import { getPatternsForExtension } from './patterns/index';
import { SymbolDeduplicator } from './SymbolDeduplicator';

/**
 * Extracts symbols (functions, classes, exports) from source code
 */
export class SymbolExtractor {
  constructor() {
    this.deduplicator = new SymbolDeduplicator();
  }

  extract(content, ext) {
    const symbols = [];
    const patterns = getPatternsForExtension(ext);

    for (const pattern of patterns) {
      let match;
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        // Extract the captured group (symbol name)
        const name = match[1] || match[2];
        if (name) {
          symbols.push(name);
        }
        
        // Prevent infinite loops on zero-width matches
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
        
        // Stop if we have enough symbols
        if (symbols.length > 100) break;
      }
    }

    // Filter valid symbols and deduplicate
    const validSymbols = this.deduplicator.filter(symbols);
    return this.deduplicator.deduplicate(validSymbols);
  }
}
