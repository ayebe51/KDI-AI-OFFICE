# KDI Incident Management & Post-Incident Memory

## 1. Incident Lifecycle
```text
Detection
   ↓
Classify Severity (LOW | MEDIUM | HIGH | CRITICAL)
   ↓
Create Incident (OPEN)
   ↓
Gather Context & Telemetry
   ↓
Execute Safe Diagnostics (INVESTIGATING)
   ↓
Formulate Mitigation Recommendation
   ↓
Approval Gate (if HIGH / CRITICAL)
   ↓
Apply Mitigation (MITIGATING → MONITORING)
   ↓
Verify Health Restoration
   ↓
Resolve Incident (RESOLVED)
   ↓
Post-Incident Memory Candidate (Phase 5 Graph Integration)
```

## 2. Post-Incident Graph Memory
When an incident transitions to `RESOLVED`, the root cause, verified mitigation steps, and diagnostic evidence are exported as a memory candidate to the Phase 5 Neo4j Knowledge Graph (`:Incident` node linked to `:RemediationStep` and `:TaskRecord`).
