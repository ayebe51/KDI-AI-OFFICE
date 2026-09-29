# ADR-014: Public vs. Private 3D Office Data Segregation

## Status
**APPROVED** (Phase 0 Addendum)

## Context
The 3D Virtual Office is hosted on a public domain via Hostinger and serves as a public portfolio and digital twin showcase for prospective clients and visitors. At the same time, the office environment hosts real, active engineering on proprietary codebases (*Koneksi Santri*), sensitive terminal logs, git diffs, financial compensation numbers, and internal decision matrices.

## Decision
We enforce a strict **Dual-Zone Security Model**:
1. **Public Mode (Unauthenticated Visitors):**
   - Access restricted to Reception, Portfolio Gallery, and Project Showcase Room.
   - Exposes only general agent presence, sanitized project overviews, public tech stacks, and approved case studies.
   - Enforces zero data leakage: Source code, Git branches, terminal logs, diffs, compensation numbers, and internal audit records are completely omitted from edge API payloads.
2. **Private Mode (Authenticated Developer / Operator):**
   - Requires verified JWT with `ROLE_DEVELOPER` or `ROLE_OPERATOR`.
   - Unlocks the entire building floorplan, real-time code inspector, Workload Mirror, approval gates, and raw execution logs.

## Rationale
- Completely eliminates risk of accidental intellectual property theft, credential leakage, or data compliance violations while maintaining an open, engaging public portfolio.

## Consequences
- **Positive:** Bulletproof data privacy, zero compromise on public showcase capabilities.
- **Negative:** Requires edge API gateway to filter and redact response payloads based on authentication context.
