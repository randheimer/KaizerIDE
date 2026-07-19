/**
 * CircuitBreaker - Prevent cascading failures
 * Implements circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 5;
    this.successThreshold = config.successThreshold || 2;
    this.timeout = config.timeout || 60000; // 1 minute
    this.logger = config.logger;
    
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * Circuit breaker states
   */
  static STATES = {
    CLOSED: 'CLOSED',     // Normal operation
    OPEN: 'OPEN',         // Failing, reject requests
    HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
  };

  /**
   * Execute function through circuit breaker
   */
  async execute(fn, fallback = null) {
    // Check if circuit is open
    if (this.state === CircuitBreaker.STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.logger?.warn('Circuit breaker is OPEN, rejecting request');
        
        if (fallback) {
          this.logger?.info('Using fallback');
          return await fallback();
        }
        
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Timeout expired, try half-open
      this.logger?.info('Circuit breaker timeout expired, entering HALF_OPEN state');
      this.state = CircuitBreaker.STATES.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      
      // If circuit just opened and fallback exists, use it
      if (this.state === CircuitBreaker.STATES.OPEN && fallback) {
        this.logger?.info('Circuit breaker opened, using fallback');
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitBreaker.STATES.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.logger?.info('Circuit breaker closing after successful recovery');
        this.close();
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = CircuitBreaker.STATES.OPEN;
    this.nextAttempt = Date.now() + this.timeout;
    this.logger?.warn(`Circuit breaker opened after ${this.failureCount} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
  }

  /**
   * Close the circuit
   */
  close() {
    this.state = CircuitBreaker.STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.logger?.info('Circuit breaker closed');
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.close();
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt
    };
  }

  /**
   * Check if circuit is open
   */
  isOpen() {
    return this.state === CircuitBreaker.STATES.OPEN && Date.now() < this.nextAttempt;
  }
}
