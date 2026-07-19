import { javascriptPatterns } from './javascript';
import { pythonPatterns } from './python';
import { commonPatterns } from './common';
import { cPatterns } from './c';
import { assemblyPatterns } from './assembly';
import { rustPatterns } from './rust';
import { goPatterns } from './go';
import { javaPatterns } from './java';
import { luaPatterns } from './lua';

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
  
  // Lua (language-specific patterns)
  '.lua': luaPatterns,
  '.luau': luaPatterns,
  
  // Rust (language-specific patterns)
  '.rs': rustPatterns,
  
  // Go (language-specific patterns)
  '.go': goPatterns,
  
  // Java/C#/Kotlin (language-specific patterns)
  '.java': javaPatterns,
  '.cs': javaPatterns,
  '.kt': javaPatterns,
  '.scala': javaPatterns,
};

/**
 * Get patterns for a specific file extension
 */
export function getPatternsForExtension(ext) {
  return patternRegistry[ext] || commonPatterns;
}
