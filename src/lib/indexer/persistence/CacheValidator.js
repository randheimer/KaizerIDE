import { CACHE_EXPIRATION_MS } from '../config/constants';

/**
 * Validates cached index data
 */
export class CacheValidator {
  validate(cachedData, workspacePath) {
    if (!cachedData) {
      console.log('[CacheValidator] No cached data found');
      return { valid: false, reason: 'no_data' };
    }

    // Verify workspace matches
    if (cachedData.workspace !== workspacePath) {
      console.log('[CacheValidator] Workspace mismatch:', cachedData.workspace, '!==', workspacePath);
      return { valid: false, reason: 'workspace_mismatch' };
    }

    // Check age
    const age = Date.now() - cachedData.ts;
    if (age > CACHE_EXPIRATION_MS) {
      console.log('[CacheValidator] Cache expired (', Math.round(age / 60000), 'minutes old)');
      return { valid: false, reason: 'expired' };
    }

    // Verify data structure
    if (!cachedData.meta || !Array.isArray(cachedData.meta)) {
      console.log('[CacheValidator] Invalid data structure');
      return { valid: false, reason: 'invalid_structure' };
    }

    return { valid: true };
  }
}
