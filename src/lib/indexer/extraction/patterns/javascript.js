/**
 * JavaScript/TypeScript symbol extraction patterns
 */
export const javascriptPatterns = [
  // Function declarations
  /function\s+(\w+)/gm,
  
  // Arrow functions and function expressions
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/gm,
  
  // Class declarations
  /class\s+(\w+)/gm,
  
  // Method definitions
  /(\w+)\s*\([^)]*\)\s*{/gm,
  
  // Export statements
  /export\s+(?:default\s+)?(?:function|class|const|let)\s+(\w+)/gm,
  
  // Named exports
  /export\s*{\s*([^}]+)\s*}/gm,
];
