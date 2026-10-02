# Owner Command Center: In-World Executive Suite

## 1. Overview & Access Vectors
The **Owner Command Center** (`OwnerControlPanel.tsx`) is an integrated management interface designed to give leadership full operational control over KDI's autonomous AI organization without leaving the 3D office experience.

Access is enabled via two natural vectors:
1. **Physical Spatial Landmark**: Walking into the **Executive CEO Office** on the Ground Floor and pressing `[E]` on the executive workstation terminal.
2. **Discreet HUD Shortcut**: Clicking the non-intrusive `👑 OWNER` pill button located in the top navigation bar.

---

## 2. Integrated Management Consoles

```
┌────────────────────────────────────────────────────────────────────────┐
│ 👑 KDI EXECUTIVE OWNER SUITE • Command Center                         ✕ │
├────────────────────────────────────────────────────────────────────────┤
│ [Command Center] [Workforce] [Autonomy] [Graph Memory] [System Health] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      ACTIVE CONSOLE VIEWPORT                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Command Center
* **Objectives & Decomposition**: Create high-level business goals; inspect automatic decomposition into atomic tasks with DAG dependency graphs.
* **Pending Approvals Queue**: Cryptographically gated Level 3 and Level 4 actions awaiting human confirmation before execution.
* **Active Incidents**: Live triage board tracking status (`OPEN`, `INVESTIGATING`, `MITIGATING`, `RESOLVED`) and incident blast radiuses.

### 2.2 AI Workforce & Workload Mirror
* **Role Benchmarks**: 9 normalized tech roles (Principal Architect, Staff Software Engineer, AI Research Scientist, Product Manager, etc.) mapped against national and regional salary benchmarks.
* **Workload Mirror**: Translates human operational responsibilities into equivalent FTE allocations, demonstrating cumulative monthly and annualized workforce valuation.
* **Cost vs Benchmark Gap**: Compares actual AI infrastructure spend (LLM tokens + compute + tools) against equivalent human market salaries.

### 2.3 Autonomy Operations (Phase 9 Integration)
* **Global Autonomy Pause**: Instant emergency killswitch preventing new automated triggers across all agents.
* **Safe Mode Toggle**: Restricts all tasks to non-mutating sandbox execution.
* **Runbook Executor**: Step-by-step sequential disaster mitigation and routine operational pipelines.
* **Audit Trail & Decision Traces**: Immutable log recording the trigger, policy, evidence, and rationale for every autonomous decision.

### 2.4 Graph Memory Console (Neo4j GraphRAG)
* **Interactive Knowledge Graph**: Visualizes connections between `Project`, `Agent`, `Task`, `Commit`, `PullRequest`, and `ArchitectureDecisionRecord`.
* **Bounded Neighborhood Expansion**: Explores context up to 2 hops deep to maintain fast rendering and zero memory bloat.

### 2.5 Infrastructure & Systems Health
* **Live Service Probes**: Monitors latency, uptime, and error rates across all 10 core subsystems:
  - NestJS API Server
  - PostgreSQL Database
  - Redis Pub/Sub & Caching
  - Neo4j Knowledge Graph
  - Ollama Local LLM Runtime
  - AI Router & Fallback System
  - MetaGPT Collaboration Engine
  - Antigravity Engineering Runtime
  - Background Task Workers
  - Realtime WebSocket Telemetry Channel
