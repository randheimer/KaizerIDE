/**
 * Parses and tokenizes search queries
 */
export class QueryParser {
  parse(query) {
    if (!query || typeof query !== 'string') {
      return { original: '', normalized: '', words: [] };
    }

    const normalized = query.toLowerCase().trim();
    const words = normalized
      .split(/\s+/)
      .filter(w => w.length > 1); // Keep 2-char words (go, db, ui, os, fn)

    return {
      original: query,
      normalized,
      words
    };
  }
}
