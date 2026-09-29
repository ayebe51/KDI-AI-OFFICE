# Disaster Recovery & Business Continuity Plan: KDI AI Office

## 1. Overview & Disaster Scenarios
The **Disaster Recovery (DR) Plan** establishes step-by-step procedures to recover **KDI AI Office** operations following critical infrastructure disruptions.

---

## 2. Recovery Procedures by Scenario

### 2.1 Scenario 1: Total Office Workstation Hardware Failure
- **Impact:** Local execution environment, databases, and Ollama models offline.
- **Recovery Procedure:**
  1. Procure/provision replacement workstation (Windows 11 + Docker Desktop + WSL2).
  2. Clone base KDI AI Office repository from GitHub:
     ```bash
     git clone git@github.com:kdi/kdi-ai-office.git "D:/apss-source/KDI AI OFFICE"
     ```
  3. Decrypt and unpack the latest daily backup archive (`backups/*.enc`).
  4. Restore PostgreSQL:
     ```bash
     docker compose up -d postgres
     docker exec -i kdi-postgres pg_restore -U kdi_user -d kdi_office -c < postgres.dump
     ```
  5. Restore Neo4j:
     ```bash
     docker exec -i kdi-neo4j neo4j-admin database load neo4j --from-path=/import
     docker compose up -d neo4j
     ```
  6. Reconnect tunnel: Start `frpc` tunnel client. Edge VPS automatically re-establishes connectivity.
  7. Estimated Recovery Time: **25 minutes**.

### 2.2 Scenario 2: Cloud Edge VPS Outage
- **Impact:** Remote mobile access and public 3D dashboard inaccessible. Local office workstation execution remains 100% functional.
- **Recovery Procedure:**
  1. The local developer continues direct work via `http://localhost:8000` on the office workstation.
  2. If VPS cannot be restored within 1 hour:
     - Spin up alternative secondary VPS (or fallback Hostinger instance).
     - Deploy Docker container `kdi-vps-gateway` using automated Ansible playbook.
     - Update DNS A-record to point to new VPS IP.
     - Update `server_addr` in `frpc.ini` and restart tunnel client.
  3. Estimated Recovery Time: **15 minutes**.

### 2.3 Scenario 3: Database Data Corruption (Neo4j or PostgreSQL)
- **Impact:** Graph queries fail or relational transactions rollback unexpectedly.
- **Recovery Procedure:**
  1. Stop application workers (`docker compose stop worker-pool supervisor`).
  2. Roll back corrupted database volume to previous night's clean snapshot.
  3. Replay transactional event logs from Redis streams for the intervening hours.
  4. Run health check verification scripts.
  5. Resume application workers.
  6. Estimated Recovery Time: **10 minutes**.

---

## 3. Secrets Recovery Strategy
1. **Master Encryption Key (MEK) Escrow:** The master key is stored in a secure offline password manager (Bitwarden/1Password) accessible to the Human Developer.
2. **Re-keying Vault:** If the master key is lost, API credentials (Gemini, Groq, OpenRouter) can be re-entered via an interactive terminal setup script (`./scripts/init-vault.sh`) which generates a fresh MEK and initializes a new database vault.
