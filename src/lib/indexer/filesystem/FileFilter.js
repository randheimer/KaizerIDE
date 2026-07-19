import { CODE_EXTENSIONS } from '../config/extensions';
import { IGNORE_PATTERNS } from '../config/ignorePatterns';
import { MAX_FILE_SIZE } from '../config/constants';

/**
 * Filters files based on extension, size, and ignore patterns
 */
export class FileFilter {
  constructor() {
    this.codeExtensions = CODE_EXTENSIONS;
    this.ignorePatterns = IGNORE_PATTERNS;
    this.maxFileSize = MAX_FILE_SIZE;
  }

  shouldIgnoreDirectory(name) {
    return this.ignorePatterns.has(name);
  }

  shouldIndexFile(name, ext) {
    return this.codeExtensions.has(ext);
  }

  async isFileSizeValid(filePath) {
    try {
      const info = await window.electron.getFileInfo(filePath);
      return info && info.success && info.size < this.maxFileSize;
    } catch {
      return false;
    }
  }

  getExtension(name) {
    if (!name || typeof name !== 'string' || !name.includes('.')) {
      return '';
    }
    return '.' + name.split('.').pop().toLowerCase();
  }
}
