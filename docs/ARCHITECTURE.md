# Architecture

## Renderer

The renderer is a React application. Existing screen components remain under `src/components` while reusable logic is migrated incrementally:

- `src/features/ai-chat` owns chat-specific rendering helpers.
- `src/features/editor` owns editor language and editor-domain utilities.
- `src/features/file-picker` owns file picker metadata utilities.
- `src/shared` contains utilities used by multiple features.
- `src/lib/stores` contains Zustand state stores.

Large components are decomposed only across stable boundaries to avoid behavior changes. New feature-specific code should go under `src/features/<feature>` rather than expanding top-level components.

## Electron main process

`electron/main.js` owns application lifecycle and IPC registration. Extracted services live under `electron/services`; validation helpers live under `electron/security`. The renderer accesses privileged APIs only through `electron/preload.js` with context isolation enabled.

### IPC security rules

- Treat every renderer argument as untrusted.
- Validate paths before filesystem access.
- Do not expose Node.js directly to the renderer.
- Keep shell execution behind narrow preload methods.
- Add new IPC handlers by domain and keep return values serializable.

## Build and release

GitHub Actions uses Node.js 22.12.0. The release workflow updates both package manifests, builds the exact version-bump commit, uploads the installer and checksum, then publishes the matching tag.
