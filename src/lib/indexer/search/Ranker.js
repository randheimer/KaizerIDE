/**
 * Ranks and limits search results
 */
export class Ranker {
  rank(scoredResults, limit = 10) {
    return scoredResults
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.file);
  }
}
