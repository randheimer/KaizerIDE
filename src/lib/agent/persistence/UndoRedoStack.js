/**
 * UndoRedoStack - Track reversible operations
 * Provides undo/redo functionality for file operations
 */
export class UndoRedoStack {
  constructor(config = {}) {
    this.logger = config.logger;
    this.maxStackSize = config.maxStackSize || 50;
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Push operation to undo stack
   */
  push(operation) {
    // Add to undo stack
    this.undoStack.push({
      id: this.generateOperationId(),
      timestamp: Date.now(),
      type: operation.type,
      description: operation.description,
      undo: operation.undo,
      redo: operation.redo,
      metadata: operation.metadata || {}
    });

    // Clear redo stack when new operation is added
    this.redoStack = [];

    // Keep stack size under limit
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.logger?.debug(`Operation pushed to undo stack: ${operation.description}`);
  }

  /**
   * Generate operation ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Undo last operation
   */
  async undo() {
    if (this.undoStack.length === 0) {
      throw new Error('Nothing to undo');
    }

    const operation = this.undoStack.pop();
    
    try {
      this.logger?.info(`Undoing: ${operation.description}`);
      
      // Execute undo function
      await operation.undo();
      
      // Move to redo stack
      this.redoStack.push(operation);
      
      this.logger?.info(`Undo successful: ${operation.description}`);
      return operation;

    } catch (error) {
      // Put operation back on undo stack if undo fails
      this.undoStack.push(operation);
      this.logger?.error(`Undo failed: ${operation.description}`, error);
      throw error;
    }
  }

  /**
   * Redo last undone operation
   */
  async redo() {
    if (this.redoStack.length === 0) {
      throw new Error('Nothing to redo');
    }

    const operation = this.redoStack.pop();
    
    try {
      this.logger?.info(`Redoing: ${operation.description}`);
      
      // Execute redo function
      await operation.redo();
      
      // Move back to undo stack
      this.undoStack.push(operation);
      
      this.logger?.info(`Redo successful: ${operation.description}`);
      return operation;

    } catch (error) {
      // Put operation back on redo stack if redo fails
      this.redoStack.push(operation);
      this.logger?.error(`Redo failed: ${operation.description}`, error);
      throw error;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack
   */
  getUndoStack() {
    return this.undoStack.map(op => ({
      id: op.id,
      timestamp: op.timestamp,
      type: op.type,
      description: op.description,
      metadata: op.metadata
    }));
  }

  /**
   * Get redo stack
   */
  getRedoStack() {
    return this.redoStack.map(op => ({
      id: op.id,
      timestamp: op.timestamp,
      type: op.type,
      description: op.description,
      metadata: op.metadata
    }));
  }

  /**
   * Clear both stacks
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.logger?.info('Undo/redo stacks cleared');
  }

  /**
   * Clear undo stack only
   */
  clearUndo() {
    this.undoStack = [];
    this.logger?.info('Undo stack cleared');
  }

  /**
   * Clear redo stack only
   */
  clearRedo() {
    this.redoStack = [];
    this.logger?.info('Redo stack cleared');
  }

  /**
   * Get stack statistics
   */
  getStats() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      totalOperations: this.undoStack.length + this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * Peek at next undo operation without executing
   */
  peekUndo() {
    if (this.undoStack.length === 0) return null;
    
    const op = this.undoStack[this.undoStack.length - 1];
    return {
      id: op.id,
      timestamp: op.timestamp,
      type: op.type,
      description: op.description,
      metadata: op.metadata
    };
  }

  /**
   * Peek at next redo operation without executing
   */
  peekRedo() {
    if (this.redoStack.length === 0) return null;
    
    const op = this.redoStack[this.redoStack.length - 1];
    return {
      id: op.id,
      timestamp: op.timestamp,
      type: op.type,
      description: op.description,
      metadata: op.metadata
    };
  }
}
