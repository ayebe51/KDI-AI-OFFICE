# KDI Operational Runbook Model

## 1. Concept
A `Runbook` defines a deterministic, reusable sequence of operational steps.

## 2. Action Types
Runbook steps must use explicit canonical action types:
- `READ`: Non-destructive state queries or telemetry inspection.
- `ANALYZE`: Data aggregation, log analysis, or root cause inference.
- `PLAN`: Formulation of code patches, migration scripts, or remediation strategies.
- `TEST`: Automated unit tests, smoke tests, or synthetic HTTP checks.
- `EDIT`: Modification of source code, configuration files, or database state.
- `NOTIFY`: Outbound notifications to human operators or communication channels.
- `REPORT`: Recording formatted summaries or updating memory stores.
- `APPROVE_GATE`: Explicit execution suspension waiting for human signoff.
- `ESCALATE`: Elevating an alert or creating a high-severity incident.
- `WAIT`: Deterministic sleep or backoff delays.

## 3. Failure Actions
Each step defines a failure policy:
- `ABORT`: Terminates the runbook immediately.
- `RETRY`: Re-executes the step up to `maxRetries` with backoff.
- `ESCALATE`: Creates an incident and alerts the operator.
- `CONTINUE`: Logs a warning and proceeds to the subsequent step.
