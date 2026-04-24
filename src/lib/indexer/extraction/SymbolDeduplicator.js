import { MAX_SYMBOLS_PER_FILE } from '../config/constants';

/**
 * Common documentation/generic words to filter out
 */
const GENERIC_WORDS = new Set([
  'prototype', 'prototypes', 'constructor', 'destructor',
  'has', 'does', 'runs', 'calls', 'gets', 'sets',
  'docs', 'doc', 'documentation', 'comment', 'comments',
  'test', 'tests', 'example', 'examples', 'sample',
  'todo', 'fixme', 'hack', 'note', 'warning',
  'param', 'params', 'return', 'returns', 'throws',
  'brief', 'description', 'summary', 'details',
  'see', 'also', 'since', 'version', 'author',
  'deprecated', 'internal', 'private', 'public',
  'true', 'false', 'null', 'undefined', 'void',
  'this', 'self', 'super', 'class', 'function',
  'if', 'else', 'for', 'while', 'switch', 'case',
  'break', 'continue', 'return', 'throw', 'try', 'catch',
]);

/**
 * Deduplicates and limits symbols.
 *
 * Accepts either legacy string symbols (`"foo"`) or the new object shape
 * (`{ name: 'foo', line: 12 }`). Dedup is by name; the earliest line wins.
 */
export class SymbolDeduplicator {
  deduplicate(symbols) {
    const seen = new Map();
    for (const s of symbols) {
      const name = typeof s === 'string' ? s : s && s.name;
      if (!name) continue;
      if (!seen.has(name)) {
        seen.set(name, typeof s === 'string' ? { name, line: 0 } : s);
      }
    }
    return Array.from(seen.values()).slice(0, MAX_SYMBOLS_PER_FILE);
  }

  isValidSymbol(symbol) {
    const name = typeof symbol === 'string' ? symbol : symbol && symbol.name;
    
    if (!name || typeof name !== 'string') return false;
    
    // Length checks
    if (name.length < 2 || name.length > 100) return false;
    
    // Must be valid identifier
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return false;
    
    // Filter out generic documentation words
    const lowerName = name.toLowerCase();
    if (GENERIC_WORDS.has(lowerName)) return false;
    
    // Filter out single-letter or two-letter generic names (i, j, x, y, id, etc.)
    if (name.length <= 2 && /^[a-z]+$/.test(name)) return false;
    
    // Filter out names that are all underscores
    if (/^_+$/.test(name)) return false;
    
    return true;
  }

  filter(symbols) {
    return symbols.filter((s) => this.isValidSymbol(s));
  }
}
