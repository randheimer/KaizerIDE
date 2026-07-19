# KaizerIDE

KaizerIDE is an AI-powered desktop IDE built with Electron, React, Vite and Monaco Editor.

## Requirements

- Node.js 22.12.0 or newer
- npm 10 or newer
- Windows for the packaged desktop installer

## Development

```bash
npm ci
npm run dev
```

## Quality checks

```bash
npm run check
npm run build
npm run validate
```

`npm run validate` runs linting, formatting checks, tests and a production Vite build.

## Windows package

```bash
npm run electron:build
```

Build artifacts are written to `release/`. GitHub Actions automatically versions, builds and publishes a Windows installer from pushes to `main`.

## Project structure

- `electron/` — Electron main process, preload bridge, services and security helpers
- `src/components/` — existing UI components, retained while features are migrated gradually
- `src/features/` — feature-owned components and utilities
- `src/shared/` — cross-feature utilities
- `src/lib/` — application services, agents, indexer and stores
- `docs/` — user and contributor documentation

See [Architecture](docs/ARCHITECTURE.md), [Building](docs/BUILDING.md), and [Contributing](docs/CONTRIBUTING.md).
