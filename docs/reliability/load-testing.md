# Load Testing & Resource Exhaustion Protocols

## 1. Load Profile & Capacity Targets
Load testing on the canonical Office Computer (Intel Core i5-1334U, 16 GB RAM, native PostgreSQL 16) establishes safe operating limits under sustained multi-agent workloads:

| Workload Dimension | Normal Target | Peak Load Target | Stress Limit (Throttle Threshold) |
|---|---|---|---|
| Concurrent WebSocket Clients | 10 | 50 | > 100 clients |
| Concurrent Active Agent Tasks | 4 | 8 | > 12 tasks |
| GraphRAG Queries / min | 15 req/min | 60 req/min | > 120 req/min |
| Ollama Concurrent Inferences | 1 model | 2 models | > 2 models (Strictly queue) |
| API Request Rate (REST) | 30 req/sec | 100 req/sec | > 200 req/sec (Rate limit 429) |

## 2. Resource Exhaustion Testing Scenarios

### Scenario A: RAM Pressure (Host Memory > 85%)
- **Test Condition**: Artificial memory allocation simulating heavy model weights or large memory buffers.
- **Expected Behavior**:
  1. `ResourceGovernanceService` flags `RAM_WARNING` at 80% and `RAM_CRITICAL` at 90%.
  2. Autonomy engine suspends spawning new speculative tasks.
  3. Worker concurrency drops from 4 down to 1.
  4. Node.js V8 garbage collection triggered; non-critical caches evicted from Redis.

### Scenario B: Disk Space Exhaustion (Drive C: or D:)
- **Test Condition**: Simulated disk usage spike reaching warning threshold (5 GB free on C: or 10 GB on D:).
- **Expected Behavior**:
  1. System blocks new local backup creations and logs critical alert.
  2. Log rotation prunes raw logs older than 7 days, compressing archived logs.
  3. Autonomy switches to `SAFE_MODE` preventing heavy engineering disk writes.

### Scenario C: Redis Queue Backlog Spike
- **Test Condition**: Ingestion of 1,000 synthetic task events within 5 seconds.
- **Expected Behavior**:
  1. Task queue depth metric triggers `HIGH` warning at > 200 pending items.
  2. Workers process tasks with strict timeout per task.
  3. Poison pill messages fail 3 times and are moved safely to Dead Letter Queue (DLQ).
  4. System does not drop events or crash worker process.

### Scenario D: AI Provider Outage & Rate Limiting
- **Test Condition**: Mock 429 Rate Limit and 503 Outage responses from primary LLM provider (Gemini).
- **Expected Behavior**:
  1. Circuit breaker trips to `OPEN` state after 5 failures.
  2. AI Router dynamically shifts non-confidential traffic to secondary provider (Groq) or local fallback (Ollama).
  3. Operational tasks requiring strict capabilities transition to `WAITING_PROVIDER` rather than failing permanently.
