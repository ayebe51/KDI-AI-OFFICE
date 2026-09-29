# ADR-003: Dual Database Strategy: Neo4j for Topology & PostgreSQL for Relational State

## Status
**APPROVED** (Phase 0 Baseline)

## Context
An autonomous software engineering system requires two fundamentally distinct data access paradigms:
1. **Relational & Linear State:** Users, tasks, hourly token usage, audit timestamps, and tool exit codes requiring ACID transactions and strict schemas.
2. **Topological & Lineage Graphs:** Code dependencies (`File -[:IMPORTS]-> File`), call graphs (`Function -[:CALLS]-> Function`), and multi-hop traceability (`Task -> Req -> File -> Commit -> Test`).

Attempting to model multi-hop graph hierarchies in relational SQL requires complex recursive CTEs that scale poorly. Conversely, storing transactional audit ledgers and token counters in a graph database is inefficient and lacks relational tooling support.

## Decision
We adopt a **Dual-Database Architecture**:
- **PostgreSQL 16:** Relational source of truth for transactional state, tasks, tool call logs, users, and audit records.
- **Neo4j 5:** Graph source of truth for code AST topologies, GraphRAG architectural context, and lineage paths.

## Rationale
- Leveraging both technologies plays to their native strengths: PostgreSQL provides fast relational indexing, ACID compliance, and standard JSONB querying; Neo4j provides native pointer-hopping Cypher traversals in constant time regardless of depth.
- Synchronization is decoupled: PostgreSQL commits emit background events consumed by the graph indexer, maintaining eventual consistency without blocking transactional APIs.

## Consequences
- **Positive:** Optimal query performance for both relational operations and complex GraphRAG traversals.
- **Negative:** Dual database operations require managing two database engines locally and maintaining synchronization integrity.
