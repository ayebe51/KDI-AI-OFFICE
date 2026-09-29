# Observability, Telemetry & Distributed Tracing: KDI AI Office

## 1. Core Purpose & Golden Question
The primary operational directive of observability in **KDI AI Office** is to answer the fundamental question:

> **"Kenapa task ini gagal?"** (Why did this task fail?)

The system must reconstruct the end-to-end causal chain from the initial user prompt down to the exact agent thought, LLM token response, tool invocation, shell exit code, or AST compiler error.

---

## 2. Distributed Tracing & ID Correlation Hierarchy

Every operation generates a strict correlation hierarchy:

```text
[ trace_id: trc_01J9X8... ] (Global lifecycle boundary)
   │
   ├── [ task_id: tsk_01J9X8... ] (High-level goal)
   │     │
   │     ├── [ task_run_id: run_01J9X8... ] (Subtask execution)
   │     │     │
   │     │     ├── [ agent_role: "SOFTWARE_ENGINEER" ]
   │     │     │     │
   │     │     │     ├── [ request_id: req_01J9X8... ] (LLM Inference Call)
   │     │     │     │     └── Provider: Gemini / Cost: $0.012 / Latency: 1.2s
   │     │     │     │
   │     │     │     └── [ tool_call_id: tc_01J9X8... ] (Tool Action)
   │     │     │           └── Tool: tool_shell / ExitCode: 1 / Stderr: "Null pointer"
```

1. **`trace_id`:** Propagated across HTTP headers (`X-Trace-ID`), WebSocket frames, Redis queue messages, and database records.
2. **`task_id`:** Links subtasks to the parent user instruction.
3. **`task_run_id`:** Identifies a specific execution attempt or retry.
4. **`request_id`:** Correlates every LLM API call with input/output token counts.

---

## 3. Structured Logging Standard

All log entries are emitted in JSON format conforming to the following schema:

```json
{
  "timestamp": "2026-09-29T16:25:30.450Z",
  "level": "ERROR",
  "trace_id": "trc_01J9X899999999999999999999",
  "task_id": "tsk_01J9X8A1B2C3D4E5F6G7H8J9K0",
  "task_run_id": "run_01J9X8B2C3D4E5F6",
  "agent_role": "SOFTWARE_ENGINEER",
  "service": "kdi-agent-workers",
  "event": "TOOL_EXECUTION_FAILED",
  "message": "Reproduction test failed with unexpected exit code 1",
  "context": {
    "tool_name": "tool_testing",
    "runner": "jest",
    "test_file": "tests/unit/PickupService.test.ts",
    "exit_code": 1,
    "stderr_tail": "AssertionError: Expected status 'READY' but received null"
  }
}
```

---

## 4. Operational Metrics & Prometheus Telemetry

Exposed at `GET /metrics` for Prometheus scraping:
- **`kdi_tasks_total{status="completed|failed|cancelled"}`:** Counter of task outcomes.
- **`kdi_task_duration_seconds{task_type="..."}`:** Histogram of task execution times.
- **`kdi_llm_tokens_total{provider="...", model="...", direction="in|out"}`:** Token accounting.
- **`kdi_llm_cost_usd_total{provider="..."}`:** Running financial spend counter.
- **`kdi_host_cpu_usage_percent`:** Real-time office PC CPU load.
- **`kdi_host_ram_used_bytes`:** Real-time workstation memory allocation.
- **`kdi_redis_queue_depth{queue="..."}`:** Monitored task queue lengths.

---

## 5. Failure Post-Mortem Reconstruction Query
When a task fails, the UI or developer can run a single query to generate a complete visual post-mortem:

```sql
SELECT 
    t.id AS task_id,
    t.title,
    tr.subtask_title,
    tr.assigned_agent,
    tc.tool_name,
    tc.exit_code,
    tc.stderr_snippet,
    lr.provider,
    lr.model,
    lr.latency_ms
FROM tasks t
JOIN task_runs tr ON tr.task_id = t.id
LEFT JOIN execution_runs er ON er.task_run_id = tr.id
LEFT JOIN tool_calls tc ON tc.execution_run_id = er.id
LEFT JOIN llm_requests lr ON lr.task_run_id = tr.id
WHERE t.id = 'tsk_01J9X8A1B2C3D4E5F6G7H8J9K0'
ORDER BY tr.created_at ASC, tc.created_at ASC;
```
