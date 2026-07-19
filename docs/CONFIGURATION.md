# Configuration

Configure AI providers, editor behavior, appearance, and core workspace settings in KaizerIDE.

[← Back to docs hub](README.md)

---

## AI setup

1. Open Settings with `Ctrl+,`.
2. Go to the **General** tab.
3. Set your **Endpoint URL**.
4. Add an **API Key** if your provider requires one.
5. Save settings and start a chat session.

Example local endpoint:

```text
http://localhost:20128/v1
```

---

## Supported AI providers

KaizerIDE works with OpenAI-compatible APIs, including:

- **OpenAI** - GPT-4, GPT-3.5, and compatible chat models.
- **Anthropic Claude** - Through an OpenAI-compatible proxy.
- **Google Gemini** - Through an OpenAI-compatible proxy.
- **Local models** - Ollama, LM Studio, LocalAI, or similar local servers.
- **Custom endpoints** - Any endpoint that follows the OpenAI-compatible chat API shape.

AI requests are sent directly to the endpoint you configure. KaizerIDE does not proxy or inspect them.

---

## Editor customization

Settings → Editor includes common code editor preferences:

- **Font** - Font size, family, and cursor style.
- **Indentation** - Tab size and related formatting behavior.
- **Layout** - Word wrap, minimap, and line numbers.
- **Editing** - Auto-save and bracket colorization options.

---

## Appearance customization

Settings → Appearance controls the main UI surface:

- **Window controls** - macOS-style or Windows-style controls.
- **Accent color** - Customize the visual accent used across the app.
- **Compact mode** - Reduce spacing for denser workflows.
- **Status bar** - Toggle status bar visibility.

---

## Workspace indexing

Workspace indexing can be enabled or disabled from Settings → Indexer. It powers fast local search and AI context discovery while keeping the index on your machine.

For details, see **[Workspace Indexing System](features/INDEXING.md)**.

---

## Related docs

- **[Quick Start](QUICK_START.md)** - First install and setup flow.
- **[Privacy](PRIVACY.md)** - Local-first guarantees and AI data behavior.
- **[AI Assistant](features/AI_ASSISTANT.md)** - Agent modes, tool calling, context, and sessions.
