import { StateManager } from './core/StateManager';
import { IndexStore } from './core/IndexStore';
import { IndexingEngine } from './core/IndexingEngine';
import { FileCollector } from './filesystem/FileCollector';
import { FileReader } from './filesystem/FileReader';
import { SearchEngine } from './search/SearchEngine';
import { SummaryGenerator } from './context/SummaryGenerator';
import { ContextBuilder } from './context/ContextBuilder';
import { LocalStorageAdapter } from './persistence/LocalStorageAdapter';
import { IndexerEvents } from './observers/IndexerEvents';
import { FileWatcher } from './observers/FileWatcher';

/**
 * WorkspaceIndexer - Main orchestrator class
 * Delegates to specialized subsystems for each responsibility
 */
export class WorkspaceIndexer {
  constructor() {
    // Core subsystems
    this.stateManager = new StateManager();
    this.indexStore = new IndexStore();
    this.events = new IndexerEvents();
    
    // Filesystem subsystem
    this.fileReader = new FileReader();
    this.fileCollector = new FileCollector();
    
    // Indexing engine
    this.indexingEngine = new IndexingEngine(
      this.stateManager,
      this.indexStore,
      this.fileCollector,
      this.fileReader
    );
    
    // Pass engine reference to collector for abort checks
    this.fileCollector.indexingEngine = this.indexingEngine;
    
    // Search subsystem
    this.searchEngine = new SearchEngine(this.indexStore);
    
    // Context subsystem
    this.summaryGenerator = new SummaryGenerator(this.indexStore);
    this.contextBuilder = new ContextBuilder(this.searchEngine);
    
    // Persistence subsystem
    this.storage = new LocalStorageAdapter();
    
    // File watcher for real-time updates
    this.fileWatcher = new FileWatcher(this);
    this.fileWatcher.start();
  }

  // Getters for backward compatibility
  get index() {
    return this.indexStore.getAll();
  }

  get status() {
    return this.stateManager.status;
  }

  get progress() {
    return this.stateManager.progress;
  }

  get totalFiles() {
    return this.stateManager.totalFiles;
  }

  get indexedFiles() {
    return this.stateManager.indexedFiles;
  }

  get enabled() {
    return this.stateManager.enabled;
  }

  get workspacePath() {
    return this.stateManager.workspacePath;
  }

  // Observer pattern methods
  subscribe(fn) {
    return this.events.subscribe(fn);
  }

  notify() {
    this.events.emitStateChange(this.stateManager, this.indexStore);
  }

  // Enable/disable
  setEnabled(val) {
    this.stateManager.setEnabled(val);
    this.notify();
  }

  // Indexing methods
  async startIndexing(workspacePath) {
    await this.indexingEngine.startIndexing(workspacePath);
    await this.storage.save(workspacePath, this.indexStore.getAll());
    this.notify();
  }

  abort() {
    this.indexingEngine.abort();
    this.notify();
  }

  async reindex(workspacePath) {
    this.indexStore.clear();
    await this.startIndexing(workspacePath);
  }

  /**
   * Re-index a single file (incremental update)
   * @param {string} filePath - Absolute path to the file
   */
  async reindexFile(filePath) {
    if (!this.stateManager.enabled) {
      console.log('[WorkspaceIndexer] Indexing disabled, skipping file re-index');
      return;
    }

    if (!this.stateManager.workspacePath) {
      console.log('[WorkspaceIndexer] No workspace path set');
      return;
    }

    console.log('[WorkspaceIndexer] Re-indexing single file:', filePath);

    try {
      // Index the single file
      await this.indexingEngine.indexSingleFile(filePath, this.stateManager.workspacePath);
      
      // Save updated index to storage
      await this.storage.save(this.stateManager.workspacePath, this.indexStore.getAll());
      
      // Notify subscribers
      this.notify();
      
      console.log('[WorkspaceIndexer] File re-indexed successfully');
    } catch (error) {
      console.error('[WorkspaceIndexer] Error re-indexing file:', error);
    }
  }

  // Search methods
  search(query, limit = 10) {
    return this.searchEngine.search(query, limit);
  }

  /**
   * Line-level grep over the cached file previews (first ~50 lines per file).
   * Much faster than shelling out to search_files for queries the AI wants to
   * run across the whole workspace. Only searches what's already in memory.
   *
   * @param {string} query - literal text to find (case-insensitive)
   * @param {number} limit - max matches to return
   * @returns {Array<{path:string, line:number, content:string}>}
   */
  grep(query, limit = 30) {
    if (!query || typeof query !== 'string') return [];
    const needle = query.toLowerCase();
    const out = [];

    for (const f of this.indexStore.getAll()) {
      if (!f || !f.preview) continue;
      const lines = f.preview.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          out.push({
            path: f.path,
            line: i + 1,
            content: lines[i].trim().slice(0, 200),
          });
          if (out.length >= limit) return out;
        }
      }
    }
    return out;
  }

  /**
   * Aggregate stats used by the summary generator and any future status UI.
   */
  getStats() {
    const files = this.indexStore.getAll();
    let totalLOC = 0;
    const languages = {};
    for (const f of files) {
      totalLOC += f.lines || 0;
      const key = (f.ext || '').replace(/^\./, '') || 'other';
      languages[key] = (languages[key] || 0) + 1;
    }
    return {
      fileCount: files.length,
      totalLOC,
      languages,
    };
  }

  // Context methods
  getIndexSummary() {
    return this.summaryGenerator.generate();
  }

  getRelevantContext(query) {
    return this.contextBuilder.build(query);
  }

  // Persistence methods
  async loadFromStorage(workspacePath) {
    const result = await this.storage.load(workspacePath);
    
    if (result.success && result.data) {
      this.indexStore.setAll(result.data.meta);
      this.stateManager.setWorkspacePath(workspacePath);
      this.stateManager.setTotalFiles(result.data.meta.length);
      this.stateManager.setIndexedFiles(result.data.meta.length);
      this.stateManager.setProgress(100);
      this.stateManager.setStatus('ready');
      this.notify();
      return true;
    }
    
    return false;
  }

  async saveToStorage() {
    if (this.stateManager.workspacePath) {
      await this.storage.save(this.stateManager.workspacePath, this.indexStore.getAll());
    }
  }

  async clearStorage() {
    await this.storage.clear();
  }
}
