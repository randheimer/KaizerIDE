# KaizerIDE

AI-powered desktop code editor built with Electron + React + Monaco.

## Implementation Status

| Feature | Status |
|---------|--------|
| Monaco Editor + custom themes (Kaizer Dark, Zero Syntax) | ✅ |
| Split editor view (`Ctrl+\`) | ✅ |
| Pinned tabs (persisted) | ✅ |
| Bookmarks (`Ctrl+Shift+K`, persisted) | ✅ |
| Editor zoom (`Ctrl+=` / `Ctrl+-` / `Ctrl+0`) | ✅ |
| Inline AI completions (Copilot-style) | ✅ |
| Inline AI edit (`Ctrl+Shift+I`) | ✅ |
| Emmet expansion (Tab in HTML/CSS/JSX/TSX) | ✅ |
| Git blame annotations (`Ctrl+Shift+G`) | ✅ |
| Git UI — visual diff and commit history | ✅ |
| AI diff decorations (green/red inline) | ✅ |
| Breadcrumb navigation | ✅ |
| Markdown preview | ✅ |
| C/C++ semantic highlighting + `#include` Ctrl+Click | ✅ |
| Custom `.sln` language (Monarch tokenizer) | ✅ |
| Syntax validation (JS/TS/JSON) | ✅ |
| Bracket pair colorization, indent guides, minimap, code folding | ✅ |
| Configurable settings (font, theme, wrap, cursor, whitespace, auto-save) | ✅ |
| File Explorer (tree, create/rename/delete, drag-drop, icons) | ✅ |
| Search Panel (in-file find/replace, case/word/regex) | ✅ |
| Workspace Search (cross-project search & replace, regex) | ✅ |
| Git Panel (staged/changed, commits, branches, stage/unstage, diff) | ✅ |
| TODO Explorer (TODO/FIXME/HACK/XXX/BUG/NOTE) | ✅ |
| Task Runner (package.json scripts) | ✅ |
| Sidebar tabs persisted to localStorage | ✅ |
| Streaming AI agent chat (Planner, Executor, Fixer, Ask agents) | ✅ |
| Agent tools (read/write file, list dir, run cmd, search, grep, outline, patch) | ✅ |
| Context pills (attach files to messages) | ✅ |
| Model picker (switch AI models) | ✅ |
| Chat history (save/load per workspace) | ✅ |
| Token Saver (compresses tool results, configurable budget) | ✅ |
| Auto-approve commands toggle | ✅ |
| Integrated PTY terminal (xterm.js + node-pty) | ✅ |
| Multiple terminal tabs, search, web links, auto-resize | ✅ |
| SSH remote development (connect, browse, read/write via SFTP) | ✅ |
| Frameless window + custom title bar + full menu bar | ✅ |
| Command Palette (`Ctrl+Shift+P`) | ✅ |
| Go to File (`Ctrl+P`) | ✅ |
| Status bar (git branch, cursor, language, encoding, model name) | ✅ |
| Toast notifications | ✅ |
| Resize handles for all panels | ✅ |
| Settings Modal (General, Editor, Appearance, AI Models, Indexer) | ✅ |
| SSH Remote Modal (connect, saved connections, browse remote) | ✅ |
| Output Panel (append-only log, filter, auto-scroll) | ✅ |
| Problems Panel (Monaco diagnostics, severity filters) | ✅ |
| Zen Mode (`Ctrl+K Z`) | ✅ |
| Multi-agent framework (Base, Context, Registry) | ✅ |
| Reliability (CircuitBreaker, ErrorHandler, FallbackManager, RetryPolicy) | ✅ |
| Observability (Logger, Metrics, Tracer) | ✅ |
| Persistence (OperationLog, SessionManager, UndoRedoStack) | ✅ |
| Workspace indexer (symbol extraction, full-text search, caching) | ✅ |
| File watcher (auto-refresh index on changes) | ✅ |
| Electron IPC (file ops, git, PTY, SSH/SFTP, workspace persistence) | ✅ |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Go to File |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+B` | Toggle Sidebar |
| `` Ctrl+` `` | Toggle Terminal |
| `Ctrl+Shift+F` | Workspace Search |
| `Ctrl+Shift+C` | Toggle AI Chat |
| `Ctrl+O` | Open Folder |
| `Ctrl+N` | New File |
| `Ctrl+S` | Save |
| `Ctrl+W` | Close Tab |
| `Ctrl+\` | Split Editor |
| `Ctrl+K Z` | Zen Mode |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom In / Out / Reset |
| `Ctrl+Shift+G` | Toggle Git Blame |
| `Ctrl+Shift+K` | Toggle Bookmark |
| `Ctrl+Shift+I` | Inline AI Edit |
| `Ctrl+,` | Open Settings |
| `F12` | Go to Definition |
| `Ctrl+Shift+O` | Go to Symbol |
| `Shift+F12` | Find All References |
| `F2` | Rename Symbol |
| `Shift+Alt+F` | Format Document |

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron |
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

## Project Structure

```
src/
  components/
    AI/chat/       — Chat panel, agents, tool renderers
    Common/        — CommandPalette, GoToFile, StatusBar, FilePicker, ResizeHandle
    Editor/        — EditorArea, Breadcrumb, InlineEditOverlay
    Layout/        — TitleBar, MenuBar
    Modals/        — SettingsModal, RemoteConnectionModal
    Output/        — OutputPanel
    Problems/      — ProblemsPanel
    Sidebar/       — FileExplorer, SearchPanel, GitPanel, TodoExplorer, TaskRunner
    Terminal/      — TerminalPanel (xterm.js wrapper)
  lib/
    agent/         — Agent framework, InlineCompletionProvider
    api/           — AI API providers (OpenAI-compatible, Anthropic)
    diff/          — Line-level diff engine
    indexer/       — Workspace indexer with symbol extraction
    stores/        — Zustand stores (chat, editor, git, ui, workspace, toast)
electron/
  main.js          — Electron main process, IPC handlers
  preload.js       — Context bridge for renderer
```

## License

MIT
