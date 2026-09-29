# Work Breakdown Structure (WBS) & Task Breakdown: KDI AI Office

## 1. Overview
This document decomposes the 10 implementation phases of **KDI AI Office** into atomic, trackable engineering tasks assigned a Work Breakdown Structure (WBS) identifier.

---

## 2. Granular Task Breakdown by Phase

### Phase 1: Foundation (Storage Tier & Extended Schema)
- **WBS 1.1:** Create root project directory structure, `.gitignore`, and `.dockerignore`.
- **WBS 1.2:** Author `docker-compose.yml` declaring isolated bridge network (`kdi-network`).
- **WBS 1.3:** Configure PostgreSQL 16 container with persistent volume and connection tuning (`postgres.conf`).
- **WBS 1.4:** Apply SQL migrations creating all 23 relational tables (16 core + 7 addendum tables: `portfolio_projects`, `project_case_studies`, `workforce_grades`, `ai_employee_compensation`, `workload_mirror_snapshots`, `department_budgets`, `office_meetings`).
- **WBS 1.5:** Configure Redis 7 container with password authentication, context serialization keys, and 1GB memory cap.
- **WBS 1.6:** Configure Neo4j 5 Enterprise container with Bolt port (7687) and memory heap settings.
- **WBS 1.7:** Execute Neo4j Cypher scripts to establish 26 unique constraints and fulltext indexes across core and workforce/meeting entities.
- **WBS 1.8:** Write automated health-check verification script (`scripts/health-check.sh`).

### Phase 2: AI Router & Ollama Local Inference
- **WBS 2.1:** Implement unified Python SDK adapter interface (`BaseLLMProvider`).
- **WBS 2.2:** Build Google Gemini 1.5 Pro / Flash adapter with function-calling support.
- **WBS 2.3:** Build Groq LPU adapter for high-speed Llama-3.3 70B inference.
- **WBS 2.4:** Build OpenRouter adapter for Claude 3.5 Sonnet and DeepSeek R1.
- **WBS 2.5:** Deploy local Ollama daemon on workstation and pull quantized models (`qwen2.5-coder:7b`, `llama3.2:3b`).
- **WBS 2.6:** Implement Ollama REST client with thread-clamping guard (`num_thread: 6`).
- **WBS 2.7:** Implement Dynamic AI Router engine evaluating complexity, token budget, and privacy flags.
- **WBS 2.8:** Build Circuit Breaker and automated fallback cascade (Gemini -> Groq/OpenRouter -> Ollama).
- **WBS 2.9:** Implement token burn rate calculation and persist usage to `llm_requests` table.

### Phase 3: Agent Persona Runtime, 20-State Machine & Modular Skills
- **WBS 3.1:** Implement core `AgentPersona` class with immutable system prompts, employee metadata (Grade, Department), and contract validators.
- **WBS 3.2:** Define and register all 14 specialist persona classes (`AI_MANAGER` through `TECHNICAL_WRITER`).
- **WBS 3.3:** Implement `SkillLoader` module to load and validate skill definitions via JSON Schemas.
- **WBS 3.4:** Implement the 10 reusable procedural skills (`coding`, `debugging`, `testing`, `git`, etc.).
- **WBS 3.5:** Implement agent lifecycle state machine supporting all 20 canonical visual states (`OFFLINE` to `COMPLETED`).
- **WBS 3.6:** Implement background Redis heartbeat daemon emitting pings every 10 seconds.
- **WBS 3.7:** Implement supervisor watchdog reclaiming orphaned tasks from dead workers.
- **WBS 3.8:** Build task context snapshot serializer/deserializer in Redis for non-destructive break, coffee, and prayer handling.

### Phase 4: MetaGPT Orchestration & OpenCode Execution Engine
- **WBS 4.1:** Integrate MetaGPT shared message pool for structured role communication.
- **WBS 4.2:** Implement MetaGPT SOP handoff pipeline: `PM -> Architect -> Engineer -> QA -> Reviewer`.
- **WBS 4.3:** Build OpenCode Git worktree manager to create isolated task directories (`git worktree add`).
- **WBS 4.4:** Integrate Tree-sitter AST parser for surgical symbol localization and code editing.
- **WBS 4.5:** Implement sandboxed child process wrapper for running tests (`npm test`, `pytest`) with CPU/RAM caps.
- **WBS 4.6:** Build unified git diff generator creating clean patch files for human review.
- **WBS 4.7:** Implement loop detection guard halting inter-agent loops after 3 iterations.

### Phase 5: Graph Memory, Workforce Graph & GraphRAG Retrieval
- **WBS 5.1:** Build repository AST scanner populating `:Project`, `:Repository`, `:Module`, `:File`, `:Function` nodes in Neo4j.
- **WBS 5.2:** Build import/call graph mapper establishing `:IMPORTS` and `:CALLS` edges.
- **WBS 5.3:** Implement post-commit hook creating `:Commit` nodes and linking `:MODIFIES` edges.
- **WBS 5.4:** Implement 2-hop topological GraphRAG expansion Cypher procedure.
- **WBS 5.5:** Build prompt context assembler formatting graph context into token-efficient XML blocks.
- **WBS 5.6:** Implement conversation distillation engine extracting reusable facts into PostgreSQL `knowledge_items`.
- **WBS 5.7:** Build workforce graph mapper creating `(:Agent)-[:HAS_RESPONSIBILITY]->(:Responsibility)` and `(:Agent)-[:HAS_COMPENSATION]->(:Compensation)`.
- **WBS 5.8:** Build project cost allocation query procedures and empirical contribution lineage tracker (`(:Commit)-[:PART_OF]->(:PortfolioProject)`).

### Phase 6: Governance, Security, Public/Private Isolation & Approval Gates
- **WBS 6.1:** Implement `PolicyEngine` evaluating action risk level (LOW, MEDIUM, HIGH, CRITICAL).
- **WBS 6.2:** Build Approval Gate Service suspending worker execution on HIGH/CRITICAL actions.
- **WBS 6.3:** Build command whitelist validator blocking unauthorized shell binaries.
- **WBS 6.4:** Implement path traversal checker blocking any file access outside workspace worktree.
- **WBS 6.5:** Implement pre-commit secret scanner (Gitleaks regex rules) rejecting leaked API keys.
- **WBS 6.6:** Build cryptographic SHA-256 hash chaining logger for PostgreSQL `audit_logs`.
- **WBS 6.7:** Implement AES-256-GCM database secrets vault for encrypted API keys.
- **WBS 6.8:** Implement Public vs. Private 3D data isolation scrubber stripping private code, diffs, logs, and salaries from public WebSocket streams.
- **WBS 6.9:** Implement Portfolio CMS RBAC enforcing project visibility boundaries (`PUBLIC`, `PRIVATE`, `INTERNAL`, `CONFIDENTIAL`).

### Phase 7: Living Virtual Office (18 Zones), 3D Digital Twin & Realtime Events
- **WBS 7.1:** Initialize React 19 + TypeScript + Vite web project with Three.js and React Three Fiber.
- **WBS 7.2:** Construct low-poly 3D living office model with 18 functional zones and NavMesh floorplan.
- **WBS 7.3:** Implement instanced meshes for furniture, desks, and server racks to optimize draw calls (< 35 calls).
- **WBS 7.4:** Create 14 agent avatar models with animation states and Drei `<Html>` floating labels.
- **WBS 7.5:** Implement FastAPI WebSocket server broadcasting Redis stream events (`office:events`, `office:public`, etc.).
- **WBS 7.6:** Connect frontend Zustand store to WebSocket feed, updating 3D avatar states in real time.
- **WBS 7.7:** Build 2D Command Center, Kanban Task Board, Workload Mirror Dashboard, and side-by-side Unified Git Diff Viewer.
- **WBS 7.8:** Build 1-click Approval Portal with approve/reject actions for mobile operators.
- **WBS 7.9:** Implement NavMesh agent pathfinding with collision avoidance and linear interpolation.
- **WBS 7.10:** Build functional Glass Whiteboard dynamic canvas texture renderer displaying agent architecture flows.
- **WBS 7.11:** Build non-blocking Islamic Prayer Scheduler daemon and Musholla 3D visualization (*Jama'ah* alignment).
- **WBS 7.12:** Build dedicated Portfolio Gallery (`RM-18`) and Project Showcase Room (`RM-19`, e.g., *Koneksi Santri Room*) with 3D Guided Tour camera rail.

### Phase 8: Portfolio CMS, Workload Mirror & Remote Access Gateway
- **WBS 8.1:** Provision Hostinger / Linux VPS with Docker, Nginx, and Let's Encrypt TLS 1.3 certificates.
- **WBS 8.2:** Deploy FRP Server (`frps`) on VPS binding to port 7000 with cryptographic token authentication.
- **WBS 8.3:** Deploy FRP Client (`frpc`) on office workstation initiating outbound TLS tunnel to VPS.
- **WBS 8.4:** Configure Nginx reverse proxy routes proxying `/api/`, `/portfolio`, and `/ws/` to local tunnel ports.
- **WBS 8.5:** Implement Edge JWT authentication filter on VPS dropping unauthenticated traffic while serving public portfolio and reception view.
- **WBS 8.6:** Build tunnel supervisor script auto-reconnecting within 10s of internet restoration.
- **WBS 8.7:** Validate mobile browser task creation and approval over public cellular network.
- **WBS 8.8:** Build Portfolio CMS UI and REST API (`/portfolio`) with empirical AI contribution verification.
- **WBS 8.9:** Build Workload Mirror simulation engine and historical monthly snapshot generator (`/workload-mirror`).

### Phase 9: Hardening, Penetration Testing & Resource Profiling
- **WBS 9.1:** Execute automated prompt injection fuzzing suite against task prompts.
- **WBS 9.2:** Execute command injection and path traversal test suite against tool sandbox.
- **WBS 9.3:** Execute port scan against office network router verifying zero exposed inbound ports.
- **WBS 9.4:** Stress test queue with 50 concurrent simulated tasks; verify host CPU throttling prevents UI lag.
- **WBS 9.5:** Run 24-hour continuous stability soak test monitoring memory leaks.
- **WBS 9.6:** Conduct public/private WebSocket channel isolation penetration test to ensure zero leakage of private telemetry.

### Phase 10: Production Readiness & Disaster Recovery Verification
- **WBS 10.1:** Implement automated daily backup script (`scripts/daily-backup.sh`) dumping Postgres (23 tables), Neo4j, and configs.
- **WBS 10.2:** Perform full disaster recovery restore drill on a secondary test machine within 30 minutes.
- **WBS 10.3:** Configure Prometheus and Grafana dashboards for task throughput, token spend, workforce costs, and host health.
- **WBS 10.4:** Reconcile all Phase 0 documentation and issue formal operational sign-off across Use Cases A through F.

