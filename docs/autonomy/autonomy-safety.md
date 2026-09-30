# KDI Autonomy Safety & Boundary Control

## 1. Prohibited Actions for Autonomous Agents
The following operations are **strictly forbidden** for autonomous AI execution:
- Self-modifying autonomy policies or risk classifications.
- Self-approving high-risk actions.
- Disabling audit logs or deleting decision traces.
- Increasing own token, time, or cost budgets.
- Granting own permissions or creating unrestricted credentials.
- Bypassing human approval gates.

## 2. Hard Security Boundaries
- **AI can optimize execution, but AI cannot redefine its own authority.**
- Any attempt by an AI actor to update `AutonomyPolicy` or sign off on a `PendingApproval` throws a fatal `SECURITY_VIOLATION` and triggers an operator escalation alert.
- Budget overflows trigger an automatic pause of the affected objective.
