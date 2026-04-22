# KaizerIDE

<p align="center">
  <img src="build/logo.png" alt="KaizerIDE Logo" width="200"/>
</p>

<p align="center">A modern desktop IDE built with Electron, React, and Monaco Editor.</p>

<p align="center">
  <a href="https://github.com/randheimer/KaizerIDE/releases"><img src="https://img.shields.io/github/v/release/randheimer/KaizerIDE" alt="GitHub release"></a>
  <a href="https://github.com/randheimer/KaizerIDE/releases"><img src="https://img.shields.io/github/downloads/randheimer/KaizerIDE/total" alt="GitHub downloads"></a>
  <a href="https://github.com/randheimer/KaizerIDE/stargazers"><img src="https://img.shields.io/github/stars/randheimer/KaizerIDE" alt="GitHub stars"></a>
  <a href="https://github.com/randheimer/KaizerIDE/issues"><img src="https://img.shields.io/github/issues/randheimer/KaizerIDE" alt="GitHub issues"></a>
  <a href="https://github.com/randheimer/KaizerIDE/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Custom-blue" alt="License"></a>
</p>

## Features

- 🎨 Modern, intuitive user interface
- 📝 Monaco Editor integration (VS Code's editor)
- 🤖 AI-powered chat assistant (requires local OpenAI-compatible API endpoint)
- 📁 File explorer and project management
- 🔍 Advanced search capabilities
- 💻 Integrated terminal
- ⚡ Fast and responsive

## Requirements

### AI Chat Assistant

The AI chat feature requires a local OpenAI-compatible API endpoint. Supported options:
- [Ollama](https://ollama.ai/) with OpenAI compatibility
- [LM Studio](https://lmstudio.ai/)
- [LocalAI](https://localai.io/)
- Any other OpenAI-compatible API server

Configure your API endpoint in the settings after installation.

## Download

Download the latest version from the [Releases](https://github.com/randheimer/KaizerIDE/releases) page.

### Installation

1. Download `KaizerIDE Setup 1.0.0.exe` from the latest release
2. Run the installer
3. Follow the installation wizard
4. Launch KaizerIDE from your Start Menu or Desktop

## Development

### Prerequisites

- Node.js 22 or higher
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/randheimer/KaizerIDE.git
cd KaizerIDE

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Build installer
npm run electron:build
```

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **Vite** - Build tool
- **Monaco Editor** - Code editor
- **React Markdown** - Markdown rendering

## License

This project is licensed under a Custom License - see the [LICENSE](LICENSE) file for details.

**Summary:**
- ✅ Free to use, modify, and distribute
- ✅ Must credit "randheimer" in your modified versions
- ❌ Cannot sell or use commercially without permission
- ❌ Must include original author attribution

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/randheimer/KaizerIDE/issues).
