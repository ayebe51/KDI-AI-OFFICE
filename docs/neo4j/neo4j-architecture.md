# Neo4j Architecture: KDI Intelligence Graph

## 1. System Role & Topology

In the KDI AI Office platform, Neo4j functions as the secondary **Relationship, Intelligence, and Context Graph**, operating in strict synergy with PostgreSQL (operational source of truth) and Redis (event bus).

```text
                        KDI RUNTIME / AI MANAGER
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
        (Authoritative)                              (Derived)
         POSTGRESQL 16                                NEO4J 5.20+
    • Operational Truth                          • Relationship Graph
    • Tasks & Queues                             • AST Code Topology
    • Users & Personas                           • Architecture Decisions
    • Immutable Audit Logs                       • 3-Tier Graph Memory
    • Financial Ledgers                          • GraphRAG Vector Index
              │                                         │
              └────────────────────┬────────────────────┘
                                   │
                              GRAPHRAG
                           CONTEXT BUILDER
                                   │
                                 AGENT
```

## 2. Driver & Connection Layer
- **Driver:** Official `neo4j-driver` (v5.27+ with Node.js Bolt connection pooling).
- **Protocols:** Bolt (`bolt://127.0.0.1:7687`) for high-throughput binary Cypher execution, HTTP (`http://127.0.0.1:7474`) for telemetry and administration.
- **Connection Pooling:** `maxConnectionPoolSize = 20`, `maxConnectionLifetime = 3m`, `connectionTimeout = 3000ms`.
- **Fault-Tolerant Isolation:** If the Neo4j daemon is unreachable or encounters connection timeouts, `Neo4jGraphRepository` automatically switches to in-memory fallback mode. Core PostgreSQL transactions are never blocked or rolled back by graph errors.

## 3. Transaction Management & Cypher Safety
- Parameterized Cypher queries are strictly mandatory across all methods.
- Dynamic label and relationship type interpolations are checked against strict runtime whitelists (`VALID_LABELS`, `VALID_REL_TYPES`), completely eliminating Cypher injection risks.
- Read operations utilize read replicas or read transactions (`executeRead`), while node and edge updates utilize managed write transactions (`executeWrite`).
