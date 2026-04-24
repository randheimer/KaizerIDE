/**
 * Python symbol extraction patterns
 * Enhanced to capture actual function/class names with better precision
 */
export const pythonPatterns = [
  // Function definitions (def keyword)
  /def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Class definitions
  /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Async function definitions
  /async\s+def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Decorated functions (capture function name after decorator)
  /@\w+\s*\n\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Static methods and class methods
  /@(?:staticmethod|classmethod)\s*\n\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
];
