# ADR-030: Event-Driven Autonomous Workflow Engine

## Status
Accepted

## Context
Autonomous office operations require reactive responsiveness to telemetry signals (e.g. database query latency spikes, test regressions) without creating unbounded execution cascades or feedback loops.

## Decision
1. Implement a unified `TriggerEngine` supporting Time, Event, Condition, Threshold, and Manual directives.
2. Build declarative condition evaluation in pure backend code without invoking LLMs for simple comparisons.
3. Enforce multi-layered loop prevention: cooldown timers, fingerprint deduplication, and causal entity chain tracking.
4. Support Dry Run and Simulation modes for safe offline validation before production execution.

## Consequences
- Eliminates non-deterministic trigger failures.
- Prevents runaway cascading loops between services and automated remediation tasks.
- Verifiable with high-speed automated integration test suites.
