# Quick Start

Get KaizerIDE installed, configured, and ready for your first AI-assisted coding session.

[← Back to docs hub](README.md)

---

## Installation

1. **Download** the latest release from [GitHub Releases](https://github.com/randheimer/KaizerIDE/releases).
2. **Verify the checksum** if you want to confirm the installer integrity. Every release ships a `.sha256` file.

   ```powershell
   (Get-FileHash .\KaizerIDE-X.Y.Z.exe -Algorithm SHA256).Hash
   ```

3. **Run** the installer, for example `KaizerIDE-X.Y.Z.exe`.
4. **Launch** KaizerIDE from the Start Menu or desktop shortcut.

---

## First steps

1. **Open a folder** from File → Open Folder or press `Ctrl+O`.
2. **Configure AI** from Settings → General by setting your endpoint and API key.
3. **Open files** from the sidebar and start coding in the Monaco editor.
4. **Use the AI assistant** with file, folder, or selection context when you need help.
5. **Discover commands** with `Ctrl+Shift+P`.

---

## Core keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+P` | Open the command palette |
| `Ctrl+S` | Save current file |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+,` | Open settings |
| `Ctrl+O` | Open folder |
| `Ctrl+W` | Close tab |

---

## First AI setup

1. Open Settings with `Ctrl+,`.
2. Go to the **General** tab.
3. Set your **Endpoint URL**, such as `http://localhost:20128/v1`.
4. Add your **API Key** if your provider requires one.
5. Open the chat panel and send a prompt with workspace context.

KaizerIDE supports OpenAI-compatible endpoints, including hosted providers and local model servers.

---

## Next reads

- **[Configuration](CONFIGURATION.md)** - AI providers, editor settings, and appearance options.
- **[Features](FEATURES.md)** - Overview of the main product areas.
- **[Privacy](PRIVACY.md)** - Local-first behavior and AI data flow.
