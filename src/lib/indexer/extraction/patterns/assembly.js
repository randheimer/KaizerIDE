/**
 * Assembly (x86/x64) symbol extraction patterns
 * For .asm, .s, .S files
 */
export const assemblyPatterns = [
  // MASM/NASM procedure definitions
  /^([a-zA-Z_][a-zA-Z0-9_]*)\s+PROC/gm,
  /^([a-zA-Z_][a-zA-Z0-9_]*)\s+proc/gm,
  
  // Labels (global entry points)
  /^([a-zA-Z_][a-zA-Z0-9_]*):/gm,
  
  // PUBLIC/EXPORT declarations
  /(?:PUBLIC|public)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  /(?:EXPORT|export)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // EXTERN declarations (imported symbols)
  /(?:EXTERN|extern)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // GAS syntax (.globl, .global)
  /\.(?:globl|global)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,
  
  // Macro definitions
  /^([a-zA-Z_][a-zA-Z0-9_]*)\s+MACRO/gm,
  /^([a-zA-Z_][a-zA-Z0-9_]*)\s+macro/gm,
  
  // EQU constants
  /^([A-Z_][A-Z0-9_]*)\s+EQU/gm,
];
