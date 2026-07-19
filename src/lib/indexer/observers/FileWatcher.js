/**
 * FileWatcher - Bridges Electron file system events to the indexer
 * Listens for file changes and triggers incremental re-indexing
 */
export class FileWatcher {
  constructor(indexer) {
    this.indexer = indexer;
    this.isListening = false;
    this.debounceTimers = new Map();
    this.DEBOUNCE_DELAY = 500; // Wait 500ms before re-indexing to batch rapid changes
  }

  /**
   * Start listening for file system changes
   */
  start() {
    if (this.isListening) {
      console.log('[FileWatcher] Already listening');
      return;
    }

    console.log('[FileWatcher] Starting file system watcher');
    this.isListening = true;

    // Listen for file system change events from App.jsx
    this.handleFileSystemChange = (event) => {
      const { tree, path } = event.detail || {};
      
      if (!path || !this.indexer.enabled) {
        return;
      }

      // Only process if this is our current workspace
      if (this.indexer.workspacePath !== path) {
        console.log('[FileWatcher] Ignoring change for different workspace');
        return;
      }

      console.log('[FileWatcher] File system changed, scheduling re-index');
      this.scheduleReindex(path);
    };

    window.addEventListener('kaizer:file-system-changed', this.handleFileSystemChange);
  }

  /**
   * Stop listening for file system changes
   */
  stop() {
    if (!this.isListening) {
      return;
    }

    console.log('[FileWatcher] Stopping file system watcher');
    this.isListening = false;

    if (this.handleFileSystemChange) {
      window.removeEventListener('kaizer:file-system-changed', this.handleFileSystemChange);
      this.handleFileSystemChange = null;
    }

    // Clear any pending debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Schedule a re-index with debouncing to avoid excessive re-indexing
   * @param {string} workspacePath - Path to workspace
   */
  scheduleReindex(workspacePath) {
    // Clear existing timer for this workspace
    if (this.debounceTimers.has(workspacePath)) {
      clearTimeout(this.debounceTimers.get(workspacePath));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(workspacePath);
      this.performReindex(workspacePath);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(workspacePath, timer);
  }

  /**
   * Perform the actual re-indexing
   * @param {string} workspacePath - Path to workspace
   */
  async performReindex(workspacePath) {
    if (!this.indexer.enabled) {
      console.log('[FileWatcher] Indexer disabled, skipping re-index');
      return;
    }

    if (this.indexer.status === 'indexing') {
      console.log('[FileWatcher] Already indexing, skipping');
      return;
    }

    console.log('[FileWatcher] Performing incremental re-index');
    
    try {
      // For now, do a full re-index
      // TODO: Implement true incremental indexing by tracking specific file changes
      await this.indexer.reindex(workspacePath);
      console.log('[FileWatcher] Re-index complete');
    } catch (error) {
      console.error('[FileWatcher] Re-index failed:', error);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      pendingReindexes: this.debounceTimers.size
    };
  }
}
