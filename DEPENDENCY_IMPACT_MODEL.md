# DEPENDENCY IMPACT & CASCADE ANALYSIS MODEL

## 1. Multi-Tier Graph Representation

KDI represents strategic dependencies as a directed acyclic graph (DAG) in Neo4j, mirrored in PostgreSQL. The topology spans 6 distinct hierarchical tiers:

```mermaid
graph TD
    OBJ[Strategic Objective: OBJ-SIMMACI-REL]
    PROG[Program: PROG-REL-01]
    PRJ[Project: SIMMACI Core]
    M1[Milestone 1: Pool Lifecycle]
    M2[Milestone 2: Socket Keepalive]
    M3[Milestone 3: Failover Benchmarks]
    M4[Milestone 4: QA & Security Review]
    M5[Milestone 5: Production Canary]
    INIT[Initiative: Verification Queue Clearance]
    TSK[Task: OWASP & Regression Verification]
    AGT[Agent: Farhan]

    OBJ -->|SUPPORTS| PROG
    PROG -->|CONTAINS| PRJ
    PROG -->|CONTAINS| M1
    M1 -->|ENABLES| M2
    M2 -->|ENABLES| M3
    M3 -->|ENABLES| M4
    M4 -->|BLOCKS| M5
    M4 -->|SUPPORTS| OBJ
    M5 -->|SUPPORTS| OBJ
    INIT -->|ENABLES| M4
    TSK -->|ENABLES| INIT
    TSK -->|ASSIGNED_TO| AGT
```

---

## 2. Cascade Impact Analysis Algorithm

When a node (task, milestone, or provider) experiences failure or slippage, KDI computes downstream blast radius **from actual graph relationships**, rather than naively assuming all downstream nodes fail.

### Traversal Logic:
1. Traverse outbound edges with relationship `BLOCKS`. Directly blocked nodes are marked for immediate execution pause.
2. Traverse `ENABLES` edges to calculate downstream milestone target date slippage.
3. Traverse `SUPPORTS` edges to evaluate impact on parent strategic objectives.
4. Traverse `ASSIGNED_TO` edges to identify which agents will experience queue saturation or idle starvation.

---

## 3. Concrete Cascade Analysis Case Study: MS-SIM-04 Delay

When milestone `MS-SIM-04` falls 4 days behind baseline:

```json
{
  "failedDependencyId": "MS-SIM-04",
  "failedDependencyType": "MILESTONE",
  "directBlockedNodes": ["MS-SIM-05"],
  "affectedMilestoneIds": ["MS-SIM-04", "MS-SIM-05"],
  "affectedObjectiveIds": ["OBJ-SIMMACI-REL"],
  "affectedProjectIds": ["SIMMACI"],
  "affectedAgentRoles": ["Farhan", "Rian"],
  "estimatedDeadlineDelayDays": 4,
  "invalidatedDownstreamWork": ["MS-SIM-05"],
  "impactSeverity": "HIGH",
  "graphTraversalDepth": 2
}
```

### Insights Delivered to Owner:
- **Direct Blocker:** MS-SIM-05 cannot begin until MS-SIM-04 security verification completes.
- **Scope of Impact:** Exactly 2 milestones and 1 strategic objective affected; other projects (e.g. Gowa Waha migration) remain 100% unaffected.
- **Resource Bottleneck:** QA queue is saturated; Farhan is overloaded at 94% utilization while engineering is comfortable at 72%.
