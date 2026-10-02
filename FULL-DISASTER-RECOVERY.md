# KDI AI OFFICE — FULL DISASTER RECOVERY RUNBOOK

## Document Version: 1.0.0
## Authority: Canonical Office Computer Recovery Procedure
## Classification: Internal Operations / Confidential

---

## 1. Scope & Objective
This procedure provides step-by-step instructions to restore the full operational integrity of KDI AI Office from bare metal or replacement hardware following a **Level 4 (Host Computer Failure)** or **Level 5 (Complete Site Loss)** catastrophe.

Someone other than the original implementer must be able to follow and execute this procedure successfully.

---

## 2. Disaster Recovery Levels
KDI AI Office categorizes failures into 5 discrete recovery tiers:

| Tier | Failure Category | Immediate Mitigation | Recovery Target (RTO) |
| :--- | :--- | :--- | :--- |
| **Level 1** | Single Service Failure (e.g. Neo4j crash) | Automatic restart with backoff, Degraded Mode active | < 2 minutes |
| **Level 2** | Application Crash (e.g. NestJS unhandled exception) | Worker queue drain, process restart, orphan task recovery | < 2 minutes |
| **Level 3** | Database Corruption (e.g. Postgres bad block) | PITR restore from WAL or latest daily logical dump | < 15 minutes |
| **Level 4** | Office Computer Failure (hardware/OS dead) | Provision replacement host, restore vault, resume | < 2 hours |
| **Level 5** | Complete Site Loss (office destroyed/inaccessible) | Activate cloud/VPS secondary node from offsite vault | < 4 hours |

---

## 3. Pre-Requisites & Required Recovery Materials
Before commencing restoration, verify possession of:
1. **Replacement Host System**:
   - OS: Windows 11 / Windows Server 2022 (or Linux Ubuntu 22.04 LTS with equivalent container runtime).
   - CPU: >= 8 Cores (Intel Core i5 13th Gen or equivalent).
   - RAM: >= 16 GB Physical Memory.
   - Storage: Drive with >= 100 GB free space (Drive `D:\` recommended on Windows).
2. **Software Prerequisites**:
   - Node.js >= 20.x, npm >= 10.x
   - Python >= 3.10
   - Git >= 2.40
   - Docker & Docker Compose (or native PostgreSQL 16, Redis 7, Neo4j 5.20)
3. **Recovery Secrets**:
   - Master Backup Encryption Key (`BACKUP_ENCRYPTION_KEY`)
   - Production Environment Blueprint (`.env.production`)
   - Cloud AI Provider API Keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`)
4. **Backup Materials**:
   - Latest encrypted backup payload (`bkp_postgresql_*.enc.json`) from offsite vault (`D:\kdi-offsite-vault` or cloud replica).

---

## 4. Phase-by-Phase Disaster Recovery Execution

```text
Host Provisioning & Runtimes
            ↓
Environment & Secret Restoration
            ↓
Database Infrastructure Initialization
            ↓
Data Restoration & Decryption Drill
            ↓
Core Application & Runtime Boot
            ↓
Integrity Verification & Test Queries
            ↓
Gateway Reconnection & Autonomy Resumption
```

### Phase 1: Host Preparation & Repository Checkout
1. Clone the canonical repository:
   ```bash
   git clone <repository_url> "D:\kdi-ai-office"
   cd "D:\kdi-ai-office"
   ```
2. Install workspace dependencies:
   ```bash
   npm ci
   npm run build
   ```

### Phase 2: Configuration & Secrets Provisioning
1. Retrieve `.env.production` from the secure secrets vault and place it in the project root:
   ```bash
   cp /secure/vault/kdi/.env.production .env.production
   ```
2. Execute the preflight configuration check:
   ```bash
   npm run validate:prod
   ```
   *Gate: Do not proceed until all 22 required variables pass validation.*

### Phase 3: Database & Infrastructure Spin-Up
1. Launch production container stack:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.prod.yml up -d postgres redis neo4j
   ```
2. Verify database liveness:
   ```bash
   docker exec kdi_postgres_prod pg_isready -U kdi_admin
   docker exec kdi_redis_prod redis-cli ping
   ```

### Phase 4: Database Decryption & Data Restoration
1. Locate the latest backup file in the offsite directory (e.g. `D:\kdi-offsite-vault\bkp_postgresql_latest.enc.json`).
2. Run the automated restoration script:
   ```bash
   node infrastructure/scripts/restore-from-vault.mjs --backup=D:\kdi-offsite-vault\bkp_postgresql_latest.enc.json
   ```
3. The restore utility:
   - Verifies the SHA-256 integrity checksum.
   - Decrypts the AES-256-GCM envelope using `BACKUP_ENCRYPTION_KEY`.
   - Ingests schemas and tables into PostgreSQL.
   - Reconstructs Neo4j knowledge graph nodes from the PostgreSQL event stream.

### Phase 5: Core Application & Runtime Startup
1. Launch the KDI Core API and WebSocket Gateway:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.prod.yml up -d api
   ```
2. Inspect startup probe:
   ```bash
   curl -s http://127.0.0.1:3000/reliability/health/startup | jq .
   ```
   *Expected: `"initialized": true`*

### Phase 6: Operational Verification & Data Integrity Drill
Verify the 10 subsystems health matrix:
```bash
curl -s http://127.0.0.1:3000/reliability/health/10 | jq .
```
Verify the 9-category Operational Scorecard:
```bash
curl -s http://127.0.0.1:3000/reliability/scorecard | jq .
```

Verify entity counts:
- Projects count > 0
- Tasks history intact
- Workforce compensation catalog preserved
- Autonomy Level 0–4 policies enforced

### Phase 7: Gateway Reconnection & Operation Resumption
1. Re-establish the secure reverse-proxy tunnel to Hostinger:
   ```bash
   cloudflared tunnel run kdi-office-tunnel
   ```
2. If the system was started in `RECOVERY_MODE`, operator issues resumption command via Human Command Center:
   ```bash
   curl -X POST http://127.0.0.1:3000/reliability/emergency/recovery-mode -H "Content-Type: application/json" -d '{"enabled": false, "operator": "PrimaryOperator"}'
   ```
3. Autonomous operations resume under standard governance.

---

## 5. Rollback & Emergency Contingency
If data restored from the latest snapshot is found to contain corruption:
1. Immediately enable **READ-ONLY MODE**:
   ```bash
   curl -X POST http://127.0.0.1:3000/reliability/emergency/read-only -H "Content-Type: application/json" -d '{"enabled": true, "operator": "IncidentLead", "reason": "Restoration anomaly"}'
   ```
2. Fall back to the preceding weekly snapshot (`bkp_postgresql_*_WEEKLY.enc.json`).
3. Re-run reconciliation:
   ```bash
   curl -X POST http://127.0.0.1:3000/reliability/reconciliations -H "Content-Type: application/json" -d '{"type": "tasks", "autoRemediate": false}'
   ```
