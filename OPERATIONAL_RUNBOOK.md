# KDI AI OFFICE — PRODUCTION OPERATIONAL RUNBOOK
## Phase 12 Emergency Procedures, Failover Protocols & Disaster Recovery Runbooks

```text
DOCUMENT VERSION: 2.0.0 (Phase 12 Go-Live Edition)
APPLIES TO: Production Operators, On-Call Engineers, Site Reliability Engineers
TARGET SERVICES: Telegram Gateway, Orchestrator, Agent Runtime, Antigravity, 3D Living Office
SECURITY CLASSIFICATION: CONFIDENTIAL / INTERNAL OPERATIONS
TIMESTAMP: 2026-10-01T11:53:00+07:00
```

---

## 1. Quick Emergency Controls

### 1.1. Emergency Autonomy Halt (Global Pause)
If any agent behaves unexpectedly or an external infrastructure incident occurs:
```bash
# Option A: Via Telegram (Fastest)
Send: /pause
# Or type natural language: "pause semua" / "stop all"

# Option B: Via HTTP API
curl -X POST http://127.0.0.1:3000/autonomy/pause \
  -H "Content-Type: application/json" \
  -d '{"reason": "Emergency operator intervention", "operator": "Human SRE"}'
```
*Effect:* Instantly halts dispatch of all new autonomous tasks. A red alert banner is broadcast across the 3D Living Office. Running tasks finish their current step and pause.

### 1.2. Resume Autonomy
```bash
# Option A: Via Telegram
Send: /resume

# Option B: Via HTTP API
curl -X POST http://127.0.0.1:3000/autonomy/resume \
  -H "Content-Type: application/json" \
  -d '{"reason": "Incident resolved, resuming operations", "operator": "Human SRE"}'
```

---

## 2. Component Failure Runbooks

### Runbook 1: Telegram Gateway Unavailable / Webhook Drop
- **Symptoms:** Owner receives no reply to Telegram messages; webhook logs show HTTP 502/504 or connection timeouts.
- **Diagnostic Commands:**
  ```bash
  # Check webhook status with Telegram Bot API
  curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo" | jq .
  
  # Check local gateway container
  docker logs kdi-api --tail 50 | grep -i "telegram"
  ```
- **Remediation Steps:**
  1. Verify the public webhook URL is reachable via HTTPS.
  2. If webhook was dropped by Telegram, re-register webhook:
     ```bash
     curl -F "url=https://your-domain.com/api/v1/telegram/webhook" \
          -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
          "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook"
     ```
  3. Restart API process if webhook listener hung:
     ```bash
     docker restart kdi-api
     ```

---

### Runbook 2: KDI AI Orchestrator Unavailable
- **Symptoms:** Health check `/health` reports degraded; natural language commands timeout.
- **Diagnostic Commands:**
  ```bash
  curl -s http://127.0.0.1:3000/health | jq .
  ```
- **Remediation Steps:**
  1. Inspect Node.js process logs for unhandled rejections:
     ```bash
     docker logs kdi-api --tail 100
     ```
  2. Restart NestJS API service:
     ```bash
     docker restart kdi-api
     ```
  3. Verify all in-flight tasks are preserved in PostgreSQL upon reboot.

---

### Runbook 3: Agent Worker Stuck / Running Task Frozen
- **Symptoms:** A task remains in `RUNNING` status for > 2 minutes; worker slots show 100% utilization.
- **Automatic Mitigation:** The built-in stale worker scanner recovers tasks automatically after 30 seconds of inactivity.
- **Manual Remediation Steps:**
  1. Inspect active workers:
     ```bash
     curl -s http://127.0.0.1:3000/runtime/summary | jq .
     ```
  2. Cancel or force-retry the stuck task:
     ```bash
     # Cancel task
     curl -X POST http://127.0.0.1:3000/runtime/tasks/<TASK_ID>/cancel \
       -H "Content-Type: application/json" \
       -d '{"reason": "Operator manually unstuck frozen worker"}'

     # Retry task
     curl -X POST http://127.0.0.1:3000/runtime/tasks/<TASK_ID>/retry
     ```

---

### Runbook 4: Antigravity Engineering Execution Failure / Worktree Lock
- **Symptoms:** Engineering task fails with git worktree error or lockfile contention.
- **Remediation Steps:**
  1. Clean up stale worktrees:
     ```bash
     git worktree prune
     ```
  2. Remove leftover lockfiles in `.worktrees/`:
     ```powershell
     Remove-Item -Recurse -Force .worktrees/*
     ```
  3. Re-run task via Orchestrator.

---

### Runbook 5: AI Provider Outage (Ollama / Gemini / Groq / OpenRouter)
- **Symptoms:** Orchestrator or agents fail with `ProviderUnavailableException`.
- **Automatic Mitigation:** `LLMService` utilizes fallback provider chaining:
  `Primary (Ollama / Gemini) → Secondary (Groq) → Fallback (OpenRouter)`.
- **Manual Remediation Steps:**
  1. Check status of local Ollama container:
     ```bash
     curl -s http://127.0.0.1:11434/api/tags
     ```
  2. If local model hung, restart Ollama:
     ```bash
     docker restart kdi-ollama
     ```
  3. Update active provider in `.env` if cloud outage is prolonged:
     ```env
     LLM_DEFAULT_PROVIDER=groq
     ```

---

### Runbook 6: PostgreSQL Database Disconnect
- **Symptoms:** API health reports `postgres: DOWN`; queries fail with connection refused.
- **Remediation Steps:**
  1. Verify PostgreSQL container is running:
     ```bash
     docker ps -f name=kdi-postgres
     ```
  2. Check disk space on host (PostgreSQL goes read-only if disk is full):
     ```bash
     df -h
     ```
  3. Restart PostgreSQL service:
     ```bash
     docker restart kdi-postgres
     ```
  4. Pool connections auto-reconnect within 5 seconds.

---

### Runbook 7: Redis Broker Interruption
- **Symptoms:** Event queue stops processing; `/health` reports `redis: DOWN`.
- **Remediation Steps:**
  1. Restart Redis container:
     ```bash
     docker restart kdi-redis
     ```
  2. Verify Append-Only File (AOF) recovery:
     ```bash
     docker logs kdi-redis --tail 20
     ```
  3. The runtime repository falls back to in-memory queues automatically during transient disconnects.

---

### Runbook 8: Neo4j Graph Database Failure
- **Symptoms:** GraphRAG queries return empty memory; Bolt driver connection fails.
- **Remediation Steps:**
  1. Verify Neo4j container:
     ```bash
     docker logs kdi-neo4j --tail 30
     ```
  2. Restart Neo4j:
     ```bash
     docker restart kdi-neo4j
     ```
  3. *Graceful Fallback:* The Orchestrator automatically skips GraphRAG memory retrieval if Neo4j is offline and continues task execution without halting.

---

### Runbook 9: WebSocket Disconnect / 3D Living Office Freeze
- **Symptoms:** 3D avatar animations freeze; overhead status badges stop updating.
- **Remediation Steps:**
  1. The Web client automatically attempts exponential backoff reconnection every 3 seconds.
  2. If UI is unresponsive, press `F5` or `Ctrl+R` to force reload the 3D canvas and fetch fresh state snapshot from `/office/snapshot`.

---

### Runbook 10: Production Deployment Rollback
- **Symptoms:** Newly deployed change in SIMMACI or KDI exhibits regression errors.
- **Remediation Steps:**
  ```bash
  # Execute automated canary rollback script
  ./infrastructure/scripts/rollback.sh
  
  # Or revert via git worktree
  git revert HEAD --no-edit
  git push origin production
  ```
  The Orchestrator dispatches an immediate rollback notification to the Owner's Telegram.
