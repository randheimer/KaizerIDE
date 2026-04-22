import { createIndexedFile } from '../types/IndexedFile';
import { SymbolExtractor } from '../extraction/SymbolExtractor';

/**
 * Reads files and extracts metadata for indexing
 */
export class FileReader {
  constructor() {
    this.symbolExtractor = new SymbolExtractor();
  }

  async indexFile(filePath, workspacePath, indexStore) {
    try {
      if (!filePath || typeof filePath !== 'string') return;

      const result = await window.electron.readFile(filePath);
      if (result.error || !result.success) return;

      const content = result.content || '';
      const lines = content.split('\n');
      const name = filePath.split(/[\\/]/).pop() || 'unknown';
      const ext = name.includes('.') ? '.' + name.split('.').pop().toLowerCase() : '';
      const dir = filePath
        .replace(workspacePath, '')
        .split(/[\\/]/)
        .slice(0, -1)
        .join('/')
        .replace(/^\//, '') || '.';

      // Extract symbols
      const symbols = this.symbolExtractor.extract(content, ext);

      // Create indexed file object
      const indexedFile = createIndexedFile({
        path: filePath,
        name,
        dir,
        ext,
        size: content.length,
        lines: lines.length,
        preview: lines.slice(0, 50).join('\n'),
        symbols: symbols || [],
        indexed: Date.now()
      });

      indexStore.add(indexedFile);
    } catch (e) {
      // Skip files that can't be read
    }
  }
}
