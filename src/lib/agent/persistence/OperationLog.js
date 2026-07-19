/**
 * OperationLog - Append-only log of all operations
 * Provides audit trail and replay capability
 */
export class OperationLog {
  constructor(config = {}) {
    this.logger = config.logger;
    this.storageKey = config.storageKey || 'kaizer-operation-log';
    this.maxEntries = config.maxEntries || 1000;
    this.enabled = config.enabled !== false;
  }

  /**
   * Log an operation
   */
  async logOperation(operation) {
    if (!this.enabled) return;

    try {
      const entry = {
        id: this.generateEntryId(),
        timestamp: Date.now(),
        type: operation.type,
        agent: operation.agent,
        tool: operation.tool,
        args: operation.args,
        result: operation.result,
        success: operation.success,
        error: operation.error,
        duration: operation.duration,
        metadata: operation.metadata || {}
      };

      // Get existing log
      const log = this.getLog();
      log.push(entry);

      // Keep only recent entries
      if (log.length > this.maxEntries) {
        log.splice(0, log.length - this.maxEntries);
      }

      // Save to storage
      localStorage.setItem(this.storageKey, JSON.stringify(log));

    } catch (error) {
      this.logger?.error('Failed to log operation', error);
    }
  }

  /**
   * Generate entry ID
   */
  generateEntryId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get full operation log
   */
  getLog(filter = {}) {
    try {
      const stored = localStorage.getItem(this.storageKey);
      let log = stored ? JSON.parse(stored) : [];

      // Apply filters
      if (filter.type) {
        log = log.filter(e => e.type === filter.type);
      }

      if (filter.agent) {
        log = log.filter(e => e.agent === filter.agent);
      }

      if (filter.tool) {
        log = log.filter(e => e.tool === filter.tool);
      }

      if (filter.success !== undefined) {
        log = log.filter(e => e.success === filter.success);
      }

      if (filter.since) {
        log = log.filter(e => e.timestamp >= filter.since);
      }

      if (filter.limit) {
        log = log.slice(-filter.limit);
      }

      return log;

    } catch (error) {
      this.logger?.error('Failed to get operation log', error);
      return [];
    }
  }

  /**
   * Get operations for session
   */
  getSessionOperations(sessionId) {
    return this.getLog({ metadata: { sessionId } });
  }

  /**
   * Clear operation log
   */
  async clearLog() {
    try {
      localStorage.removeItem(this.storageKey);
      this.logger?.info('Operation log cleared');
      return true;
    } catch (error) {
      this.logger?.error('Failed to clear operation log', error);
      return false;
    }
  }

  /**
   * Get log statistics
   */
  getStats() {
    const log = this.getLog();

    if (log.length === 0) {
      return {
        total: 0,
        byType: {},
        byAgent: {},
        byTool: {},
        successRate: 0
      };
    }

    const byType = {};
    const byAgent = {};
    const byTool = {};
    let successCount = 0;

    for (const entry of log) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byAgent[entry.agent] = (byAgent[entry.agent] || 0) + 1;
      if (entry.tool) {
        byTool[entry.tool] = (byTool[entry.tool] || 0) + 1;
      }
      if (entry.success) {
        successCount++;
      }
    }

    return {
      total: log.length,
      byType,
      byAgent,
      byTool,
      successRate: (successCount / log.length) * 100
    };
  }

  /**
   * Export log to JSON
   */
  exportLog() {
    const log = this.getLog();
    return JSON.stringify(log, null, 2);
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}
