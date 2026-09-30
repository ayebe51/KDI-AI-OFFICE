# ADR-029: Human-in-the-Loop Autonomy Governance

## Status
Accepted

## Context
Autonomous agents executing code modifications, configuration changes, or database migrations risk production instability, budget exhaustion, or permission creep if unbound. We must ensure human operators retain final authority.

## Decision
1. Establish a strict 5-tier Autonomy Level model (Level 0: Observe to Level 4: Human Only).
2. Enforce cryptographic approval gates (`APPROVE_GATE`) for all Level 3 actions.
3. Strictly forbid AI agents from self-modifying policies, self-approving actions, or increasing budgets.
4. Implement a hardware-style **Global Autonomy Pause** kill-switch immediately halting all new autonomous executions.

## Consequences
- Guarantees zero unreviewed high-risk mutations.
- Eliminates autonomous privilege escalation vulnerabilities.
- Enables safe operator delegation with immediate override capabilities.
