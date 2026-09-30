# ADR-022: Backend-Driven 3D Digital Twin

## Status
**APPROVED** (Phase 6 Canonical Decision)

## Context
A common failure mode in virtual office and 3D metaverse prototypes is implementing client-side "fake life" simulations—running random timers, random walking algorithms, random coffee breaks, and fabricated task progress to create the illusion of activity.

For KDI AI Office, this is strictly prohibited. The platform's primary mission is to serve as an **autonomous multi-agent software engineering workspace** and a faithful **living digital twin** of real ongoing work.

## Core Principle
```text
REAL BACKEND STATE → 3D VISUALIZATION
```
**NOT:**
```text
3D ANIMATION → Considered as REAL STATE
```

## Explicit Architectural Roles
1. **Backend = Source of Truth:**
   All task assignments, agent runtime statuses, activity states, locations, meeting lifecycles, prayer schedules, and infrastructure health metrics originate exclusively from authoritative backend services (`OfficeService`, `RuntimeService`, `HealthService`).
2. **3D = Visualization Layer:**
   The 3D world is strictly a reflection/projection of system state. It does not generate business state, invent tasks, or alter operational reality.
3. **React = Application & UI Orchestration:**
   React manages layout, data fetching, WebSocket subscription, overlays, inspectors, accessibility modes, and modals.
4. **PlayCanvas = 3D Rendering & Spatial Storytelling:**
   Renders entities, materials, lighting, cameras, and procedural motion.
5. **WebSocket = Real-Time Transport:**
   Transports normalized, typed, version-sequenced events (`office.*`).

## State Decomposition
To prevent conflating operational execution with visual behavior, internal states are strictly decoupled:
- **`AgentRuntimeStatus` (Operational State):** `AVAILABLE`, `RESERVED`, `WORKING`, `PLANNING`, `WAITING`, `WAITING_APPROVAL`, `PAUSED`, `ERROR`, `COMPLETED`, `OFFLINE`, `DRAINING`.
- **`OfficeActivityState` (Office Activity State):** `OFFLINE`, `IDLE`, `WORKING`, `THINKING`, `PLANNING`, `CODING`, `DEBUGGING`, `TESTING`, `REVIEWING`, `MEETING`, `BREAK`, `COFFEE`, `LUNCH`, `PRAYING`, `READING`, `TRAINING`, `WAITING_APPROVAL`, `ERROR`, `COMPLETED`.
- **`AgentAnimClip` (Visual Animation State):** `IDLE`, `WALK`, `SIT`, `TYPE`, `THINK`, `READ`, `MEETING`, `COFFEE`, `PRAY`, `ERROR`, `CELEBRATE`.

## Deterministic Activity Mapping
Transitions from operational state to office activity are governed deterministically by `AgentActivityMapper`:
- `task.started` (CODING) $\rightarrow$ `CODING`
- `task.started` (TESTING) $\rightarrow$ `TESTING`
- `task.started` (PLANNING) $\rightarrow$ `PLANNING`
- `task.started` (RESEARCH) $\rightarrow$ `THINKING`
- `task.started` (REVIEW / SECURITY) $\rightarrow$ `REVIEWING`
- `task.paused` (Approval Required) $\rightarrow$ `WAITING_APPROVAL`
- `task.completed` $\rightarrow$ `COMPLETED`
- `scheduled.prayer` $\rightarrow$ `PRAYING` (tasks preserved in serialized context)

## Resiliency & State Versioning
- **`entityVersion`:** Every agent update increments an integer version. The client store discards out-of-order events where $V_{\text{event}} < V_{\text{current}}$.
- **Event Deduplication:** Client caches recently processed `eventId` strings to eliminate duplicate frames.
- **Authoritative Snapshot:** On initial connection and upon any WebSocket reconnection, the client requests `GET /office/snapshot` to reconcile any missed state.
- **Connection Disruption:** If the WebSocket disconnects, the 3D office remains rendered in its last authoritative state, displaying a "Reconnecting" badge. No fake behavior is simulated during disconnection.

## Consequences
- Every visual change on screen can be traced back directly to a verifiable backend event, log line, or transaction.
- Operators and public observers have complete transparency into actual system productivity.
- Eliminates visual desynchronization and phantom agent actions.
