import { DirectoryFormatter } from './formatters/DirectoryFormatter';
import { FileTypeFormatter } from './formatters/FileTypeFormatter';
import { SymbolFormatter } from './formatters/SymbolFormatter';
import { MAX_DIRS_IN_SUMMARY } from '../config/constants';

const LARGEST_FILES_COUNT = 5;

/**
 * Generates index summaries for AI system prompts.
 *
 * Includes:
 *  - File count + total LOC so the agent can gauge project size.
 *  - Project structure (directory tree sample).
 *  - File type breakdown.
 *  - Top-N symbols.
 *  - Largest files by LOC so the agent knows what the "big" files are
 *    without needing to read each one.
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

    const allFiles = this.indexStore.getAll();
    const fileCount = allFiles.length;
    const totalLOC = allFiles.reduce((sum, f) => sum + (f.lines || 0), 0);

    // Group files by directory
    const dirs = this.directoryFormatter.groupByDirectory(this.indexStore);
    const dirLines = this.directoryFormatter.format(dirs, MAX_DIRS_IN_SUMMARY);

    // Get file type breakdown
    const fileTypes = this.fileTypeFormatter.format(this.indexStore);

    // Get top symbols
    const symbols = this.symbolFormatter.format(this.indexStore);

    // Top-N largest files by line count
    const largest = [...allFiles]
      .filter((f) => f && typeof f.lines === 'number')
      .sort((a, b) => (b.lines || 0) - (a.lines || 0))
      .slice(0, LARGEST_FILES_COUNT)
      .map((f) => `${f.name || 'unknown'} (${f.lines}L)`)
      .join(' \u00b7 ');

    const lines = [
      `WORKSPACE INDEX: ${fileCount} files \u00b7 ${totalLOC.toLocaleString()} LOC`,
      '',
      'PROJECT STRUCTURE:',
      ...dirLines,
      '',
      'FILE TYPES: ' + fileTypes,
      '',
      'KEY SYMBOLS: ' + symbols,
    ];

    if (largest) {
      lines.push('', 'LARGEST FILES: ' + largest);
    }

    return lines.join('\n');
  }
}
