/**
 * Rust symbol extraction patterns
 * Captures functions, structs, enums, traits, impls, type aliases, and modules
 */
export const rustPatterns = [
  // Functions (pub, pub(crate), async, unsafe, const, extern)
  /(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Struct definitions
  /(?:pub(?:\([^)]*\))?\s+)?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Enum definitions
  /(?:pub(?:\([^)]*\))?\s+)?enum\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Trait definitions
  /(?:pub(?:\([^)]*\))?\s+)?trait\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Impl blocks (impl TypeName or impl Trait for Type)
  /impl(?:<[^>]*>)?\s+(?:([a-zA-Z_][a-zA-Z0-9_]*)\s+for\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Type aliases
  /(?:pub(?:\([^)]*\))?\s+)?type\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Module declarations
  /(?:pub(?:\([^)]*\))?\s+)?mod\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Static/const declarations
  /(?:pub(?:\([^)]*\))?\s+)?(?:static|const)\s+(?:mut\s+)?([A-Z_][A-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Macro definitions (macro_rules!)
  /macro_rules!\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Use declarations with aliases
  /use\s+(?:[a-zA-Z_][a-zA-Z0-9_:]*::)*([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
];
