# ADR-032: KDI Backup and Disaster Recovery Strategy

## Status
Accepted (Phase 10 — Production Hardening)

## Context
KDI AI Office manages critical intellectual property, project worktrees, task execution records, workforce market benchmarks, and GraphRAG institutional memory. Because the canonical runtime operates on physical hardware where the Windows C: drive has restricted headroom (~5GB free) and the secondary D: drive has abundant space (~250GB free), backup placement, encryption, offsite staging, and verified restoration procedures must be systematically governed.

## Decision
1. **Targeted Storage Architecture**:
   - Primary backup destination is placed on secondary storage (`D:\kdi-backups`) to eliminate any risk of crashing the Windows host OS via disk starvation.
   - Encrypted backup payloads are mirrored to an isolated offsite staging vault (`D:\kdi-offsite-vault` and remote VPS/cloud storage sync).
2. **Authenticated Encryption at Rest**:
   - All backups containing private database rows, project repositories, or credentials metadata are encrypted using AES-256-GCM with PBKDF2 key derivation (100,000 iterations, SHA-256), a random 16-byte IV, and an authentication tag. Unencrypted backup dumps are strictly prohibited.
3. **Multi-Database Recovery Strategy**:
   - **PostgreSQL**: Authoritative relational store. Daily logical encrypted dumps + continuous WAL archiving. RPO <= 1h, RTO <= 15m.
   - **Neo4j**: Derived intelligence graph. Rebuildable from PostgreSQL operational event logs and schema DDL. RPO <= 4h, RTO <= 30m.
   - **Redis**: Fast broker. Classified into ephemeral cache (non-persisted) and durable event queues (AOF `appendfsync everysec` + RDB snapshot). RPO <= 1m, RTO <= 5m.
4. **Mandatory Restore Verification**:
   - A backup is not considered valid merely because creation succeeds. Automated restore drills decrypt the payload, rehydrate the schema in a clean sandbox, verify table row counts (projects, tasks, executions, agents, workforce, decisions, memory, costs), and execute test query suites.
5. **Tiered Retention Policy**:
   - Daily backups retained for 7 days.
   - Weekly snapshots retained for 4 weeks.
   - Monthly snapshots retained for 12 months.
   - Expired artifacts are automatically purged.

## Consequences
- **Positive**: High resilience against hardware failure or site loss; zero plaintext leakage of private projects in backup files; clear, mathematically substantiated RPO/RTO targets.
- **Negative**: Disk I/O and CPU overhead during daily encryption routines; offsite synchronization requires stable network connectivity.
