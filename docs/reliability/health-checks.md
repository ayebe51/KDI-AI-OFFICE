# Health Checks & Probes Model — KDI AI Office

## 1. Tripartite Probe Architecture
KDI AI Office adheres to standard operational probe paradigms:
- **Liveness Probe (`/health/liveness`)**: Asserts that the Node/NestJS process is running, responsive to HTTP requests, and has not entered an unrecoverable deadlocked state.
- **Readiness Probe (`/health/readiness`)**: Asserts that all critical infrastructure dependencies (PostgreSQL pool, Redis client, Agent Runtime queue) are online and capable of accepting traffic.
- **Startup Probe (`/health/startup`)**: Asserts that all initialization stages (loading configuration, seeding digital employees, priming AI Router, mounting Antigravity sandboxes) have completed.

## 2. 10 Subsystems Health Matrix
Every critical engine delivers a typed `DetailedHealthStatus`:
- `status`: `HEALTHY` | `DEGRADED` | `UNHEALTHY` | `UNKNOWN`
- `cause`:
  - `SERVICE_HEALTHY`: Normal operation
  - `DEPENDENCY_UNHEALTHY`: Underlying datastore or external service offline
  - `CONFIGURATION_INVALID`: Malformed credentials or blueprint mismatch
  - `AUTHENTICATION_FAILED`: Expired token or revoked key
  - `RESOURCE_EXHAUSTED`: Host CPU/RAM or disk pressure

## 3. Degradation vs Restart
A service is **never restarted** if a transient dependency outage can be handled via Degraded Mode (e.g. Neo4j offline does not crash the core API; it merely suspends GraphRAG queries).
