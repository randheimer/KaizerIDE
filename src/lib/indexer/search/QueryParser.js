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
      .filter(w => w.length > 2); // Filter out very short words

    return {
      original: query,
      normalized,
      words
    };
  }
}
