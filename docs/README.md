<p align="center">
  <img src="images/logo.png" alt="KaizerIDE" height="90"/>
</p>

<h1 align="center">KaizerIDE</h1>

<p align="center">
  <strong>AI-Powered Desktop IDE — local-first, zero telemetry, direct API control</strong>
</p>

<p align="center">
  <a href="https://github.com/randheimer/KaizerIDE/releases"><img src="https://img.shields.io/github/v/release/randheimer/KaizerIDE?style=flat-square" alt="Release"></a>
  <a href="https://github.com/randheimer/KaizerIDE/releases"><img src="https://img.shields.io/github/downloads/randheimer/KaizerIDE/total?style=flat-square" alt="Downloads"></a>
  <a href="https://github.com/randheimer/KaizerIDE/stargazers"><img src="https://img.shields.io/github/stars/randheimer/KaizerIDE?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/randheimer/KaizerIDE/blob/main/docs/LICENSE"><img src="https://img.shields.io/badge/license-Custom-blue?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/randheimer/KaizerIDE/releases"><strong>⬇️ &nbsp;Download for Windows</strong></a>
</p>

<p align="center">
  <img src="images/Preview8.png" alt="KaizerIDE Preview" width="820"/>
</p>

---

## What is KaizerIDE?

KaizerIDE is a lightweight desktop IDE that pairs a full Monaco code editor with a multi-agent AI assistant — and keeps everything under your control. No telemetry, no required account. AI requests go directly to the endpoint you configure, including local models running on your own machine.

It ships with **local workspace indexing** so the AI understands your entire codebase instantly, without cloud embeddings or external services.

---

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🤖 Multi-Agent AI</h3>
      Four specialized modes — <strong>Agent</strong>, <strong>Planner</strong>, <strong>Ask</strong>, and <strong>Fixer</strong> — each with distinct tool access and behavior. Context pills attach files and selections without pasting.
    </td>
    <td width="50%" valign="top">
      <h3>💻 Monaco Editor</h3>
      The same editor core as VS Code — multi-tab editing, syntax highlighting for 100+ languages, IntelliSense, minimap, bracket colorization, and autosave.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🔍 Local Workspace Indexing</h3>
      Indexes your entire codebase on open. Symbol extraction, fuzzy search, real-time file watching — 100% on-device, no cloud embeddings.
    </td>
    <td valign="top">
      <h3>⚡ Command Palette</h3>
      <code>Ctrl+Shift+P</code> — keyboard-first access to every IDE action. New file, save, toggle sidebar, settings, reindex, SSH connect, and more.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🔐 Privacy-First Design</h3>
      Zero telemetry. No required account. Direct API routing — your AI requests never pass through a KaizerIDE proxy. Works fully offline with local models.
    </td>
    <td valign="top">
      <h3>🌐 SSH / SFTP Support</h3>
      Connect to remote servers and edit files directly from the IDE. Windows Explorer context-menu integration to open any folder in KaizerIDE.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🎨 Modern UI</h3>
      Glassmorphism surfaces, accent color controls, compact mode, macOS and Windows window chrome themes, lazy-loaded modals for fast startup.
    </td>
    <td valign="top">
      <h3>🔧 Developer Tools</h3>
      Integrated terminal, settings panel, keyboard shortcuts, <code>.gitignore</code>-aware async file tree, and ESLint + Prettier quality tooling.
    </td>
  </tr>
</table>

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="images/Preview2.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="images/Preview3.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="images/Preview4.png" width="260" alt="Preview"/></td>
  </tr>
  <tr>
    <td align="center"><img src="images/Preview9.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="images/Preview10.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="images/Preview11.png" width="260" alt="Preview"/></td>
  </tr>
</table>

<p align="center">
  <a href="SCREENSHOTS.md">View all screenshots →</a>
</p>

---

## Quick install

<p align="center">
  <a href="https://github.com/randheimer/KaizerIDE/releases"><strong>⬇️ &nbsp;Download the latest release from GitHub Releases</strong></a>
</p>

1. Run `KaizerIDE-X.Y.Z.exe`.
2. Open a folder with `Ctrl+O`.
3. Configure your AI endpoint in **Settings → General**.
4. Press `Ctrl+Shift+P` and start coding.

Optionally verify the SHA256 checksum shipped with each release. See the full **[Quick Start](QUICK_START.md)** for the complete first-run flow.

---

## Roadmap

| Milestone | Status |
| --- | --- |
| Core IDE — editor, tabs, file explorer, terminal | ✅ Complete |
| Multi-agent AI system (Agent / Planner / Ask / Fixer) | ✅ Complete |
| Local workspace indexing with real-time file watching | ✅ Complete |
| Command palette, durable sessions, ESLint + Prettier | ✅ Complete |
| Git UI — visual diff and commit history | 🚧 In progress |
| Debugger integration | 📋 Planned |
| Custom themes and color schemes | 📋 Planned |
| Documentation generation from code | 📋 Planned |

---

## Documentation hub

| Start here | Description |
| --- | --- |
| **[Quick Start](QUICK_START.md)** | Install KaizerIDE, open your first folder, configure AI, and learn core shortcuts. |
| **[Configuration](CONFIGURATION.md)** | Set AI endpoints, editor preferences, appearance options, and indexing behavior. |
| **[Features](FEATURES.md)** | Browse the main product areas and jump into detailed feature docs. |
| **[Privacy](PRIVACY.md)** | Understand local-first guarantees, AI request routing, and workspace indexing privacy. |
| **[Trust & Positioning](TRUST.md)** | Compare KaizerIDE with other IDEs and review the enterprise trust model. |
| **[Building from Source](BUILDING.md)** | Run the app locally, build releases, and use linting/formatting commands. |

---

## Feature guides

| Guide | Covers |
| --- | --- |
| **[AI Assistant](features/AI_ASSISTANT.md)** | Multi-agent chat, context pills, tool calling, planning, streaming, durable sessions, and providers. |
| **[Editor](features/EDITOR.md)** | Monaco editing, tabs, syntax highlighting, IntelliSense, minimap, themes, and autosave. |
| **[File Management](features/FILE_MANAGEMENT.md)** | File explorer, search, `.gitignore` awareness, SSH/SFTP, context menus, and drag/drop. |
| **[UI & UX](features/UI_UX.md)** | Welcome screen, command palette, themes, appearance controls, glass effects, and lazy-loaded modals. |
| **[Developer Tools](features/DEVELOPER_TOOLS.md)** | Terminal, settings, shortcuts, workspace indexer pointers, and quality workflows. |
| **[Workspace Indexing](features/INDEXING.md)** | Local indexing, symbol extraction, search tools, cache behavior, performance, and troubleshooting. |

---

## Repository stats

![Clones](graphs/clones.png)

---

## Project resources

| Resource | Link |
| --- | --- |
| **GitHub repository** | [randheimer/KaizerIDE](https://github.com/randheimer/KaizerIDE) |
| **Releases** | [Download builds](https://github.com/randheimer/KaizerIDE/releases) |
| **Bug reports** | [Open a bug issue](https://github.com/randheimer/KaizerIDE/issues/new?labels=bug) |
| **Feature requests** | [Request a feature](https://github.com/randheimer/KaizerIDE/issues/new?labels=enhancement) |
| **Contributing** | [Contribution guide](CONTRIBUTING.md) |
| **Security** | [Security policy](SECURITY.md) |
| **License** | [Custom License](LICENSE) |

---

## Support

- **Documentation** — Start with this hub and follow the topic links above.
- **Issues** — Use [GitHub Issues](https://github.com/randheimer/KaizerIDE/issues) for bugs and requests.
- **Community** — Star the project if KaizerIDE is useful to you.

---

<p align="center">
  <img src="images/logo.png" alt="KaizerIDE" height="36"/>
</p>

<p align="center">
  Made with ❤️ by the KaizerIDE team
</p>

<p align="center">
  <sub>Built for developers who value privacy, speed, and AI assistance</sub>
</p>
