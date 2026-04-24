/**
 * JavaScript/TypeScript symbol extraction patterns
 * Enhanced to capture actual function/class names, not generic words
 */
export const javascriptPatterns = [
  // Function declarations
  /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
  
  // Arrow functions and function expressions (const/let/var)
  /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function\s*\(|\([^)]*\)\s*=>)/gm,
  
  // Class declarations
  /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
  
  // Method definitions in classes (avoid generic words)
  /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/gm,
  
  // Export statements
  /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
  
  // Named exports (extract individual names)
  /export\s*\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\s*,\s*[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\}/gm,
  
  // React components (function components)
  /(?:export\s+)?(?:default\s+)?function\s+([A-Z][a-zA-Z0-9_$]*)\s*\(/gm,
  
  // React components (arrow function)
  /(?:export\s+)?const\s+([A-Z][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/gm,
  
  // TypeScript interfaces and types
  /(?:export\s+)?(?:interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
  
  // TypeScript enums
  /(?:export\s+)?enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
];
