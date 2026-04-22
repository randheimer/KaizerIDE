/**
 * Python symbol extraction patterns
 */
export const pythonPatterns = [
  // Function definitions
  /def\s+(\w+)/gm,
  
  // Class definitions
  /class\s+(\w+)/gm,
  
  // Async function definitions
  /async\s+def\s+(\w+)/gm,
];
