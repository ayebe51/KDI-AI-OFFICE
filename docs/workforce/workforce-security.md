# Workforce Security, Privacy & Data Isolation

## 1. Threat Model & Data Sensitivity
Workforce valuation data encompasses sensitive information:
- Actual human employee compensation records.
- Personal workload allocations and operational duties.
- Organizational replacement value and benchmark gap metrics.

Under no circumstances may personal compensation data or private employer benchmarks leak to public endpoints or unauthenticated sessions.

---

## 2. Public vs Private Isolation Boundary

### Public Endpoints (`/public/workforce/summary`)
The public showcase exposes only sanitized, high-level capability data:
- Aggregate virtual AI agent count and department distributions.
- Generalized autonomous capabilities (e.g. Fullstack TypeScript, MetaGPT SOPs, Dual-Database persistence).
- High-level capability equivalence (e.g. "Workload represents ~3.2 FTE equivalent across 6 functional disciplines").
- **Strictly Redacted**: Individual human names, employee IDs, actual monthly salaries, specific gap amounts, and employer identities.

### Administrative Endpoints (`/workforce/*`)
- Requires valid bearer authentication token with admin/operator role.
- All modifications (source creation, benchmark update, profile save, simulation execution) are written to an append-only audit trail capturing `timestamp`, `actor`, `action`, `targetType`, `targetId`, and `justification`.

---

## 3. Automated Data Leakage Prevention Test (Test 24)
Unit and integration test suites enforce an automated scan across the serialized public summary:
```ts
assert.equal(jsonStr.includes('EMP-OPERATOR-01'), false);
assert.equal(jsonStr.includes('4500000'), false);
assert.equal(jsonStr.includes('11080000'), false);
```
Any accidental exposure of human identifiers or actual pay figures causes build failure.
