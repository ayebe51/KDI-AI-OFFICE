# ADR-008: Resource-Aware Concurrency Throttling & Adaptive Scheduling

## Status
**APPROVED** (Phase 0 Baseline)

## Context
The office workstation is a shared resource. During working hours, the human developer uses the workstation for active programming in Antigravity IDE, browser multitasking, and local debugging. If background AI agents simultaneously run heavy AST indexing, Docker builds, and CPU inference, the host system can freeze or experience severe UI lag.

## Decision
We implement a **Resource-Aware Dynamic Scheduling Engine** that monitors host operating system telemetry (CPU load %, available RAM, disk I/O) in real-time.
- **Concurrency Throttling:** The active worker pool dynamically scales between 1 and 4 concurrent subtasks.
- **Host Protection Thresholds:**
  - If CPU utilization > 75% or RAM allocation > 80%, new background tasks in the Redis queue are held in `QUEUED` state.
  - If local Ollama CPU inference is active, concurrent worker threads are clamped to `CPU_CORES - 2`.
  - Background maintenance and documentation tasks run with `nice` priority (lower scheduling priority).

## Rationale
- Guarantees that the physical workstation remains completely fluid and responsive for the human developer at all times.
- Eliminates out-of-memory (OOM) crashes and system freezes during background autonomous runs.

## Consequences
- **Positive:** Perfectly stable workstation operations, cooperative resource sharing, hardware longevity.
- **Negative:** Heavy background batch tasks take longer to finish during peak hours when the developer is actively compiling code.
