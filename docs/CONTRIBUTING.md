# Contributing to KaizerIDE

Thanks for your interest in contributing to KaizerIDE! 🎉

## How to Contribute

### Reporting Bugs
- Check if the bug is already reported in [Issues](https://github.com/randheimer/KaizerIDE/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable
  - Your OS and KaizerIDE version

### Suggesting Features
- Open an issue with the `enhancement` label
- Describe the feature and why it would be useful
- Include mockups or examples if possible

### Pull Requests

1. **Fork the repo** and create your branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Test your changes thoroughly
   - Run `npm run lint` and `npm run format:check` before committing

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

   Use [Conventional Commits](https://www.conventionalcommits.org/). The
   prefix drives the automatic version bump:

   | Prefix | Semver bump |
   | --- | --- |
   | `feat:` | minor |
   | `fix:` / `chore:` / `perf:` / `refactor:` | patch |
   | `BREAKING CHANGE:` footer or `feat!:` | major |
   | `docs:` / `style:` / `test:` | none |

6. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a PR on GitHub with a clear description. CI will run
   `lint`, `format:check`, and `build` automatically on every PR.

### New to Contributing?
If you're new to open source, start with issues labeled `good first issue`. These are:
- ✅ Beginner-friendly tasks
- ✅ Well-documented with clear instructions
- ✅ Perfect for learning the codebase
- ✅ Usually small bug fixes or simple features

**How to find them:**
1. Go to https://github.com/randheimer/KaizerIDE/issues
2. Click "Labels" → Select "good first issue"
3. Pick one that interests you and comment that you'd like to work on it!

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Git

### Project Structure
```
KaizerIDE/
├── electron/                  # Electron main & preload
│   ├── main.js                # IPC, window, SSH, file IO
│   └── preload.js             # contextBridge surface
├── src/                       # React renderer
│   ├── components/
│   │   ├── AI/chat/           # Chat panel + tool cards
│   │   ├── Common/            # Palette, file picker, toasts
│   │   ├── Editor/            # Monaco wrapper + tabs
│   │   ├── Layout/            # Title + menu bars
│   │   ├── Modals/            # Settings, remote connection
│   │   ├── Sidebar/           # File explorer, search panel
│   │   └── Terminal/          # Terminal panel
│   ├── hooks/                 # Reusable React hooks
│   └── lib/
│       ├── agent/             # Multi-agent system (exec/plan/ask/fix)
│       └── indexer/           # Local workspace indexer
├── docs/                      # User-facing docs + screenshots
└── .github/
    ├── dependabot.yml         # Weekly dep updates
    └── workflows/
        ├── build-release.yml  # Auto-build + release on main
        ├── ci.yml             # Lint + build on PRs
        └── traffic-stats.yml  # Daily repo traffic graphs
```

### Tech Stack
- **Frontend**: React 18, Vite 6, Monaco Editor
- **Shell**: Electron 41
- **AI**: Any OpenAI-compatible endpoint (Claude, GPT, Qwen, Gemini, local)
- **Remote**: `ssh2` for SFTP workspaces
- **Tooling**: ESLint + Prettier

### Scripts
```bash
npm run dev             # Vite + Electron dev mode
npm run build           # Vite production build
npm run electron:build  # Full Windows installer

npm run lint            # ESLint
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier write
npm run format:check    # Prettier check
```

## Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## Questions?
Open a discussion or reach out in issues. We're here to help!

---

Happy coding! 🚀
