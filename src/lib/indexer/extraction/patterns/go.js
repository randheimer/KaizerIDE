/**
 * Go symbol extraction patterns
 * Captures functions, types, interfaces, structs, methods, and constants
 */
export const goPatterns = [
  // Function declarations (with or without receiver)
  /func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,

  // Type declarations (struct, interface, or alias)
  /type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:struct|interface|[a-zA-Z_])/gm,

  // Struct type definitions
  /type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+struct\s*\{/gm,

  // Interface type definitions
  /type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+interface\s*\{/gm,

  // Const declarations (single and grouped)
  /(?:const\s+)(?:\(\s*)?([a-zA-Z_][a-zA-Z0-9_]*)\s/gm,

  // Var declarations (package-level)
  /(?:var\s+)(?:\(\s*)?([a-zA-Z_][a-zA-Z0-9_]*)\s/gm,

  // Method declarations with receiver (more specific)
  /func\s+\((?:[a-zA-Z_][a-zA-Z0-9_]*\s+\*?)([a-zA-Z_][a-zA-Z0-9_]*)\)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
];
