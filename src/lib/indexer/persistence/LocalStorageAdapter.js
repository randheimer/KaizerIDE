import { StorageAdapter } from './StorageAdapter';
import { StorageKeyGenerator } from './StorageKeyGenerator';
import { CacheValidator } from './CacheValidator';

/**
 * localStorage implementation of StorageAdapter
 */
export class LocalStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.keyGenerator = new StorageKeyGenerator();
    this.validator = new CacheValidator();
  }

  async save(workspacePath, indexStore) {
    try {
      const key = this.keyGenerator.generate(workspacePath);
      
      // Only save metadata, not full content (too large)
      const meta = indexStore.map(f => ({
        path: f.path,
        name: f.name,
        dir: f.dir,
        ext: f.ext,
        size: f.size,
        lines: f.lines,
        symbols: f.symbols,
        indexed: f.indexed
      }));

      const data = {
        meta,
        workspace: workspacePath,
        ts: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(data));
      console.log('[LocalStorageAdapter] Saved index for:', workspacePath);
      return { success: true };
    } catch (e) {
      console.warn('[LocalStorageAdapter] Failed to save:', e);
      return { success: false, error: e.message };
    }
  }

  async load(workspacePath) {
    try {
      const key = this.keyGenerator.generate(workspacePath);
      const stored = JSON.parse(localStorage.getItem(key) || 'null');

      if (!stored) {
        console.log('[LocalStorageAdapter] No cached index found for:', workspacePath);
        return { success: false, reason: 'not_found' };
      }

      // Validate cache
      const validation = this.validator.validate(stored, workspacePath);
      if (!validation.valid) {
        return { success: false, reason: validation.reason };
      }

      console.log('[LocalStorageAdapter] Loaded cached index:', stored.meta.length, 'files');
      return { success: true, data: stored };
    } catch (e) {
      console.error('[LocalStorageAdapter] Error loading:', e);
      return { success: false, error: e.message };
    }
  }

  async remove(workspacePath) {
    try {
      const key = this.keyGenerator.generate(workspacePath);
      localStorage.removeItem(key);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async clear(prefix) {
    try {
      const keys = this.keyGenerator.getAllKeys();
      keys.forEach(key => localStorage.removeItem(key));
      console.log('[LocalStorageAdapter] Cleared', keys.length, 'cached indexes');
      return { success: true, count: keys.length };
    } catch (e) {
      console.warn('[LocalStorageAdapter] Failed to clear:', e);
      return { success: false, error: e.message };
    }
  }

  async getAllKeys(prefix) {
    return this.keyGenerator.getAllKeys();
  }
}
