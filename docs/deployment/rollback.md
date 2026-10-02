# Production Rollback Procedure

## 1. Trigger Conditions
An immediate production rollback is triggered when any of the following occur during or post-deployment:
1. **Health Check Regression**: Any critical subsystem (PostgreSQL, Redis, Neo4j, KDI API, AI Router) reports `unhealthy` after the post-deploy grace period (60 seconds).
2. **Crash Loop Detection**: Any core worker or API process experiences ≥3 crash loops within 300 seconds.
3. **Database Migration Error**: Schema migration fails or triggers foreign-key / data integrity violations.
4. **Error Rate Spike**: API 5xx error rate exceeds 1.0% over a 3-minute sliding window.
5. **Operator Emergency Abort**: Manual trigger via Command Center or CLI (`npm run ops:rollback`).

## 2. Rollback Flow
The automated rollback pipeline follows a strictly ordered reversal:

```text
[Health Regression / Incident]
             ↓
[1. Activate Safe / Maintenance Mode]
  - Pause autonomous queue processing
  - Divert external gateway traffic to maintenance page
             ↓
[2. Terminate Unhealthy Release Processes]
  - Graceful stop (SIGTERM) of running API / workers with 15s timeout
             ↓
[3. Revert Code & Build Artifacts]
  - Check out previous validated git commit hash
  - Re-link built static assets in Hostinger / public web
             ↓
[4. Verify Database Schema Compatibility]
  - If schema was backward-compatible: Keep existing database state
  - If schema contained destructive or incompatible changes:
    Initiate clean restore from pre-release backup snapshot
             ↓
[5. Service Restart in Canonical Order]
  - Infrastructure -> Databases -> Redis -> Core API -> Workers -> Gateway
             ↓
[6. Verification & Post-Mortem]
  - Execute readiness checks across all 10 subsystems
  - Log rollback incident with root cause analysis requirement
```

## 3. Database Rollback Constraints
- Forward migrations must be written additively (expand-contract pattern) to prevent requiring a full database restore on code rollback.
- If a schema downgrade is strictly necessary, run the audited `down` migration script.
- If data corruption occurred during migration, trigger the clean restore procedure from `D:\kdi-backups\<pre-release-backup-id>.enc.tar.gz`.
