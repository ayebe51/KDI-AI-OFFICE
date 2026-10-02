# Service Inventory — KDI AI Office

## Canonical Service Registry

| Service ID | Service Name | Type | Host | Port | Criticality | Startup Order | Backup Required |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `kdi-postgres` | PostgreSQL Database Engine | DATABASE | 127.0.0.1 | 5432 | CRITICAL | 1 | Yes |
| `kdi-redis` | Redis Queue & Event Bus | CACHE | 127.0.0.1 | 6379 | CRITICAL | 2 | Yes |
| `kdi-neo4j` | Neo4j Graph Database | GRAPH | 127.0.0.1 | 7687 | CRITICAL | 3 | Yes |
| `kdi-api` | KDI Core API & NestJS Host | API | 127.0.0.1 | 3000 | CRITICAL | 4 | No |
| `kdi-ai-router` | Dynamic AI Router | ROUTER | 127.0.0.1 | 3000 | CRITICAL | 5 | No |
| `kdi-ollama` | Ollama Local LLM Inference | ORCHESTRATOR | 127.0.0.1 | 11434 | HIGH | 6 | No |
| `kdi-agent-runtime` | Multi-Agent Runtime & Scheduler | WORKER | 127.0.0.1 | 3000 | CRITICAL | 7 | No |
| `kdi-metagpt` | MetaGPT Roleplay Orchestrator | ORCHESTRATOR | 127.0.0.1 | 3000 | HIGH | 8 | No |
| `kdi-antigravity` | Antigravity Engineering Sandbox | WORKER | 127.0.0.1 | 3000 | CRITICAL | 9 | No |
| `kdi-autonomy-engine` | Autonomous Operations Engine | ORCHESTRATOR | 127.0.0.1 | 3000 | CRITICAL | 10 | No |
| `kdi-websocket` | Real-time WebSocket Gateway | GATEWAY | 127.0.0.1 | 3000 | HIGH | 11 | No |

## Criticality Classifications
- **CRITICAL**: Outage blocks end-to-end task execution or causes permanent operational halt. High-priority alerting, automated restart with backoff, and DLQ routing.
- **HIGH**: Non-blocking feature degradation (e.g. 3D digital twin visualization or local LLM inference); fallback mechanisms automatically engage.
