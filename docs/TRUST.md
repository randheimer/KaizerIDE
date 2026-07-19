# Trust & Positioning

KaizerIDE is designed for individuals and teams that need local-first AI coding, predictable data behavior, and direct control over AI endpoints.

[← Back to docs hub](README.md)

---

## Enterprise-grade trust model

KaizerIDE is suitable for professional environments where security, compliance, and predictability matter.

- **Deterministic data behavior** - No hidden services, background syncing, or opaque data flows.
- **Composable AI architecture** - Integrate with internal LLMs, private endpoints, or local model servers.
- **Infrastructure-independent design** - Runs without vendor lock-in or required cloud dependencies.
- **Audit-friendly model** - Open architecture allows inspection and verification.
- **Deployment flexibility** - Works for individual machines, secured teams, and isolated environments.

KaizerIDE is built for teams that require control over convenience trade-offs.

---

## KaizerIDE vs other IDEs

| Feature | KaizerIDE | VS Code | Cursor | Windsurf |
| --- | --- | --- | --- | --- |
| **Telemetry** | None | Yes, opt-out | Yes, configurable | Yes |
| **Usage tracking** | None | Yes, opt-out | Yes, privacy mode available | Yes |
| **Cloud sync** | None | Optional | Yes | Yes |
| **Account required** | No | Yes | Yes | Yes |
| **Code sent to servers** | Never by default* | For some features | Yes, for AI features | Yes, for AI features |
| **Workspace indexing** | Local, no AI needed | Manual search | Semantic AI vector embeddings | RAG-based AI indexing |
| **Local AI support** | Yes | Full | Limited via Cursor Pro | Limited |
| **Open source** | Yes | Yes | No | No |
| **Self-hosted AI** | Yes | Yes | Limited via Cursor Pro | Enterprise only |
| **Bring your own API** | Yes | Yes | Limited via Cursor Pro | Yes, via Windsurf servers |

\* AI features send selected prompt/context data to the endpoint you configure.

---

## Key differences

- **KaizerIDE** - AI requests go directly to your chosen endpoint. Workspace indexing is local, fast, private, and works offline without AI or cloud embeddings.
- **VS Code** - Highly flexible and extensible. Can be configured for local and private workflows with the right extensions.
- **Windsurf** - Powerful agentic AI with cloud-based or enterprise AI workflows and AI-driven repository context.
- **Cursor** - Polished AI UX with semantic indexing and multi-file reasoning, with cloud dependency for core AI features.

---

## Choose KaizerIDE if

- You want **zero telemetry by default**.
- You need **direct API connections** without intermediaries.
- You value **simple and lightweight** tooling.
- You need **local workspace indexing** that works offline without AI.
- You want privacy without enterprise pricing.

---

## Related docs

- **[Privacy](PRIVACY.md)** - Local-first guarantees and AI data flow.
- **[Security Policy](SECURITY.md)** - Vulnerability reporting and security considerations.
- **[Workspace Indexing System](features/INDEXING.md)** - Local indexing behavior and architecture.
