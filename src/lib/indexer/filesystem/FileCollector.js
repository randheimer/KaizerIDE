import { MAX_DEPTH } from '../config/constants';
import { FileFilter } from './FileFilter';

/**
 * Recursively collects files from the workspace
 */
export class FileCollector {
  constructor(indexingEngine = null) {
    this.fileFilter = new FileFilter();
    this.indexingEngine = indexingEngine;
  }

  async collectFiles(dirPath, depth = 0) {
    if (depth > MAX_DEPTH) {
      return [];
    }

    // Check if indexing was aborted
    if (this.indexingEngine && this.indexingEngine.isAborted()) {
      return [];
    }

    let result = [];

    console.log('[Indexer] Collecting files from:', dirPath, 'depth:', depth);
    const listResult = await window.electron.listDir(dirPath);
    
    if (!listResult.success) {
      console.warn('[Indexer] Failed to list directory:', dirPath, listResult.error);
      return result;
    }

    const entries = listResult.entries || [];
    console.log('[Indexer] Found', entries.length, 'entries in', dirPath);

    for (const entry of entries) {
      // Check abort status
      if (this.indexingEngine && this.indexingEngine.isAborted()) {
        return result;
      }

      const name = entry.name;

      if (entry.type === 'directory' || entry.type === 'dir') {
        if (!this.fileFilter.shouldIgnoreDirectory(name)) {
          const children = await this.collectFiles(entry.path, depth + 1);
          result = result.concat(children);
        }
      } else {
        const ext = this.fileFilter.getExtension(name);
        
        if (this.fileFilter.shouldIndexFile(name, ext)) {
          const isValid = await this.fileFilter.isFileSizeValid(entry.path);
          if (isValid) {
            result.push(entry.path);
          }
        }
      }
    }

    return result;
  }
}
