/**
 * Common symbol extraction patterns for multiple languages
 */
export const commonPatterns = [
  // Lua functions
  /function\s+(\w+)/gm,
  
  // Rust functions
  /fn\s+(\w+)/gm,
  
  // Go functions
  /func\s+(\w+)/gm,
  
  // C/C++ functions
  /(?:void|int|char|float|double|bool|auto)\s+(\w+)\s*\(/gm,
  
  // Java/C# methods
  /(?:public|private|protected|static)?\s*(?:void|int|String|boolean|var)\s+(\w+)\s*\(/gm,
];
