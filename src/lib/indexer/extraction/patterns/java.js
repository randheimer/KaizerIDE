/**
 * Java/C#/Kotlin symbol extraction patterns
 * Captures classes, interfaces, methods, enums, annotations, and fields
 */
export const javaPatterns = [
  // Class declarations (public, abstract, final, sealed, etc.)
  /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:abstract\s+)?(?:final\s+)?(?:sealed\s+)?(?:record\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Interface declarations
  /(?:public|private|protected|internal)?\s*(?:static\s+)?interface\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Enum declarations
  /(?:public|private|protected|internal)?\s*(?:static\s+)?enum\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Method declarations (with visibility and modifiers)
  /(?:public|private|protected|internal)\s+(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:abstract\s+)?(?:async\s+)?(?:synchronized\s+)?(?:final\s+)?(?:native\s+)?(?:void|int|long|float|double|boolean|char|byte|short|string|String|var|Task|IEnumerable|IList|List|Dictionary|Action|Func|object|dynamic)\s+(?:<[^>]*>\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,

  // Kotlin-specific: fun declarations
  /(?:public|private|protected|internal)?\s*(?:override\s+)?(?:suspend\s+)?fun\s+(?:<[^>]*>\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm,

  // Kotlin-specific: data class, object, companion object
  /(?:public|private|protected|internal)?\s*(?:data\s+)?(?:sealed\s+)?(?:abstract\s+)?(?:open\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // Annotation definitions (Java)
  /@interface\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm,

  // C# properties (auto-implemented or with body)
  /(?:public|private|protected|internal)\s+(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:readonly\s+)?(?:void|int|long|float|double|bool|string|var|object|dynamic|[A-Z][a-zA-Z0-9_]*(?:<[^>]*>)?(?:\[\])?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gm,

  // C# namespace / Java package declarations (for context)
  /(?:namespace|package)\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/gm,
];
