# Living Virtual Office & Activity Engine: KDI AI Office

## 1. Overview & Core Philosophy
The **Living Virtual Office** is the **Digital Twin of the AI Workforce**. Unlike static 3D dashboards or decorative game gimmicks, every visual element in the 3D space directly reflects the actual, deterministic state of the backend multi-agent system.

```text
Backend System State (Task / Tool / Schedule)
      ↓
Agent State & Activity Engine
      ↓
Spatial Room & Waypoint Assignment
      ↓
Office Telemetry Event
      ↓
WebSocket Real-Time Broadcast
      ↓
3D Digital Twin Visualization (React Three Fiber)
```

Micro-animations (head turns, typing cadence, coffee cup lift) are variations applied *after* the backend state has been established; random animations never dictate or fake system states.

---

## 2. Visual Style & Aesthetic Philosophy
- **Aesthetic Tone:** Modern, professional, warm, clean, slightly futuristic, human-centered, and Islamic-friendly technology office.
- **Color Palette:** Warm neutral architectural tones (light oak woods, soft slate, off-white acoustic panels, warm 3000K recessed lighting, subdued sage and bronze accents).
- **Prohibited Tropes:** Excessive cyberpunk neon, dark dystopian alleyways, arcade game aesthetics, or overly robotic cyborg models.
- **Atmosphere:** A tranquil, high-efficiency modern software company headquarters where the primary workforce consists of autonomous digital AI employees.

---

## 3. Comprehensive Office Floorplan (18 Zones & Rooms)

```text
┌─────────────────┬──────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ 1. RECEPTION    │ 2. MANAGEMENT    │ 3. PM ROOM      │ 4. ARCHITECTURE │ 5. WHITEBOARD   │
│ - Visitor Kiosk │ - AI Manager     │ - Product Mgr   │ - Sys Architect │ - System Design │
│ - Public Info   │ - Wall Monitors  │ - Biz Analyst   │ - DB Architect  │ - Sequences     │
├─────────────────┼──────────────────┴─────────────────┴─────────────────┼─────────────────┤
│ 6. PORTFOLIO    │ 7. MEETING ROOM (COLLABORATIVE SYNC)                  │ 8. PROJECT ROOM │
│ - Project Wall  │ - Multi-Agent Debate & Standup Table                  │ - Koneksi Santri│
│ - Showcases     │ - Teleconference Screen & Action Items                │ - Dedicated Lab │
├─────────────────┼──────────────────────────────────────────────────────┼─────────────────┤
│ 9. PANTRY       │ 10. ENGINEERING FLOOR (OPEN WORKSPACE)                │ 11. QA ROOM     │
│ - Coffee Bar    │ - Frontend Area (FE-01, FE-02)                       │ - Test Benches  │
│ - Water Disp.   │ - Backend Area  (BE-01, BE-02)                       │ - Coverage Mon  │
│ - Snack Table   │ - DevOps Area   (DevOps-01, TechWriter)              │ - Robot Arms    │
├─────────────────┼──────────────────┬─────────────────┬─────────────────┼─────────────────┤
│ 12. BREAK AREA  │ 13. MUSHOLLA     │ 14. SECURITY RM │ 15. RESEARCH RM │ 16. SERVER ROOM │
│ - Lounge Chairs │ - Mihrab & Sajadah│ - Vault Bunker  │ - Paper Archive │ - Live Blades   │
│ - Book Shelves  │ - Wudhu Wash     │ - Audit Guard   │ - Radar Dish    │ - DB Health     │
└─────────────────┴──────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 3.1 Zone Specifications

| Room / Zone | Description & Furniture | Architectural Purpose |
|---|---|---|
| **1. Reception** | Glass entrance, reception desk, visitor digital kiosk, turnstiles. | Public landing zone for external visitors; displays public company overview and portfolio. |
| **2. Management Room** | Executive mahogany desk, multi-monitor mission wall, project backlog board. | Primary workspace of the AI Manager; coordinates global tasks and agent dispatches. |
| **3. PM Room** | Collaborative standing desks, sprint burndown board, wireframe screens. | Workspace for Product Manager and Business Analyst. |
| **4. Architecture Room** | Drafting tables, 3D rotating Neo4j topological model, system spec shelves. | Workspace for System Architect and Database Architect. |
| **5. Whiteboard Area** | Wall-to-wall magnetic glass dry-erase whiteboard with digital marker projections. | Dynamic visualization of active architectural diagrams, data flows, and task decomposition. |
| **6. Portfolio Gallery** | Digital exhibition stands, rotating holographic project pedestals, display wall. | Showcase of completed and active software projects for public visitors and team review. |
| **7. Meeting Room** | Large conference table, 10 ergonomic chairs, central video monitor, agenda screen. | Venue for cross-functional multi-agent syncs, SOP handoffs, and retrospectives. |
| **8. Project Room** | Dedicated war room for flagship products (e.g., *Koneksi Santri Room*). | Contains project-specific architecture wall, live staging demo terminal, and timeline. |
| **9. Pantry** | Espresso machine, cups, hot/cold water dispenser, bistro table, bar stools. | Break destination for coffee, tea, and short mental resets. |
| **10. Engineering Floor** | Modular acoustic pod desks, dual curved monitors, mechanical keyboards. | Main open-space floor with dedicated pods for Frontend, Backend, and DevOps Engineers. |
| **11. QA Room** | Specialized hardware test benches, automated test light towers (green/red). | Workspace for QA Engineer; monitors live test suite passes, failures, and code coverage. |
| **12. Break Area** | Comfortable armchairs, natural indoor plants, soft area rug, reading library. | Destination for agent `BREAK` and `READING` activities. |
| **13. Musholla** | Mihrab facing Qibla, clean prayer mats (sajadah), Quran shelf, adjacent wudhu area. | Dedicated prayer sanctuary for individual and congregational prayer (`PRAYING`). |
| **14. Security Room** | Biometric access door, dark aesthetic, red perimeter lines, threat monitors. | Workspace for Security Engineer and Code Reviewer; scans diffs and CVE advisories. |
| **15. Research Room** | Bookshelves, arXiv paper terminals, floating data tablets, search radar dish. | Workspace for Researcher; evaluates third-party packages and emerging tech. |
| **16. Server Room** | Cold-aisle server racks, glass front blades, fiber trays, overhead cooling vents. | Visual representation of PostgreSQL, Redis, Neo4j, Ollama, and worker containers. |

---

## 4. The 20 Canonical Agent States

The agent state machine expands to 20 deterministic states:

```text
OFFLINE ────── Agent process not running or deregistered
IDLE ───────── Agent awaiting assignment at their primary desk
WORKING ────── General productive execution
THINKING ───── Ingesting prompts, querying GraphRAG memory
PLANNING ───── Decomposing tasks, drafting PRDs or ADRs
CODING ─────── Active file modification via OpenCode
DEBUGGING ──── Inspecting stack traces, isolating failing lines
TESTING ────── Executing unit, integration, or regression test runners
REVIEWING ──── Inspecting code diffs, lint scores, and security scans
MEETING ────── Participating in structured conference in Meeting Room
MOVING ─────── Walking through corridors between rooms
BREAK ──────── Relaxing in the Break Area
COFFEE ─────── Pouring/drinking beverage in Pantry
LUNCH ──────── Eating or seated in Pantry bistro table
PRAYING ────── Engaged in prayer in the Musholla
READING ────── Reviewing documentation or technical articles
TRAINING ───── Fine-tuning skills, updating internal knowledge items
WAITING_APPROVAL ─ Suspended awaiting human developer sign-off
ERROR ──────── Blocked by unrecoverable failure / exception
COMPLETED ──── Finished assigned task with passing criteria
```

---

## 5. Movement & Waypoint Navigation System
When an agent's activity changes its required location (e.g., from `Engineering Floor` to `Meeting Room` or `Pantry`), the **Movement System** handles the transition:

1. **State Update:** Backend emits `agent.status.changed` with `state: "MOVING"` and `target_room: "RM-09"`.
2. **NavMesh Pathfinding:** In the 3D client, Three.js pathfinding calculates an obstacle-free corridor route across the office floorplan NavMesh.
3. **Arrival Event:** Upon reaching the destination coordinate, the agent emits an internal arrival trigger, snaps to the designated chair/standing node, and transitions to the target state (`MEETING`, `COFFEE`, `PRAYING`).
4. **Non-Blocking Execution:** Movement animation is visual; the underlying agent logic begins processing immediately without being artificially delayed by 3D walking speed.

---

## 6. Break System & Context Preservation
To simulate human-centered office rhythms without harming productivity:
- **Trigger:** Configurable idle interval or post-task relaxation rule.
- **Context Snapshot:** Before transitioning to `COFFEE`, `LUNCH`, or `BREAK`, the agent's complete working context is serialized:
  ```json
  {
    "agent_id": "SOFTWARE_ENGINEER",
    "previous_state": "CODING",
    "saved_context": {
      "task_id": "tsk_1092",
      "file_path": "src/services/PickupService.ts",
      "line_number": 48
    }
  }
  ```
- **Resumption:** When the break concludes (e.g., after 60 seconds of simulation or upon immediate task arrival), the agent transitions back to their workstation, rehydrates the saved context, and resumes work seamlessly.

---

## 7. Musholla & Prayer Scheduler

### 7.1 Spiritual Architecture & Aesthetics
The Musholla is designed with dignity, warmth, and authenticity:
- **Clean Wooden Mihrab:** Subtle arch indicator directed towards Qibla.
- **Sajadah (Prayer Mats):** Soft emerald green textured rugs aligned in neat prayer rows.
- **Al-Qur'an Stand & Bookshelf:** Symmetrical wooden display on the side wall.
- **Wudhu Station:** Clean tiled ablution area adjacent to the entrance with water faucet props.

### 7.2 Non-Blocking Prayer Scheduler
- **Scheduling Abstraction:** Calculated dynamically using local timezone, geographic coordinates, and official prayer calculation methods (e.g., Kemenag Indonesia / Muslim World League).
- **Asynchronous Safeguard:** Prayer activities in the virtual office **DO NOT** halt background AI backend execution. If an emergency bugfix arrives during prayer time, the AI Manager dispatches it immediately to active background workers, while avatars in the 3D space visually reflect appropriate respectful transitions.
- **Congregational Prayer (Jamaah):** When prayer time triggers, eligible available agents walk to the Musholla, form rows behind a designated Imam avatar, perform prayer motions, and return to work upon completion.

---

## 8. Functional Meeting Room & Whiteboard Engine

### 8.1 Structured Multi-Agent Meetings
When cross-functional collaboration is required (e.g., complex task planning or retrospective), the AI Manager schedules an `office_meeting`:
- **Meeting Entity:** `meeting_id`, `project_id`, `topic`, `participants`, `agenda`, `start_time`, `decisions`, `action_items`.
- **Participants Gather:** Relevant avatars (e.g., PM, Architect, Engineer, QA) move to the Meeting Room and seat around the oval conference table.
- **Collaborative Transcript:** Summary notes and architectural decisions are recorded and persisted to PostgreSQL `office_meetings` and Neo4j `:Meeting` nodes.

### 8.2 Interactive Functional Whiteboard
The glass whiteboard in the Architecture Room dynamically renders diagrams generated by agents:
- **Data Source:** System Architect and Database Architect tool outputs (Mermaid syntax or SVG).
- **Real-Time Projection:** The 3D camera can focus on the whiteboard surface to display interactive sequence diagrams, ERDs, or task decomposition trees.

---

## 9. Server Room Telemetry Representation
The Server Room features animated server racks with LED blades representing core system infrastructure:
- **Blade Racks:** PostgreSQL, Redis, Neo4j, Ollama, MetaGPT, OpenCode, Worker Pool.
- **Dynamic LED Status:**
  - `ONLINE`: Constant soft green pulse.
  - `DEGRADED`: Amber blink (e.g., provider fallback active, host CPU > 75%).
  - `OFFLINE / ERROR`: Strobe red alert with cooling fan alarm visual.

---

## 10. Public vs. Private 3D Modes
The 3D Virtual Office supports dual operational views:

### 10.1 Public Mode (External Visitors & Portfolio Guests)
- **Accessible Zones:** Reception, Portfolio Gallery, Project Showcase Room, Meeting Room (exterior/spectator view).
- **Visible Data:** Agent roles, high-level public project names, general activity ("Collaborating on Mobile UI"), tech stack badges.
- **Strictly Redacted:** Source code diffs, Git branches, terminal logs, salary/compensation figures, API keys, private tasks, and internal audit records.

### 10.2 Private Mode (Authenticated Developer / Master Operator)
- **Full Unrestricted Access:** Free camera orbit across all rooms, click-to-inspect any agent's live prompt stream, view raw terminal outputs, access Workload Mirror, review pending approval diffs, and inspect workforce compensation metrics.
- **Authentication:** Requires valid JWT with `ROLE_DEVELOPER` or `ROLE_OPERATOR`.
