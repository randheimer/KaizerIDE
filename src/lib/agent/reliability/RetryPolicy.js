/**
 * RetryPolicy - Configurable retry strategies
 * Implements exponential backoff and retry logic
 */
export class RetryPolicy {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.initialDelay = config.initialDelay || 1000; // 1 second
    this.maxDelay = config.maxDelay || 30000; // 30 seconds
    this.backoffMultiplier = config.backoffMultiplier || 2;
    this.jitter = config.jitter !== false; // Add randomness to prevent thundering herd
    this.logger = config.logger;
  }

  /**
   * Calculate delay for retry attempt
   */
  calculateDelay(attemptNumber) {
    // Exponential backoff: delay = initialDelay * (multiplier ^ attemptNumber)
    let delay = this.initialDelay * Math.pow(this.backoffMultiplier, attemptNumber);
    
    // Cap at max delay
    delay = Math.min(delay, this.maxDelay);
    
    // Add jitter (randomness) to prevent synchronized retries
    if (this.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }
    
    return Math.floor(delay);
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, context = {}) {
    let lastError = null;
    let attemptCount = 0;

    while (attemptCount <= this.maxRetries) {
      try {
        this.logger?.debug(`Retry attempt ${attemptCount + 1}/${this.maxRetries + 1}`);
        
        const result = await fn(attemptCount);
        
        if (attemptCount > 0) {
          this.logger?.info(`Succeeded after ${attemptCount} retries`);
        }
        
        return result;

      } catch (error) {
        lastError = error;
        attemptCount++;

        // Check if we should retry
        if (attemptCount > this.maxRetries) {
          this.logger?.error(`Max retries (${this.maxRetries}) exceeded`, error);
          break;
        }

        // Check if error is retryable
        if (context.errorHandler) {
          const handled = await context.errorHandler.handleError(error, {
            attemptCount,
            maxRetries: this.maxRetries
          });
          
          if (!handled.shouldRetry) {
            this.logger?.warn('Error is not retryable, aborting', error);
            throw error;
          }
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attemptCount - 1);
        this.logger?.info(`Retrying in ${delay}ms (attempt ${attemptCount}/${this.maxRetries})`);
        
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create retry policy with custom config
   */
  static create(config) {
    return new RetryPolicy(config);
  }

  /**
   * Predefined policies
   */
  static POLICIES = {
    // Fast retry for quick operations
    FAST: {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2
    },
    
    // Standard retry for most operations
    STANDARD: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    },
    
    // Aggressive retry for critical operations
    AGGRESSIVE: {
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 2
    },
    
    // No retry
    NONE: {
      maxRetries: 0,
      initialDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1
    }
  };

  /**
   * Get predefined policy
   */
  static getPolicy(name, logger = null) {
    const config = RetryPolicy.POLICIES[name.toUpperCase()];
    if (!config) {
      throw new Error(`Unknown retry policy: ${name}`);
    }
    return new RetryPolicy({ ...config, logger });
  }
}
