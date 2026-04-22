/**
 * Configuration constants for the workspace indexer
 */

// Batch size for concurrent file indexing
export const BATCH_SIZE = 10;

// Maximum file size to index (500KB)
export const MAX_FILE_SIZE = 500 * 1024;

// Maximum directory depth for recursive traversal
export const MAX_DEPTH = 8;

// Maximum number of symbols to extract per file
export const MAX_SYMBOLS_PER_FILE = 50;

// Cache expiration time (1 hour in milliseconds)
export const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

// Maximum number of files to show in directory preview
export const MAX_FILES_IN_DIR_PREVIEW = 8;

// Maximum number of directories to show in index summary
export const MAX_DIRS_IN_SUMMARY = 15;

// Maximum number of symbols to show in index summary
export const MAX_SYMBOLS_IN_SUMMARY = 50;

// Storage key prefix for localStorage
export const STORAGE_KEY_PREFIX = 'kaizer-index-';

// Indexer enabled state key
export const INDEXER_ENABLED_KEY = 'kaizer-indexer-enabled';
