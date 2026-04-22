import { DirectoryFormatter } from './formatters/DirectoryFormatter';
import { FileTypeFormatter } from './formatters/FileTypeFormatter';
import { SymbolFormatter } from './formatters/SymbolFormatter';
import { MAX_DIRS_IN_SUMMARY } from '../config/constants';

/**
 * Generates index summaries for AI system prompts
 */
export class SummaryGenerator {
  constructor(indexStore) {
    this.indexStore = indexStore;
    this.directoryFormatter = new DirectoryFormatter();
    this.fileTypeFormatter = new FileTypeFormatter();
    this.symbolFormatter = new SymbolFormatter();
  }

  generate() {
    if (this.indexStore.getCount() === 0) {
      return null;
    }

    // Group files by directory
    const dirs = this.directoryFormatter.groupByDirectory(this.indexStore);
    const dirLines = this.directoryFormatter.format(dirs, MAX_DIRS_IN_SUMMARY);

    // Get file type breakdown
    const fileTypes = this.fileTypeFormatter.format(this.indexStore);

    // Get top symbols
    const symbols = this.symbolFormatter.format(this.indexStore);

    const lines = [
      `WORKSPACE INDEX (${this.indexStore.getCount()} files indexed):`,
      '',
      'PROJECT STRUCTURE:',
      ...dirLines,
      '',
      'FILE TYPES: ' + fileTypes,
      '',
      'KEY SYMBOLS: ' + symbols,
    ];

    return lines.join('\n');
  }
}
