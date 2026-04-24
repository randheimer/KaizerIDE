/**
 * Common symbol extraction patterns for multiple languages
 * Enhanced to capture actual function definitions, not documentation words
 */
export const commonPatterns = [
  // Lua functions (local and global)
  /(?:local\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Rust functions (pub/pub(crate)/private)
  /(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Go functions (exported and unexported)
  /func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
  
  // C/C++ function definitions (return type + name + parenthesis)
  // Matches: NTSTATUS HvInitializeVmx(VOID), static void init(), etc.
  /^(?:static\s+|inline\s+|extern\s+|FORCEINLINE\s+)*(?:NTSTATUS|BOOLEAN|VOID|void|int|char|float|double|bool|auto|unsigned|signed|long|short|UINT8|UINT16|UINT32|UINT64|SIZE_T|PVOID|PCHAR)\s+(?:\*\s*)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
  
  // C/C++ function pointers and typedefs
  /typedef\s+(?:struct\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // C/C++ struct/enum definitions
  /(?:typedef\s+)?(?:struct|enum|union)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // C/C++ macros (important for hypervisor code)
  /#define\s+([A-Z_][A-Z0-9_]*)/gm,
  
  // Java/C# methods (with visibility modifiers)
  /(?:public|private|protected|internal|static|virtual|override|async)\s+(?:static\s+)?(?:async\s+)?(?:void|int|string|bool|var|Task|NTSTATUS|BOOLEAN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
  
  // Assembly labels and procedures (for .asm files)
  /^([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:PROC|proc|:)/gm,
  
  // Assembly exported symbols
  /(?:PUBLIC|public|EXPORT|export)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
];
