# KDI Autonomy Policy Engine

## 1. Policy Model
The `AutonomyPolicy` schema defines the explicit envelope within which an agent or runbook may act:

```typescript
export interface AutonomyPolicy {
  policyId: string;
  action: RunbookActionType | string;
  riskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  allowedAgents: AgentRole[];
  allowedProjects: string[];
  allowedEnvironment: 'SANDBOX' | 'STAGING' | 'PRODUCTION';
  maxCost: number;       // in USD
  maxDuration: number;   // in milliseconds
  approvalRequired: boolean;
}
```

## 2. Risk Classification
- **LOW**: Read health endpoint, generate report, run non-destructive test, summarize logs.
- **MEDIUM**: Dependency update in isolated worktree, non-production configuration change.
- **HIGH**: Production configuration, database migration, external destructive operation.
- **CRITICAL**: Credential change, security boundary modification, irreversible production action.

## 3. Evaluation Rules
1. If the global emergency switch is active, policy evaluation immediately returns `BLOCKED`.
2. Critical risk actions immediately evaluate to `HUMAN_ONLY` (Level 4).
3. If an action's estimated cost or duration exceeds policy limits, the action halts for human approval.
4. If the agent role is not whitelisted, the action halts with `AGENT_DISALLOWED`.
