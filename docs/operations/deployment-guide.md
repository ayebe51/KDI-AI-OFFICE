# Production Deployment & Operations Guide: Office Computer

## 1. Overview & Architecture Separation
This guide provides step-by-step instructions for deploying and running **KDI AI Office** on the **Office Computer (Komputer Kantor)**.

The deployment model strictly guarantees that the Office Computer functions as an autonomous, self-contained sovereign AI runtime. Once deployed, the developer's laptop can be disconnected or shut down completely (`Laptop OFF`), and the AI Office runtime will continue executing tasks 24/7.

```text
┌───────────────────────┐              ┌────────────────────────┐
│   DEVELOPER LAPTOP    │              │    HOSTINGER / WEB     │
│ • Code authoring      │              │ • Public 3D Frontend   │
│ • Unit & Syntax tests │              │ • Static Web Assets    │
│ • Git Push            │              └───────────┬────────────┘
└──────────┬────────────┘                          │ HTTPS / WSS
           │                                       │ (Reverse Tunnel)
           ▼                                       ▼
┌───────────────────────────────────────────────────────────────┐
│               OFFICE COMPUTER (SOVEREIGN RUNTIME)             │
│ • NestJS Core API & WebSocket Service (Port 3000)             │
│ • PostgreSQL 16 (Operational Database)                        │
│ • Redis 7 (Queues, Context Serialization, Events)             │
│ • Neo4j 5 (GraphRAG & Knowledge Topology)                     │
│ • Sovereign Ollama Daemon (CPU Quantized Models)              │
│ • Multi-Agent Workers & OpenCode Execution Sandboxes          │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites & Host Readiness Verification
Before beginning deployment on the Office Computer, verify the following prerequisites:
1. **Operating System:** Ubuntu 22.04/24.04 LTS or Windows 11 Pro 64-bit with WSL2.
2. **Hardware:** Min 8 Cores CPU, 32GB RAM, 100GB free NVMe SSD disk space.
3. **Software Installed:**
   - Docker Engine >= 24.0 (`docker --version`)
   - Docker Compose Plugin >= 2.20 (`docker compose version`)
   - Git >= 2.40 (`git --version`)
   - Node.js >= 20.x (Optional on host, bundled inside container)
   - Curl / Wget for health probes
4. **Network:** Outbound internet access for reverse tunnel and cloud LLM APIs. **ZERO INBOUND PORTS OPEN.**

---

## 3. Step-by-Step Installation & Deployment

### Step 3.1: Clone the Repository
On the Office Computer, clone the repository into the dedicated application directory:
```bash
git clone https://github.com/your-org/kdi-ai-office.git /opt/kdi-ai-office
cd /opt/kdi-ai-office
```

### Step 3.2: Environment Configuration
Execute the initial provisioning script to create data folders and the environment file:
```bash
bash infrastructure/scripts/setup.sh
```
Open `.env.production` and populate the production secrets:
```bash
nano .env.production
```
*Mandatory settings to configure:*
- `POSTGRES_PASSWORD`: Strong random database password.
- `REDIS_PASSWORD`: Strong random Redis password.
- `NEO4J_PASSWORD`: Strong random Neo4j password.
- `JWT_SECRET`: High-entropy key (min 48 characters, generate via `openssl rand -base64 48`).
- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`: Upstream production API keys.

### Step 3.3: Pre-Flight Configuration Validation
Run the automated configuration validator:
```bash
node infrastructure/scripts/production-readiness-check.mjs
```
*Must output `[SUCCESS] Production configuration contract: VERIFIED READY` before proceeding.*

### Step 3.4: Launch Production Containers
Execute the production deployment script:
```bash
bash infrastructure/scripts/deploy.sh
```
This builds and starts the isolated containers:
- `kdi_postgres_prod` (172.30.0.2)
- `kdi_redis_prod` (172.30.0.3)
- `kdi_neo4j_prod` (172.30.0.4)
- `kdi_api_prod` (172.30.0.10, bound to `127.0.0.1:3000`)

---

## 4. Subsystem Initialization & Verification

### 4.1 PostgreSQL Initialization
Database migrations and schemas (23 tables) are automatically applied on container startup via entrypoint scripts in `docs/data/postgresql-schema.md`.
To manually verify tables:
```bash
docker exec -it kdi_postgres_prod psql -U kdi_prod_admin -d kdi_ai_office_prod -c "\dt"
```

### 4.2 Redis Cache & Queues Initialization
Verify password-protected Redis connectivity:
```bash
docker exec -it kdi_redis_prod redis-cli -a "$REDIS_PASSWORD" ping
# Output: PONG
```

### 4.3 Neo4j Graph Initialization
Verify Bolt interface and unique constraints:
```bash
docker exec -it kdi_neo4j_prod cypher-shell -u neo4j -p "$NEO4J_PASSWORD" "SHOW CONSTRAINTS;"
```

---

## 5. Health Probes & Monitoring
Verify end-to-end service health using the automated probe:
```bash
bash infrastructure/scripts/health-check.sh
```
Expected output:
```text
[PASS] Aggregate System Health Endpoint (/health): OK
[PASS] PostgreSQL Database (/health/postgres): OK
[PASS] Redis Queue & Cache (/health/redis): OK
[PASS] Neo4j Graph Memory (/health/neo4j): OK
==========================================================
 ALL SUBSYSTEM PROBES REPORT HEALTHY (100% PASS)
==========================================================
```

### Viewing Realtime Logs
- API & Workers: `docker logs -f kdi_api_prod`
- Database: `docker logs -f kdi_postgres_prod`
- Redis: `docker logs -f kdi_redis_prod`
- Neo4j: `docker logs -f kdi_neo4j_prod`

---

## 6. Maintenance, Updates & Rollbacks

### 6.1 Rolling Application Updates
To pull new code updates pushed from the developer laptop:
```bash
git pull origin main
bash infrastructure/scripts/deploy.sh
```

### 6.2 Emergency Rollback
If an update causes degraded health probes, execute the one-step rollback:
```bash
bash infrastructure/scripts/rollback.sh
```

### 6.3 Automated Database Backups
A daily cron job runs `scripts/daily-backup.sh` dumping PostgreSQL and Neo4j into encrypted archives stored in `/opt/kdi-ai-office/data/backups`:
```bash
# Manual snapshot
bash scripts/daily-backup.sh
```

### 6.4 Disaster Recovery Restore
To restore databases from an encrypted backup snapshot:
```bash
bash scripts/restore-drill.sh /opt/kdi-ai-office/data/backups/kdi_backup_latest.tar.gz
```
Recovery Time Objective (RTO): < 30 minutes.

---

## 7. Laptop Disconnection Acceptance Test
To verify the independence of the Office Computer:
1. Verify `kdi_api_prod` is actively processing a background task.
2. Completely disconnect the developer laptop from the network or power it off.
3. Observe via mobile browser (accessing public Hostinger URL via FRP reverse tunnel) that the 3D living office, WebSocket feed, and task executions remain 100% active and responsive.
