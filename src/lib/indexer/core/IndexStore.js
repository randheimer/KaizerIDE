/**
 * Manages the in-memory index storage
 */
export class IndexStore {
  constructor() {
    this.index = []; // Array of IndexedFile objects
  }

  add(file) {
    this.index.push(file);
  }

  clear() {
    this.index = [];
  }

  getAll() {
    return this.index;
  }

  getCount() {
    return this.index.length;
  }

  findByPath(path) {
    return this.index.find(f => f.path === path);
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
  }
}
