/**
 * AgentBase - Abstract base class for all agents
 * Defines lifecycle hooks and common functionality
 */
export class AgentBase {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.initialized = false;
  }

  /**
   * Initialize agent (called once before first execution)
   * Override in subclasses for setup logic
   */
  async initialize(context) {
    if (this.initialized) return;
    
    context.logger?.info(`[${this.name}] Initializing agent`);
    await this.onInitialize(context);
    this.initialized = true;
  }

  /**
   * Hook: Override for custom initialization
   */
  async onInitialize(context) {
    // Override in subclass
  }

  /**
   * Execute agent turn (main entry point)
   */
  async execute(context) {
    if (!this.initialized) {
      await this.initialize(context);
    }

    context.logger?.info(`[${this.name}] Starting execution`, context.getSummary());
    context.metrics?.recordAgentStart(this.name);

    try {
      // Pre-execution hook
      await this.beforeExecute(context);

      // Main execution
      const result = await this.doExecute(context);

      // Post-execution hook
      await this.afterExecute(context, result);

      context.metrics?.recordAgentSuccess(this.name);
      return result;

    } catch (error) {
      context.logger?.error(`[${this.name}] Execution failed`, error);
      context.metrics?.recordAgentError(this.name, error);

      // Error handling hook
      const handled = await this.onError(context, error);
      if (!handled) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Hook: Called before main execution
   */
  async beforeExecute(context) {
    // Override in subclass
  }

  /**
   * Hook: Main execution logic (MUST override in subclass)
   */
  async doExecute(context) {
    throw new Error(`${this.name}: doExecute() must be implemented in subclass`);
  }

  /**
   * Hook: Called after successful execution
   */
  async afterExecute(context, result) {
    // Override in subclass
  }

  /**
   * Hook: Called when error occurs
   * Return true if error was handled, false to re-throw
   */
  async onError(context, error) {
    // Override in subclass for custom error handling
    return false;
  }

  /**
   * Cleanup resources (called on shutdown)
   */
  async cleanup(context) {
    context.logger?.info(`[${this.name}] Cleaning up agent`);
    await this.onCleanup(context);
  }

  /**
   * Hook: Override for custom cleanup
   */
  async onCleanup(context) {
    // Override in subclass
  }

  /**
   * Get agent capabilities/permissions
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: true,
      canExecute: true,
      allowedTools: null // null = all tools allowed
    };
  }

  /**
   * Get agent-specific system prompt
   */
  getSystemPrompt(context) {
    return null; // Override in subclass
  }

  /**
   * Validate if agent can use a specific tool
   */
  canUseTool(toolName) {
    const capabilities = this.getCapabilities();
    
    if (capabilities.allowedTools === null) {
      return true; // All tools allowed
    }

    return capabilities.allowedTools.includes(toolName);
  }
}
