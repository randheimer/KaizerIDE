# Privacy

KaizerIDE is built around local control: your code, configuration, workspace state, and AI routing stay under your control.

[← Back to docs hub](README.md)

---

## Local-first philosophy

KaizerIDE is engineered for developers who want a private development environment without hidden cloud dependencies.

- **No telemetry** - No behavioral tracking or usage analytics.
- **No background profiling** - No hidden analytics services.
- **No cloud sync requirement** - Editor state and configuration stay local.
- **No required account** - Use the app without an identity system.
- **No project uploads to KaizerIDE infrastructure** - Your local workspace is not transmitted to a KaizerIDE service.

---

## Data ownership

Everything you work on remains under your control:

- **Project files** remain on your device or your chosen remote server.
- **Configuration data** is stored on-device.
- **Editor state** is managed locally.
- **Workspace indexing** runs locally and stores cache locally.

You remain the custodian of your development environment.

---

## AI request handling

AI capabilities are user-controlled and endpoint-driven:

- **Direct routing** - AI requests go directly to the API provider you configure.
- **No KaizerIDE proxy** - KaizerIDE does not proxy, inspect, or log AI traffic.
- **OpenAI-compatible endpoints** - Hosted APIs and local model servers can be used.
- **Local model support** - Ollama, LM Studio, LocalAI, and similar tools can support offline or private workflows.

You decide what data leaves your machine and which AI endpoint receives it.

---

## Workspace indexing privacy

The workspace indexer is designed for local search and context discovery:

- **Local processing** - Indexing happens on your machine.
- **No embeddings upload** - Index data is not sent to a cloud service.
- **Local cache** - Index cache is stored locally.
- **User control** - Indexing can be disabled from settings.

For technical details, see **[Workspace Indexing System](features/INDEXING.md)**.

---

## Security posture

KaizerIDE follows a minimal attack-surface mindset:

- **No mandatory network services**.
- **No background data pipelines**.
- **No silent collection mechanisms**.
- **No external authentication dependency**.

For vulnerability reporting and supported versions, see **[Security Policy](SECURITY.md)**.

---

## Bottom line

KaizerIDE is for developers and teams who need local-first AI coding with no telemetry, no required accounts, and no outbound data by default.
