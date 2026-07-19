# AI Assistant

KaizerIDE includes a context-aware AI assistant built around specialized agents, direct endpoint configuration, and local workspace context.

[← Back to features](../FEATURES.md) · [Docs hub](../README.md)

---

## Core capabilities

- **Multi-agent system** - Four specialized modes for execution, planning, Q&A, and debugging.
- **Context-aware chat** - Attach files, folders, and selections to prompts with context pills.
- **Tool calling** - The assistant can read files, search code, inspect workspace structure, and analyze project context.
- **Multi-model support** - Works with OpenAI-compatible APIs, including hosted and local providers.
- **Streaming responses** - AI replies stream in real time with markdown and code highlighting.
- **Planning system** - Create implementation plans with real-time preview.
- **Durable sessions** - Chat history survives restarts through disk-backed storage in `userData/`.

---

## Agent modes

| Mode | Purpose |
| --- | --- |
| **Agent** | Implements features, applies code changes, and completes multi-step tasks. |
| **Planner** | Designs implementation plans and architecture before edits. |
| **Ask** | Answers questions and explains code without modifying files. |
| **Fixer** | Diagnoses issues and applies focused bug fixes. |

Each mode has a distinct role so workflows can stay intentional and predictable.

---

## Context pills

Context pills let you attach project information without pasting large file contents into the prompt manually.

You can use them for:

- **Files** - Ask questions about specific source or docs files.
- **Folders** - Give the assistant broader project context.
- **Selections** - Focus the assistant on a specific code region.

---

## Tool calling

The assistant can use workspace tools to understand and work with your project:

- **Read files** to inspect source and documentation.
- **Search code** across the workspace.
- **Analyze structure** through folders and indexed symbols.
- **Run commands** with permission controls where required.

Tool usage is designed to keep the AI grounded in the actual project instead of guessing.

---

## Supported providers

KaizerIDE supports OpenAI-compatible endpoints, including:

- **OpenAI**.
- **Anthropic Claude** through compatible proxies.
- **Qwen** through compatible endpoints.
- **Gemini** through compatible proxies.
- **Local models** such as Ollama, LM Studio, and LocalAI.
- **Custom endpoints** that implement an OpenAI-compatible chat API.

For setup details, see **[Configuration](../CONFIGURATION.md)**.

---

## Privacy model

AI traffic is sent directly to the endpoint you configure. KaizerIDE does not proxy, inspect, or log AI traffic.

For the full data-flow explanation, see **[Privacy](../PRIVACY.md)**.
