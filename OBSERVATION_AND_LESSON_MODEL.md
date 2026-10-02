# OBSERVATION, LESSON & ERROR TAXONOMY MODEL — KDI AI OFFICE

```text
===================================================================
KDI AI OFFICE — PHASE 14
DOMAIN: OBSERVATION INGESTION, STRUCTURED LESSONS & ERROR TAXONOMY
STATUS: COMPLETE & PRODUCTION VERIFIED
STORAGE: POSTGRESQL (AUTHORITATIVE) + NEO4J (GRAPHRAG PROVENANCE)
===================================================================
```

---

## 1. Domain Overview

The **Observation and Lesson Model** structures raw execution events into standardized, auditable learning records. It provides the empirical foundation upon which process mining, pattern detection, and improvement proposals operate.

---

## 2. Normalized Error Taxonomy (Section 15)

In complex multi-agent software engineering, failure modes are frequently misdiagnosed if error strings are unstructured. KDI AI Office establishes a canonical 15-category normalized failure taxonomy:

| Normalized Category | Description & Typical Trigger | Remediating Subsystem |
|---|---|---|
| **`AUTHENTICATION`** | Expired JWT, invalid bearer token, 401 response | Auth Service / SecretSanitizer |
| **`AUTHORIZATION`** | 403 Forbidden, RBAC violation, Level 4 gate rejection | Policy Engine / Approval Gate |
| **`DATABASE`** | PostgreSQL pool exhaustion, deadlock, lock timeout, bad SQL | Ahmad (DBA) / PgBouncer |
| **`NETWORK`** | ECONNREFUSED, socket hangup, DNS lookup failure | Infra / Network Gateway |
| **`PROVIDER`** | Model rate limit (429), quota exhaustion, provider timeout | AI Router / LLM Service |
| **`TOOL`** | CLI error code 127, MCP tool timeout, command crash | Toolchain Manager |
| **`AGENT`** | Agent runtime unhandled exception, worker crash | Agent Runtime Supervisor |
| **`PLANNING`** | Missing dependency, invalid task decomposition | MetaGPT Planner |
| **`EXECUTION`** | Compilation error, syntax error, runtime exception | Farhan / Rian / Worktree |
| **`TEST`** | Test assertion failure, Jest/Playwright timeout | Nadia (QA) / Test Runner |
| **`DEPLOYMENT`** | Docker build failure, Git worktree conflict, port collision | Ilham (DevOps) |
| **`CONFIGURATION`** | Missing environment variable, malformed YAML | Config Validator |
| **`HUMAN_APPROVAL`** | Rejection by Owner, timeout at approval gate | Telegram Notification |
| **`EXTERNAL_DEPENDENCY`**| Third-party API outage, package registry failure | Dependency Cache |
| **`UNKNOWN`** | Unclassified transient failure | Fallback Logger |

---

## 3. Learning Observation Entity Schema

Every noteworthy execution anomaly, friction event, or performance milestone generates a `LearningObservation`:

```json
{
  "id": "OBS-1790839500001-a1b2",
  "taskId": "tsk_audit_large_diff",
  "incidentId": "INC-2026-09-002",
  "category": "PROVIDER",
  "statement": "Gemini Flash primary provider timeout on long complex diffs (> 2000 lines).",
  "context": "Audit diffs exceeding 2000 lines during SIMMACI security review.",
  "sourceData": {
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "elapsedMs": 30000,
    "lineCount": 2450
  },
  "confidence": 0.96,
  "timestamp": "2026-10-01T08:15:00Z"
}
```

---

## 4. Structured Lesson Entity Schema

When observations are validated across multiple events or tested in an experiment, they are promoted to a `StructuredLesson`:

```json
{
  "id": "LSN-1790839500002-c3d4",
  "observationIds": ["OBS-1790839500001-a1b2"],
  "title": "Provider fallback meningkatkan reliability workload X",
  "facts": [
    "Gemini primary timeout pada diff besar (>2000 baris); fallback ke Ollama/Groq berhasil 100%."
  ],
  "observations": [
    "Payload besar lebih stabil dialihkan ke streaming provider atau dedicated chunk worker."
  ],
  "hypotheses": [
    "Routing berbobot ukuran payload akan mengeliminasi error timeout."
  ],
  "recommendations": [
    "Update routing rule untuk payload > 1500 baris ke dedicated streaming chunk processor."
  ],
  "validated": true,
  "validatedAt": "2026-10-01T10:15:00Z",
  "confidence": 0.96,
  "scope": "AI_ROUTER"
}
```

---

## 5. Experience Replay & Retrospective Engine (Section 6)

Upon completion of any critical or complex engineering task, the `RetrospectiveProcessMiningService` performs an automated retrospective (Experience Replay).

The retrospective method answers the 8 operational reflection questions:
1. **What happened?** (Actual provider, cost, tools, duration)
2. **What was expected?** (Estimated effort, planned steps, budget)
3. **What worked?** (First-pass test verification, tools integrated successfully)
4. **What failed?** (Retry count, verification failures)
5. **Where was friction?** (Wasted queue wait times, rework cycles, duration overruns)
6. **What repeated?** (Recurring error signatures)
7. **What should change?** (Pre-commit linting, effort weight adjustments)
8. **What evidence supports the change?** (Empirical metrics, duration ratios)

---

## 6. Baseline Telemetry Registry (Section 58)

The system maintains 27 active historical observations and 6 validated lessons in its operational memory:
- **Lesson 1:** QA queue bottleneck during simultaneous E2E workloads.
- **Lesson 2:** Provider fallback and streaming chunking for large diffs.
- **Lesson 3:** Obsolete step 4 in Redis recovery runbook.
- **Lesson 4:** Documentation gap in Git worktree rollback flow.
- **Lesson 5:** Complexity-based agent routing for backend architecture tasks.
- **Lesson 6:** Pre-commit automated linter reducing rework rate from 12% to 4%.
