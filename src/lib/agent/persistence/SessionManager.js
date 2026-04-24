/**
 * SessionManager - Save and resume agent sessions.
 *
 * Storage strategy (hybrid):
 *   - localStorage is the synchronous cache + source of truth for reads.
 *   - When running inside Electron, writes are also mirrored to disk
 *     (userData/KaizerIDE/agent-sessions.json) via IPC for durability.
 *   - On construction, we kick off an async rehydrate-from-disk that seeds
 *     localStorage if disk has data that localStorage doesn't.
 */
export class SessionManager {
  constructor(config = {}) {
    this.logger = config.logger;
    this.storageKey = config.storageKey || 'kaizer-agent-sessions';
    this.maxSessions = config.maxSessions || 50;
    this._diskHydrated = false;

    // Best-effort async rehydrate from disk on startup
    this._hydrateFromDisk().catch((err) => {
      this.logger?.warn?.('SessionManager: disk hydration failed', err);
    });
  }

  /**
   * Returns true if the Electron bridge for session persistence is available.
   */
  _hasDiskStorage() {
    return (
      typeof globalThis.window !== 'undefined' &&
      globalThis.window.electron &&
      typeof globalThis.window.electron.saveAgentSessions === 'function' &&
      typeof globalThis.window.electron.loadAgentSessions === 'function'
    );
  }

  /**
   * Load sessions from disk once; if disk has more recent data than localStorage,
   * seed localStorage from it so downstream sync reads see everything.
   */
  async _hydrateFromDisk() {
    if (this._diskHydrated) return;
    this._diskHydrated = true;
    if (!this._hasDiskStorage()) return;

    try {
      const res = await globalThis.window.electron.loadAgentSessions();
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const fromDisk = res.data;
      const local = this.getAllSessions();

      // Merge by id, preferring the newer timestamp
      const byId = new Map();
      for (const s of local) byId.set(s.id, s);
      for (const s of fromDisk) {
        const existing = byId.get(s.id);
        if (!existing || (s.timestamp || 0) > (existing.timestamp || 0)) {
          byId.set(s.id, s);
        }
      }

      const merged = Array.from(byId.values())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, this.maxSessions);

      localStorage.setItem(this.storageKey, JSON.stringify(merged));
      this.logger?.info?.(`SessionManager: hydrated ${merged.length} sessions from disk`);
    } catch (error) {
      this.logger?.warn?.('SessionManager: disk hydration error', error);
    }
  }

  /**
   * Async write-through to disk. Fire-and-forget: localStorage remains the
   * synchronous source of truth for getters.
   */
  _persistToDisk(sessions) {
    if (!this._hasDiskStorage()) return;
    // Fire-and-forget; failures are logged but do not throw to callers.
    Promise.resolve()
      .then(() => globalThis.window.electron.saveAgentSessions(sessions))
      .catch((err) => this.logger?.warn?.('SessionManager: disk save failed', err));
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    const randomBytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(randomBytes);
    const randomPart = Array.from(randomBytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    return `session_${Date.now()}_${randomPart}`;
  }

  /**
   * Save current session
   */
  async saveSession(sessionData) {
    try {
      const sessionId = sessionData.id || this.generateSessionId();
      
      const session = {
        id: sessionId,
        timestamp: Date.now(),
        workspacePath: sessionData.workspacePath,
        messages: sessionData.messages,
        settings: sessionData.settings,
        iteration: sessionData.iteration,
        metadata: sessionData.metadata || {}
      };

      // Get existing sessions
      const sessions = this.getAllSessions();
      
      // Add or update session
      const existingIndex = sessions.findIndex(s => s.id === sessionId);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      // Keep only recent sessions
      if (sessions.length > this.maxSessions) {
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        sessions.splice(this.maxSessions);
      }

      // Save to storage (sync) + mirror to disk (async, best-effort)
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      this._persistToDisk(sessions);
      
      this.logger?.info(`Session saved: ${sessionId}`);
      return sessionId;

    } catch (error) {
      this.logger?.error('Failed to save session', error);
      throw error;
    }
  }

  /**
   * Load session by ID
   */
  async loadSession(sessionId) {
    try {
      const sessions = this.getAllSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      this.logger?.info(`Session loaded: ${sessionId}`);
      return session;

    } catch (error) {
      this.logger?.error('Failed to load session', error);
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      this.logger?.error('Failed to get sessions', error);
      return [];
    }
  }

  /**
   * Get sessions for workspace
   */
  getSessionsForWorkspace(workspacePath) {
    const sessions = this.getAllSessions();
    return sessions.filter(s => s.workspacePath === workspacePath);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      this._persistToDisk(filtered);
      
      this.logger?.info(`Session deleted: ${sessionId}`);
      return true;

    } catch (error) {
      this.logger?.error('Failed to delete session', error);
      return false;
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions() {
    try {
      localStorage.removeItem(this.storageKey);
      this._persistToDisk([]);
      this.logger?.info('All sessions cleared');
      return true;
    } catch (error) {
      this.logger?.error('Failed to clear sessions', error);
      return false;
    }
  }

  /**
   * Export session to JSON
   */
  exportSession(sessionId) {
    const session = this.getAllSessions().find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from JSON
   */
  async importSession(jsonString) {
    try {
      const session = JSON.parse(jsonString);
      
      // Validate session structure
      if (!session.id || !session.messages) {
        throw new Error('Invalid session format');
      }

      // Save imported session
      return await this.saveSession(session);

    } catch (error) {
      this.logger?.error('Failed to import session', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = this.getAllSessions();
    
    return {
      total: sessions.length,
      byWorkspace: sessions.reduce((acc, s) => {
        acc[s.workspacePath] = (acc[s.workspacePath] || 0) + 1;
        return acc;
      }, {}),
      oldest: sessions.length > 0 ? Math.min(...sessions.map(s => s.timestamp)) : null,
      newest: sessions.length > 0 ? Math.max(...sessions.map(s => s.timestamp)) : null
    };
  }
}
