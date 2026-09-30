# KDI Autonomy Levels Taxonomy

KDI AI Office enforces a strict 5-tier autonomy gradient. AI agents operate strictly within their assigned level.

| Level | Identifier | Scope & Capabilities | Human Authority Gate |
| :--- | :--- | :--- | :--- |
| **0** | `OBSERVE` | Read-only telemetry, logs, metric monitoring. Zero mutation. | None required |
| **1** | `SUGGEST` | Analytical synthesis, generating recommendations, architectural plans. | Review on demand |
| **2** | `EXECUTE_LOW_RISK` | Autonomous execution of whitelisted, non-destructive tasks (e.g. read endpoint, smoke test, format report). | Background audit |
| **3** | `APPROVAL_REQUIRED` | High-risk actions (code patches, database migrations, configuration changes). Halts execution until cryptographic signoff. | **Explicit human approval required** |
| **4** | `HUMAN_ONLY` | Critical actions (credential modification, security boundary edits, irreversible production deletions). AI execution strictly forbidden. | **Direct human execution only** |

## Level Transition Governance
- **No Self-Elevation**: AI agents cannot upgrade their own autonomy level or approve actions at Level 3 or 4.
- **Fail-Safe Default**: Any action without an explicit policy match defaults to Level 3 (halt and request approval).
