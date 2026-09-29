# ADR-013: Graph-Driven Collaboration & Dynamic Meeting Coordination

## Status
**APPROVED** (Phase 0 Addendum)

## Context
In multi-agent environments, inter-agent collaboration often suffers from two extremes: either agents never visibly collaborate (operating as disconnected siloed worker threads), or they engage in unconstrained, chaotic chat loops that burn exorbitant token budgets without producing actionable outcomes.

## Decision
We implement **Graph-Driven Collaboration and Structured Meetings**:
1. Cross-agent meetings are scheduled dynamically by the AI Manager based on actual dependency relationships in Neo4j (e.g., when multiple agents are linked via `(:Agent)-[:WORKS_ON]->(:Project)` or `(:Agent)-[:HAS_RUN]->(:Task)`).
2. Meetings are formal entities (`office_meetings`) with explicit agendas, participant rosters, and time-bounded execution.
3. In the 3D office, avatars physically convene at the Meeting Room table, and collaborative consensus decisions are recorded in PostgreSQL and Neo4j `:Meeting` nodes.

## Rationale
- Anchors collaboration to real project graph topology rather than arbitrary triggers.
- Prevents infinite dialogue loops through strict agenda-driven handoff protocols.

## Consequences
- **Positive:** Purposeful, auditable collaboration; spatial visualization of genuine team coordination.
- **Negative:** Requires state synchronization between the graph relationship engine and the 3D avatar movement coordinator.
