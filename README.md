# KaizerIDE

Modern AI-powered desktop IDE built with Electron + React.

## Features

- **Monaco Editor** — full code editing with syntax highlighting, diff view, minimap, multi-tab
- **AI Chat** — integrated AI assistant with agent tools (file read/write, shell, search, git)
- **Workspace Search** — full-project search with match highlighting, case/word/regex toggles
- **Go to File** — fuzzy file finder (`Ctrl+P`) with keyboard navigation
- **Git Integration** — sidebar panel with branch switching, staging, commits, diff view, history
- **Terminal** — real PTY terminal via xterm.js + node-pty, ANSI colors, multi-tab, SSH support
- **File Explorer** — tree view with drag-and-drop, context menus, inline rename/delete
- **Command Palette** — `Ctrl+Shift+P` command palette for quick actions
- **Syntax Highlighting** — 100+ languages via Monaco + custom themes
- **Diff System** — inline line-by-line diff with gutter decorations
- **Workspace Indexer** — symbol extraction and full-text search across project files

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron 41 |
| UI | React 18, Zustand |
| Editor | Monaco Editor |
| Terminal | xterm.js, node-pty |
| Git | simple-git |
| SSH | ssh2 |
| Build | Vite, electron-builder |

## Getting Started

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for Windows
npm run build:win
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Go to File |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+B` | Toggle Sidebar |
| `` Ctrl+` `` | Toggle Terminal |
| `Ctrl+Shift+F` | Toggle Search |
| `Ctrl+O` | Open File |
| `Ctrl+N` | New File |
| `Ctrl+S` | Save File |

## Project Structure

```
src/
  components/
    Common/        — GoToFile, CommandPalette, StatusBar
    Editor/        — EditorArea (Monaco wrapper, tabs, diff)
    Sidebar/       — Sidebar, FileExplorer, WorkspaceSearchPanel, GitPanel
    Terminal/      — TerminalPanel (xterm.js wrapper)
    Chat/          — AI chat panel
  lib/
    stores/        — Zustand stores (chat, editor, ui, workspace, git, toast)
    indexer/       — Workspace indexer with symbol extraction
    diff/          — Line-level diff engine
electron/
  main.js          — Electron main process, IPC handlers
  preload.js       — Context bridge for renderer
```

## License

MIT
