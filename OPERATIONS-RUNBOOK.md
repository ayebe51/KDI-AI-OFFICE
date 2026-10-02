# KDI AI OFFICE — STANDARD OPERATIONS RUNBOOK

## Document Version: 1.0.0
## Authority: 24/7 Office Operations & Reliability Guide
## Target Audience: Production Operators, Site Reliability Engineers, Human Commanders

---

## 1. Quick Reference: Service Commands

### Starting the Office Services
```powershell
# Windows Host (Development / Hybrid Mode)
npm run dev:api    # Starts NestJS API & WebSocket Gateway on port 3000
npm run dev:web    # Starts PlayCanvas 3D Virtual Office on port 5173

# Containerized Production Stack (Docker Compose)
docker compose -f infrastructure/compose/docker-compose.prod.yml up -d
```

### Stopping Services Gracefully
```powershell
# Graceful stop: drains worker tasks, flushes queues, and terminates DB pools
curl -X POST http://127.0.0.1:3000/reliability/shutdown

# Containerized stop
docker compose -f infrastructure/compose/docker-compose.prod.yml down
```

### Restarting Services with Crash Loop Reset
```powershell
# Reset crash loop state for API or Workers
curl -X POST http://127.0.0.1:3000/reliability/services/kdi-api/reset-backoff
```

---

## 2. Health & Readiness Inspection

### 10 Subsystems Health Matrix
```bash
curl -s http://127.0.0.1:3000/reliability/health/10 | jq .
```
Evaluates all 10 core engines:
1. `api`: HTTP listener & process memory
2. `postgres`: Relational database connection pool
3. `redis`: Queue & pub/sub broker
4. `neo4j`: Graph database Bolt driver
5. `aiRouter`: Active LLM provider chains
6. `ollama`: Local GPU/CPU inference engine
7. `agentRuntime`: Task scheduling & worker availability
8. `metaGpt`: Software engineering team roleplay runtime
9. `antigravity`: Sandboxed git worktrees & execution provider
10. `websocket`: 3D Living Virtual Office streaming gateway

### Liveness Probe (Kubernetes / Process Watcher)
```bash
curl -i http://127.0.0.1:3000/reliability/health/liveness
# Returns HTTP 200 { "alive": true, "uptimeSeconds": ... }
```

### Readiness Probe (Ingress Gateway)
```bash
curl -i http://127.0.0.1:3000/reliability/health/readiness
# Returns HTTP 200 { "ready": true, "criticalServicesReady": true }
```

---

## 3. Backup & Restore Operations

### Creating an Encrypted Backup
```bash
curl -X POST http://127.0.0.1:3000/reliability/backups \
  -H "Content-Type: application/json" \
  -d '{"database": "POSTGRESQL", "tier": "DAILY"}'
```
*Artifact is saved to `D:\kdi-backups\bkp_postgresql_<timestamp>.enc.json` encrypted with AES-256-GCM.*

### Running an Automated Restore Drill
```bash
curl -X POST http://127.0.0.1:3000/reliability/backups/<backup_id>/restore-test
```
*Validates checksum, decrypts in a clean sandbox, and verifies integrity across 10 core entities.*

### Inspecting RPO / RTO Compliance
```bash
curl -s http://127.0.0.1:3000/reliability/rpo-rto | jq .
```

---

## 4. Emergency Modes & Autonomy Overrides

### Emergency Mode Matrix

| Mode | Purpose | Command |
| :--- | :--- | :--- |
| **Global Autonomy Pause** | Immediately halts all autonomous triggers while allowing in-flight tasks to finish | Click **EMERGENCY PAUSE** in Command Center |
| **Read-Only Mode** | Blocks all database mutations, writes, and file modifications | `POST /reliability/emergency/read-only {"enabled": true}` |
| **Safe Mode** | Blocks high-risk actions (Level 3/4: code patches, database migrations) | `POST /reliability/emergency/safe-mode {"enabled": true}` |
| **Maintenance Mode** | Displays maintenance notice to clients and rejects incoming directives | `POST /reliability/emergency/maintenance {"enabled": true}` |
| **Recovery Mode** | Restricts system to authorized operator interventions during disaster recovery | `POST /reliability/emergency/recovery-mode {"enabled": true}` |

---

## 5. Queue Durability & Dead Letter Queue (DLQ)

### Viewing Dead-Lettered Tasks
```bash
curl -s http://127.0.0.1:3000/reliability/dlq | jq .
```

### Replaying an Event Safely (Idempotent)
```bash
curl -X POST http://127.0.0.1:3000/reliability/dlq/<dlqId>/replay
```
*The `IdempotencyService` guarantees that replaying an already-processed event produces zero duplicate side effects.*

---

## 6. Resource Governance & Host Limits

### Inspecting Host CPU, RAM, and Disk
```bash
curl -s http://127.0.0.1:3000/reliability/governance | jq .
```
*Important: If Disk C: free space drops below 10GB, a WARNING is raised. Never place backups or Docker images on drive C:. Always utilize primary storage vault on drive `D:\`.*

---

## 7. Operational Scorecard
```bash
curl -s http://127.0.0.1:3000/reliability/scorecard | jq .
```
Presents ratings and status across 9 essential domains:
1. `availability`
2. `security`
3. `backups`
4. `recovery`
5. `performance`
6. `queueHealth`
7. `providerHealth`
8. `autonomySafety`
9. `dataIntegrity`
