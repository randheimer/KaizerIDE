/**
 * Lua/Luau symbol extraction patterns
 * Captures functions (global, local, method-style), tables, and module patterns
 */
export const luaPatterns = [
  // Global function declarations
  /function\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/gm,

  // Local function declarations
  /local\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,

  // Method-style function declarations (e.g., function MyClass:method())
  /function\s+([a-zA-Z_][a-zA-Z0-9_.]*):([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,

  // Variable-style function assignments (e.g., local x = function())
  /local\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*function\s*\(/gm,

  // Table field function assignments (e.g., function M.init())
  /function\s+([A-Z][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,

  // Module return pattern (return M or return {})
  /return\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/gm,

  // Luau type annotations (type exports)
  /export\s+type\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Local variable tables (common module pattern)
  /local\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*\{/gm,
];
