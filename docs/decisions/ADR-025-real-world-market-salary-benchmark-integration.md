# ADR-025: Real-World Market Salary Benchmark Integration

## Status
ACCEPTED (Phase 8 Architecture Gate)

## Date
2026-09-30

## Context
KDI AI Office requires a rigorous, verifiable mechanism to benchmark labor compensation for both human workload valuation and digital workforce planning. Prior designs lacked explicit data provenance, allowing unverified heuristic salary figures that risked misleading stakeholders. 

We require an authoritative standard where:
1. Every salary figure is linked to a verified real-world source registry.
2. A strict reliability tier hierarchy governs source selection (Tier A: BPS/Gov, Tier B: Industry surveys like Glints/Michael Page, Tier C: Job portals like Jobstreet by SEEK, Tier D: Aggregations, Tier E: AI models marked ESTIMATED).
3. Benchmark figures must never be synthetic without explicit labeling.
4. Historical salary benchmark snapshots must be frozen upon creation to prevent silent historical mutation.
5. Strict geographic separation (Central Java vs National Remote) and experience level taxonomies must be preserved.

## Decision
We implement `SalaryBenchmarkSource` and `SalaryBenchmark` with immutable snapshots in `@kdi/types` and `@kdi/api`:
1. **Source Registry**: All benchmark data must originate from registered sources capturing publication date, retrieval date, effective period, URL, provider, methodology, and reliability tier.
2. **Snapshotting**: Every modification generates a `SalaryBenchmarkSnapshot` ensuring historical immutability.
3. **Staleness Tracking**: Benchmarks older than the freshness threshold (default 180 days) are flagged as `STALE` and excluded from current default views.
4. **Source Dispersion**: When multiple verified reports cover a role, median values are preserved with explicit dispersion disclosures rather than opaque blending.

## Consequences
- **Positive**: Complete data provenance and auditability; eliminates ungrounded salary figures; builds trust with institutional stakeholders.
- **Negative**: Requires ongoing maintenance of annual survey reports and periodic snapshotting.
- **Compliance**: Adheres to Indonesian regional market baselines (Sakernas BPS Jawa Tengah 2026, Glints 2026, Michael Page 2026, Jobstreet SEEK 2026).
