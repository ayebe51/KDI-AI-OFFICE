# Alerting Architecture & Runbook Linkage — KDI AI Office

## 1. Alert Severities & Routing Policy

| Severity | Threshold / Trigger Condition | Notification Route | Target Response Time | Runbook Requirement |
| :--- | :--- | :--- | :---: | :---: |
| **`INFO`** | Daily briefing published, planned backup completed | Command Center feed | Non-urgent | Optional |
| **`WARNING`** | Disk C: < 10GB free, worker crash loop entry | Command Center banner | < 30 minutes | Required |
| **`HIGH`** | Neo4j offline, LLM provider rate limit exceeded | Command Center banner + SMS/Email | < 15 minutes | Mandatory |
| **`CRITICAL`** | PostgreSQL unreachable, worker crash loop exhausted | Instant alarm + Operator escalation | < 5 minutes | Mandatory |

## 2. Mandatory Alert Schema
Every alert emitted by the `ObservabilityService` must conform to:
- `alertId`: Unique identifier (e.g. `alt_1710928_a4f1`)
- `severity`: `INFO` | `WARNING` | `HIGH` | `CRITICAL`
- `source`: Subsystem name (e.g. `redis_sentinel`)
- `reason`: Concrete symptom description
- `impact`: Expected user or autonomy effect
- `recommendedAction`: Immediate mitigation step
- `runbook`: Clickable identifier (e.g. `rbk_diag_service`)

## 3. Deduplication Policy
Identical alerts (same severity, source, and reason) are automatically suppressed within a 60-second sliding window to avoid alert storms.
