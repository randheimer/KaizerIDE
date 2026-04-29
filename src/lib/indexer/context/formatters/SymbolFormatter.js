/**
 * Formats symbol lists for display in the workspace summary.
 * Shows top symbols by frequency (how many files reference them)
 * instead of dumping all unique names — much more compact and useful.
 */
export class SymbolFormatter {
  format(indexStore, maxSymbols = 10) {
    const counts = new Map();
    for (const f of indexStore.getAll()) {
      if (!f || !f.symbols) continue;
      for (const s of f.symbols) {
        const name = typeof s === 'string' ? s : s && s.name;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    // Sort by frequency, take top N
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxSymbols)
      .map(([name, count]) => `${name}(${count})`)
      .join(', ');
  }
}
