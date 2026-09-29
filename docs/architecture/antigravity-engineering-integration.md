# Antigravity Engineering Integration Specification

## Overview
This specification details the architecture, interfaces, and integration protocols connecting **Google Antigravity** as the primary autonomous engineering execution layer within the **KDI AI Office**.

```text
Human Request
      ↓
KDI AI Manager
      ↓
MetaGPT Planning (Software Company SOPs)
      ↓
Normalized EngineeringPlan & EngineeringTask DAG
      ↓
KDI Task Engine (Dependency & Concurrency Guard)
      ↓
Antigravity Engineering Provider
      ↓
Workspace Manager (Git Worktree Isolation)
      ↓
7-Phase Engineering Loop:
[ UNDERSTAND → INSPECT → PLAN → IMPLEMENT → TEST → VERIFY → REPORT ]
      ↓
Verification Gate (Tests, Linter, Typecheck, Build, Criteria)
      ↓
Evidence Collection (Diff, Test Logs, Commit Hash)
      ↓
PostgreSQL Persistence + Redis Transport + Neo4j Graph
```

---

## 1. Architectural Boundaries

| Component | Responsibility | Boundary Constraint |
|---|---|---|
| **MetaGPT** | Planning / Software Company SOPs (Product Manager, Architect, Project Manager, Engineer breakdown) | **Zero direct repository execution**. Output is strictly normalized `EngineeringPlan`. |
| **KDI AI Manager** | Governance, risk evaluation, policy gatekeeper | High-risk operations gated to `WAITING_APPROVAL`. Anti-self-approval enforced. |
| **KDI Agent Runtime** | Lifecycle state machine, priority queue, DAG dependencies, workstation concurrency | Schedules tasks only when dependencies and host resources allow. |
| **Antigravity Engineering Provider** | Code editing, AST parsing, test execution, subagent orchestration | Strictly operates in isolated `git worktree`. Protected branches are read-only. |
| **Verification Gate** | Evidence verification (zero fake success) | Rejects completion if tests fail; marks `FAILED_VERIFICATION`. |
| **PostgreSQL** | Operational source of truth | Persists sessions, executions, events, results, and approval records. |
| **Redis** | Event transport pipeline | Correlated, idempotent event publishing to `kdi:events:engineering`. |
| **Neo4j** | Relationship graph | Ingests execution nodes, commit hashes, modified files, and skills. |

---

## 2. Antigravity Dual Integration: SDK & CLI

### A. Primary Programmatic: Antigravity Python SDK (`AntigravitySDKAdapter`)
- Bridges to `google.antigravity` Python package.
- Spawns asynchronous context-managed agents (`Agent(LocalAgentConfig)`).
- Captures token deltas, tool executions, and reasoning traces in real time.
- Authentication modes: `AVAILABLE`, `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_EXPIRED`, `UNAVAILABLE`.

### B. Operational Fallback: Antigravity Headless CLI (`AntigravityCLIAdapter`)
- Headless invocation: `agy --headless --json --prompt "<prompt>"`.
- Machine-readable structured JSON streams (`--json`, `--stream-json`).
- Full child process supervision: PID registration, safe cancellation (`taskkill /T /F` or `SIGTERM`), zero zombie processes.

---

## 3. Workspace Isolation Model

Every task execution is provisioned with an isolated git worktree:
```text
repo/
 ├── main (protected: no direct writes, no push)
 └── .worktrees/
      ├── ws_tsk_001_1790684/ (branch: task/tsk_001)
      └── ws_tsk_002_1790685/ (branch: task/tsk_002)
```
- Protected branches: `main`, `master`, `production`, `release`.
- Direct pushes or modifications to protected branches are immediately denied.
- Clean automated teardown (`git worktree remove --force`) on session closure.

---

## 4. Verification Gate Protocol (Zero Fake Success)
No engineering task can be marked `COMPLETED` based solely on LLM self-attestation. The `VerificationGate` executes verifiable commands in the workspace:
1. `typecheckCommand`: Must exit code 0 with zero compiler diagnostics.
2. `lintCommand`: Must exit code 0.
3. `buildCommand`: Must produce build artifacts without error.
4. `testCommand`: Must execute the test runner, parsing passed and failed counts.
5. `criteriaCheck`: Confirms specific acceptance criteria are satisfied.

If any check fails, status transitions to `FAILED_VERIFICATION`, commit creation is blocked, and concrete evidence is preserved.
