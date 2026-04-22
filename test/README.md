# KaizerIDE

A modern, extensible IDE with a sleek UI and powerful plugin architecture built for developers who demand flexibility and performance.

## Features

- **Modern UI** — Clean, responsive interface with customizable themes
- **Plugin System** — Extend functionality with Lua-based plugins
- **Multi-Language Support** — Syntax highlighting and IntelliSense for popular languages
- **Integrated Terminal** — Built-in command execution
- **File Explorer** — Intuitive project navigation
- **Code Intelligence** — Auto-completion, go-to-definition, and refactoring tools
- **Git Integration** — Version control at your fingertips

## Installation

### Prerequisites

- Windows 10/11
- .NET Runtime 6.0 or higher (if applicable)
- 4GB RAM minimum, 8GB recommended

### Setup

1. Download the latest release from the releases page
2. Extract the archive to your desired location
3. Run `KaizerIDE.exe`
4. Open your project folder via `File > Open Folder`

## Plugin Development

KaizerIDE uses Lua for plugin development, providing a simple yet powerful scripting interface.

### Plugin Structure

```
plugins/
├── my-plugin/
│   ├── init.lua
│   └── plugin.json
```

### Getting Started

1. Create a new folder in the `plugins` directory
2. Add a `plugin.json` manifest file
3. Create an `init.lua` file with your plugin logic
4. Restart KaizerIDE or reload plugins via `Tools > Reload Plugins`

### Example Plugin

See `examples/hello-plugin.lua` for a complete plugin example demonstrating:
- Editor integration
- UI components
- Event handling
- File operations

## Configuration

Edit `config.json` in the installation directory to customize:
- Theme and appearance
- Keybindings
- Plugin settings
- Editor preferences

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open File | `Ctrl+O` |
| Save | `Ctrl+S` |
| Find | `Ctrl+F` |
| Command Palette | `Ctrl+Shift+P` |
| Toggle Terminal | `Ctrl+` ` |
| Quick Open | `Ctrl+P` |

## API Documentation

Full API documentation for plugin development is available at `docs/api.md`

### Core APIs

- `editor.*` — Text editor manipulation
- `ui.*` — UI components and dialogs
- `fs.*` — File system operations
- `project.*` — Project management
- `events.*` — Event system

## Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` for guidelines.

## License

MIT License - see `LICENSE` for details

## Support

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join our community forum
- **Documentation**: Full docs at `docs/`

---

Built with ❤️ for developers, by developers.
