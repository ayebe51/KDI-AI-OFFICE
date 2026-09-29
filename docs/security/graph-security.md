# Graph Security & Privacy Isolation

## 1. Multi-Tenant Project Boundary Isolation
Graph queries are scoped strictly by `projectId`.
- Cross-project traversals are blocked during context building.
- An agent or user querying Project A cannot access nodes or memories belonging to Project B unless explicitly authorized as multi-project shared technology.

## 2. Visibility Levels
- `PUBLIC`: Sanitized project descriptions, public portfolio showcases, open-source technology summaries.
- `INTERNAL`: Standard developer context, architecture decisions, task descriptions, unit test results.
- `PRIVATE`: Department-level discussions, internal cost summaries, non-public designs.
- `CONFIDENTIAL`: KMS secrets metadata, security audit vulnerabilities, executive decisions. Stripped from all standard public/internal queries.

## 3. Cypher Injection Defense
- Zero string interpolation of user input.
- All values parameterized via `$id`, `$projectId`, etc.
- Labels and relationship types validated against `VALID_LABELS` and `VALID_REL_TYPES` sets.
- Traversal depth capped to maximum 4 hops to prevent graph explosion attacks.
