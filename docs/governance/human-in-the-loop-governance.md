# KDI Human-in-the-Loop Governance & Authority Framework

## 1. Core Principle
**Human remains the final authority.**

Autonomous agents operate as an augmented engineering workforce under delegated authority. The system operates on predefined boundaries that no model or agent can transcend.

## 2. Cryptographic Approval Gates
Every high-risk action (database migrations, production branch merges, configuration updates) generates a `PendingApproval` record:
- Expiration timers automatically invalidate stale requests.
- Approval scopes can be granular: `ONCE`, `FOR_OBJECTIVE`, `FOR_RUNBOOK`, or `TEMPORARY`.
- AI agents are strictly blocked from self-approving actions.

## 3. Human Intervention Metrics
The governance engine tracks:
- `human_interventions`: Total manual actions taken.
- `approval_count`: Number of granted approvals.
- `rejection_count`: Number of rejected actions.
- `manual_override_count`: Emergency switch activations.
- `escalation_count`: Critical alerts surfaced to humans.
