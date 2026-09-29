# Agent Lifecycle & State Machine: KDI AI Office

## 1. Overview
Agents in the **KDI AI Office** are deterministic, resource-conscious worker runtimes. Rather than running continuously in memory and burning compute/RAM, agents are instantiated on demand, transition through an expanded 20-state machine, emit regular heartbeats, and are cleanly terminated and garbage-collected upon task resolution.

---

## 2. Formal Dual-Layer Architecture: Runtime Status vs. Office Activity

In Phase 3, KDI AI Office formally establishes the separation between the **Agent Runtime Status** (the deterministic lifecycle of whether and how an agent executes a task) and the **Office Activity State** (the visual representation displayed in the 3D Living Virtual Office):

- **Agent Runtime Status (12 States)**: Low-level deterministic execution state managed by `AgentStateMachine`.
- **Office Activity State (20 States)**: High-level spatial/visual behavior rendered by PlayCanvas 3D, bridged via `AgentActivityMapper`.

### 2.1 Agent Runtime State Machine (12 States)
- `OFFLINE`: Agent process or thread is not active.
- `AVAILABLE`: Ready to accept newly scheduled tasks.
- `IDLE`: Awake at desk, awaiting incoming queue events.
- `RESERVED`: Claimed atomically by a worker for task execution.
- `PLANNING`: Ingesting prompt constraints, task context, or GraphRAG memory.
- `WORKING`: Actively executing a task attempt.
- `WAITING`: Temporarily yielding for external response or non-blocking timer.
- `WAITING_APPROVAL`: Blocked awaiting developer or operator authorization.
- `PAUSED`: Execution explicitly suspended by operator.
- `ERROR`: Recoverable or unrecoverable fault encountered.
- `COMPLETED`: Finished task execution successfully.
- `DRAINING`: Completing in-flight work before shutting down.

### 2.2 Canonical Task State Machine (15 Formal States)
1. `CREATED`: Task ingested and normalized.
2. `QUEUED`: Enqueued in priority queue awaiting scheduling.
3. `PLANNING`: Evaluating context, constraints, and dependencies.
4. `READY`: Ready for atomic worker assignment.
5. `ASSIGNED`: Matched to a specific agent candidate.
6. `RUNNING`: Worker actively executing the task.
7. `PAUSED`: Execution paused by user or policy.
8. `WAITING_DEPENDENCY`: Blocked pending upstream DAG prerequisite completion.
9. `WAITING_APPROVAL`: Intercepted by risk policy awaiting human sign-off.
10. `RETRYING`: Delayed exponential backoff retry in progress.
11. `COMPLETED`: Result verified and validated.
12. `FAILED`: Unrecoverable execution failure.
13. `CANCELLED`: Aborted by user command.
14. `EXPIRED`: Deadline exceeded without resolution.
15. `BLOCKED`: Dependency failed under `BLOCK` policy.

---

## 3. Agent 3D Visual State Machine (20 Canonical Office Activities)
    
    IDLE --> WORKING: Task Ingested
    
    state WORKING {
        [*] --> THINKING: Parsing Prompt / Memory
        THINKING --> PLANNING: Decomposing Goals / Specs
        PLANNING --> CODING: OpenCode AST Patching
        CODING --> DEBUGGING: Fixing Call Stack Errors
        DEBUGGING --> TESTING: Verification Test Runners
        TESTING --> REVIEWING: Inspecting Unified Diffs
    }
    
    WORKING --> MOVING: Transit across Office Corridors
    MOVING --> WORKING: Arrived at Destination Room
    
    WORKING --> MEETING: Scheduled Cross-Agent Sync
    MEETING --> MOVING: Concluded / Return to Desk
    
    WORKING --> BREAK: Lounge Rest
    WORKING --> COFFEE: Pantry Refreshment
    WORKING --> LUNCH: Dining Interval
    WORKING --> PRAYING: Congregational / Solo Prayer
    WORKING --> READING: Tech Documentation Study
    WORKING --> TRAINING: Knowledge Base Distillation
    
    BREAK --> WORKING: Context Rehydrated
    COFFEE --> WORKING: Context Rehydrated
    LUNCH --> WORKING: Context Rehydrated
    PRAYING --> WORKING: Context Rehydrated
    READING --> WORKING: Context Rehydrated
    TRAINING --> WORKING: Context Rehydrated
    
    WORKING --> WAITING_APPROVAL: High-Risk Action Detected
    WAITING_APPROVAL --> WORKING: Approved by Developer
    WAITING_APPROVAL --> FAILED: Rejected by Developer
    
    WORKING --> COMPLETED: Criteria Met & Verified
    WORKING --> ERROR: Unrecoverable Fault
    
    ERROR --> RECOVERING: Self-Correction Loop
    RECOVERING --> WORKING: Recovered
    RECOVERING --> FAILED: Retries Exhausted
    
    COMPLETED --> CLEANUP: Persist Lineage & Cost
    FAILED --> CLEANUP: Record Audit Post-Mortem
    
    CLEANUP --> OFFLINE: Freed Memory
```

---

## 3. Lifecycle Phases & Transitions

### 3.1 Phase 1 — Spawn & Initialization (`INITIALIZING -> IDLE`)
1. **Trigger:** Redis task queue worker claims a subtask designated for a specific agent persona.
2. **Context Hydration:**
   - Loads base system prompt and role constraints from `/docs/agents/agent-catalog.md`.
   - Ingests working memory from Redis session key (`kdi:session:<task_id>`).
   - Retrieves architectural context from Neo4j (GraphRAG 2-hop neighborhood).
3. **Heartbeat Initialization:** Spawns a background thread emitting heartbeats every 10 seconds to `kdi:agent:<id>:heartbeat` in Redis.

### 3.2 Phase 2 — Execution & Tool Invocation (`THINKING -> PLANNING -> CODING / TESTING`)
1. **Reasoning Loop:** Agent invokes AI Router with hydrated context.
2. **Tool Request:** Agent emits a structured tool execution request (e.g., `git.checkout`, `opencode.edit_file`, `shell.run_test`).
3. **Guardrails Check:** Sandbox Engine checks tool permissions and risk level against `permissions.md`.
4. **State Broadcast:** Emits WebSocket event updating the 3D digital twin avatar state in real-time (`CODING`, `TESTING`, etc.).

### 3.3 Phase 3 — Activity & Break Intermissions (`BREAK`, `COFFEE`, `LUNCH`, `PRAYING`)
1. **Context Snapshot:** Before transitioning to a break or prayer state, the active subtask state, target file path, and line numbers are serialized to Redis key `kdi:task:<task_id>:saved_context`.
2. **Spatial Transit:** Emits `agent.status.changed` with state `MOVING`, triggering NavMesh pathfinding in the 3D office.
3. **Intermission Duration:** Visual representation concludes after the scheduled interval or upon arrival of an urgent developer priority task.
4. **Resumption:** Agent returns to their desk, rehydrates the serialized context, and resumes execution seamlessly with zero loss of task momentum.

### 3.4 Phase 4 — Cross-Agent Meeting Coordination (`MEETING`)
1. **Trigger:** AI Manager identifies multiple agents assigned to overlapping tasks or subtasks on the same project.
2. **Transit & Gathering:** Participating agents transition to `MOVING`, convene in the Meeting Room (RM-07), and enter `MEETING` state.
3. **Consensus Artifact:** The meeting records architectural consensus, decisions, and action items, persisting an `office_meetings` record in PostgreSQL and a `:Meeting` node in Neo4j.
4. **Return:** Agents return to their respective pods on the Engineering Floor.

### 3.5 Phase 5 — Suspension & Resumption (`WAITING_APPROVAL`)
1. **Interception:** If an action requires human approval, execution is suspended.
2. **State Serialization:** The agent's call stack, memory state, and pending tool payload are serialized to PostgreSQL `approvals` table.
3. **Resource Release:** The worker thread yields its slot in the active concurrency pool, ensuring other low-risk tasks can execute while awaiting human input.
4. **Resumption:** When the user approves via web dashboard, a Redis event wakes an available worker, restores the serialized state, and resumes execution.

### 3.6 Phase 6 — Termination & Garbage Collection (`CLEANUP -> OFFLINE`)
1. **Lineage Ingestion:** Writes execution summary, tool logs, cost accounting records, and output artifacts to PostgreSQL and Neo4j graph nodes.
2. **Workspace Cleanliness:** Prunes isolated Git worktrees (`git worktree remove`) and flushes temporary Redis cache keys.
3. **Memory Reclamation:** Shuts down subprocesses, closes database connections, and transitions agent avatar to `IDLE` or `OFFLINE`.
4. **Heartbeat Teardown:** Removes heartbeat key from Redis; supervisor marks agent inactive.
