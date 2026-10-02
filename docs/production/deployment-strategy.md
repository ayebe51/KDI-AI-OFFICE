# Production Deployment Strategy — KDI AI Office

## 1. Principles
Production releases must prioritize data integrity, security, and recoverability over theoretical zero-downtime claims:
```text
Data Integrity > Security > Recoverability > Availability
```

## 2. Release Lifecycle Flow
Every production deployment must follow the 7-stage gate:

```text
1. Preflight Validation
   └── Configuration completeness & secrets validation
            │
            ▼
2. Automated Backup Snapshot
   └── Encrypted snapshot of PostgreSQL & Neo4j taken and verified
            │
            ▼
3. Migration Safety Evaluation
   └── Schema changes verified backward-compatible and non-destructive
            │
            ▼
4. Deployment Execution
   └── Application code updated and recompiled
            │
            ▼
5. Health & Readiness Probe
   └── /health/readiness and 10 subsystems probe must return 200 OK
            │
            ▼
6. Smoke Test Suite
   └── Basic task execution, WebSocket streaming, and portfolio queries verified
            │
            ▼
7. Telemetry Monitoring
   └── Error rates, queue depth, and memory monitored for 15 minutes
```

## 3. Rollback Gate
If health regression, unhandled exceptions, or database errors are detected during stages 5–7:
- The operator activates `RollbackManager`.
- System enters `SAFE_MODE` or `READ_ONLY_MODE`.
- Code is reverted to the prior release tag.
- Database state is verified or restored from stage 2 snapshot.
