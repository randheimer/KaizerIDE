/**
 * Logger - Structured logging with levels
 * Provides consistent logging across the agent system
 */
export class Logger {
  constructor(config = {}) {
    this.level = config.level || 'info'; // 'debug' | 'info' | 'warn' | 'error'
    this.enabled = config.enabled !== false;
    this.prefix = config.prefix || '[Agent]';
    this.logs = []; // Store logs for debug panel
    this.maxLogs = config.maxLogs || 1000;
  }

  /**
   * Log levels (lower number = higher priority)
   */
  static LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    if (!this.enabled) return false;
    return Logger.LEVELS[level] >= Logger.LEVELS[this.level];
  }

  /**
   * Format log entry
   */
  formatEntry(level, message, data) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      prefix: this.prefix
    };
  }

  /**
   * Store log entry
   */
  storeLog(entry) {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Debug level logging
   */
  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.formatEntry('debug', message, data);
    this.storeLog(entry);
    console.debug(`${this.prefix} ${message}`, data || '');
  }

  /**
   * Info level logging
   */
  info(message, data = null) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.formatEntry('info', message, data);
    this.storeLog(entry);
    console.log(`${this.prefix} ${message}`, data || '');
  }

  /**
   * Warning level logging
   */
  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.formatEntry('warn', message, data);
    this.storeLog(entry);
    console.warn(`${this.prefix} ${message}`, data || '');
  }

  /**
   * Error level logging
   */
  error(message, error = null) {
    if (!this.shouldLog('error')) return;
    
    const entry = this.formatEntry('error', message, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    this.storeLog(entry);
    console.error(`${this.prefix} ${message}`, error || '');
  }

  /**
   * Get all logs
   */
  getLogs(filter = {}) {
    let filtered = this.logs;

    if (filter.level) {
      const minLevel = Logger.LEVELS[filter.level];
      filtered = filtered.filter(log => Logger.LEVELS[log.level] >= minLevel);
    }

    if (filter.since) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.since);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (!Logger.LEVELS.hasOwnProperty(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.level = level;
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}
