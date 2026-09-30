# KDI Trigger & Condition Engine

## 1. Trigger Modalities
The KDI `TriggerEngine` supports 6 distinct operational triggers:

1. **TIME**: Cron or interval schedules (e.g. `0 8 * * 1` for every Monday 08:00 WIB). Handled via the existing Phase 3 scheduler.
2. **EVENT**: Telemetry events emitted by subsystems (e.g. `service.degraded`, `task.failed`, `execution.failed`).
3. **CONDITION**: Declarative deterministic field comparisons evaluated without LLM overhead.
4. **MANUAL**: Direct human directive submitted via the Command Center terminal.
5. **DEPENDENCY**: Directed Acyclic Graph (DAG) task readiness.
6. **THRESHOLD**: Continuous numeric metric monitors (e.g. `latencyMs > 2000`).

## 2. Condition Operators
Deterministic evaluation supports:
- `GT`: Greater than
- `GTE`: Greater than or equal
- `LT`: Less than
- `LTE`: Less than or equal
- `EQ`: Equal
- `NEQ`: Not equal
- `CONTAINS`: Substring match

Simple arithmetic conditions are strictly evaluated in the backend runtime to eliminate LLM non-determinism.
