# ADR-006: Event-Driven Agent Architecture & Asynchronous Message Queues

## Status
**APPROVED** (Phase 0 Baseline)

## Context
A synchronous, request-reply HTTP architecture for long-running multi-agent tasks causes HTTP timeouts, thread blocking, inability to survive network blips, and UI freezes. Autonomous tasks can take anywhere from 30 seconds to 15 minutes to complete.

## Decision
We adopt an **Event-Driven, Asynchronous Queue Architecture** centered around **Redis 7 (Streams and Pub/Sub)** and non-blocking background workers.

## Rationale
- Decouples task submission from execution: The user submits a prompt via web or mobile, receives an immediate `task_id` within 200ms, and disconnects safely.
- Real-time updates: Subtasks emit discrete events (`agent.status.changed`, `task.progress`, `approval.required`) streamed over WebSockets to the 3D dashboard without aggressive HTTP polling.
- Resilient recovery: In-flight queue tasks are tracked with consumer group acknowledgments; crashed workers do not cause lost tasks.

## Consequences
- **Positive:** System is fully non-blocking, responsive under load, resilient to client disconnects.
- **Negative:** Increased architecture complexity requiring event schema versioning and distributed state synchronization.
