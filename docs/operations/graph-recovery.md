# Graph Recovery & Disaster Rebuild

## 1. Recovery Model
Because PostgreSQL 16 is the authoritative operational source of truth and Redis retains event journals, Neo4j graph state is derivable and reconstructable.

```text
┌─────────────────┐       ┌──────────────────┐
│  POSTGRESQL 16  │       │  EVENT JOURNALS  │
│  Projects/Tasks │       │   Redis Streams  │
└────────┬────────┘       └────────┬─────────┘
         │                         │
         └────────────┬────────────┘
                      ↓
           GraphRebuildService
                      ↓
           NEO4J RECONSTRUCTION
         (Idempotent Upserts)
```

## 2. Rebuild Procedures
- **Project Rebuild:** `POST /memory/rebuild` with body `{"projectId": "PRJ-KDI"}`.
- **Full Rebuild:** `POST /memory/rebuild` with empty body rebuilds all registered projects, standard technologies, and baseline ADRs (`ADR-001` through `ADR-020`).
- **Idempotency:** Stable deterministic IDs prevent duplicate nodes or duplicate relationships during re-execution.
