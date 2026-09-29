# WebSocket Realtime Event Contract: KDI AI Office

## 1. Overview & Transport Protocol
The **KDI AI Office WebSocket Service** delivers ultra-low-latency real-time telemetry to the 3D Digital Twin Office and 2D Management Dashboards.
- **Endpoint:** `wss://office.kdi.internal/ws/v1/events`
- **Sub-protocol:** JSON-encoded event frames.
- **Heartbeat:** Ping/Pong frames every 30 seconds to maintain persistent NAT traversal.

---

## 2. Canonical WebSocket Event Envelope

```json
{
  "event_id": "evt_01J9X8K2M4N5P6Q7R8S9T0V1W2",
  "type": "agent.status.changed",
  "timestamp": "2026-09-29T16:22:15.120Z",
  "channel": "office:events",
  "data": {
    "agent_role": "SOFTWARE_ENGINEER",
    "previous_state": "THINKING",
    "current_state": "CODING",
    "room_id": "RM-05",
    "task_id": "tsk_01J9X8A1B2C3",
    "activity_summary": "Writing patch in PickupService.ts:L48"
  }
}
```

---

## 3. Catalog of Supported Realtime Events

### 3.1 Task Lifecycle Events
- **`task.created`:** Emitted when a new task is ingested and enqueued.
- **`task.started`:** Emitted when a worker process claims the task and begins planning.
- **`task.progress`:** Streams percentage, active subtask title, and current agent.
- **`task.completed`:** Emitted when all subtasks pass and final diff is generated.
- **`task.failed`:** Emitted when a task fails with error code and traceback.

### 3.2 Agent State & Spatial Navigation Events
- **`agent.status.changed`:** Drives the 3D avatar animations and overhead status badges across all 20 canonical visual states (`OFFLINE`, `IDLE`, `WORKING`, `THINKING`, `PLANNING`, `CODING`, `DEBUGGING`, `TESTING`, `REVIEWING`, `MEETING`, `BREAK`, `COFFEE`, `LUNCH`, `PRAYING`, `READING`, `TRAINING`, `MOVING`, `WAITING_APPROVAL`, `ERROR`, `COMPLETED`).
- **`agent.entered_room`:** Emitted when an agent's avatar crosses a room bounding threshold and triggers room occupancy updates (`agent_id`, `room_id`, `entered_at`).
- **`agent.left_room`:** Emitted when an agent departs a room to initiate corridor navigation or room change (`agent_id`, `room_id`, `target_room_id`).

### 3.3 Governance & Approval Events
- **`approval.required`:** High-risk action intercepted; pushes an alert payload with diff/SQL preview to the dashboard.
- **`approval.resolved`:** Emitted when human signs off (`APPROVED` or `REJECTED`), unfreezing UI indicators.

### 3.4 Engineering Execution Events
- **`test.started`:** Test runner initiated for a specific test file.
- **`test.completed`:** Test runner finished; emits passed/failed counts and execution time.
- **`commit.created`:** New git commit created on task working branch with commit hash and message.

### 3.5 AI Router & Inference Events
- **`llm.request.started`:** Model call initiated; emits provider name and estimated tokens.
- **`llm.request.completed`:** Model response received; emits actual tokens, latency in ms, and cost.

### 3.6 Meeting & Collaboration Events
- **`meeting.started`:** Emitted when AI Manager convenes a sync in `RM-12` (Meeting Room). Payload includes `meeting_id`, `project_id`, `task_id`, `topic`, `participants` array, and agenda. Triggers concurrent agent navigation to meeting seats.
- **`meeting.ended`:** Emitted when meeting adjourns. Transmits meeting minutes, decisions, and action items, triggering participant returns to their origin desks.

### 3.7 Break, Wellness & Islamic Prayer Events
- **`break.started`:** Emitted when an agent enters general rest state (`agent_id`, `target_zone: RM-15`).
- **`break.ended`:** Emitted when rest period elapses; avatar returns to work desk.
- **`coffee.started`:** Emitted when agent walks to `RM-14` (Pantry) for coffee machine interaction; previous task execution context is serialized.
- **`coffee.ended`:** Emitted when coffee break concludes; deserializes saved task context and resumes active role state.
- **`lunch.started`:** Emitted during scheduled midday recess; agent visits Pantry dining area.
- **`lunch.ended`:** Emitted when lunch recess concludes.
- **`prayer.started`:** Emitted when Prayer Scheduler triggers for scheduled Salah (Fajr, Dhuhr, Asr, Maghrib, Isha); agent saves execution context and navigates to `RM-16` (Musholla). Supports single or congregational (*Jama'ah*) mode. Background tasks remain 24/7 non-blocking.
- **`prayer.ended`:** Emitted at prayer conclusion; avatar transitions back to origin room and resumes execution context.

### 3.8 Portfolio & Project Showcase Events
- **`portfolio.project.updated`:** Emitted when project metadata, tech stack, screenshots, or case study content is updated via Portfolio CMS.
- **`portfolio.project.status.changed`:** Emitted when a portfolio project transitions lifecycle status (`CONCEPT`, `PROTOTYPE`, `DEVELOPMENT`, `STAGING`, `PRODUCTION`, `MAINTENANCE`, `ARCHIVED`). Updates digital displays in `RM-18` (Portfolio Gallery) and `RM-19` (Project Showcase).

### 3.9 Workforce, Cost & Budget Events
- **`cost.updated`:** Emitted upon LLM token or tool execution reconciliation, updating cumulative virtual workforce cost for an agent or project.
- **`budget.threshold.reached`:** Emitted when department operating cost reaches 80%, 90%, or 100% of defined monthly allocation limit. Triggers managerial alert in `RM-02` (Management Room).
- **`workload.updated`:** Emitted when the Workload Mirror recalculates equivalent AI roles, virtual compensation, or tool costs from newly mapped responsibilities.

---

## 4. Public vs. Private Channel Subscription & Privacy Scrubbing

Clients subscribe to specific scoped channels. The WebSocket gateway enforces privacy filtering based on client authentication:

```json
{
  "action": "subscribe",
  "channels": [
    "office:public",
    "portfolio:public",
    "office:events",
    "task:tsk_01J9X8A1B2C3",
    "agent:SOFTWARE_ENGINEER"
  ]
}
```

### 4.1 Channel Scopes & Sanitization Rules
| Channel | Auth Requirement | Permitted Events & Payload Content | Scrubbed / Redacted Fields |
|---|---|---|---|
| `office:public` | None (Unauthenticated) | Room occupancies, high-level agent role and status (`CODING`, `MEETING`, `PRAYING`), general company announcements | Code diffs, SQL, commit hashes, stack traces, compensation, costs, internal decision logs |
| `portfolio:public` | None (Unauthenticated) | `portfolio.project.*` for projects with `PUBLIC` visibility only | Unreleased drafts, `INTERNAL`/`CONFIDENTIAL` projects, private repository links |
| `office:events` | Bearer JWT (`OPERATOR`, `MANAGER`, `ADMIN`) | Full unfiltered stream: task lifecycles, test details, agent internal thinking, meetings, movement events | None (Full telemetry) |
| `workforce:finance` | Bearer JWT (`MANAGER`, `ADMIN`) | `cost.updated`, `budget.threshold.reached`, `workload.updated`, salary metrics | Hidden from lower-privilege operators |

