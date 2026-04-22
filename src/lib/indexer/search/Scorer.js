/**
 * Scores indexed files based on query relevance
 */
export class Scorer {
  score(file, query) {
    let score = 0;
    const { normalized, words } = query;

    // Filename match = high score
    if (file.name && file.name.toLowerCase().includes(normalized)) {
      score += 10;
    }

    // Symbol match = high score
    if (file.symbols && Array.isArray(file.symbols)) {
      file.symbols.forEach(s => {
        if (s && typeof s === 'string' && s.toLowerCase().includes(normalized)) {
          score += 5;
        }
      });
    }

    // Word matches in preview
    words.forEach(w => {
      if (file.preview && file.preview.toLowerCase().includes(w)) {
        score += 1;
      }
      if (file.dir && file.dir.toLowerCase().includes(w)) {
        score += 2;
      }
    });

    // Path match
    if (file.path && file.path.toLowerCase().includes(normalized)) {
      score += 3;
    }

    return score;
  }
}
