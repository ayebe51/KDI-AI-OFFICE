# ADR-027: Separation of Human Market Benchmark and AI Operating Cost

## Status
ACCEPTED (Phase 8 Architecture Gate)

## Date
2026-09-30

## Context
A critical architectural pitfall in AI workforce simulation is the conflation of external human market replacement value with internal digital employee costs. Conflating these numbers creates deceptive metrics where software operating expenses (cloud servers, LLM tokens) are falsely presented as equivalent to human payroll or where virtual agent compensation is mistaken for real cash liabilities.

We must enforce a strict, immutable architectural separation between:
1. **Perspective A (AI Workforce Operating & Virtual Cost)**:
   $$\text{Total AI Employee Cost} = \text{Virtual Compensation} + \text{LLM Cost} + \text{Tool Cost} + \text{Infra Allocation}$$
2. **Perspective B (Real-World Human Workforce Valuation)**:
   $$\text{Equivalent Human Market Value} = \sum (\text{Market Salary Benchmark} \times \text{Effective FTE})$$

## Decision
We enforce a **Three-View Partitioned Model** across API and UI layers:
1. **View 1 (Real-World Market Workforce Benchmark)**: Evaluates what equivalent human talent costs in the open market (e.g. Central Java baseline).
2. **View 2 (Virtual Employee Compensation Simulation)**: Internal simulated salary based on organizational grade (GR-01 to GR-06), allowances, and performance incentives for agent ranking and capability benchmarking.
3. **View 3 (Actual AI Operating Cost)**: Real hard cash runtime expenses for hosting models, running cloud nodes, and paying external API token invoices.
4. **Data Isolation & Privacy**:
   - Public showcases (`/public/workforce/summary`) only expose aggregate digital agent counts, department compositions, and high-level capability equivalence.
   - Actual human compensation figures, individual PII, private employer names, and specific gap calculations are strictly confidential and barred from public API responses.

## Consequences
- **Positive**: Complete analytical clarity; prevents misleading financial comparisons; protects personal human compensation privacy.
- **Negative**: Requires maintaining two separate accounting pipelines within the workforce module.
