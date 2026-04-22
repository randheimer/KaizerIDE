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

  // Search methods
  search(query, limit = 10) {
    return this.searchEngine.search(query, limit);
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
