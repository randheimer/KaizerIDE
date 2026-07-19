/**
 * AgentContext - Shared context object passed between agent components
 * Contains all necessary state and dependencies for agent execution
 */
export class AgentContext {
  constructor({
    workspacePath,
    activeFile,
    activeFileContent,
    settings,
    messages,
    indexer,
    logger,
    metrics,
    sessionManager
  }) {
    // Workspace context
    this.workspacePath = workspacePath;
    this.activeFile = activeFile;
    this.activeFileContent = activeFileContent;
    
    // Settings and configuration
    this.settings = settings;
    
    // Conversation history
    this.messages = messages;
    
    // Subsystems
    this.indexer = indexer;
    this.logger = logger;
    this.metrics = metrics;
    this.sessionManager = sessionManager;
    
    // Execution state
    this.abortSignal = null;
    this.iteration = 0;
    this.maxIterations = 12;
    
    // Callbacks
    this.onToken = null;
    this.onToolCall = null;
    this.onToolResult = null;
    this.onThinkingToken = null;
    this.onIterationUpdate = null;
    this.onDone = null;
  }

  /**
   * Set abort signal for cancellation
   */
  setAbortSignal(signal) {
    this.abortSignal = signal;
  }

  /**
   * Set callback functions
   */
  setCallbacks({ onToken, onToolCall, onToolResult, onThinkingToken, onIterationUpdate, onDone }) {
    this.onToken = onToken;
    this.onToolCall = onToolCall;
    this.onToolResult = onToolResult;
    this.onThinkingToken = onThinkingToken;
    this.onIterationUpdate = onIterationUpdate;
    this.onDone = onDone;
  }

  /**
   * Check if execution should be aborted
   */
  isAborted() {
    return this.abortSignal?.aborted || false;
  }

  /**
   * Increment iteration counter
   */
  incrementIteration() {
    this.iteration++;
  }

  /**
   * Check if max iterations reached
   */
  hasReachedMaxIterations() {
    return this.iteration >= this.maxIterations;
  }

  /**
   * Reset iteration counter
   */
  resetIteration() {
    this.iteration = 0;
  }

  /**
   * Clone context with updated messages
   */
  withMessages(messages) {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);
    cloned.messages = messages;
    return cloned;
  }

  /**
   * Get context summary for logging
   */
  getSummary() {
    return {
      workspacePath: this.workspacePath,
      activeFile: this.activeFile,
      messageCount: this.messages?.length || 0,
      iteration: this.iteration,
      maxIterations: this.maxIterations,
      model: this.settings?.selectedModel?.id
    };
  }
}
