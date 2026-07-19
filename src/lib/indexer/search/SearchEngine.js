import { QueryParser } from './QueryParser';
import { Scorer } from './Scorer';
import { Ranker } from './Ranker';

/**
 * Main search engine coordinator
 */
export class SearchEngine {
  constructor(indexStore) {
    this.indexStore = indexStore;
    this.queryParser = new QueryParser();
    this.scorer = new Scorer();
    this.ranker = new Ranker();
  }

  search(query, limit = 10) {
    if (!query || this.indexStore.getCount() === 0) {
      return [];
    }

    // Parse query
    const parsedQuery = this.queryParser.parse(query);

    // Score all files
    const scoredResults = this.indexStore.map(file => ({
      file,
      score: this.scorer.score(file, parsedQuery)
    }));

    // Rank and limit results
    return this.ranker.rank(scoredResults, limit);
  }
}
