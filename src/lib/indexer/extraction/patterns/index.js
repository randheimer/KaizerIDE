import { javascriptPatterns } from './javascript';
import { pythonPatterns } from './python';
import { commonPatterns } from './common';
import { cPatterns } from './c';
import { assemblyPatterns } from './assembly';

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
  
  // C/C++ (use specialized patterns)
  '.c': cPatterns,
  '.cpp': cPatterns,
  '.cc': cPatterns,
  '.cxx': cPatterns,
  '.h': cPatterns,
  '.hpp': cPatterns,
  '.hxx': cPatterns,
  '.hh': cPatterns,
  
  // Assembly
  '.asm': assemblyPatterns,
  '.s': assemblyPatterns,
  '.S': assemblyPatterns,
  
  // Lua
  '.lua': commonPatterns,
  '.luau': commonPatterns,
  
  // Rust
  '.rs': commonPatterns,
  
  // Go
  '.go': commonPatterns,
  
  // Java/C#/Kotlin
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
