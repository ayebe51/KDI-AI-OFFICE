# Observability Architecture — KDI AI Office

## 1. Observability Signals
KDI AI Office implements an OpenTelemetry-compatible observability engine capturing three core signals:
1. **Traces**: Distributed trace context (`trace_id`, `span_id`, `parent_span_id`, `correlation_id`) propagating across HTTP endpoints, task queues, agent executions, and database queries.
2. **Metrics**: Real-time numerical gauges tracking latency P95, task queue depth, active worker count, CPU/RAM utilization, and token expenditure.
3. **Structured Logs**: JSON-formatted log streams enriched with trace metadata and scrubbed of sensitive secrets.

## 2. End-to-End Trace Propagation Flow

```text
HTTP Request (trace_id: trc_8f1a)
    │
    ▼
KDI Command Controller (span_id: spn_01)
    │
    ▼
Office Objective Decomposition (span_id: spn_02)
    │
    ▼
Task Queue Enqueue (correlation_id: corr_task_902)
    │
    ▼
Worker Execution (span_id: spn_03)
    │
    ▼
Antigravity Sandboxed Tool (span_id: spn_04)
    │
    ▼
PostgreSQL / Neo4j Mutation (span_id: spn_05)
```
