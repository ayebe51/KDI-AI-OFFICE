# STRATEGIC DRIFT & OBJECTIVE OBSOLESCENCE MODEL

## 1. Strategic Drift Detection

**Strategic Drift** occurs when active daily engineering work slowly decouples from approved strategic objectives. The Drift Engine continuously evaluates:

```text
Daily Tasks & Commits <---> Milestone Deliverables <---> Program Success Criteria <---> Strategic Objective
```

---

## 2. Drift Detection Signals & Evaluation Rules

The engine scans for four primary drift patterns:
1. **Unlinked Tasks (`UNLINKED_TASKS`):** Tasks created without parentage linking to an approved Strategic Program or Milestone.
2. **Unapproved Scope Expansion (`SCOPE_EXPANSION`):** New initiatives added without prior cryptographic Owner approval.
3. **Resource Burn Without Impact (`BURNING_WITHOUT_PROGRESS`):** High token or compute consumption on a module that produces zero measurable progress on milestone criteria.
4. **Repetitive Rework (`REPEATED_NO_IMPACT`):** More than 3 cycles of failed verification without opening an incident or triggering replanning.

```typescript
export interface StrategicDriftFinding {
  driftDetected: boolean;
  driftType: 'UNLINKED_TASKS' | 'SCOPE_EXPANSION' | 'BURNING_WITHOUT_PROGRESS' | 'REPEATED_NO_IMPACT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedTasks: string[];
  evidence: string[];
  recommendedAction: string;
  detectedAt: string;
}
```

---

## 3. Objective Obsolescence Detection

An objective may become obsolete if fundamental operating assumptions change. Signals monitored:
- **Disappeared Dependencies:** External upstream systems deprecated.
- **Technology Shifts:** Underlying framework or architecture replaced.
- **Strategic Policy Changes:** Owner reallocates priority to a different domain.

### Non-Autonomous Cancellation Rule:
When obsolescence is detected, **KDI NEVER automatically cancels the objective**.
The engine surfaces an advisory review recommendation:

```json
{
  "objectiveId": "OBJ-SIMMACI-REL",
  "isObsolescent": false,
  "obsolescenceScore": 0.0,
  "triggers": [],
  "recommendation": "CONTINUE",
  "assumptionsEvaluated": [
    "SIMMACI production database remains operational on PostgreSQL 16",
    "Academic Madrasah semester enrollment peak traffic confirmed",
    "Security & reliability objectives remain aligned with organizational roadmap"
  ]
}
```
Only the human Owner retains the sovereign authority to cancel or retire an objective.
