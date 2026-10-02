# Restart Policy, Crash Loop Protection & Worker Recovery

## 1. Crash Loop State Machine
To protect host hardware against infinite CPU/RAM churn from rapid restart loops, services transition through 5 discrete states:

```text
       ┌─────────── Success / Cooldown ───────────┐
       ▼                                          │
    [NORMAL] ──(Failure)──> [BACKOFF] ──(3 Fails)─┴─> [CRASH_LOOP] ──(>5 Fails)──> [ESCALATED]
                                                           │                              │
                                                           └────── Exponential Jitter ────┘
```

1. **`NORMAL`**: Baseline healthy execution.
2. **`BACKOFF`**: Initial failures invoke backoff: `delay = initialBackoff * (2^attempts) + randomJitter`.
3. **`CRASH_LOOP`**: Reaching 3 consecutive failures halts rapid retries, forcing a minimum 60s cooldown window.
4. **`ESCALATED`**: Reaching 5 consecutive failures suspends automatic restarts and triggers an incident alert in Human Command Center.

## 2. Worker Orphan Recovery
- Workers emit heartbeats every 10 seconds.
- If a worker running an active task fails to emit a heartbeat within 30 seconds (`staleWorkerThresholdMs`), the `WorkerRecoveryService` marks the worker as `ORPHAN_DETECTED`.
- The in-flight task is safely extracted, its retry counter incremented, and re-enqueued for another worker slot.
