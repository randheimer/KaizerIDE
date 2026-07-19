# Developer Tools

KaizerIDE includes workflow tools for running commands, configuring the app, navigating quickly, and maintaining project quality.

[← Back to features](../FEATURES.md) · [Docs hub](../README.md)

---

## Integrated terminal

Run project commands without leaving the IDE. The terminal supports common development workflows such as starting dev servers, running tests, and inspecting command output.

---

## Settings panel

The settings panel centralizes configuration for:

- **AI models and endpoints**.
- **Editor preferences**.
- **Appearance controls**.
- **Workspace indexing**.

See **[Configuration](../CONFIGURATION.md)** for setup details.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+S` | Save current file |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+,` | Open settings |
| `Ctrl+O` | Open folder |
| `Ctrl+W` | Close tab |

---

## Workspace indexer

The local workspace indexer powers fast code lookup, symbol discovery, and AI context retrieval with real-time file watching.

See **[Workspace Indexing System](INDEXING.md)** for architecture, configuration, and troubleshooting.

---

## Code quality workflow

The project includes ESLint and Prettier scripts:

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

For full development and build steps, see **[Building from Source](../BUILDING.md)**.

---

## Related docs

- **[Quick Start](../QUICK_START.md)** - Install and first setup.
- **[Building from Source](../BUILDING.md)** - Development commands and release workflow.
- **[Contributing](../CONTRIBUTING.md)** - Pull request and contribution guidelines.
