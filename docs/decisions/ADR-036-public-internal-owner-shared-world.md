# ADR-036: Public / Internal / Owner Shared World

## Status
Accepted

## Context
Traditional enterprise systems maintain separate silos: a marketing website for visitors, an internal dashboard for employees, and a management back-office for company executives. In KDI AI OFFICE, dividing the 3D office into separate disconnected apps would fragment the living organizational concept and create redundant frontends.

We needed a unified paradigm where every participant experiences the same physical space while respecting zero-trust authorization boundaries.

## Decision
**One world. Multiple authorized perspectives.**

KDI implements a single, unified 3D virtual office supporting three progressive tiers of access:

1. **Public / Visitor**:
   - Access: Zero barrier to entry. No mandatory login gate.
   - Flow: Character Selection $\rightarrow$ Enter Office $\rightarrow$ Free Exploration $\rightarrow$ Talk to Sinta $\rightarrow$ Explore Portfolio $\rightarrow$ Elevator Navigation (Ground, Floor 2, Rooftop) $\rightarrow$ Coffee at Mang Ujang.
   - Data Protection: Sanitized public DTOs. Private source code diffs, financial balances, execution traces, and server credentials are never transmitted over the wire.
2. **Internal Member**:
   - Access: Authenticated staff / operator credentials.
   - Flow: All public exploration features + inspect internal agent assignments, view approved engineering tasks, inspect system status, and participate in whiteboard meetings.
3. **Executive Owner**:
   - Access: Cryptographically validated Owner JWT token.
   - Flow: Explores the exact same 3D physical office with chibi avatar, augmented with:
     - In-world Agent Inspector with real-time costs, execution stdout, and market salary valuation.
     - Direct in-world task assignment and objective decomposition.
     - Approval and rejection of Level 3/4 high-risk operations.
     - Follow Agent camera lock.
     - Tactical Bird's-Eye Overview Mode.
     - Full Executive Owner Suite (Command Center, Workforce Mirror, Autonomy Pause, Graph Memory, Infrastructure Health).

## Security & Verification Guarantees
- Authorization is strictly enforced at the NestJS API gateway and WebSocket message dispatcher.
- The frontend never trusts client-side role flags. Privileged endpoints reject unauthorized tokens with HTTP 403 `FORBIDDEN`.
- Public visitors cannot elevate their permissions simply by manipulating DOM state.

## Consequences
### Positive
- Deep immersion: The Owner manages the autonomous AI organization from within the living virtual headquarters.
- Unified maintenance: Single PlayCanvas scene graph, single asset pipeline, and single coordinate system.
- Zero data leakage: Sensitive telemetry is filtered at the server boundary before dispatch.
