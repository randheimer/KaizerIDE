/**
 * ErrorHandler - Centralized error classification and handling
 * Provides consistent error handling across the agent system
 */
export class ErrorHandler {
  constructor(config = {}) {
    this.logger = config.logger;
    this.metrics = config.metrics;
  }

  /**
   * Error types for classification
   */
  static ERROR_TYPES = {
    NETWORK: 'network',
    API: 'api',
    TOOL: 'tool',
    VALIDATION: 'validation',
    TIMEOUT: 'timeout',
    ABORT: 'abort',
    UNKNOWN: 'unknown'
  };

  /**
   * Classify error type
   */
  classifyError(error) {
    if (!error) return ErrorHandler.ERROR_TYPES.UNKNOWN;

    // Abort errors
    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      return ErrorHandler.ERROR_TYPES.ABORT;
    }

    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch failed')) {
      return ErrorHandler.ERROR_TYPES.NETWORK;
    }

    // API errors
    if (error.message?.includes('API') || error.status) {
      return ErrorHandler.ERROR_TYPES.API;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return ErrorHandler.ERROR_TYPES.TIMEOUT;
    }

    // Tool errors
    if (error.message?.includes('tool') || error.toolName) {
      return ErrorHandler.ERROR_TYPES.TOOL;
    }

    // Validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return ErrorHandler.ERROR_TYPES.VALIDATION;
    }

    return ErrorHandler.ERROR_TYPES.UNKNOWN;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    const type = this.classifyError(error);

    // Non-retryable error types
    const nonRetryable = [
      ErrorHandler.ERROR_TYPES.ABORT,
      ErrorHandler.ERROR_TYPES.VALIDATION
    ];

    if (nonRetryable.includes(type)) {
      return false;
    }

    // Check for specific non-retryable API errors
    if (type === ErrorHandler.ERROR_TYPES.API) {
      const status = error.status || this.extractStatusCode(error.message);
      
      // 4xx errors (except 429) are not retryable
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract status code from error message
   */
  extractStatusCode(message) {
    if (!message) return null;
    
    const match = message.match(/API (\d{3})/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Handle error with appropriate strategy
   */
  async handleError(error, context = {}) {
    const type = this.classifyError(error);
    const retryable = this.isRetryable(error);

    this.logger?.error(`Error occurred: ${type}`, {
      message: error.message,
      retryable,
      context
    });

    this.metrics?.recordError('handler', type, error);

    // Return error info for retry logic
    return {
      type,
      retryable,
      error,
      shouldRetry: retryable && (context.attemptCount || 0) < (context.maxRetries || 3)
    };
  }

  /**
   * Create user-friendly error message
   */
  formatErrorMessage(error) {
    const type = this.classifyError(error);

    switch (type) {
      case ErrorHandler.ERROR_TYPES.NETWORK:
        return 'Network error: Unable to connect to the API. Please check your connection.';
      
      case ErrorHandler.ERROR_TYPES.API:
        const status = this.extractStatusCode(error.message);
        if (status === 401) return 'Authentication failed. Please check your API key.';
        if (status === 429) return 'Rate limit exceeded. Please wait a moment and try again.';
        if (status === 500) return 'API server error. Please try again later.';
        return `API error: ${error.message}`;
      
      case ErrorHandler.ERROR_TYPES.TOOL:
        return `Tool execution failed: ${error.message}`;
      
      case ErrorHandler.ERROR_TYPES.VALIDATION:
        return `Validation error: ${error.message}`;
      
      case ErrorHandler.ERROR_TYPES.TIMEOUT:
        return 'Request timed out. Please try again.';
      
      case ErrorHandler.ERROR_TYPES.ABORT:
        return 'Request was cancelled.';
      
      default:
        return `Error: ${error.message || 'An unknown error occurred'}`;
    }
  }

  /**
   * Get recovery suggestions
   */
  getRecoverySuggestions(error) {
    const type = this.classifyError(error);

    switch (type) {
      case ErrorHandler.ERROR_TYPES.NETWORK:
        return [
          'Check your internet connection',
          'Verify the API endpoint is correct',
          'Check if the API server is running'
        ];
      
      case ErrorHandler.ERROR_TYPES.API:
        const status = this.extractStatusCode(error.message);
        if (status === 401) return ['Check your API key in settings'];
        if (status === 429) return ['Wait a moment before retrying', 'Consider using a different model'];
        return ['Try again in a moment', 'Check API server status'];
      
      case ErrorHandler.ERROR_TYPES.TOOL:
        return [
          'Check if the file/directory exists',
          'Verify you have necessary permissions',
          'Try a different approach'
        ];
      
      case ErrorHandler.ERROR_TYPES.TIMEOUT:
        return [
          'Try again with a shorter request',
          'Check your network connection',
          'Increase timeout in settings'
        ];
      
      default:
        return ['Try again', 'Check the error details', 'Contact support if the issue persists'];
    }
  }
}
