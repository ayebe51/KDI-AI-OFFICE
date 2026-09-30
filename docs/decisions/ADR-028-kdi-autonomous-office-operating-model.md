# ADR-028: KDI Autonomous Office Operating Model

## Status
Accepted

## Context
KDI AI Office has transitioned from individual task execution to continuous operational surveillance and proactive software development. We require an architectural model that elevates high-level strategic objectives into multi-agent workflows without removing human authority or introducing uncontrolled orchestration layers.

## Decision
1. Introduce `OfficeObjective` as a first-class domain concept higher than `CanonicalTask`.
2. Anchor `AIManager` as the central supervisor, planner, and decomposition engine.
3. Standardize operational procedures as declarative `Runbook` specifications with explicit action types.
4. Integrate recurring schedules into the existing Phase 3 `AgentScheduler` runtime without adding a secondary scheduler daemon.

## Consequences
- Clean separation between strategic goals (`OfficeObjective`) and tactical units (`CanonicalTask`).
- Reusable, deterministic procedures for health checks, diagnostics, and triage.
- Direct alignment with the 3D living office digital twin.
