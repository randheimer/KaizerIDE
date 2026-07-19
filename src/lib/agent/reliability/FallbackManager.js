/**
 * FallbackManager - Graceful degradation strategies
 * Provides fallback mechanisms when primary operations fail
 */
export class FallbackManager {
  constructor(config = {}) {
    this.logger = config.logger;
    this.fallbacks = new Map();
  }

  /**
   * Register a fallback for an operation
   */
  registerFallback(operationName, fallbackFn, priority = 0) {
    if (!this.fallbacks.has(operationName)) {
      this.fallbacks.set(operationName, []);
    }

    this.fallbacks.get(operationName).push({
      fn: fallbackFn,
      priority,
      name: fallbackFn.name || 'anonymous'
    });

    // Sort by priority (higher priority first)
    this.fallbacks.get(operationName).sort((a, b) => b.priority - a.priority);

    this.logger?.debug(`Registered fallback for ${operationName}: ${fallbackFn.name || 'anonymous'} (priority: ${priority})`);
  }

  /**
   * Execute operation with fallback chain
   */
  async executeWithFallback(operationName, primaryFn, context = {}) {
    // Try primary operation first
    try {
      this.logger?.debug(`Executing primary operation: ${operationName}`);
      return await primaryFn();
    } catch (primaryError) {
      this.logger?.warn(`Primary operation failed: ${operationName}`, primaryError);

      // Try fallbacks in priority order
      const fallbacks = this.fallbacks.get(operationName) || [];
      
      if (fallbacks.length === 0) {
        this.logger?.error(`No fallbacks available for ${operationName}`);
        throw primaryError;
      }

      for (const fallback of fallbacks) {
        try {
          this.logger?.info(`Trying fallback: ${fallback.name} for ${operationName}`);
          const result = await fallback.fn(primaryError, context);
          this.logger?.info(`Fallback succeeded: ${fallback.name}`);
          return result;
        } catch (fallbackError) {
          this.logger?.warn(`Fallback failed: ${fallback.name}`, fallbackError);
          // Continue to next fallback
        }
      }

      // All fallbacks failed
      this.logger?.error(`All fallbacks exhausted for ${operationName}`);
      throw primaryError;
    }
  }

  /**
   * Check if fallback exists for operation
   */
  hasFallback(operationName) {
    return this.fallbacks.has(operationName) && this.fallbacks.get(operationName).length > 0;
  }

  /**
   * Get fallback count for operation
   */
  getFallbackCount(operationName) {
    return this.fallbacks.get(operationName)?.length || 0;
  }

  /**
   * Clear fallbacks for operation
   */
  clearFallbacks(operationName) {
    this.fallbacks.delete(operationName);
  }

  /**
   * Clear all fallbacks
   */
  clearAll() {
    this.fallbacks.clear();
  }
}
