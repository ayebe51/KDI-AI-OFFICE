# ADR-019: Neo4j as KDI Intelligence Graph

## Status
Accepted

## Context
KDI AI Office requires a robust memory and context architecture where autonomous agents can understand relationships between projects, tasks, executions, code files, commits, test results, and architecture decisions.

While PostgreSQL 16 serves as the authoritative operational source of truth for transactional data (ACID guarantees, task queues, financial ledgers, audit hashes), relational databases face performance bottlenecks when performing multi-hop relationship traversals (e.g. 2-hop to 4-hop graph walks across tasks, dependencies, code files, and ADR decisions). Furthermore, pure vector databases lack the explicit topological structure needed to trace decisions back to commits and test runs without hallucination.

## Decision
We adopt **Neo4j** (Community Edition 5.20+ with APOC and vector index support) as the **KDI Intelligence Graph**:
1. **Separation of Concerns:**
   - **PostgreSQL 16:** Authoritative operational source of truth.
   - **Neo4j:** Derived relationship, context, and intelligence graph.
   - **Redis 7:** Asynchronous event bus and transient state transport.
2. **Eventual Consistency & Asynchronous Ingestion:**
   - Graph updates are driven asynchronously via KDI Runtime and engineering events (`task.created`, `task.assigned`, `engineering.started`, `engineering.file.changed`, `engineering.completed`, `decision.created`).
   - If Neo4j is offline or unavailable, core business operations in PostgreSQL proceed without interruption; graph writes degrade gracefully and can be recovered via event replay or operational graph reconstruction.
3. **Repository Abstraction:**
   - Business services never invoke raw Cypher queries directly. All graph interactions flow through the `GraphRepository` abstraction (`Neo4jGraphRepository`).
4. **Identifier Strategy:**
   - Every graph node carries `id`, `entityType`, `sourceSystem` (e.g. `kdi-postgres`), and `sourceId`, allowing 100% bidirectional traceability back to the operational database.

## Alternatives Considered
- **PostgreSQL Recursive CTEs:** Complex to maintain, slow on deep traversals across heterogeneous entities, lacks native vector search index integration.
- **Pure Vector Database (e.g., Pinecone, Qdrant):** Loses explicit structural relationships (e.g., `Task -DEPENDS_ON-> Task`, `Commit -CHANGED-> File`); prone to disconnected semantic hallucinations.
- **In-Memory Graphs Only:** Non-persistent, lost on worker restart, cannot scale across multiple distributed workers.

## Consequences
- **Positive:** Sub-millisecond multi-hop neighborhood traversals; explicit citable relationship paths; vector index search co-located with graph topology; 100% recoverable from PostgreSQL operational truth.
- **Trade-offs:** Requires running a Neo4j daemon/container (port 7687 Bolt, 7474 HTTP); eventual consistency means graph state trails operational transactions by ~10–50ms.
