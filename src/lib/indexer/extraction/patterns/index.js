import { javascriptPatterns } from './javascript';
import { pythonPatterns } from './python';
import { commonPatterns } from './common';

/**
 * Pattern registry for different file types
 */
export const patternRegistry = {
  // JavaScript/TypeScript
  '.js': javascriptPatterns,
  '.jsx': javascriptPatterns,
  '.ts': javascriptPatterns,
  '.tsx': javascriptPatterns,
  '.mjs': javascriptPatterns,
  '.cjs': javascriptPatterns,
  '.es6': javascriptPatterns,
  
  // Python
  '.py': pythonPatterns,
  '.pyw': pythonPatterns,
  '.pyx': pythonPatterns,
  '.pyi': pythonPatterns,
  
  // Lua
  '.lua': commonPatterns,
  '.luau': commonPatterns,
  
  // Rust
  '.rs': commonPatterns,
  
  // Go
  '.go': commonPatterns,
  
  // C/C++
  '.c': commonPatterns,
  '.cpp': commonPatterns,
  '.cc': commonPatterns,
  '.cxx': commonPatterns,
  '.h': commonPatterns,
  '.hpp': commonPatterns,
  
  // Java/C#
  '.java': commonPatterns,
  '.cs': commonPatterns,
  '.kt': commonPatterns,
  '.scala': commonPatterns,
};

/**
 * Get patterns for a specific file extension
 */
export function getPatternsForExtension(ext) {
  return patternRegistry[ext] || commonPatterns;
}
