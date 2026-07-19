import { STORAGE_KEY_PREFIX } from '../config/constants';

/**
 * Generates storage keys for workspace indexes
 */
export class StorageKeyGenerator {
  generate(workspacePath) {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }
    
    // Use base64 encoding of workspace path (truncated for safety)
    const encoded = btoa(workspacePath).slice(0, 20);
    return `${STORAGE_KEY_PREFIX}${encoded}`;
  }

  getAllKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          keys.push(key);
        }
      }
    } catch (e) {
      console.warn('[StorageKeyGenerator] Failed to get keys:', e);
    }
    return keys;
  }
}
