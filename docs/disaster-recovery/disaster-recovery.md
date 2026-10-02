# Disaster Recovery Architecture & Scenarios — KDI AI Office

## 1. Disaster Recovery Levels & Scenarios

### Level 1: Single Service Failure
- **Symptom**: Neo4j, Redis, or Ollama process dies.
- **Action**: Automatic restart via `RestartPolicyService`. Degraded Mode active during backoff.
- **Data Risk**: Zero data loss.

### Level 2: Application Failure
- **Symptom**: KDI API crashes due to unhandled exception or process termination.
- **Action**: Worker tasks in flight are detected via missing heartbeats and requeued by `WorkerRecoveryService`.
- **Data Risk**: Zero data loss.

### Level 3: Database Corruption
- **Symptom**: PostgreSQL physical data file corruption.
- **Action**: Stop application, wipe corrupted data volume, restore from latest daily encrypted backup + WAL replay.
- **Data Risk**: RPO <= 1h (logical) or <= 5m (WAL).

### Level 4: Office Computer Failure
- **Symptom**: Primary desktop hardware fails (motherboard, SSD, power supply).
- **Action**: Provision replacement machine, restore environment secrets from vault, restore PostgreSQL from `D:\kdi-offsite-vault` replica, rebuild Neo4j from events, start API.
- **Target RTO**: < 2 hours.

### Level 5: Complete Site Loss
- **Symptom**: Physical office destroyed or inaccessible.
- **Action**: Spin up temporary cloud VPS runtime, deploy `docker-compose.prod.yml`, ingest offsite encrypted cloud backup, redirect Hostinger tunnel.
- **Target RTO**: < 4 hours.
