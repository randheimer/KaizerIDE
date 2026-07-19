import { INDEXER_ENABLED_KEY } from '../config/constants';

/**
 * Manages indexer state (status, progress, enabled flag)
 */
export class StateManager {
  constructor() {
    this.status = 'idle'; // 'idle' | 'indexing' | 'ready' | 'error' | 'aborted'
    this.progress = 0; // 0-100
    this.totalFiles = 0;
    this.indexedFiles = 0;
    this.workspacePath = null;
    this.enabled = this.loadEnabled();
  }

  loadEnabled() {
    try {
      return JSON.parse(localStorage.getItem(INDEXER_ENABLED_KEY) ?? 'true');
    } catch {
      return true;
    }
  }

  setEnabled(val) {
    this.enabled = val;
    localStorage.setItem(INDEXER_ENABLED_KEY, JSON.stringify(val));
  }

  setStatus(status) {
    this.status = status;
  }

  setProgress(progress) {
    this.progress = Math.min(100, Math.max(0, progress));
  }

  setTotalFiles(total) {
    this.totalFiles = total;
  }

  setIndexedFiles(indexed) {
    this.indexedFiles = indexed;
    if (this.totalFiles > 0) {
      this.progress = Math.round((this.indexedFiles / this.totalFiles) * 100);
    }
  }

  setWorkspacePath(path) {
    this.workspacePath = path;
  }

  reset() {
    this.status = 'idle';
    this.progress = 0;
    this.totalFiles = 0;
    this.indexedFiles = 0;
  }

  getState() {
    return {
      status: this.status,
      progress: this.progress,
      totalFiles: this.totalFiles,
      indexedFiles: this.indexedFiles,
      enabled: this.enabled,
      workspacePath: this.workspacePath
    };
  }
}
