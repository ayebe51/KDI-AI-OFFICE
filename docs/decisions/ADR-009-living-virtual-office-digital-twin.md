# ADR-009: Living Virtual Office as Digital Twin of the AI Workforce

## Status
**APPROVED** (Phase 0 Addendum)

## Context
Standard agent monitoring systems rely on sterile text tables, logs, or static 2D dashboards. Conversely, visual 3D simulations often make the mistake of animating random movements, typing motions, and conversations that bear no correlation to the actual state of the backend workers, creating an untrustworthy gimmick.

## Decision
We establish the **Living Virtual Office** as a strict **Digital Twin of the AI Workforce**:
1. All avatar positions, room allocations, visual poses, and floating indicators must derive deterministically from backend system events (`agent.status.changed`, `task.progress`, `tool.executing`, `prayer.started`).
2. Random micro-animations (e.g., blinking, subtle head adjustments) are strictly cosmetic variations applied *after* the backend state has been established; they never dictate or fake operational activity.

## Rationale
- High-trust observability: A human developer glancing at the 3D office immediately knows the genuine operational status of their engineering team (e.g., seeing the QA avatar in the QA Room with a red beacon indicates an actual test failure).
- Human-centered workplace culture: Introducing authentic spaces like the Pantry and Musholla creates a respectful, dignified, and relatable environment for human-AI collaboration.

## Consequences
- **Positive:** High visual engagement, instant intuitive system comprehension, zero disconnect between visual presentation and backend reality.
- **Negative:** Requires continuous event streaming over WebSockets and spatial state mapping logic.
