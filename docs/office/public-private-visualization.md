# Public vs Private Office Visualization Boundary

## 1. Zero-Trust Data Isolation
KDI AI Office enforces rigorous data masking between public visitors and authorized internal operators:

```text
Incoming Request
      │
      ├──> If Public: GET /office/snapshot?internal=false
      │       ├── Filter: Strip internal-only rooms (Server Room, Management)
      │       ├── Filter: Mask internal task IDs, exact LLM tokens, and cost ledgers
      │       └── Filter: Strip unverified commits and code diffs
      │
      └──> If Authorized Internal: GET /office/snapshot?internal=true
              ├── Full access: All 14 rooms visible
              ├── Full telemetry: Task IDs, active branch, model provider, cost
              └── Full graph: Bounded 3-hop Neo4j knowledge expansion
```

## 2. Telemetry Masking Rules
- **Public View:** Displays Agent Name, Role, Department, Grade, Current Activity Summary, and Public Projects.
- **Private View:** Unlocks exact model identifier (`ollama:qwen2.5-coder:7b`, `gemini-1.5-pro`), execution runtime metrics, cost in USD, active Git worktree, and GraphRAG citations.
- **Strict Boundary:** Credentials, database passwords, API keys, and raw prompts are never sent to either client tier.
