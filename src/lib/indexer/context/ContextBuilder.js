/**
 * Builds relevant context for specific queries
 */
export class ContextBuilder {
  constructor(searchEngine) {
    this.searchEngine = searchEngine;
  }

  build(query) {
    const results = this.searchEngine.search(query, 5);
    
    if (results.length === 0) {
      return null;
    }

    const lines = results.map(f =>
      `• ${f.path || 'unknown'} (${f.lines || 0} lines) — symbols: ${
        (f.symbols && f.symbols.length > 0) 
          ? f.symbols.slice(0, 5).join(', ') 
          : 'none'
      }`
    );

    return 'RELEVANT FILES FROM INDEX:\n' + lines.join('\n');
  }
}
