# ADR-026: Workload Mirror and Equivalent Workforce Valuation

## Status
ACCEPTED (Phase 8 Architecture Gate)

## Date
2026-09-30

## Context
In many organizations, a single human operator frequently covers multiple distinct functional disciplines (e.g. Website Administration, WordPress Core Engineering, Graphic Design, Social Media Management, Decree Publishing, and Local IT Support). Traditional HR frameworks evaluate such individuals strictly by nominal job title, ignoring the multi-disciplinary replacement capacity actually performed.

However, naive replacement calculations risk double-counting overlapping duties or making unsubstantiated normative claims ("the employee should be paid X"). We require an objective, illustrative mathematical model that:
1. Deconstructs workload responsibilities with concrete activity evidence.
2. Maps each responsibility to normalized market roles.
3. Implements strict double-counting and overlap controls.
4. Aggregates equivalent headcount FTE and calculates illustrative market replacement value.
5. Prohibits all normative or legal entitlement language across all outputs.

## Decision
We establish the **Workload Mirror Engine**:
1. **Decomposition**: Responsibilities are defined with documented evidence (commit history, task queues, logs), frequency, weekly hours, skills, and tools.
2. **Double-Counting Control**: An `allocationPercentage` (0–100%) and an `overlapFactor` (0.0–1.0) are applied to each mapping:
   $$\text{Effective FTE} = \frac{\text{Allocation \%}}{100} \times (1 - \text{Overlap Factor})$$
3. **Illustrative Valuation Range**: Each role's valuation is computed using verified salary benchmarks:
   $$\text{Valuation} = \text{Benchmark Salary} \times \text{Effective FTE}$$
   Calculated across Low (Min), Median, and High (Max) scenarios.
4. **Illustrative Benchmark Gap**:
   $$\text{Illustrative Gap} = \text{Equivalent Workforce Valuation (Median)} - \text{Actual Compensation}$$
5. **Language Standard**: All UI and reports strictly enforce non-normative terminology: *Illustrative Market Salary Benchmark*, *Equivalent Workforce Value*, *Benchmark Gap*. Prohibits *True Salary*, *Fair Salary*, *Underpaid*, *Wage Theft*, *Illegal Salary*.

## Consequences
- **Positive**: Accurately articulates true organizational capacity delivered by multi-disciplinary operators; prevents artificial valuation inflation via overlap controls.
- **Negative**: Requires careful human review to audit overlap factors between closely related disciplines (e.g. Web Admin and WordPress CMS).
