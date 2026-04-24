/**
 * C/C++ symbol extraction patterns
 * Enhanced for systems programming, hypervisors, and kernel code
 */
export const cPatterns = [
  // Function definitions with various return types
  // Matches: NTSTATUS HvInitializeVmx(VOID), static void init(), etc.
  /^(?:static\s+|inline\s+|extern\s+|FORCEINLINE\s+|__forceinline\s+|__inline\s+)*(?:NTSTATUS|BOOLEAN|VOID|void|int|char|float|double|bool|auto|unsigned|signed|long|short|UINT8|UINT16|UINT32|UINT64|INT8|INT16|INT32|INT64|SIZE_T|SSIZE_T|PVOID|PCHAR|PUCHAR|PSTR|PWSTR|HANDLE|DWORD|QWORD|ULONG|ULONGLONG|LARGE_INTEGER)\s+(?:\*\s*)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,
  
  // Function pointers in typedefs
  /typedef\s+\w+\s*\(\s*\*\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/gm,
  
  // Struct definitions
  /typedef\s+struct\s+(?:_)?([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  /struct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gm,
  
  // Enum definitions
  /typedef\s+enum\s+(?:_)?([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  /enum\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gm,
  
  // Union definitions
  /typedef\s+union\s+(?:_)?([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  /union\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gm,
  
  // Macro definitions (constants and function-like macros)
  /#define\s+([A-Z_][A-Z0-9_]*)/gm,
  
  // Global variables
  /^(?:static\s+|extern\s+)?(?:const\s+)?(?:volatile\s+)?(?:PVOID|ULONG|UINT64|SIZE_T|BOOLEAN)\s+([a-z_][a-z0-9_]*)\s*[=;]/gm,
  
  // Windows driver entry points
  /DRIVER_(?:INITIALIZE|UNLOAD|ADD_DEVICE|DISPATCH)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Callback function declarations
  /(?:CALLBACK|WINAPI|NTAPI|FASTCALL|STDCALL)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // C++ class definitions
  /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // C++ namespace definitions
  /namespace\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // C++ template definitions
  /template\s*<[^>]*>\s*(?:class|struct)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
];
