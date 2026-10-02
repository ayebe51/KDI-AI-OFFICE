# Dependency Graph & Startup Order — KDI AI Office

## 1. Topological Dependency Hierarchy

```text
Infrastructure Tier (Zero Dependencies)
  ├── PostgreSQL Database Engine (:5432)
  ├── Redis Event Bus & Queue (:6379)
  └── Neo4j Graph Store (:7687)
         │
         ▼
Application Tier
  └── KDI Core API (:3000)
         ├── depends on PostgreSQL
         ├── depends on Redis
         └── depends on Neo4j
                │
                ▼
Intelligence & Routing Tier
  ├── Dynamic AI Router
  │      └── depends on KDI Core API
  └── Ollama Local Inference (:11434)
         │
         ▼
Execution & Worker Tier
  ├── Agent Runtime & Task Scheduler
  │      ├── depends on PostgreSQL
  │      ├── depends on Redis
  │      └── depends on AI Router
  ├── MetaGPT Roleplay Orchestrator
  │      └── depends on Agent Runtime
  └── Antigravity Engineering Sandbox
         └── depends on Agent Runtime
                │
                ▼
Autonomous Operations & Digital Twin
  ├── Autonomous Operations Engine
  │      ├── depends on Agent Runtime
  │      └── depends on AI Router
  └── WebSocket Telemetry Gateway
         ├── depends on KDI Core API
         └── depends on Redis
```

## 2. Startup & Shutdown Order Contract
1. **Startup Sequence**:
   - Step 1: `kdi-postgres`
   - Step 2: `kdi-redis`
   - Step 3: `kdi-neo4j`
   - Step 4: `kdi-api`
   - Step 5: `kdi-ai-router`
   - Step 6: `kdi-ollama`
   - Step 7: `kdi-agent-runtime`
   - Step 8: `kdi-metagpt`
   - Step 9: `kdi-antigravity`
   - Step 10: `kdi-autonomy-engine`
   - Step 11: `kdi-websocket`
2. **Shutdown Sequence**: Exactly reverses the startup sequence (`kdi-websocket` down to `kdi-postgres`).
