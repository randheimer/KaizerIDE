/**
 * Manages the in-memory index storage.
 * Uses both an array (for ordered iteration) and a Map (for O(1) path lookups).
 */
export class IndexStore {
  constructor() {
    this.index = []; // Array of IndexedFile objects (ordered)
    this._pathMap = new Map(); // path -> IndexedFile (O(1) lookup)
  }

  add(file) {
    this.index.push(file);
    if (file && file.path) {
      this._pathMap.set(file.path, file);
    }
  }

  clear() {
    this.index = [];
    this._pathMap.clear();
  }

  getAll() {
    return this.index;
  }

  getCount() {
    return this.index.length;
  }

  findByPath(path) {
    return this._pathMap.get(path) || null;
  }

  filter(predicate) {
    return this.index.filter(predicate);
  }

  map(mapper) {
    return this.index.map(mapper);
  }

  forEach(callback) {
    this.index.forEach(callback);
  }

  setAll(files) {
    this.index = files;
    // Rebuild the path map
    this._pathMap.clear();
    for (const file of files) {
      if (file && file.path) {
        this._pathMap.set(file.path, file);
      }
    }
  }

  /**
   * Update or add a file in the index
   * @param {string} path - File path
   * @param {object} fileData - IndexedFile data
   */
  updateFile(path, fileData) {
    const existing = this._pathMap.get(path);
    
    if (existing) {
      // Update in-place via the map reference (same object in array)
      const idx = this.index.indexOf(existing);
      if (idx !== -1) {
        this.index[idx] = fileData;
      }
      this._pathMap.set(path, fileData);
      console.log('[IndexStore] Updated file in index:', path);
    } else {
      // Add new file
      this.index.push(fileData);
      this._pathMap.set(path, fileData);
      console.log('[IndexStore] Added new file to index:', path);
    }
  }

  /**
   * Remove a file from the index
   * @param {string} path - File path to remove
   * @returns {boolean} - True if file was removed, false if not found
   */
  removeFile(path) {
    if (!this._pathMap.has(path)) return false;
    
    this._pathMap.delete(path);
    this.index = this.index.filter(f => f.path !== path);
    console.log('[IndexStore] Removed file from index:', path);
    return true;
  }

  /**
   * Check if a file exists in the index
   * @param {string} path - File path
   * @returns {boolean}
   */
  hasFile(path) {
    return this._pathMap.has(path);
  }
}
