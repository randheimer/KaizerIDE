import { MAX_SYMBOLS_IN_SUMMARY } from '../../config/constants';

/**
 * Formats symbol lists for display
 */
export class SymbolFormatter {
  format(indexStore, maxSymbols = MAX_SYMBOLS_IN_SUMMARY) {
    const allSymbols = [...new Set(
      indexStore
        .getAll()
        .flatMap(f => (f && f.symbols) ? f.symbols : [])
    )];

    return allSymbols.slice(0, maxSymbols).join(', ');
  }
}
