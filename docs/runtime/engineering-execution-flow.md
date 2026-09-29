# Engineering Execution Flow & Lifecycle

## 1. 7-Phase Engineering Loop

```text
[ UNDERSTAND ] ──→ Inspect requirements, acceptance criteria, constraints
       ↓
[ INSPECT ]    ──→ Explore repository layout, symbols, AST dependencies
       ↓
[ PLAN ]       ──→ Formulate surgical implementation strategy
       ↓
[ IMPLEMENT ]  ──→ Apply code modifications inside isolated worktree
       ↓
[ TEST ]       ──→ Run automated unit and regression test suites
       ↓
[ VERIFY ]     ──→ Execute strict Verification Gate (tests, lint, typecheck, build)
       ↓
[ REPORT ]     ──→ Compile verifiable evidence, git diff, commit hash, telemetry
```

---

## 2. State Progression Matrix

```text
       CREATED
          ↓
       QUEUED
          ↓
       ASSIGNED
          ↓
       RUNNING (Engineering Session Created)
          ↓
     IMPLEMENTED (Code Modified)
          ↓
 VERIFICATION_PENDING (Tests / Linters Running)
       ↙      ↘
(All Pass)   (Any Failure)
    ↓              ↓
 VERIFIED     FAILED_VERIFICATION ──→ RETRYING / DLQ
    ↓
COMPLETED
```

---

## 3. Crash Recovery & Resilience
1. Every task execution is assigned a unique `executionId` and tracked in `engineering_executions`.
2. Heartbeats pulse every 10 seconds.
3. If an executor process dies or is terminated:
   - Stale worker detector flags heartbeat timeout (>30s).
   - The worker slot is safely reclaimed.
   - The task evaluates retry backoff (1s, 2s, 4s...) or routes to Dead Letter Queue (DLQ).
   - Zero lost tasks.
