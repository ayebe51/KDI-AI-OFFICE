# DYNAMIC REPLANNING ENGINE & MULTI-OPTION ANALYSIS

## 1. Replanning Architecture & Loop

When actual execution diverges materially from the baseline plan, the Replanning Engine activates without human prompting, but operates strictly within **Bounded Strategic Autonomy**:

```text
Detect Deviation -> Analyze Root Cause -> Evaluate Cascade Impact -> Generate Multi-Option Trade-offs -> Compare Options -> Governance Boundary Check -> Owner Decision (if S4) OR Autonomous Re-sequence (if S3) -> Execute Plan vn+1 -> Rollback if Degraded
```

---

## 2. Replanning Triggers

The Replanning Engine is triggered by:
1. **Milestone Miss or Slippage:** $> 2$ days behind baseline (e.g. MS-SIM-04 queue backlog).
2. **Critical Dependency Failure:** Blocker in an upstream milestone.
3. **Agent Capacity Saturation:** QA or engineering utilization exceeding 85% threshold.
4. **Third-Party Provider Outage:** API rate limits or downtime.
5. **Budget Threshold Warnings:** 70%, 85%, 95% spend warnings.
6. **New Owner Requirement:** Explicit scope additions via Telegram.
7. **Validated Learning (Phase 14):** Empirical evidence suggesting a better execution sequence.

---

## 3. Multi-Option Analysis (Trade-Off Presentation)

The engine rejects arbitrary single "best" recommendations. It generates distinct, quantified trade-off options for governance review:

```typescript
export interface StrategicReplanningOption {
  optionId: string;
  title: string;
  strategy: 'SEQUENCE_CHANGE' | 'RESOURCE_REASSIGNMENT' | 'SCOPE_REDUCTION' | 'SCOPE_EXPANSION' | 'DEADLINE_ADJUSTMENT' | 'PAUSE' | 'SPLIT_MERGE';
  expectedOutcome: string;
  estimatedCostUsd: number;
  estimatedEffortHours: number;
  risk: RiskLevel;
  dependencyImpact: string[];
  qualityImplications: string;
  confidence: number;
  requiresOwnerApproval: boolean;
}
```

### Trade-Off Matrix for MS-SIM-04 Backlog:

| Option | Strategy | Timeline Impact | Scope Impact | Quality / Risk Impact | Governance Required? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option A** | `DEADLINE_ADJUSTMENT` | +4 days (MS-SIM-05 moves to Oct 19) | 100% full scope kept | Zero regression risk; highest test coverage. | **YES (Owner Approval)** |
| **Option B** | `SCOPE_REDUCTION` | 0 days (Deadline Oct 15 kept) | Defer Initiative X (Edge cases) | Coverage drops 94% $\rightarrow$ 88%; core paths safe. | **YES (Owner Approval)** |
| **Option C** | `SEQUENCE_CHANGE` | 0 days (Deadline Oct 15 kept) | 100% scope kept | Parallelize pool tests to Rian; defer non-critical tasks. | **NO (Autonomous S3)** |

---

## 4. Governed Execution vs Autonomous Re-sequencing

- **Autonomous Re-sequencing (S3):** KDI reassigns tasks between available agents or re-orders verification suites without changing external delivery commitments or budget limits.
- **Escalation to Owner (S4):** If the only feasible solutions require shifting deadlines or cutting agreed scope, KDI emits a structured **DECISION REQUIRED** message via Telegram and halts speculative work.

---

## 5. Safe Rollback Protocol

If a newly activated plan version causes measurable performance degradation (e.g. API latency spike or test regression), the engine executes:
```typescript
rollbackToPreviousApprovedPlan({
  objectiveId: 'OBJ-SIMMACI-REL',
  reason: 'Automated test degradation detected during canary',
  degradedMetrics: ['API latency spiked by 40ms'],
  authorizedBy: 'Owner / Chief Architect'
});
```
It immediately restores the prior plan state, logs an incident report (`INC-ROLLBACK-*`), and informs the Owner.
