/**
 * IndexedFile type definition and factory
 * 
 * Represents a file in the workspace index with metadata and symbols
 */

/**
 * IndexedFile shape:
 * {
 *   path: string,           // Absolute file path
 *   name: string,           // File name
 *   dir: string,            // Relative directory from workspace root
 *   ext: string,            // File extension (e.g., '.js')
 *   size: number,           // File size in bytes
 *   lines: number,          // Number of lines
 *   preview: string,        // First 50 lines of content
 *   symbols: string[],      // Extracted function/class names
 *   indexed: number,        // Timestamp when indexed
 * }
 */

/**
 * Creates a new IndexedFile object
 */
export function createIndexedFile({
  path,
  name,
  dir,
  ext,
  size,
  lines,
  preview,
  symbols,
  indexed
}) {
  return {
    path: path || '',
    name: name || 'unknown',
    dir: dir || '.',
    ext: ext || '',
    size: size || 0,
    lines: lines || 0,
    preview: preview || '',
    symbols: symbols || [],
    indexed: indexed || Date.now()
  };
}

/**
 * Validates an IndexedFile object
 */
export function isValidIndexedFile(file) {
  return (
    file &&
    typeof file === 'object' &&
    typeof file.path === 'string' &&
    typeof file.name === 'string' &&
    typeof file.dir === 'string' &&
    typeof file.ext === 'string' &&
    typeof file.size === 'number' &&
    typeof file.lines === 'number' &&
    typeof file.preview === 'string' &&
    Array.isArray(file.symbols) &&
    typeof file.indexed === 'number'
  );
}
