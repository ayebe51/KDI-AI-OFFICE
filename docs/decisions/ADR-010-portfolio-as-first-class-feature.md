# ADR-010: Portfolio as a First-Class Architectural Feature

## Status
**APPROVED** (Phase 0 Addendum)

## Context
In most software development platforms, client work showcases and portfolios are detached static marketing websites hosted independently from the engineering environment. This creates severe documentation lag, out-of-date case studies, and disconnected architectural diagrams that do not reflect actual merged codebases.

## Decision
We designate the **Portfolio as a First-Class Feature** integrated directly into the core KDI AI Office architecture and 3D virtual environment:
1. Portfolio data links directly to live project records, Git commit histories, and Neo4j graph entities.
2. The 3D office features physical exhibition spaces (Portfolio Gallery, dedicated Project Rooms like the *Koneksi Santri Room*).
3. Demonstrated AI contributions (planning, coding, testing, security review) must be backed by verified execution evidence in audit logs and commit histories.

## Rationale
- Authenticity and truth: Case studies and architecture views are dynamically synchronized with real repository deliverables.
- Unified experience: Potential clients, external visitors, and team members explore finished products in the same virtual digital office where the autonomous agents build them.

## Consequences
- **Positive:** Always up-to-date showcase, empirical evidence backing all claims, rich interactive customer experience.
- **Negative:** Requires rigorous data sanitization rules to prevent leaking proprietary intellectual property or private internal code to public viewers.
