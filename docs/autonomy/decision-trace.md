# KDI Decision Trace & Auditability

## 1. Provenance Schema
Every autonomous trigger, evaluation, and action must answer:
- Why did this run?
- What triggered it?
- Which policy allowed it?
- Which agent executed it?
- What changed?
- What evidence exists?
- Who approved it (if required)?
- What was the result?

```typescript
export interface DecisionTrace {
  decisionId: string;
  objectiveId?: string;
  triggerId?: string;
  policyId?: string;
  agentId?: string;
  reason: string;
  evidence: string[];
  decision: 'PERMITTED' | 'BLOCKED_POLICY' | 'WAITING_APPROVAL' | 'HUMAN_ONLY' | 'BUDGET_EXCEEDED' | 'LOOP_DETECTED';
  approval?: { approvedBy: string; timestamp: string; scope: string };
  timestamp: string;
}
```

## 2. Zero Private Chain-of-Thought
Decision traces record objective, factual evidence (telemetry readings, policy IDs, cron timestamps) and concise rationales. Raw unverified model reasoning traces are never exposed in audit logs.
