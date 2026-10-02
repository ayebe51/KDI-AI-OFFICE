# RPO & RTO Service Targets — KDI AI Office

## Definitions
- **Recovery Point Objective (RPO)**: The maximum acceptable data loss measured in time units between the last persisted backup/state and a catastrophic incident.
- **Recovery Time Objective (RTO)**: The maximum acceptable duration required to restore the service to operational readiness following an outage.

## Target Matrix & Methodological Rationale

| Subsystem | Target RPO | Target RTO | Actual RPO | Actual RTO | Rationale |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **PostgreSQL Database** | <= 1h | <= 15m | ~1h (WAL: <5m) | ~5m | Daily automated encrypted logical dumps combined with continuous WAL archiving; tested restore takes < 300s. |
| **Neo4j Graph Database** | <= 4h | <= 30m | ~2h | ~10m | Graph structure is derived from authoritative PostgreSQL events and rebuildable via event stream replays. |
| **Redis Event / Queue Layer** | <= 1m | <= 5m | ~1s | ~1m | Configured with `appendonly yes` and `appendfsync everysec`, ensuring at most 1 second of event state at risk. |
| **KDI Core API & Runtime** | 0s | <= 2m | 0s | ~30s | Stateless NestJS application architecture boots and binds within 10–30 seconds. |
| **Dynamic AI Router** | 0s | <= 1m | 0s | ~10s | In-memory model registry and multi-provider fallback engine require zero warm-up time. |
