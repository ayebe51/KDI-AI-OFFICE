# ADR-033: KDI Observability Architecture

## Status
Accepted (Phase 10 — Production Hardening)

## Context
Running an autonomous software development company 24/7 requires complete observability across HTTP ingress, AI manager objectives, task scheduling, agent executions, tool invocations, database latency, and 3D digital twin streaming. Operators must be able to trace causal provenance and understand system behavior without noisy alert fatigue or sensitive secret exposure in log files.

## Decision
1. **OpenTelemetry-Compatible Abstraction**:
   - Telemetry signals are unified across Traces, Metrics, and Structured JSON Logs.
   - Every user directive or automated trigger generates a root `trace_id` and `correlation_id` propagated through:
     `HTTP / WebSocket Ingress` -> `KDI Directive / Objective` -> `Task Unit` -> `Worker Execution` -> `Tool Invocation / LLM Call` -> `Database Mutation` -> `Client Telemetry Broadcast`
2. **Structured Logging with Automated Redaction**:
   - Logs are formatted in JSON containing timestamp, service, level, operation, trace_id, span_id, task_id, and message.
   - PII, database passwords, JWT tokens, Bearer headers, and API keys are automatically scrubbed via regex masks before emission.
3. **Actionable Alerting & Runbook Linkage**:
   - Alerts are categorized into 4 deterministic tiers: `INFO`, `WARNING`, `HIGH`, `CRITICAL`.
   - Every alert includes source, reason, potential impact, recommended immediate action, and a direct link to an operational runbook.
   - Alert deduplication suppresses identical bursts within 60-second sliding windows.
4. **SLO / SLI & Error Budgets**:
   - Four core service-level objectives are tracked: API Availability (99.5%), Backup Success Rate (99.9%), Task Processing Latency P95 (< 5s), and WebSocket Streaming Uptime (99.0%).
   - Depleted error budgets signal when release changes should be postponed in favor of stability hardening.
5. **Categorized Operational Scorecard**:
   - System health is reported across 9 granular dimensions (Availability, Security, Backups, Recovery, Performance, Queue Health, Provider Health, Autonomy Safety, Data Integrity) rather than a single ambiguous score.

## Consequences
- **Positive**: Complete causal transparency during incident triage; zero secret leakage in observability pipelines; alerts are actionable and linked directly to mitigation runbooks.
- **Negative**: Trace context propagation overhead across asynchronous boundary queues.
