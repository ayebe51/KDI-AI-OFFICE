# KDI Market Salary Benchmark Methodology Guide

## 1. Overview & Core Philosophy
The KDI Market Salary Benchmark Methodology establishes a transparent, verifiable, and mathematically sound framework for estimating the labor replacement value of organizational functions. 

The primary objective is to reflect **real-world market compensation standards** across Indonesian tech, design, communications, and IT operations sectors for the year **2026**.

---

## 2. Source Selection Criteria
A salary source is admitted to the KDI Benchmark Registry only if it satisfies all of the following requirements:
1. **Public or Verified Institutional Publisher**: Published by a recognized government agency, accredited recruitment enterprise, or audited job platform.
2. **Methodological Transparency**: Discloses sample composition, sample size, or data aggregation technique (e.g. median net monthly wages from Sakernas).
3. **Temporal Validity**: Clearly indicates publication date and effective survey period (2026 active baseline).
4. **Geographic Precision**: Differentiates between regional markets (e.g. Central Java: Cilacap, Purwokerto, Banyumas, Semarang) and National Remote positions.
5. **Traceability**: Contains direct URLs or verifiable report identifiers.

---

## 3. Source Reliability Hierarchy
Sources are stratified into five canonical tiers:

| Tier | Category | Admitted Sources | Treatment in System |
| :--- | :--- | :--- | :--- |
| **TIER A** | Official Government / Statistical | Badan Pusat Statistik (BPS Jawa Tengah Sakernas) | Baseline reference for regional formal wages |
| **TIER B** | Recognized Recruitment Surveys | Glints Tech Talent Report 2026, Michael Page Salary Guide 2026 | Industry standard for technology and digital roles |
| **TIER C** | Primary Job Portals with Disclosures | Jobstreet by SEEK Indonesia Salary Insights 2026 | Granular employer posting disclosures |
| **TIER D** | Aggregated Postings / Secondary Data | Secondary recruitment meta-aggregators | Secondary supplementary reference |
| **TIER E** | Model Projections / Heuristics | Algorithmic or LLM estimation | **Prohibited as market benchmarks**; MUST be labeled `ESTIMATED` |

---

## 4. Geographic & Regional Treatment
Salaries vary substantially across Indonesia. The KDI benchmark framework strictly isolates geographic contexts:
- **Central Java Regional (Cilacap, Purwokerto, Banyumas, Semarang)**: Reflects local cost-of-living and prevailing enterprise wage scales. Used as the default baseline for local operational roles.
- **National Remote Indonesia**: Applied to specialized software engineering, systems architecture, and distributed technical disciplines where compensation is national or hybrid.
- **Jakarta Capital Region**: Maintained as a separate geographic benchmark band; never conflated with Central Java regional figures without explicit contextual labeling.

---

## 5. Experience Level Mapping
Internal organizational grades are normalized to external market tiers:

| Source Market Level | Normalized KDI Level | Standard Years of Experience | Representative Roles |
| :--- | :--- | :--- | :--- |
| Entry / Associate | `JUNIOR` | 0 – 2 years | Junior Designer, Helpdesk Support |
| Mid-Level / Professional | `MID` | 2 – 5 years | Web Administrator, WordPress Specialist, Graphic Designer |
| Senior / Specialist | `SENIOR` | 5 – 8 years | Senior Software Engineer, QA Automation Engineer |
| Principal / Lead / Architect | `PRINCIPAL` | 8+ years | Systems Architect, Technical Director |
| Management | `MANAGER` / `DIRECTOR` | 6+ years | Product Delivery Manager |

---

## 6. Salary Range Treatment: Min, Median & Max
To eliminate arbitrary single-number assumptions, every benchmark captures a three-point distribution:
- **Low Scenario (Min)**: 10th to 25th percentile of verified survey disclosures (entry-level within grade or regional lower quartile).
- **Median Scenario (Median)**: The 50th percentile statistical median. Serves as the primary baseline for illustrative gap calculations.
- **High Scenario (Max)**: 75th to 90th percentile of verified survey disclosures (top-tier enterprise or premium specialty).

---

## 7. Source Conflicts & Dispersion Analysis
When multiple independent reports provide varying figures for the same role and location:
1. The system **never erases variance** by presenting an ungrounded average.
2. The system computes the **dispersion range** (Min Spread, Median Spread, and Percentage Variance).
3. The blended benchmark uses the **unweighted median across verified sources**, explicitly disclosing the methodology and dispersion notes.

---

## 8. Staleness Tracking & Expiration
- Benchmarks have a configurable freshness window (default: **180 days** from retrieval).
- If a benchmark's retrieval age exceeds the threshold, it is automatically marked with an amber badge: `STALE / HISTORICAL BENCHMARK`.
- Historical snapshots are preserved immutably to allow longitudinal wage trend analysis without corrupting past reports.

---

## 9. Equivalent FTE & Overlap Prevention (Double-Counting Control)
When one individual performs multiple functions:
1. **Allocation Percentage**: Reflects time/effort share (e.g. Web Admin 100%, Design 60%, Social Media 40%).
2. **Domain Overlap Mitigation**: When two functions share underlying tooling or infrastructure (e.g. Website Administration and WordPress CMS management share server, domain, and publishing workflows), an `overlapFactor` (e.g. 0.10) mitigates redundant capacity:
   $$\text{Effective FTE} = \frac{\text{Allocation \%}}{100} \times (1 - \text{Overlap Factor})$$
3. This mathematical constraint guarantees that multi-role aggregation cannot artificially inflate replacement valuation.

---

## 10. Confidence Scoring
Each mapped role is assigned a match confidence score:
- **HIGH**: Direct title correspondence, $\ge 3$ overlapping core skills, verified tools, and human review sign-off.
- **MEDIUM**: Functional alignment with related title (e.g. Academic Decree Formatting $\rightarrow$ Content Publishing Specialist).
- **LOW**: Partial heuristic capability overlap; requires human confirmation before inclusion in final executive briefs.

---

## 11. Known Limitations & Governance Boundaries
1. **Non-Normative Boundary**: Benchmarks reflect statistical market replacement costs, not subjective assessments of what an individual "deserves" or legal entitlements.
2. **Contractual Independence**: The KDI platform does not perform formal payroll accounting, tax withholding, or labor union arbitration.
3. **Macroeconomic Shifts**: Sudden inflationary spikes or statutory minimum wage (UMR/UMK) decree updates require manual registry refresh.
