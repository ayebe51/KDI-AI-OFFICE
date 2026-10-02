# KDI AI Office — Subsystem Recovery Runbooks

This document provides standardized, step-by-step operational recovery procedures for all critical failure scenarios.

---

## Runbook 1: API Failure
- **Detection**: Health monitor reports `kdi_api = unhealthy`; HTTP requests return 502/503 or connection refused on `http://127.0.0.1:3000/health/liveness`.
- **Diagnosis**: Inspect Windows Event Viewer or PM2/Node logs (`Get-Content logs/api.log -Tail 100`). Check for unhandled exceptions, port collisions on 3000, or Node heap out-of-memory.
- **Action**:
  1. Terminate orphaned Node processes: `Stop-Process -Name node -Force -ErrorAction SilentlyContinue`.
  2. Verify environment secrets: Check `.env` configuration file integrity.
  3. Restart API service: `npm run start:api` or service manager equivalent.
- **Verification**: Query `curl http://127.0.0.1:3000/health/readiness`. Status must return HTTP 200 with all core dependencies online.
- **Rollback**: If recent code change caused failure, execute `git revert HEAD` and rebuild (`npm run build`).
- **Escalation**: Alert Lead Operator if API fails to stay up for >3 restarts (Crash Loop state).

---

## Runbook 2: PostgreSQL Failure
- **Detection**: Health monitor flags `postgresql = unhealthy`; API logs display `ECONNREFUSED 127.0.0.1:5432` or database connection pool timeout.
- **Diagnosis**: Run `Get-Service postgresql*` in PowerShell. Inspect PostgreSQL server log directory (`C:\Program Files\PostgreSQL\16\data\log\`). Check disk space on drive `C:\`.
- **Action**:
  1. Restart Windows Service: `Restart-Service postgresql-x64-16`.
  2. If service fails to start due to disk space, clear temp files or relocate PostgreSQL log archives.
  3. If corruption detected, prepare restore from clean snapshot in `D:\kdi-backups`.
- **Verification**: Execute test query: `psql -U kdi_app -d kdi_office -c "SELECT count(*) FROM projects;"`.
- **Rollback**: If migration caused failure, execute down migration or restore pre-migration backup snapshot.
- **Escalation**: Escalate to Database Administrator if WAL corruption or transaction log lockup occurs.

---

## Runbook 3: Redis Failure
- **Detection**: Health monitor flags `redis = unhealthy`; Task queue operations, pub/sub, or agent state sync fails.
- **Diagnosis**: Check Redis process status (`Get-Process redis-server` or `docker ps -f name=redis`). Inspect memory usage.
- **Action**:
  1. Restart Redis process or container: `docker restart kdi-redis` or `Restart-Service Redis`.
  2. If memory full (`OOM command not allowed`), inspect key expiration policies and run eviction on ephemeral keys.
- **Verification**: Execute `redis-cli ping` (must respond `PONG`). Check health endpoint `/reliability/health`.
- **Rollback**: Re-initialize with clean appendonly file if AOF corruption blocks startup (`redis-check-aof --fix`).
- **Escalation**: Alert Operator if event queue backlog exceeds 1,000 unhandled messages.

---

## Runbook 4: Neo4j Failure
- **Detection**: Health monitor flags `neo4j = degraded` or `unhealthy`; GraphRAG queries fail or return fallback status.
- **Diagnosis**: Query Neo4j Bolt port `7687` and HTTP port `7474`. Inspect `neo4j.log` and `debug.log`. Check Java heap limit.
- **Action**:
  1. Restart Neo4j service / container: `docker restart kdi-neo4j`.
  2. If Neo4j is unrecoverable, system operates in **Degraded Mode** (core tasks continue, GraphRAG disabled).
  3. Rebuild graph projections from PostgreSQL event log using `npm run graph:reconcile`.
- **Verification**: Run Cypher test query: `MATCH (n) RETURN count(n) LIMIT 1;`.
- **Rollback**: Re-run Graph schema & index creation scripts if indices were invalidated.
- **Escalation**: Notify Knowledge Engineer if graph reconciliation mismatches persist.

---

## Runbook 5: AI Provider Failure
- **Detection**: Circuit breaker for Gemini, Groq, or OpenRouter transitions to `OPEN`. Outgoing LLM calls return 429, 500, or timeout.
- **Diagnosis**: Query `/reliability/health` to inspect provider matrix. Check external API status dashboards and account quota/billing status.
- **Action**:
  1. Confirm AI Router automatic fallback activated (Gemini -> Groq -> Local Ollama).
  2. If external internet is down, enable local-only inference route for eligible workloads.
  3. Mark non-urgent engineering/research tasks as `WAITING_PROVIDER`.
- **Verification**: Test prompt via fallback provider: `npm run test:provider -- --provider=groq`.
- **Rollback**: Reset circuit breaker manually via Command Center once external service status is green.
- **Escalation**: Notify Operations Lead if all external providers remain offline for >15 minutes.

---

## Runbook 6: Antigravity Engineering Failure
- **Detection**: Antigravity subprocess or tool execution times out or returns non-zero exit code; tasks stuck in engineering stage.
- **Diagnosis**: Inspect Antigravity CLI status, IPC channels, and workspace repository locks.
- **Action**:
  1. Release git locks in target workspace (`Remove-Item -Path .git/index.lock -Force`).
  2. Restart Antigravity engineering worker daemon.
  3. Requeue orphaned engineering tasks with idempotency key.
- **Verification**: Dispatch benign verification task (e.g., repository status check).
- **Rollback**: Revert any uncommitted scratch changes created by failed agent step.
- **Escalation**: Notify Engineering Lead if tool execution permission or authentication token expired.

---

## Runbook 7: Disk Space Full (C: or D: Drive)
- **Detection**: Resource governance flags `DISK_WARNING` (<10GB) or `DISK_CRITICAL` (<5GB).
- **Diagnosis**: Run `Get-PSDrive -PSProvider FileSystem` to inspect usage across `C:\` and `D:\`.
- **Action**:
  1. Prune temporary Node caches: `npm cache clean --force`.
  2. Prune old Docker build layers: `docker system prune -f`.
  3. Move local backups from `D:\kdi-backups` to offsite storage vault `D:\kdi-offsite-vault`.
  4. Run log rotation: compress `.log` files older than 48 hours.
- **Verification**: Confirm free disk space is > 15 GB on both drives.
- **Rollback**: N/A (Cleanup only).
- **Escalation**: Alert Systems Administrator if physical storage expansion is required.

---

## Runbook 8: Memory Pressure (RAM > 85%)
- **Detection**: Resource governance triggers `RAM_WARNING` at 80% and `RAM_CRITICAL` at 90%.
- **Diagnosis**: Run `Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10` to identify memory consumers.
- **Action**:
  1. Throttle worker concurrency down to 1 active worker.
  2. Unload idle Ollama models from host memory (`ollama stop <model>`).
  3. Restart worker subprocesses to reclaim leaked V8 heap memory.
- **Verification**: Confirm RAM utilization drops below 75%.
- **Rollback**: Restore normal worker concurrency once memory is stabilized.
- **Escalation**: Notify Lead Operator if background memory leak persists.

---

## Runbook 9: TLS / Certificate Failure
- **Detection**: HTTPS/WSS connections from public frontend fail with `ERR_CERT_DATE_INVALID` or `CERT_HAS_EXPIRED`.
- **Diagnosis**: Check certificate validity using OpenSSL or browser dev tools on public domain.
- **Action**:
  1. Trigger automated Let's Encrypt / Certbot renewal on reverse proxy / Hostinger gateway.
  2. If manual certificate deployed, import renewed `.pem` or `.pfx` certificate.
  3. Reload reverse proxy (Nginx / Caddy / Hostinger edge router).
- **Verification**: Inspect certificate expiry timestamp: verify >30 days validity remaining.
- **Rollback**: Restore previous working certificate bundle if new certificate format is corrupted.
- **Escalation**: Alert Security Officer if renewal DNS validation fails.

---

## Runbook 10: Credential / Secret Failure
- **Detection**: API requests or database connections reject authentication with 401 Unauthorized or `password authentication failed`.
- **Diagnosis**: Cross-reference secret rotation log in `SecurityHardeningService`. Verify `.env` hash.
- **Action**:
  1. Rotate affected credential using least-privilege service account procedure.
  2. Update secret in encrypted secret store and push updated `.env` to canonical host.
  3. Perform rolling restart of dependent service.
- **Verification**: Verify successful authentication using health monitor check.
- **Rollback**: Re-activate previous valid credential if rotation was performed prematurely.
- **Escalation**: Initiate Security Incident Response if credential was suspected compromised.

---

## Runbook 11: Office Computer Failure (Host Loss)
- **Detection**: Office Computer unresponsive on local network; public frontend gateway returns 504 Gateway Timeout.
- **Diagnosis**: Confirm physical power, thermal, OS crash, or hardware failure of the Windows host.
- **Action**:
  1. Follow `FULL-DISASTER-RECOVERY.md` Level 4 Procedure.
  2. Power on replacement host or restore Windows 11 environment.
  3. Clone repository, restore secrets, and retrieve latest encrypted backup from offsite vault.
  4. Restore PostgreSQL, Neo4j, and Redis state; start services in canonical order.
- **Verification**: Execute full restore verification suite (`npm run ops:restore-test`).
- **Rollback**: N/A.
- **Escalation**: Notify all stakeholders and activate Disaster Recovery team.

---

## Runbook 12: Backup Restore Verification Failure
- **Detection**: Automated clean-room restore test (`RestoreTestService`) returns `success = false` or entity count mismatch.
- **Diagnosis**: Inspect restore verification log. Check for corrupted tarball, invalid AES decryption key, or missing table schema.
- **Action**:
  1. Re-verify AES-256-GCM authentication tag on backup archive.
  2. Test previous generation backup snapshot (N-1 daily backup).
  3. Validate database schema migration compatibility.
- **Verification**: Clean-room restore script executes and passes all 10 entity count assertions.
- **Rollback**: Discard failed restore sandbox database.
- **Escalation**: Immediate high-priority alert to Operations Lead: backup integrity compromised.

---

## Runbook 13: Full Disaster Recovery (Complete Site Loss)
- **Detection**: Total physical loss of office facility (fire, flood, catastrophic theft).
- **Diagnosis**: Confirm primary site unrecoverable.
- **Action**:
  1. Follow `FULL-DISASTER-RECOVERY.md` Level 5 Procedure.
  2. Provision emergency cloud host (VPS / Bare Metal).
  3. Retrieve encrypted backups from offsite cloud bucket / secondary storage.
  4. Initialize Dockerized infrastructure stack with zero public port exposure.
  5. Decrypt and restore PostgreSQL and Neo4j databases.
  6. Point Hostinger DNS / Reverse Proxy tunnel to emergency cloud host.
- **Verification**: Conduct end-to-end smoke test: verify portfolio, workforce, agent autonomy, and graph memory.
- **Rollback**: Transition back to on-premise Office Computer once facility is restored.
- **Escalation**: Executive Management briefing.
