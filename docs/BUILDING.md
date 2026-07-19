# Building from Source

Set up KaizerIDE for local development, run quality checks, and build release artifacts.

[← Back to docs hub](README.md)

---

## Prerequisites

- **Node.js 20+**.
- **npm** or **yarn**.
- **Git**.
- **Windows** for Windows installer builds.

---

## Development setup

```bash
git clone https://github.com/randheimer/KaizerIDE.git
cd KaizerIDE
npm install
npm run dev
```

`npm run dev` starts the Vite renderer and Electron shell for local development.

---

## Build commands

```bash
npm run build           # Build the Vite production bundle
npm run electron:build  # Build the Windows installer
```

---

## Code quality

```bash
npm run lint            # Run ESLint on src/
npm run lint:fix        # Auto-fix lint issues
npm run format          # Format with Prettier
npm run format:check    # Check formatting without writing
```

Run `npm run lint`, `npm run format:check`, and `npm run build` before opening pull requests.

---

## Tech stack

- **Electron 41** - Desktop shell.
- **React 18** - UI framework.
- **Vite 6** - Build tool and dev server.
- **Monaco Editor** - VS Code editor core.
- **react-markdown + remark-gfm** - Markdown rendering in AI chat.
- **react-syntax-highlighter (Prism)** - Code block highlighting.
- **ssh2** - Native SSH/SFTP client for remote workspaces.
- **ESLint + Prettier** - Code quality tooling.

---

## Release process

Commits on `main` automatically trigger a build through GitHub Actions. Version bumps follow conventional commit prefixes:

| Prefix | Bump | Example |
| --- | --- | --- |
| `BREAKING CHANGE:` or `feat!:` | Major | `1.0.0` → `2.0.0` |
| `feat:` | Minor | `1.0.0` → `1.1.0` |
| `fix:` / `chore:` / `perf:` / `refactor:` | Patch | `1.0.0` → `1.0.1` |
| `docs:` / `style:` / `test:` | None, paths ignored | No release |

Every release ships a SHA256 checksum alongside the `.exe` installer for verification. The release workflow also generates a changelog grouped by commit type.

---

## Contributing

For pull request workflow, issue reporting, and code standards, see **[Contributing to KaizerIDE](CONTRIBUTING.md)**.
