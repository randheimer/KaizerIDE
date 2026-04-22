/**
 * Generic event emitter for observer pattern
 */
export class EventEmitter {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.listeners.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this.listeners.delete(callback);
  }

  emit(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('[EventEmitter] Error in listener:', e);
      }
    });
  }

  clear() {
    this.listeners.clear();
  }

  getListenerCount() {
    return this.listeners.size;
  }
}
