/**
 * Formats file type statistics for display
 */
export class FileTypeFormatter {
  format(indexStore) {
    const extCounts = {};
    
    indexStore.forEach(f => {
      if (!f || !f.ext) return;
      extCounts[f.ext] = (extCounts[f.ext] || 0) + 1;
    });

    return Object.entries(extCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([ext, count]) => `${ext}(${count})`)
      .join(', ');
  }
}
