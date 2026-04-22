import { BATCH_SIZE } from '../config/constants';

/**
 * Core indexing engine - handles batch processing and orchestration
 */
export class IndexingEngine {
  constructor(stateManager, indexStore, fileCollector, fileReader) {
    this.stateManager = stateManager;
    this.indexStore = indexStore;
    this.fileCollector = fileCollector;
    this.fileReader = fileReader;
    this.aborted = false;
  }

  async startIndexing(workspacePath) {
    if (!this.stateManager.enabled) {
      console.log('[Indexer] Indexing is disabled');
      return;
    }

    if (this.stateManager.status === 'indexing') {
      this.abort();
    }

    console.log('[Indexer] Starting indexing for:', workspacePath);
    this.aborted = false;
    this.stateManager.setWorkspacePath(workspacePath);
    this.indexStore.clear();
    this.stateManager.setStatus('indexing');
    this.stateManager.setProgress(0);
    this.stateManager.setIndexedFiles(0);

    try {
      // Collect all file paths recursively
      console.log('[Indexer] Collecting files...');
      const allFiles = await this.fileCollector.collectFiles(workspacePath);
      
      if (this.aborted) {
        this.stateManager.setStatus('aborted');
        return;
      }

      this.stateManager.setTotalFiles(allFiles.length);
      console.log('[Indexer] Found', allFiles.length, 'files to index');

      // Index in batches to not block UI
      for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        if (this.aborted) {
          this.stateManager.setStatus('aborted');
          return;
        }

        const batch = allFiles.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(f => this.fileReader.indexFile(f, workspacePath, this.indexStore)));
        
        this.stateManager.setIndexedFiles(Math.min(i + BATCH_SIZE, allFiles.length));
        
        // Yield to UI
        await new Promise(r => setTimeout(r, 0));
      }

      this.stateManager.setStatus('ready');
      this.stateManager.setProgress(100);
      console.log('[Indexer] Indexing complete!', this.indexStore.getCount(), 'files indexed');
      
    } catch (e) {
      console.error('[Indexer] Error:', e);
      this.stateManager.setStatus('error');
    }
  }

  abort() {
    this.aborted = true;
    this.stateManager.setStatus('aborted');
  }

  isAborted() {
    return this.aborted;
  }
}
