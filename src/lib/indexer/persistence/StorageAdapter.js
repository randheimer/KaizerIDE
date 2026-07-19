/**
 * Abstract storage adapter interface
 */
export class StorageAdapter {
  async save(key, data) {
    throw new Error('save() must be implemented by subclass');
  }

  async load(key) {
    throw new Error('load() must be implemented by subclass');
  }

  async remove(key) {
    throw new Error('remove() must be implemented by subclass');
  }

  async clear(prefix) {
    throw new Error('clear() must be implemented by subclass');
  }

  async getAllKeys(prefix) {
    throw new Error('getAllKeys() must be implemented by subclass');
  }
}
