# ADR-007: Mandatory Human-in-the-Loop Approval Gates for High-Risk Actions

## Status
**APPROVED** (Phase 0 Baseline)

## Context
Full, unconstrained autonomy for AI agents executing in real-world codebases introduces unacceptable operational risks:
- Accidental drops or destructive migrations on production/staging databases.
- Force pushing broken or untested branches over protected repositories.
- Installing malicious, hallucinated, or vulnerable third-party packages.
- Arbitrary modification of host infrastructure configurations.

## Decision
We enforce **Mandatory Cryptographic Human Approval Gates** for all actions classified as **Risk: HIGH** or **Risk: CRITICAL**.
- Autonomous execution is permitted only for **Risk: LOW** and **Risk: MEDIUM** actions.
- Any attempt by an agent to execute a high-risk tool immediately suspends the task worker, transitions the task state to `WAITING_APPROVAL`, and emits an urgent push/WebSocket notification to the Human Developer.

## Rationale
- Maintains human engineering sovereignty as the final authority over system mutations.
- Eliminates catastrophic accidents while preserving 90% of autonomous efficiency for routine research, planning, localized bugfixing, and test writing.
- Provides a clean mobile approval mechanism where the developer can inspect side-by-side diffs on their phone and approve with a single tap.

## Consequences
- **Positive:** Guaranteed protection against destructive agent hallucinations, full regulatory auditability, high developer trust.
- **Negative:** Background workflows requiring high-risk actions will pause until the human developer responds.
