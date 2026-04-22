# KaizerIDE

<p align="center">
  <img src="images/Preview1.png" alt="KaizerIDE Preview" width="800"/>
</p>

<p align="center">
  <strong>AI-Powered Desktop IDE</strong><br>
  A modern, lightweight code editor with integrated AI assistant
</p>

<p align="center">
  <a href="https://github.com/randheimer/KaizerIDE/releases"><img src="https://img.shields.io/github/v/release/randheimer/KaizerIDE?style=flat-square" alt="Release"></a>
  <a href="https://github.com/randheimer/KaizerIDE/releases"><img src="https://img.shields.io/github/downloads/randheimer/KaizerIDE/total?style=flat-square" alt="Downloads"></a>
  <a href="https://github.com/randheimer/KaizerIDE/stargazers"><img src="https://img.shields.io/github/stars/randheimer/KaizerIDE?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/randheimer/KaizerIDE/blob/main/docs/LICENSE"><img src="https://img.shields.io/badge/license-Custom-blue?style=flat-square" alt="License"></a>
</p>

---

## ✨ Features

### 🤖 AI-Powered Coding Assistant
- **Context-Aware Chat** - AI understands your entire project structure
- **Tool Calling** - AI can read files, search code, and analyze your workspace
- **Multi-Model Support** - Works with any OpenAI-compatible API (Claude, GPT, local models)
- **Streaming Responses** - Real-time AI responses with syntax highlighting
- **Code Context Pills** - Attach files, folders, or selections to your prompts

### 💻 Modern Code Editor
- **Monaco Editor** - The same powerful editor from VS Code
- **Syntax Highlighting** - Support for 100+ programming languages
- **IntelliSense** - Auto-completion and intelligent code suggestions
- **Multi-Tab Editing** - Work on multiple files simultaneously
- **Minimap** - Quick navigation for large files
- **Customizable Themes** - Multiple editor themes including Kaizer Dark and Zero Syntax

### 📁 File Management
- **File Explorer** - Browse and manage your project files
- **Search Panel** - Fast file and text search across your workspace
- **Context Menu Integration** - Right-click files/folders in Windows Explorer to open in KaizerIDE
- **Drag & Drop** - Easy file operations

### 🎨 Beautiful UI/UX
- **macOS & Windows Themes** - Native-looking window controls for both platforms
- **Customizable Appearance** - Accent colors, compact mode, status bar toggle
- **Glassmorphism Design** - Modern frosted glass effects and smooth animations
- **Dark Mode** - Easy on the eyes for long coding sessions

### 🔧 Developer Tools
- **Integrated Terminal** - Run commands without leaving the IDE
- **Settings Panel** - Customize editor, appearance, and AI models
- **Keyboard Shortcuts** - Familiar shortcuts for productivity
- **Auto-Save** - Never lose your work

---

## 🚀 Quick Start

### Installation

1. **Download** the latest release from [GitHub Releases](https://github.com/randheimer/KaizerIDE/releases)
2. **Run** the installer (`KaizerIDE.Setup.x.x.x.exe`)
3. **Launch** from Start Menu or Desktop shortcut

### First Steps

1. **Open a Folder** - File → Open Folder or `Ctrl+O`
2. **Configure AI** - Settings → General → Set your API endpoint and key
3. **Start Coding** - Open files and use the AI assistant for help

---

## 🔐 Privacy & Security

**Your code stays on your machine. Period.**

KaizerIDE is built with privacy as a core principle, not an afterthought. We believe your code, your projects, and your workflow are yours alone.

### What We DON'T Do

- ❌ **No Telemetry** - We don't collect usage data, crash reports, or analytics
- ❌ **No Tracking** - No user tracking, cookies, or third-party services
- ❌ **No Cloud Sync** - Your code never gets uploaded to our servers (we don't have any!)
- ❌ **No Account Required** - Use it completely offline, no sign-up needed
- ❌ **No "Anonymous" Data** - We don't collect anything, period

### What We DO

- ✅ **Local Storage** - All settings, files, and data stay on your device
- ✅ **Open Source** - Audit the code yourself, see exactly what it does
- ✅ **Your API Keys** - Stored locally in your system, never transmitted to us
- ✅ **Direct AI Calls** - AI requests go straight to YOUR chosen endpoint
- ✅ **Offline Capable** - Works without internet (except for AI features)

### AI Privacy

When you use AI features:
- 🔒 Requests go **directly** to your chosen API endpoint (OpenAI, Ollama, etc.)
- 🔒 We **never** see your code, prompts, or responses
- 🔒 Use **local models** (Ollama, LM Studio) for complete offline privacy
- 🔒 **You control** what data leaves your machine

### KaizerIDE vs Other IDEs

| Feature | KaizerIDE | VS Code | Cursor | GitHub Copilot |
|---------|-----------|---------|--------|----------------|
| **Telemetry** | ❌ None | ✅ Yes (opt-out) | ✅ Yes (configurable) | ✅ Yes |
| **Usage Tracking** | ❌ None | ✅ Yes (opt-out) | ✅ Yes (privacy mode available) | ✅ Yes |
| **Cloud Sync** | ❌ None | ✅ Optional | ✅ Yes | N/A |
| **Account Required** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Code Sent to Servers** | ❌ Never* | ⚠️ For some features | ✅ Yes (for AI features) | ✅ Yes |
| **Local AI Support** | ✅ Full (Ollama, LM Studio) | ✅ Full (via extensions) | ❌ Cloud-only** | ❌ Cloud-only |
| **Open Source** | ✅ Yes | ✅ Core (MIT) | ❌ No (proprietary) | ❌ No |
| **Self-Hosted AI** | ✅ Yes | ✅ Yes (via extensions) | ⚠️ Limited | ❌ No |
| **Bring Your Own API** | ✅ Yes (direct) | ✅ Yes (via extensions) | ✅ Yes (via Cursor servers) | ❌ No |

**\*Except when you use AI features - those go to YOUR chosen endpoint**  
**\*\*Cursor routes all requests through their servers, even with custom API keys**

### Why This Matters

**The Key Difference:**
- **KaizerIDE** - Your AI requests go **directly** to your chosen endpoint (no middleman)
- **VS Code** - Flexible, can be fully local with the right extensions
- **Cursor** - All AI requests route through Cursor's servers (even with your own API key)
- **Copilot** - Locked to GitHub's cloud service

**Choose KaizerIDE if:**
- You want **zero telemetry** by default (not opt-out)
- You need **direct API connections** without intermediaries
- You value **simplicity** over enterprise features
- You want a **lightweight** alternative to heavy IDEs

**Choose VS Code if:**
- You need the **largest extension ecosystem**
- You want **maximum flexibility** and customization
- You're comfortable managing privacy settings yourself

**Choose Cursor if:**
- You want **polished AI UX** and don't mind cloud dependency
- You're willing to pay for Pro features
- You trust their privacy mode implementation

**Bottom Line:** KaizerIDE prioritizes privacy and simplicity. VS Code offers flexibility. Cursor offers polish but requires trust in their infrastructure.

---

## ⚙️ Configuration

### AI Setup

1. Open Settings (`Ctrl+,`)
2. Go to **General** tab
3. Set your **Endpoint URL** (e.g., `http://localhost:20128/v1`)
4. Add your **API Key** (optional, depends on your provider)

### Supported AI Providers

- **OpenAI** - GPT-4, GPT-3.5
- **Anthropic Claude** - Via OpenAI-compatible proxy
- **Local Models** - Ollama, LM Studio, LocalAI
- **Custom Endpoints** - Any OpenAI-compatible API

### Editor Customization

**Settings → Editor:**
- Font size, family, and cursor style
- Tab size and word wrap
- Minimap and line numbers
- Auto-save options
- Bracket colorization

**Settings → Appearance:**
- Window controls theme (macOS/Windows)
- Accent color
- Compact mode
- Status bar visibility

---

## 🎯 Use Cases

### For Developers
- Quick prototyping with AI assistance
- Code review and refactoring
- Learning new languages and frameworks
- Debugging with AI help

### For Students
- Learning to code with AI tutor
- Homework and project assistance
- Understanding complex concepts
- Free and open-source

### For Teams
- Lightweight alternative to heavy IDEs
- Self-hosted AI for privacy
- Customizable for team workflows
- No subscription fees

---

## 🛠️ Tech Stack

- **Electron** - Cross-platform desktop framework
- **React** - UI framework
- **Vite** - Fast build tool
- **Monaco Editor** - VS Code's editor
- **Node-PTY** - Terminal emulation
- **Chokidar** - File watching

---

## 📦 Building from Source

### Prerequisites
- Node.js 20+
- npm or yarn
- Windows (for Windows builds)

### Development

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
npm run electron:build
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the project

---

## 📝 License

KaizerIDE is open-source software licensed under a [Custom License](LICENSE).

**Key Points:**
- ✅ Free to use and modify
- ✅ Must include attribution to original author
- ❌ Commercial use requires permission
- ✅ Open source with restrictions

---

## 🔗 Links

- [GitHub Repository](https://github.com/randheimer/KaizerIDE)
- [Report a Bug](https://github.com/randheimer/KaizerIDE/issues/new?labels=bug)
- [Request a Feature](https://github.com/randheimer/KaizerIDE/issues/new?labels=enhancement)
- [Releases](https://github.com/randheimer/KaizerIDE/releases)

---

## 💬 Support

Need help? Have questions?

- 📖 Check the [documentation](https://github.com/randheimer/KaizerIDE#readme)
- 🐛 [Open an issue](https://github.com/randheimer/KaizerIDE/issues)
- ⭐ Star the project if you find it useful!

---

<p align="center">
  Made with ❤️ by the KaizerIDE team
</p>

<p align="center">
  <sub>Built for developers who value privacy, speed, and AI assistance</sub>
</p>
