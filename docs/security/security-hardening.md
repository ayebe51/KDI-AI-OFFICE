# Security Hardening & Principle of Least Privilege — KDI AI Office

## 1. Security Architecture
KDI AI Office enforces strict defense-in-depth across the operating system, container boundaries, application authentication, and autonomous agent sandboxes.

## 2. Least Privilege Service Account Roles
Universal superuser database access is replaced with 4 isolated role identities:
1. `kdi_api_app`: Normal CRUD runtime on application entities (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Blocked from `DROP TABLE`, `ALTER SCHEMA`, or superuser administration.
2. `kdi_migrator`: Schema migration account. Permitted DDL execution during controlled maintenance windows.
3. `kdi_backup_svc`: Read-only access on the public schema for generating `pg_dump` snapshots. Mutation strictly denied.
4. `kdi_reporter`: Read-only observer account for telemetry, metrics, and scorecards.

## 3. Autonomous Agent Sandbox Boundaries
- Agents execute inside isolated git worktrees (`ai/task-*`).
- Destructive commands (`rm -rf`, `DROP`, credential modification) are blocked by the Level 4 Autonomy Policy Gate.
- In-memory secret scrubbing removes API keys, private certificates, and passwords before logging or WebSocket broadcast.
