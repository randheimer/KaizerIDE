import { EventEmitter } from './EventEmitter';

/**
 * Indexer-specific event emitter with typed events
 */
export class IndexerEvents extends EventEmitter {
  emitStateChange(stateManager, indexStore) {
    const state = stateManager.getState();
    this.emit({
      ...state,
      fileCount: indexStore.getCount()
    });
  }
}
