import { WorkspaceIndexer } from './WorkspaceIndexer';

/**
 * Singleton instance of WorkspaceIndexer
 * Exported for backward compatibility with existing code
 */
export const indexer = new WorkspaceIndexer();

/**
 * Export WorkspaceIndexer class for advanced usage
 */
export { WorkspaceIndexer };
