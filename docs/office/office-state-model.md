# Office State Model

## 1. Domain Separation of Concerns
The KDI AI Office state model maintains strict segregation between three tiers of state:

```text
Operational Runtime State (Backend Engine)
          ↓ (AgentActivityMapper)
Office Activity State (Normalized Office Contract)
          ↓ (AgentAnimationController)
Visual Animation State (PlayCanvas Entity)
```

## 2. State Tiers

### A. Operational Runtime State (`AgentRuntimeStatus`)
Governs task dispatch, worker concurrency, and system availability:
- `AVAILABLE`
- `RESERVED`
- `WORKING`
- `PLANNING`
- `WAITING`
- `WAITING_APPROVAL`
- `PAUSED`
- `ERROR`
- `COMPLETED`
- `OFFLINE`
- `DRAINING`

### B. Office Activity State (`OfficeActivityState`)
Reflects semantic employee behaviors inside the virtual office:
- `OFFLINE`
- `IDLE`
- `WORKING`
- `THINKING`
- `PLANNING`
- `CODING`
- `DEBUGGING`
- `TESTING`
- `REVIEWING`
- `MEETING`
- `BREAK`
- `COFFEE`
- `LUNCH`
- `PRAYING`
- `READING`
- `TRAINING`
- `WAITING_APPROVAL`
- `ERROR`
- `COMPLETED`

### C. Visual Animation State (`AgentAnimClip`)
Drives procedural transforms, poses, and emissive indicators in PlayCanvas:
- `IDLE`
- `WALK`
- `SIT`
- `TYPE`
- `THINK`
- `READ`
- `MEETING`
- `COFFEE`
- `PRAY`
- `ERROR`
- `CELEBRATE`

## 3. Snapshot + Event Model
- **Initial Connection:** Client calls `GET /office/snapshot?internal={mode}` to receive the full, authoritative baseline of all rooms, agents, meetings, and server nodes.
- **Incremental Stream:** Client processes normalized events over WebSocket (`office.agent.activity_changed`, `office.meeting.started`, etc.).
- **Reconnect Recovery:** When the connection drops and recovers, the client automatically re-fetches the authoritative snapshot, guaranteeing zero missed state transitions.
