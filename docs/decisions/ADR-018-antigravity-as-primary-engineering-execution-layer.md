# ADR-018: Google Antigravity as Primary Engineering Execution Layer

## Status
**ACCEPTED** (Supersedes ADR-005 OpenCode primary execution mandate)

## Date
2026-09-29

## Context
In the foundational architecture (ADR-005), KDI AI Office envisioned MetaGPT for multi-agent role Standard Operating Procedures (SOPs) and OpenCode as the software execution engine for sandboxed git worktrees and AST patching. 

However, during Phase 4 implementation and practical runtime testing:
1. OpenCode was still an early, experimental adapter without sovereign enterprise integration or native multi-modal verification capabilities.
2. The team required an autonomous engineering agent layer capable of deep codebase navigation, multi-step surgical patching, real-time tool observation, headless non-interactive execution, robust command sandboxing, and strict verification gating.
3. Google Antigravity provides a comprehensive agentic engineering platform with both a high-fidelity Python SDK (`google.antigravity`) for programmatic leasing and a headless non-interactive CLI (`agy`) with structured JSON streams for operational scripting.

A total architecture revision was mandated: decouple multi-agent planning from execution authority, establish KDI AI Manager as the sole governance authority, use MetaGPT purely for software company planning, and integrate Google Antigravity as the primary engineering execution layer.

---

## Decision

1. **MetaGPT as Planning / Software Company Authority**:
   - MetaGPT acts strictly as the **Software Company Planning Layer** (Product Manager, System Architect, Project Manager, Engineer).
   - MetaGPT does **NOT** execute code or modify repositories directly.
   - MetaGPT generates a normalized `EngineeringPlan` and canonical `EngineeringTask[]` DAG which is validated and ingested by the **KDI Task Engine**.

2. **Antigravity as Primary Engineering Execution Layer**:
   - **Google Antigravity** is designated as the **Primary Autonomous Software Engineering Layer** in KDI AI Office.
   - Programmatic integration uses the **Antigravity Python SDK** (`google.antigravity`) as the primary path.
   - Headless, non-interactive execution uses the **Antigravity CLI** (`agy`) with structured JSON events as the operational fallback path.

3. **Vendor-Agnostic Abstraction Layer (`EngineeringProvider`)**:
   - All KDI runtime components interact strictly through the canonical `EngineeringProvider` interface:
     - `initialize()`
     - `healthCheck()`
     - `createSession()`
     - `executeTask()`
     - `streamEvents()`
     - `cancelExecution()`
     - `resumeExecution()`
     - `collectResult()`
     - `collectDiff()`
     - `collectUsage()`
     - `closeSession()`
   - Primary implementation: `AntigravityEngineeringProvider`.
   - Adapters: `AntigravitySDKAdapter`, `AntigravityCLIAdapter`.
   - Deprecated/Inactive: `OpenCodeAdapter` (preserved solely as an optional future experimental stub; zero hard dependencies).

4. **Workspace & Git Worktree Isolation**:
   - Every engineering execution is allocated an isolated workspace using `git worktree add -b task/<id> <path>`.
   - Protected branches (`main`, `master`, `production`) have a strict default policy: write-restricted, direct push denied, force push denied.

5. **Strict Command Permission Policy**:
   - **READ ONLY** (`ls`, `pwd`, `find`, `grep`, `cat`, `git status`, `git diff`, `git log`): `ALLOW`.
   - **NORMAL ENGINEERING** (`npm test`, `npm run build`, `npm run lint`, `npm run typecheck`, `pytest`): `ALLOW` inside isolated worktree.
   - **HIGH RISK** (`git push`, `rm -rf`, `sudo`, production deployment, secret modification): `HUMAN_APPROVAL_REQUIRED` or `DENY`.

6. **Prompt Injection & Secret Defense**:
   - All repository contents (README, source comments, fixtures) are strictly classified as **Untrusted Data**.
   - Immutable authority order:
     `KDI Security Policy` → `KDI Task Policy` → `Agent System Instructions` → `Human-approved task` → `Repository Content`.
   - Secrets (`.env`, private keys, API keys, database credentials) are automatically scrubbed and redacted across prompts, events, Redis queues, and WebSocket telemetry.

7. **Zero Fake Success Verification Gate**:
   - Tasks cannot transition to `COMPLETED` based merely on agent assertions.
   - The `VerificationGate` executes actual test suites, linters, typecheckers, and build scripts.
   - State transition: `IMPLEMENTED` → `VERIFICATION_PENDING` → `VERIFIED` → `COMPLETED`. If tests fail, state is set to `FAILED_VERIFICATION`.

---

## Why Antigravity?
- **Robust Tool & Subagent Delegation**: Antigravity natively supports surgical code editing, AST navigation, tool interception, and subagent coordination.
- **Headless Operational Pipeline**: Headless CLI with `--json` and `--stream-json` allows machine-readable automation without human terminal scraping.
- **Enterprise Safety & Policy Controls**: Integrates cleanly with KDI permission policies, approval gates, and context isolation.
- **Dual SDK and CLI Support**: Enables seamless switching between Python programmatic leasing and standalone operational binaries.

---

## Alternatives Considered

1. **Retaining OpenCode as Primary Executor (ADR-005)**:
   - *Rejected:* OpenCode lacks mature headless JSON event streaming, lacks official enterprise SDK support, and created unwanted architectural fragility.
2. **Direct Raw LLM Code Generation**:
   - *Rejected:* Raw LLM inference produces unverified hallucinations, lacks file system sandbox controls, and cannot run compiler checks or test suites autonomously.
3. **MetaGPT Native Code Execution**:
   - *Rejected:* Violates separation of concerns. MetaGPT excels at multi-role conversational planning; allowing it to execute code directly breaches KDI governance and auditability boundaries.

---

## Security Implications
- **Untrusted Repository Framing**: Potential prompt injections inside open-source dependencies or malicious commits are isolated in `<untrusted_repository_content>` boundaries.
- **Protected Branch Defense**: Direct modification or push to `main` is completely blocked.
- **Secret Redaction**: Automated regex pattern scrubbers purge credentials before persistence or broadcast.
- **Anti-Self-Approval**: Agents are strictly prohibited from approving their own high-risk actions.

---

## Operational Implications
- Workstation resources are supervised by `ConcurrencyController`.
- Process lifecycles are tracked via PID maps; `taskkill` or `SIGTERM` terminates child processes safely without leaving orphan zombies.
- PostgreSQL retains operational execution records, test evidence, git diffs, and approval audit logs.

---

## Failure Modes & Mitigations
| Failure Mode | Impact | Mitigation |
|---|---|---|
| Python SDK unavailable | SDK execution fails | `AntigravityEngineeringProvider` gracefully falls back to `AntigravityCLIAdapter` or local sovereign engine |
| Test suite fails in workspace | Code defect introduced | `VerificationGate` marks `FAILED_VERIFICATION`, preserves test logs, refuses `COMPLETED` |
| Malicious prompt in README | Injection attack | `PromptInjectionDefense` wraps content as untrusted data; authority hierarchy prevents policy override |
| High-risk command attempted | Unauthorized push/deploy | `CommandClassifier` gates command into `WAITING_APPROVAL` for human operator decision |
| Host worker crash | Interrupted task | Idempotent task claiming and stale recovery watchdog recover slot |

---

## Consequences
- **Positive:**
  - Clear separation: MetaGPT plans, KDI governs, Antigravity engineers.
  - Zero fake success: all code changes require verifiable passing test evidence.
  - High resilience: SDK with CLI operational fallback.
  - Complete operational auditability in PostgreSQL and Neo4j.
- **Negative:**
  - Requires maintaining both SDK bridge and CLI subprocess adapter.
  - Worktree creation incurs slight disk overhead (mitigated by automated release and cleanup).
