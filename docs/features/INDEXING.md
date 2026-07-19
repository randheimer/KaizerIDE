# 🔍 Workspace Indexing System

> **Fast, intelligent code navigation powered by real-time indexing**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Why Indexing?](#why-indexing)
- [How It Works](#how-it-works)
- [Supported Languages](#supported-languages)
- [AI Integration](#ai-integration)
- [Performance](#performance)
- [Configuration](#configuration)
- [Privacy & Security](#privacy--security)
- [Troubleshooting](#troubleshooting)

---

## Overview

KaizerIDE includes a powerful workspace indexing system that builds a searchable in-memory database of your entire codebase. This enables the AI assistant to instantly find files, symbols, and code without repeatedly reading every file.

---

## Why Indexing?

### ❌ Without Indexing
- AI must read files on-demand (slow)
- Repeated file reads for similar queries
- Higher latency for code navigation
- More API calls and processing time

### ✅ With Indexing
- ⚡ Instant file and symbol lookups
- 🔎 Fast fuzzy search across codebase
- 🔄 Real-time updates on file changes
- 🧠 AI has full context awareness
- 🔒 100% local (no data leaves your machine)

---

## How It Works

### 1️⃣ Initial Indexing

When you open a workspace, KaizerIDE:

1. **Checks Cache** - Looks for a cached index in localStorage (valid for 1 hour)
2. **Loads or Builds** - Either loads from cache (instant) or starts fresh indexing
3. **Walks Directory** - Recursively scans your workspace
4. **Filters Files** - Only indexes supported file types
5. **Extracts Symbols** - Finds functions, classes, methods, structs, defines
6. **Stores Preview** - Keeps first ~50 lines of each file for quick context
7. **Saves Cache** - Stores index in localStorage for next session

### 2️⃣ What Gets Indexed

For each file, the system stores:

| Data | Description |
|------|-------------|
| **Path** | Relative path from workspace root |
| **Extension** | File type (`.js`, `.py`, `.lua`, etc.) |
| **Line Count** | Total lines in file |
| **Symbols** | Functions, classes, methods with line numbers |
| **Preview** | First ~50 lines of code |
| **Headings** | Markdown headings (for documentation) |

### 3️⃣ Real-Time Updates

The **FileWatcher** monitors your workspace for changes:

- ✅ **File Created** → Automatically indexed
- 🔄 **File Modified** → Re-indexed incrementally
- ❌ **File Deleted** → Removed from index
- ⏱️ **Debounced** → Changes batched (300ms) to avoid thrashing

### 4️⃣ Search Capabilities

#### 🔍 Fuzzy Search (`search_index`)
Searches across:
- Filenames and paths
- Symbol names (functions, classes, etc.)
- Code content (preview)

Returns ranked results with code snippets showing context.

#### 📝 Line-Level Search (`grep_index`)
Fast text search:
- Case-insensitive literal matching
- Returns file path, line number, and content
- Results grouped by file

---

## Supported Languages

The indexer extracts symbols from:

### 🟨 JavaScript/TypeScript
- Functions, classes, methods
- Arrow functions, async functions
- Exports and imports

### 🐍 Python
- Functions, classes, methods
- Decorators and properties

### 🔵 C/C++
- Functions, structs, typedefs
- Defines, macros, enums

### 🐹 Go
- Functions, types, methods
- Interfaces and structs

### 🦀 Rust
- Functions, structs, impls
- Traits and enums

### 🌙 Lua ✨ NEW
- Global functions (`function name()`)
- Module functions (`function module.name()`)
- Local functions (`local function name()`)
- Table definitions (`table = {}`)

### 📄 Assembly
- Labels, procedures, macros

### 📝 Markdown
- Headings and structure

---

## AI Integration

The AI assistant uses indexing through specialized tools:

### `search_index`
**Find files by name, symbol, or content**

```
User: "Find the authentication function"
AI: Searches index for "authentication"
→ Returns: auth.js, login.ts, etc. with snippets
```

### `grep_index`
**Fast line-level text search**

```
User: "Where is API_KEY used?"
AI: Searches all indexed files
→ Returns: config.js:12, api.js:45, etc.
```

### `get_file_outline`
**Get structured outline of a file**

```
User: "Show me the structure of App.jsx"
AI: Returns all functions, classes, exports
→ function App (line 15)
→ function handleClick (line 42)
```

### `get_symbol_definition`
**Locate where a symbol is defined**

```
User: "Find the User class definition"
AI: Searches symbols in index
→ Returns: models/User.js:15 with context
```

### `find_references`
**Find all usages of a symbol**

```
User: "Where is validateEmail called?"
AI: Searches index for references
→ Returns all files and lines using it
```

---

## Performance

### ⚡ Typical Workspace (1000 files)

| Metric | Value |
|--------|-------|
| **Indexing Time** | 2-5 seconds |
| **Memory Usage** | 5-10 MB |
| **Cache Size** | 2-5 MB in localStorage |
| **Cache Duration** | 1 hour |

### 🚀 Optimizations

- **Batch Processing** - 50 files at a time, yields to UI
- **Smart Caching** - Saves index for 1 hour
- **Incremental Updates** - Only re-indexes changed files
- **Preview Limits** - Only first 50 lines stored per file
- **Ignore Patterns** - Skips node_modules, .git, dist, etc.

---

## Configuration

### Enable/Disable Indexing

1. Open **Settings** (`Ctrl+,`)
2. Go to **Indexer** tab
3. Toggle "Enable workspace indexing"

When disabled, the AI uses on-demand file reading instead.

### What Gets Ignored

By default, the indexer skips:

```
node_modules/
.git/
dist/, build/, release/
__pycache__/
.vscode/, .idea/
Files matching .gitignore patterns
```

### Supported File Extensions

| Language | Extensions |
|----------|-----------|
| **JavaScript/TypeScript** | `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs` |
| **Python** | `.py` |
| **C/C++** | `.c`, `.h`, `.cpp`, `.hpp`, `.cc`, `.cxx` |
| **Go** | `.go` |
| **Rust** | `.rs` |
| **Lua** | `.lua` |
| **Assembly** | `.asm`, `.s` |
| **Markdown** | `.md` |
| **Config** | `.json`, `.yaml`, `.yml`, `.toml` |

---

## Privacy & Security

🔒 **Your code stays on your machine**

- ✅ **100% Local** - All indexing happens on your machine
- ✅ **No Cloud** - Index never leaves your computer
- ✅ **No Telemetry** - No data sent to external servers
- ✅ **localStorage Only** - Cache stored in browser storage
- ✅ **User Control** - Can be disabled anytime

---

## Troubleshooting

### ❓ Index Not Loading

1. Check if indexing is enabled in Settings
2. Try clearing the cache: Settings → Indexer → Clear Index
3. Restart the application

### 🐌 Slow Indexing

- Large workspaces (10,000+ files) may take longer
- Check if you're indexing unnecessary directories
- Consider adding patterns to `.gitignore`

### 🔍 Missing Symbols

- Ensure file extension is supported
- Check if file is in an ignored directory
- Try re-indexing: Settings → Indexer → Re-index Workspace

### 💾 High Memory Usage

- Index size scales with workspace size
- Consider excluding large generated directories
- Clear cache if not actively using indexing

---

## Architecture

## Architecture

The indexing system is modular with 7 subsystems:

| Subsystem | Components | Purpose |
|-----------|------------|---------|
| **1. Core** | StateManager, IndexStore, IndexingEngine | Central coordination and state |
| **2. Filesystem** | FileCollector, FileReader | File discovery and reading |
| **3. Extraction** | SymbolExtractor, HeadingExtractor | Parse and extract symbols |
| **4. Search** | SearchEngine, Scorer, Ranker | Fast fuzzy and exact search |
| **5. Persistence** | LocalStorageAdapter, CacheValidator | Cache management |
| **6. Observer** | FileWatcher, IndexerEvents | Real-time file monitoring |
| **7. Context** | SummaryGenerator, ContextBuilder | AI context generation |

For technical details, see the source code in `src/lib/indexer/`.

---

## Future Enhancements

Planned improvements:

- 🔮 Semantic search using embeddings
- 🔗 Cross-file reference tracking
- 📊 Call hierarchy visualization
- ✏️ Symbol rename refactoring
- 📦 Import/export analysis
- 🕸️ Dependency graph generation

---

## Quick Reference

### Common Commands

| Action | How To |
|--------|--------|
| **Enable indexing** | Settings → Indexer → Toggle on |
| **Clear cache** | Settings → Indexer → Clear Index |
| **Re-index workspace** | Settings → Indexer → Re-index |
| **Check index status** | Look at status bar (bottom right) |

### AI Tool Usage

| Tool | When to Use |
|------|-------------|
| `search_index` | Find files/symbols by name or content |
| `grep_index` | Search for exact text across files |
| `get_file_outline` | Get structure of a specific file |
| `get_symbol_definition` | Find where a symbol is defined |

---

**Need Help?** Check out the [main documentation](../README.md) or open an issue on [GitHub](https://github.com/randheimer/KaizerIDE).

---

*Last updated: April 2026 • Added Lua support*
