import { MAX_SYMBOLS_PER_FILE } from '../config/constants';

/**
 * Deduplicates and limits symbols
 */
export class SymbolDeduplicator {
  deduplicate(symbols) {
    const unique = [...new Set(symbols)];
    return unique.slice(0, MAX_SYMBOLS_PER_FILE);
  }

  isValidSymbol(symbol) {
    return symbol && 
           typeof symbol === 'string' && 
           symbol.length > 0 && 
           symbol.length < 100 &&
           /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(symbol);
  }

  filter(symbols) {
    return symbols.filter(s => this.isValidSymbol(s));
  }
}
