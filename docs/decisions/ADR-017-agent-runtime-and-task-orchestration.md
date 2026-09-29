# ADR-017: Agent Runtime, Task Orchestration & Living Workforce Execution

## Status
Accepted

## Date
2026-09-29

## Context
Following the completion of the Phase 2 AI Intelligence Layer (ADR-016), KDI AI Office required an execution runtime to translate AI models into autonomous digital employees. The system must coordinate heterogeneous multi-agent tasks, manage task queues, enforce deterministic state transitions, resolve Directed Acyclic Graph (DAG) task dependencies, respect workstation resource constraints, link execution costs, bridge internal runtime telemetry to 3D virtual office activities, and provide human-in-the-loop escalation.

Crucially, this phase builds the foundational runtime body of the AI workforce *without* jumping prematurely to uncontrolled autonomous code editing or arbitrary shell execution.

## Decision

1. **Separation of Concerns**:
   Strict architectural isolation between `Task`, `Agent`, `Skill`, `Tool`, `Execution`, `Model`, `Provider`, `Memory`, `Policy`, and `Approval`. No entity violates its bounded context.

2. **Canonical State Machines**:
   - **Task State Machine (15 Formal States)**:
     `CREATED`, `QUEUED`, `PLANNING`, `READY`, `ASSIGNED`, `RUNNING`, `PAUSED`, `WAITING_DEPENDENCY`, `WAITING_APPROVAL`, `RETRYING`, `COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`, `BLOCKED`.
     Guards enforce valid transitions (`canTransition`, `transition`). Illegal transitions throw `IllegalStateTransitionException`.
   - **Agent State Machine (12 Formal States)**:
     `OFFLINE`, `AVAILABLE`, `IDLE`, `RESERVED`, `PLANNING`, `WORKING`, `WAITING`, `WAITING_APPROVAL`, `PAUSED`, `ERROR`, `COMPLETED`, `DRAINING`.
     Runtime availability (`AVAILABLE`, `BUSY`, `DRAINING`, `ERROR`, `OFFLINE`) is derived dynamically.
   - **Office Activity Bridge (`AgentActivityMapper`)**:
     Decouples internal runtime states from visual presentation by mapping combinations of runtime state and task type to the 20 visual office activity states (e.g., `RUNNING` + `CODING` -> `CODING`; `PLANNING` -> `THINKING`; `WAITING_APPROVAL` -> `WAITING_APPROVAL`).

3. **Weighted Priority Queue & Dead Letter Queue (DLQ)**:
   Task queue supports priority weighting (`URGENT` [1000] > `HIGH` [500] > `NORMAL` [100] > `LOW` [10]), delayed re-enqueueing for exponential backoff, atomic claiming, and Dead Letter Queue (`DLQ`) routing when max retries are exhausted.

4. **Task Dependency DAG Engine (`DependencyManager`)**:
   Tasks can declare explicit prerequisites (`dependencies: string[]`). Dependent tasks remain in `WAITING_DEPENDENCY` until prerequisites succeed. Configurable failure policies (`BLOCK`, `SKIP`, `RETRY_DEPENDENCY`, `ESCALATE`) prevent premature or corrupted executions.

5. **Multi-Factor Assignment Engine (`AgentAssignmentEngine`)**:
   Selects optimal agents based on:
   - Required skills (e.g. `coding`, `testing`, `debugging`, `research`, `documentation`, `architecture`, `security`, `analysis`).
   - Required LLM capabilities (e.g. `CODE`, `REASONING`, `FAST`).
   - Workstation concurrency limits (`maxConcurrentTasks`).
   - Data privacy boundary: tasks marked `CONFIDENTIAL` strictly require local execution capabilities and are prohibited from cloud-dependent agents.
   - Traceable selection scoring and audit rejection logs.

6. **Workstation Concurrency & Resource Guard (`ConcurrencyController`)**:
   Enforces agent-level concurrency and global workstation ceilings (`maxRunningTasks`, `maxRunningAgents`, `maxWorkerProcesses`). Samples host CPU and memory pressure; schedules work only when host resources are healthy.

7. **Worker System & Lifecycle Supervision (`TaskWorker`, `AgentRuntime`)**:
   - Atomic claim pattern (`QUEUED` -> `ASSIGNED` -> `RUNNING`).
   - Timeout watchdog via `AbortController` preventing zombie processes.
   - Periodic heartbeats and stale worker crash recovery scanning (`recoverStaleWorkers`).
   - Non-fatal retry classification (`TIMEOUT`, `RATE_LIMITED` -> delayed retry; `AUTHENTICATION_FAILED` -> immediate escalation).

8. **Pluggable Execution Provider Abstraction (`ExecutionProvider`)**:
   `ExecutionProvider` abstraction decouples task execution from specific engines. Phase 3 implements `LLMExecutionProvider` linking directly to Phase 2 `LLMService` for token and cost accounting. Future adapters (`OpenCodeExecutionProvider`, `MetaGPTExecutionProvider`) plug into this exact interface without refactoring the orchestration runtime.

9. **AI Manager & Human Escalation Foundation (`AIManager`)**:
   Provides high-level request normalization, task validation, risk assessment (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and automatic gating into `WAITING_APPROVAL` for dangerous operations (e.g. destructive database changes or security modifications).

10. **Operator Console & Live Telemetry**:
    Interactive web UI (`AgentRuntimeConsole`) providing real-time task dispatch, lifecycle controls (pause/resume/cancel/retry), DLQ inspection, execution audit histories, and live WebSocket event streams (`task.*`, `agent.*`, `execution.*`).

## Consequences

- **Positive:**
  - Robust, deterministic multi-agent orchestration without runaway processes or zombie workers.
  - Complete traceability for task assignment decisions, DAG prerequisites, and cost accounting.
  - Full compatibility with the 3D PlayCanvas Living Virtual Office via clean state-to-activity mapping.
  - Extensible execution provider interface ready for Phase 4 tool and workflow integration.
- **Negative:**
  - In-memory queue and registry require Redis and PostgreSQL hydration for multi-node clustering in later enterprise phases.
  - Scheduler polling loop requires calibration on low-spec hardware to balance latency versus CPU overhead.
