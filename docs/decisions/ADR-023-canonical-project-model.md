# ADR-023: Canonical Project Model for Internal and Public Portfolio

## Status
**ACCEPTED**

## Context
KDI AI Office operates both as an internal autonomous multi-agent engineering platform and as a public-facing corporate portfolio. Previously, project concepts were split between lightweight visual mockups, internal task groupings, and static client descriptions. There was a critical risk of data divergence (where 3D showcases display different information than public web pages) and data leakage (where confidential client terms, LLM token costs, private git repositories, or internal agent execution logs accidentally expose to the internet).

## Decision
1. **Single Canonical Project Authority:**
   All projects within KDI AI Office are defined using a single, normalized `Project` domain model stored authoritatively in PostgreSQL and mapped associatively into the Neo4j Knowledge Graph.
2. **Explicit Public Projection (`PublicProject` DTO):**
   Internal `Project` entities are NEVER returned directly over public HTTP endpoints. The backend `ProjectsService` enforces a strict whitelist transformation (`toPublicProjectDto`), filtering:
   - Projects with `visibility !== 'PUBLIC'` or `publishStatus !== 'PUBLISHED'` (returning 404).
   - Stripping internal notes, total costs (`totalCostUsd`), and token counts (`totalTokensUsed`).
   - Stripping private internal git URLs (`privateRepoUrl`).
   - Stripping internal agent IDs from team rosters.
   - Filtering features and media down to strictly those flagged as `PUBLIC`.
3. **Deterministic Slug Routing:**
   Public projects are addressed strictly via unique, lowercase, URL-safe slugs (`/project/:slug`), ensuring stable bookmarking and search engine indexability.

## Consequences
- **Positive:** Guaranteed zero data divergence between 3D kiosks, 2D project cards, and detailed case studies. Absolute protection against accidental proprietary secret leakage.
- **Negative:** Schema migrations must account for both internal task fields and public showcase metadata.
