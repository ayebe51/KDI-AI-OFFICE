# Workforce Domain Model Specification

## 1. Domain Entities
The Phase 8 Workforce Architecture introduces a two-tier organizational domain model that clearly bifurcates human market workforce reconstruction from autonomous digital agent runtime economics.

```text
+-------------------------------------------------------------+
|              WORKFORCE DOMAIN ARCHITECTURE                  |
+-------------------------------------------------------------+
|                                                             |
|   [ PERSPECTIVE B: REAL-WORLD HUMAN WORKLOAD MIRROR ]       |
|                                                             |
|   WorkloadProfile (1 Human Operator)                        |
|     |                                                       |
|     +---> Responsibility (N functional areas)               |
|     |       |                                               |
|     |       +---> Evidence (Commits, logs, tickets)         |
|     |       +---> Skills & Tools                            |
|     |                                                       |
|     +---> WorkloadRoleMapping                               |
|     |       |                                               |
|     |       +---> MarketRole (Normalized taxonomy)          |
|     |       +---> SalaryBenchmark (Min, Median, Max)        |
|     |       +---> SalaryBenchmarkSource (Tier A-D)          |
|     |       +---> Allocation % & Overlap Factor             |
|     |                                                       |
|     +---> EquivalentRoleValuation                           |
|             |                                               |
|             +---> Equivalent Headcount FTE                  |
|             +---> Illustrative Workforce Value (Range)      |
|             +---> Illustrative Benchmark Gap                |
|                                                             |
+-------------------------------------------------------------+
|                                                             |
|   [ PERSPECTIVE A: AI VIRTUAL WORKFORCE & OPERATING COST ]  |
|                                                             |
|   VirtualEmployee (Autonomous Agents)                       |
|     |                                                       |
|     +---> VirtualCompensation (Simulated Base + Bonus)      |
|     +---> OperatingCost (LLM Tokens + Tools + Cloud Infra)  |
|     +---> Total AI Cost = Virtual Comp + Operating Cost     |
|                                                             |
+-------------------------------------------------------------+
```

## 2. Core Separation Principle
1. **AI Operating Cost**: Measures real monthly cloud hosting, LLM token inference, and developer tooling subscriptions.
2. **Virtual Employee Compensation**: Internal simulation model used to assess digital agent capability, task complexity, and organizational value relative to standard salary grades.
3. **Real-World Workforce Valuation**: External human replacement benchmark estimating what the multi-disciplinary responsibilities performed by a human operator would cost on the open market.
