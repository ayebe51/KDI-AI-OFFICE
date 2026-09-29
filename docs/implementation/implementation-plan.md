# Phased Implementation Plan: KDI AI Office

## 1. Overview & Phased Roadmap Strategy
The implementation of **KDI AI Office** follows an incremental, risk-mitigated **10-Phase Progression**. 

Each phase builds systematically upon the verified artifacts of its predecessor. No phase commences until all exit criteria and validation tests of the prior phase pass completely.

---

## 2. Detailed Phase Specifications

### Phase 1: Foundation (Host Infrastructure & Extended Storage Tier)
- **Objective:** Provision local Docker environment, initialize PostgreSQL, Redis, and Neo4j containers with security configurations, baseline 23-table schema, and workforce/portfolio graph schemas.
- **Dependencies:** Docker Desktop / WSL2 on office workstation.
- **Deliverables:**
  - `docker-compose.yml` with isolated `kdi-network` (172.28.0.0/16).
  - PostgreSQL 16 schema migrations (23 tables total: 16 core + 7 addendum tables: `portfolio_projects`, `project_case_studies`, `workforce_grades`, `ai_employee_compensation`, `workload_mirror_snapshots`, `department_budgets`, `office_meetings`) and seed data.
  - Neo4j 5 enterprise setup with Cypher constraints and indexes (including `Responsibility`, `Compensation`, `Cost`, `Budget`, `Meeting`).
  - Redis 7 instance with authentication, memory limits, and context serialization keys.
- **Key Tasks:**
  1. Configure persistent storage volume mounts in `data/`.
  2. Execute baseline SQL migrations (`docs/data/postgresql-schema.md`).
  3. Execute Neo4j schema constraint statements (`docs/data/neo4j-schema.md`).
- **Risks:** Port conflicts with existing local databases on the office machine.
- **Acceptance Criteria:** All 3 databases pass automated connection probes via `scripts/health-check.sh`.
- **Validation:** Integration test asserting database read/write roundtrip in < 15ms.

---

### Phase 2: AI Router & Ollama Local Inference
- **Objective:** Implement the multi-provider LLM abstraction layer with dynamic capability routing, cost tracking, and local Ollama fallback.
- **Dependencies:** Phase 1 complete; API keys for Gemini, Groq, OpenRouter.
- **Deliverables:**
  - `kdi-ai-router` service with unified request/response schemas.
  - Local Ollama daemon running `qwen2.5-coder:7b` and `llama3.2:3b`.
  - Configurable routing engine (`config/routing-rules.json`).
  - Automated circuit breaker and fallback cascade.
- **Key Tasks:**
  1. Implement provider adapter classes (Gemini, Groq, OpenRouter, Ollama).
  2. Implement token counting and cost calculation logic.
  3. Implement rate-limiting sliding window in Redis.
  4. Build automated fallback test suite verifying HTTP 429 failover.
- **Risks:** Ollama CPU thread starvation freezing the workstation.
- **Acceptance Criteria:** Seamless fallback from cloud provider to local Ollama within 3 seconds of failure.
- **Validation:** Automated test mocking cloud outage verifies local model returns valid completion.

---

### Phase 3: Agent Persona Runtime, 20-State Machine & Modular Skills
- **Objective:** Build the core agent execution runtime supporting 14 specialized agent personas, 20-state deterministic state machine, context serialization (breaks/prayer), and modular skill loader.
- **Dependencies:** Phase 2 complete.
- **Deliverables:**
  - Agent Persona Registry with system prompts, digital employee metadata, and grade/compensation mapping.
  - 20-State Machine Supervisor managing transitions (`OFFLINE`, `IDLE`, `WORKING`, `THINKING`, `PLANNING`, `CODING`, `DEBUGGING`, `TESTING`, `REVIEWING`, `MEETING`, `BREAK`, `COFFEE`, `LUNCH`, `PRAYING`, `READING`, `TRAINING`, `MOVING`, `WAITING_APPROVAL`, `ERROR`, `COMPLETED`).
  - Context Serializer for non-destructive break, coffee, and prayer interruption handling.
  - Modular Skill Engine loading YAML/JSON skill manifests.
  - Agent heartbeat daemon in Redis.
- **Key Tasks:**
  1. Implement base `AgentPersona` class and 14 concrete persona subclasses with employee metadata.
  2. Implement `SkillLoader` and register procedural skills.
  3. Implement deterministic state transition event emitter.
  4. Implement task context snapshot and restore mechanism.
- **Risks:** Agent prompt drift or hallucinated role violations.
- **Acceptance Criteria:** Every agent verifies its contract schema, transitions cleanly across all 20 states, and restores context without loss.
- **Validation:** Unit tests verifying each of the 14 agents rejects prohibited commands and resumes after break.

---

### Phase 4: MetaGPT Orchestration & OpenCode Execution Engine
- **Objective:** Integrate MetaGPT multi-agent SOP workflows with OpenCode sandboxed software engineering execution.
- **Dependencies:** Phase 3 complete.
- **Deliverables:**
  - MetaGPT shared message pool coordinator.
  - OpenCode execution engine with Git worktree manager.
  - AST code parser and surgical search/replace patcher.
  - Sandboxed test runner child process supervisor.
- **Key Tasks:**
  1. Configure MetaGPT SOP pipelines (PM -> Architect -> Engineer -> QA).
  2. Implement `git worktree add -b ai/task-...` sandbox isolation.
  3. Connect OpenCode syntax validator for TypeScript/Python.
- **Risks:** Unhandled git merge conflicts in automated worktrees.
- **Acceptance Criteria:** Autonomous end-to-end task run reproduces a bug, fixes it in worktree, and runs tests.
- **Validation:** End-to-end test on dummy repository successfully creates branch and passes tests.

---

### Phase 5: Graph Memory, Workforce Graph & GraphRAG Retrieval
- **Objective:** Connect Neo4j with the agent runtime for 2-hop topological dependency context injection, workforce cost relationships, and meeting collaboration graph queries.
- **Dependencies:** Phase 4 complete.
- **Deliverables:**
  - Codebase AST indexer populating `:File`, `:Function`, `:Module` in Neo4j.
  - Workforce Graph Topology connecting `Agent -> HAS_RESPONSIBILITY -> Responsibility`, `Agent -> HAS_COMPENSATION -> Compensation`, and `Cost -> ALLOCATED_TO -> Project`.
  - Lineage tracer recording `Task -> Agent -> Commit -> File -> Test` for empirical portfolio contribution.
  - GraphRAG 2-hop neighborhood expansion query service.
- **Key Tasks:**
  1. Build Tree-sitter repository scanner to populate Neo4j code nodes.
  2. Implement Cypher context builder and XML injector.
  3. Implement workforce cost allocation graph queries.
  4. Implement post-commit lineage hook.
- **Risks:** Large repository AST indexing memory overhead.
- **Acceptance Criteria:** GraphRAG query returns direct imports and caller functions in < 150ms; workforce queries resolve project cost instantly.
- **Validation:** Integration test asserting GraphRAG context and workforce graph queries return accurate relationships.

---

### Phase 6: Governance, Security, Public/Private Isolation & Approval Gates
- **Objective:** Implement capability-based security, command whitelists, prompt injection guards, human approval gates, and Public vs. Private 3D data isolation.
- **Dependencies:** Phase 5 complete.
- **Deliverables:**
  - `PolicyEngine` intercepting all tool calls.
  - Approval Gate Service suspending tasks on Risk: HIGH / CRITICAL.
  - Public/Private Isolation Scrubber for 3D digital twin and portfolio telemetry.
  - Command execution sandbox restricting shell commands to whitelisted binaries.
  - Tamper-evident cryptographic SHA-256 audit logger.
- **Key Tasks:**
  1. Implement tool call risk classification evaluator.
  2. Implement approval suspension and resume state serialization.
  3. Implement privacy scrubbing layer stripping diffs, logs, and salaries from public WebSocket streams.
  4. Implement pre-commit secret scanner (Gitleaks rules).
- **Risks:** Accidental bypass of approval gate during rapid agent loops; public data leakage.
- **Acceptance Criteria:** 100% of high-risk actions halt and await signed human approval; zero private tokens leak to public channels.
- **Validation:** Security test asserting `git push` is blocked without approval token and public stream contains zero private attributes.

---

### Phase 7: Living Virtual Office (18 Zones), 3D Digital Twin & Realtime Events
- **Objective:** Build the interactive Living Office 3D digital twin in PlayCanvas React (`@playcanvas/react` + `playcanvas` per ADR-015; validated in Phase 1 Correction Technical Spike) with 18 rooms/zones, 20 states, NavMesh movement, Musholla & prayer visualization, functional glass whiteboard, server room telemetry, Portfolio Gallery & Project Rooms, and the 2D command center.
- **Dependencies:** Phase 6 complete; Phase 1 PlayCanvas Technical Spike verified.
- **Deliverables:**
  - React + PlayCanvas React 3D living office floorplan with 18 functional zones and NavMesh movement.
  - 14 avatar models reflecting real-time agent states across 20 canonical visual states.
  - Functional Glass Whiteboard rendering agent diagrams and architecture flows.
  - Non-blocking Islamic Prayer Scheduler with Musholla visualization (*Jama'ah* support).
  - Server Room 3D rack telemetry with live pulse indicators.
  - Dedicated Portfolio Gallery (`RM-18`) and Project Showcase Room (`RM-19`, e.g., *Koneksi Santri Room*).
  - 2D Command Center, Kanban Task Board, Workload Mirror Dashboard, and Unified Diff Viewer.
  - WebSocket telemetry bridge broadcasting Redis events in < 100ms.
- **Key Tasks:**
  1. Model low-poly warm modern office scene with instanced meshes and 18 zones.
  2. Implement NavMesh agent pathfinding with linear interpolation and collision avoidance.
  3. Implement glass whiteboard dynamic texture renderer.
  4. Connect WebSocket client with state translation hook.
  5. Build 3D Guided Tour camera rail and Public/Private toggle.
- **Risks:** 3D rendering performance lag on low-end mobile devices.
- **Acceptance Criteria:** Scene maintains >= 45 FPS; WebSocket latency < 100ms; zero fake animations.
- **Validation:** Lighthouse performance score >= 90; mobile smoke test passing; NavMesh pathing verified.

---

### Phase 8: Portfolio CMS, Workload Mirror & Remote Access Gateway
- **Objective:** Deploy edge gateway on Hostinger VPS, establish secure outbound reverse tunnel, build Portfolio CMS, and launch Workload Mirror simulation engine.
- **Dependencies:** Phase 7 complete.
- **Deliverables:**
  - FRP Server / Nginx edge reverse proxy on Linux VPS with Let's Encrypt TLS 1.3.
  - FRP Client daemon on office PC maintaining persistent outbound TLS session.
  - Portfolio CMS with full CRUD, asset upload, and empirical AI contribution badge verification.
  - Workload Mirror engine mapping human responsibilities to equivalent AI workforce and cost simulations.
  - Edge JWT authentication middleware dropping unauthorized requests at VPS while serving public portfolio and reception view.
- **Key Tasks:**
  1. Configure VPS Nginx with rate limiting, WAF rules, and public routing.
  2. Build Portfolio CMS UI and REST endpoints (`/portfolio`).
  3. Implement Workload Mirror calculation service and monthly snapshot generator.
  4. Configure `frps` and `frpc` with cryptographic auth token.
- **Risks:** Tunnel disconnection during office network IP renewal.
- **Acceptance Criteria:** Zero open inbound ports on office firewall; auto-reconnect within 10s; public visitors can explore portfolio seamlessly.
- **Validation:** Penetration test verifying office PC ports are invisible to external nmap scans; public portfolio loads without credentials.

---

### Phase 9: Hardening, Penetration Testing & Resource Profiling
- **Objective:** Conduct rigorous security audits, stress testing, prompt injection fuzzing, and host resource profiling across living office, portfolio, and workforce simulations.
- **Dependencies:** Phase 8 complete.
- **Deliverables:**
  - Security audit report covering STRIDE threat model and public/private 3D boundaries.
  - Resource throttling benchmark report under peak multi-agent workloads with 3D client connected.
  - Prompt injection fuzzing test suite.
- **Key Tasks:**
  1. Execute automated prompt injection attacks against agent inputs.
  2. Stress test queue with 50 concurrent simulated tasks; verify host CPU throttles cleanly.
  3. Validate path traversal and shell command injection blocks.
  4. Audit WebSocket streams for confidential data leakage under simulated penetration.
- **Risks:** Discovering memory leaks in long-running Python/Node worker processes.
- **Acceptance Criteria:** Zero critical security findings; host workstation CPU remains < 75%.
- **Validation:** Clean security scan and automated soak test running for 24 hours.

---

### Phase 10: Production Readiness & Disaster Recovery Verification
- **Objective:** Finalize automated backups, disaster recovery runbooks, operational monitoring, and handoff to active development.
- **Dependencies:** Phase 9 complete.
- **Deliverables:**
  - Automated daily encrypted backup scripts for PostgreSQL, Neo4j, and configs.
  - Disaster recovery restore verification drill including portfolio and workforce tables.
  - Prometheus / Grafana operational telemetry dashboards.
  - Final Source-of-Truth documentation sign-off.
- **Key Tasks:**
  1. Execute disaster recovery restore drill on clean machine.
  2. Verify all 14 agents, skills, and tools operate stably in Living Office.
  3. Present final Phase 0 operational dashboard and Portfolio Showcase status.
- **Risks:** Incomplete documentation causing operational ambiguity.
- **Acceptance Criteria:** Full recovery from backup in < 30 minutes.
- **Validation:** Formal walkthrough of Use Cases A, B, C, D, E (Living Office), and F (Workforce Economics).

