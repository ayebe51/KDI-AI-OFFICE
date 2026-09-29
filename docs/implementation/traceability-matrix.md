# Requirements Traceability Matrix (RTM): KDI AI Office

## 1. Overview
The **Requirements Traceability Matrix (RTM)** guarantees bi-directional traceability across all project phases. Every functional requirement (`FR-xxx`) and non-functional requirement (`NFR-xxx`) maps directly to an architectural design decision, software component, assigned agent, required skill, API endpoint, and automated test suite.

---

## 2. Comprehensive Traceability Matrix

| Req ID | Requirement Summary | Design Document | Primary Component | Assigned Agent | Required Skill | Exposed API / Contract | Verification Test Suite |
|---|---|---|---|---|---|---|---|
| **FR-001** | Remote Task Ingestion | `01-prd.md`<br>`01-sdd.md` | `api-server` | `AI Manager` | `pm` | `POST /tasks` | `tests/api/test_tasks.py` |
| **FR-002** | Asynchronous Task Queuing | `03-container-architecture.md`<br>`redis-design.md` | `redis-queue` | `AI Manager` | `workflow-orchestration` | `kdi:queue:tasks:*` | `tests/unit/test_redis_queue.py` |
| **FR-003** | Task Decomposition & Delegation | `agent-catalog.md`<br>`metagpt.md` | `task-supervisor` | `AI Manager` | `pm`<br>`architect` | `POST /tasks` | `tests/integration/test_decomposition.py` |
| **FR-004** | Task Cancellation & Abort | `02-product-requirements.md`<br>`agent-lifecycle.md` | `process-supervisor` | `AI Manager` | `workflow-orchestration` | `POST /tasks/:id/cancel` | `tests/api/test_cancellation.py` |
| **FR-005** | Human Approval Workflow | `agent-permissions.md`<br>`ADR-007` | `policy-engine` | `Database Architect`<br>`DevOps` | `database-architecture` | `POST /tasks/:id/approve`<br>`POST /tasks/:id/reject` | `tests/security/test_approval_gates.py` |
| **FR-006** | Agent Persona Registry (14 Roles)| `agent-catalog.md`<br>`agent-contracts.md` | `agent-runtime` | All 14 Agents | Role Skills | `GET /agents`<br>`GET /agents/:id` | `tests/unit/test_agent_contracts.py` |
| **FR-007** | Antigravity Engineering Execution Engine| `antigravity-engineering-integration.md`<br>`ADR-018` | `antigravity-provider` | `Software Engineer` | `coding`<br>`git`<br>`testing` | `EngineeringProvider`<br>`tool.git.v1` | `engineering.test.ts` (Tests A-J) |
| **FR-008** | MetaGPT Multi-Agent Coordination | `metagpt.md`<br>`ADR-005` | `metagpt-planner` | `AI Manager`<br>`Architect` | `system-architecture`<br>`pm` | `EngineeringPlan`<br>`EngineeringTask` | `engineering.test.ts` (MetaGPT SOP) |
| **FR-009** | Reusable Skill Pipeline | `docs/agents/skills/*`<br>`tool-system.md` | `skill-loader` | All Agents | Reusable Skills | Tool Interface | `tests/unit/test_skill_loader.py` |
| **FR-010** | Tool Sandbox & Command Whitelist| `tool-system.md`<br>`threat-model.md` | `sandbox-guard` | `Software Engineer`<br>`QA` | `shell-whitelist` | `tool.shell.v1` | `tests/security/test_command_injection.py` |
| **FR-011** | Neo4j Knowledge Graph Persistence| `graph-model.md`<br>`neo4j-schema.md` | `neo4j-graph` | `System Architect` | `repository-analysis` | Bolt Protocol / 7687 | `tests/graph/test_graph_integrity.py` |
| **FR-012** | GraphRAG Context Retrieval | `graphrag.md`<br>`context-engineering.md` | `graphrag-engine` | `Software Engineer`<br>`Architect` | `research` | GraphRAG Internal API | `tests/graph/test_graphrag_retrieval.py` |
| **FR-013** | Tiered Memory Segmentation | `memory-model.md`<br>`postgresql-schema.md`| `memory-manager` | All Agents | All Skills | Redis + Postgres + Neo4j | `tests/unit/test_memory_tiering.py` |
| **FR-014** | Multi-Provider Model Abstraction | `provider-architecture.md`<br>`ADR-004` | `ai-router` | All Agents | Reasoning / Inference | Unified LLM Interface | `tests/llm/test_provider_adapters.py` |
| **FR-015** | Dynamic Intelligent Routing | `routing-policy.md`<br>`model-capability-matrix.md`| `ai-router` | `AI Manager` | `routing-decision` | Router Engine | `tests/llm/test_routing_policy.py` |
| **FR-016** | Graceful Inference Fallback Chain | `fallback-policy.md`<br>`ollama.md` | `circuit-breaker` | All Agents | Fallback Cascade | Fallback Engine | `tests/llm/test_fallback_circuit.py` |
| **FR-017** | Interactive 3D Office Digital Twin| `04-3d-office-design.md`<br>`03-ux-design.md`<br>`ADR-015` | `web-ui-3d` | Operator (Human) | PlayCanvas React Presentation | Static Web Host | `tests/frontend/test_3d_render.spec.ts` |
| **FR-018** | Realtime WebSocket Event Stream | `websocket-events.md`<br>`redis-design.md` | `ws-gateway` | Operator (Human) | Realtime Pub/Sub | `WSS /ws/v1/events` | `tests/integration/test_websocket_stream.py` |
| **FR-019** | Command Center & Admin Dashboard | `03-ux-design.md`<br>`api-contract.md` | `web-ui-2d` | Operator (Human) | Dashboard UI | REST API Endpoints | `tests/frontend/test_dashboard_views.spec.ts` |
| **FR-020** | Living Office 18-Zone Spatial Twin | `living-office-engine.md`<br>`04-3d-office-design.md`<br>`ADR-015` | `web-ui-3d` | Operator (Human) | PlayCanvas React Presentation | `WSS /ws/v1/events` | `tests/frontend/test_living_office_zones.spec.ts` |
| **FR-021** | Deterministic 20-State & Movement | `living-office-engine.md`<br>`agent-lifecycle.md` | `office-activity-engine` | All Agents | Navigation / State | WebSocket Events | `tests/unit/test_state_movement_engine.py` |
| **FR-022** | Context-Preserving Break & Pantry | `living-office-engine.md`<br>`ADR-009` | `context-serializer` | All Agents | Context Management | Redis Context Store | `tests/unit/test_break_context_recovery.py` |
| **FR-023** | Non-Blocking Prayer & Musholla | `living-office-engine.md`<br>`ADR-009` | `prayer-scheduler` | All Agents | Scheduler / Workflow | `WSS /ws/v1/events` | `tests/unit/test_prayer_scheduler.py` |
| **FR-024** | Meeting Room & Glass Whiteboard | `living-office-engine.md`<br>`ADR-013` | `meeting-coordinator` | `AI Manager`<br>`Architect` | Collaboration | `GET /meetings`<br>`POST /meetings` | `tests/integration/test_meeting_coordinator.py` |
| **FR-025** | Server Room Telemetry Twin | `living-office-engine.md`<br>`observability.md` | `telemetry-twin` | `DevOps Engineer` | `resource-monitoring` | `GET /health` | `tests/ops/test_server_room_telemetry.py` |
| **FR-026** | Public vs Private 3D Isolation | `living-office-engine.md`<br>`ADR-014` | `privacy-scrubber` | `Security Engineer` | `security-scan` | WebSocket Channels | `tests/security/test_public_isolation.py` |
| **FR-027** | Portfolio Showcase & Project Rooms | `portfolio-system.md`<br>`ADR-010` | `portfolio-service` | `Marketing Specialist` | `documentation` | `GET /portfolio` | `tests/api/test_portfolio_endpoints.py` |
| **FR-028** | Empirical AI Contribution Tracing | `portfolio-system.md`<br>`graph-model.md` | `contribution-tracer` | `Technical Writer` | `repository-analysis` | `GET /portfolio/:id/team` | `tests/graph/test_contribution_tracer.py` |
| **FR-029** | Portfolio CMS & Realtime Sync | `portfolio-system.md`<br>`api-contract.md` | `portfolio-cms` | `AI Manager` | `documentation` | `POST /portfolio` | `tests/api/test_portfolio_cms.py` |
| **FR-030** | AI Compensation Simulation (8 Gr) | `compensation-and-cost-accounting.md`<br>`ADR-011` | `compensation-engine` | `AI Manager` | `financial-modeling` | `GET /workforce/:id/compensation` | `tests/unit/test_compensation_engine.py` |
| **FR-031** | Multi-Project Cost Allocation | `compensation-and-cost-accounting.md`<br>`ADR-011` | `cost-allocator` | `AI Manager` | `financial-modeling` | `GET /costs`<br>`GET /budgets` | `tests/unit/test_cost_allocation.py` |
| **FR-032** | Workload Mirror & Snapshots | `compensation-and-cost-accounting.md`<br>`ADR-012` | `workload-mirror` | `AI Manager` | `financial-modeling` | `GET /workload-mirror` | `tests/integration/test_workload_mirror.py` |
| **NFR-001**| Zero Public Database Exposure | `05-deployment-architecture.md` | Network / Docker | Security Engineer | `security-scan` | 127.0.0.1 Bindings | `tests/security/test_port_bindings.py` |
| **NFR-002**| Authenticated Remote Gateway | `remote-access.md`<br>`auth.md` | `vps-gateway` | Security Engineer | `threat-modeling` | Reverse Tunnel (FRP) | `tests/security/test_tunnel_handshake.py` |
| **NFR-003**| Secrets Vault & Key Management | `secrets-management.md` | `secrets-vault` | Security Engineer | `secret-detection` | AES-256-GCM Vault | `tests/security/test_secret_encryption.py` |
| **NFR-004**| Prompt Injection Defense | `threat-model.md`<br>`security-architecture.md`| `prompt-guard` | Security Engineer | `security-scan` | Prompt Parser | `tests/security/test_prompt_injection.py` |
| **NFR-005**| Graceful Host Reconnect | `remote-access.md`<br>`ADR-002` | `tunnel-client` | DevOps Engineer | `devops-engineering` | Outbound TLS Tunnel | `tests/ops/test_tunnel_reconnect.py` |
| **NFR-006**| Task Worker Crash Recovery | `agent-lifecycle.md`<br>`redis-design.md` | `supervisor` | AI Manager | `workflow-orchestration` | Redis In-Flight Queues | `tests/integration/test_worker_crash_recovery.py`|
| **NFR-007**| End-to-End Distributed Tracing | `observability.md`<br>`audit.md` | `tracer` | Technical Writer | `documentation` | `trace_id` Header | `tests/ops/test_distributed_tracing.py` |
| **NFR-008**| Immutable Audit Trail | `audit.md`<br>`postgresql-schema.md` | `audit-service` | Security Engineer | `audit-verification` | `GET /api/v1/audit` | `tests/security/test_audit_hash_chain.py` |
| **NFR-009**| Local Host Resource Safeguard | `ADR-008`<br>`05-deployment-architecture.md` | `resource-mon` | DevOps Engineer | `resource-monitoring` | Host Monitor | `tests/ops/test_resource_throttling.py` |
| **NFR-010**| CPU-Friendly Inference Baseline | `ollama.md`<br>`ADR-004` | `ollama-daemon` | Software Engineer | `coding` | Local Ollama REST | `tests/llm/test_ollama_cpu_inference.py` |
| **NFR-011**| Modular Provider & Skill Arch | `provider-architecture.md` | Core SDK | Architect | `system-architecture` | Interface Adapters | `tests/unit/test_extensibility.py` |
| **NFR-012**| Database Migration Safety | `database-architect.md` | Migration Engine | Database Architect| `database-architecture` | SQL Migrations | `tests/db/test_migration_rollback.py` |
| **NFR-013**| Automated Database Snapshots | `backup.md`<br>`disaster-recovery.md` | Backup Daemon | DevOps Engineer | `devops-engineering` | Backup Scripts | `tests/ops/test_backup_restore_drill.py` |

---

## 3. PlayCanvas React 3D Technical Spike Traceability Matrix

| 3D Requirement | PlayCanvas Component | Frontend Module | WebSocket Event | Test Suite |
|---|---|---|---|---|
| **REQ-3D-001: Scene Lifecycle & Canvas Mount** | `<Application fillMode={FILLMODE_NONE} />` | `apps/web/src/3d/core/PlayCanvasApp.tsx` | N/A | `npm run build`<br>`npm run typecheck` |
| **REQ-3D-002: Orbit & Free Camera Navigation** | `<Camera />`<br>`<OrbitControls />` | `apps/web/src/3d/camera/OfficeCamera.tsx` | N/A | `npm run build`<br>`npm run typecheck` |
| **REQ-3D-003: Architectural Illumination Rig** | `<Light type="directional" />`<br>`<Light type="omni" />` | `apps/web/src/3d/scene/OfficeLighting.tsx` | N/A | `npm run build` |
| **REQ-3D-004: Office Floor & Spatial Layout** | `<Render type="box" material={floorMat} />` | `apps/web/src/3d/entities/OfficeFloor.tsx` | N/A | `npm run build` |
| **REQ-3D-005: Workstation Desk & Monitor Glow** | `<Entity>`<br>`<Render type="cylinder" />`<br>`<Render type="box" />` | `apps/web/src/3d/entities/OfficeDesk.tsx` | `agent.status.changed` | `npm run build` |
| **REQ-3D-006: Agent Entity Rendering (ENGINEER-001)**| `<Entity ref={avatarRef}>`<br>`<Render type="capsule" />`<br>`<Render type="sphere" />` | `apps/web/src/3d/agents/PlayCanvasAgent.tsx` | `agent.status.changed` | `npm run build`<br>`npm run typecheck` |
| **REQ-3D-007: Procedural Animation (Idle/Work)** | `useAppEvent('update', callback)` | `apps/web/src/3d/agents/PlayCanvasAgent.tsx` | `agent.status.changed` | `npm run build` |
| **REQ-3D-008: 20-State Normalization** | `Agent3DStateAdapter.toVisualConfig()` | `apps/web/src/3d/adapters/Agent3DStateAdapter.ts` | `agent.status.changed` | `apps/web/src/3d/adapters/Agent3DStateAdapter.test.ts` (5 tests) |
| **REQ-3D-009: Agent Pointer Click Interaction** | `<Entity onClick={...} onPointerDown={...}>` | `apps/web/src/3d/agents/PlayCanvasAgent.tsx` | N/A | `npm run build`<br>`npm run typecheck` |
| **REQ-3D-010: React HUD Overlay & Action Card** | React Overlay DOM (`<AgentOverlay />`) | `apps/web/src/3d/interaction/AgentOverlay.tsx` | `agent.status.changed` | `npm run build`<br>`npm run typecheck` |
| **REQ-3D-011: Public Safe Telemetry Isolation** | Data sanitizer in `onSelect` callback | `apps/web/src/3d/state/types.ts`<br>`AgentOverlay.tsx` | `agent.status.changed` | `tests/security/test_public_isolation.py` |
| **REQ-3D-012: WebGL 2.0 Fallback Boundary** | `checkWebGLSupport()` + `<WebGLFallback />` | `apps/web/src/3d/core/WebGLFallback.tsx` | `agent.status.changed` | `npm run build` |

---

## 4. Phase 2: AI Intelligence Layer Traceability Matrix

| Requirement | Implementation Component | Source File | API / WebSocket Contract | Test Suite |
|---|---|---|---|---|
| **REQ-LLM-001: Canonical Provider Abstraction** | `LLMProvider` | `services/api/src/llm/interfaces/llm-provider.interface.ts` | Interface Contract | `npm run build --workspace=@kdi/api` |
| **REQ-LLM-002: Error Normalization** | `LLMException` | `services/api/src/llm/exceptions/llm.exception.ts` | Canonical Error Codes | `npm run test --workspace=@kdi/api` |
| **REQ-LLM-003: Sovereign Ollama Adapter** | `OllamaAdapter` | `services/api/src/llm/providers/ollama.adapter.ts` | `/api/tags`, `/api/chat` | `npm run test --workspace=@kdi/api` |
| **REQ-LLM-004: Google Gemini Adapter** | `GeminiAdapter` | `services/api/src/llm/providers/gemini.adapter.ts` | `generateContent` v1beta | `npm run test --workspace=@kdi/api` |
| **REQ-LLM-005: Groq LPU Adapter** | `GroqAdapter` | `services/api/src/llm/providers/groq.adapter.ts` | `chat/completions` + Rate Limit Headers | `npm run test --workspace=@kdi/api` |
| **REQ-LLM-006: OpenRouter Gateway Adapter** | `OpenRouterAdapter` | `services/api/src/llm/providers/openrouter.adapter.ts` | `chat/completions` + Attribution | `npm run test --workspace=@kdi/api` |
| **REQ-LLM-007: Model & Capability Registry** | `ModelRegistry`<br>`CapabilityRegistry` | `services/api/src/llm/registries/` | 10 Models, 10 Capabilities | `services/api/src/llm/llm.service.test.ts` |
| **REQ-LLM-008: Dynamic AI Router** | `LLMRouter` | `services/api/src/llm/router/llm.router.ts` | `POST /llm/route` | `services/api/src/llm/llm.service.test.ts` (3 tests) |
| **REQ-LLM-009: Strict Privacy Isolation** | `CapabilityRegistry.satisfiesPrivacy` | `services/api/src/llm/registries/capability.registry.ts` | `CONFIDENTIAL` -> Local Only | `services/api/src/llm/llm.service.test.ts` (2 tests) |
| **REQ-LLM-010: Resilient Fallback Engine** | `FallbackEngine` | `services/api/src/llm/engine/fallback.engine.ts` | `llm.fallback.triggered` WS | `services/api/src/llm/llm.service.test.ts` (1 test) |
| **REQ-LLM-011: Circuit Breaker & Quota Mgr** | `CircuitBreaker`<br>`QuotaManager` | `services/api/src/llm/governance/` | Sliding 60s window + cooldowns | `services/api/src/llm/llm.service.test.ts` (2 tests) |
| **REQ-LLM-012: Zero-Fabrication Costing** | `CostEstimator`<br>`UsageTracker` | `services/api/src/llm/governance/` | Exact token count & pricing | `services/api/src/llm/llm.service.test.ts` (2 tests) |
| **REQ-LLM-013: Interactive LLM Playground** | `LLMPlayground` | `apps/web/src/components/LLMPlayground.tsx` | `POST /llm/chat`, `GET /llm/models` | `npm run build --workspace=@kdi/web` |

---

## 5. Phase 3: Agent Runtime & Task Orchestration Traceability Matrix

| Requirement | Implementation Component | Source File | API / WebSocket Contract | Test Suite |
|---|---|---|---|---|
| **REQ-RUN-001: Task State Machine (15 Formal States)** | `TaskStateMachine` | `services/api/src/runtime/state-machines/task.state-machine.ts` | State validation & transition guards | `runtime.service.test.ts` (3 tests) |
| **REQ-RUN-002: Agent State Machine (12 States & Availability)** | `AgentStateMachine` | `services/api/src/runtime/state-machines/agent.state-machine.ts` | Runtime status & availability derivation | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-003: 3D Living Office Activity Bridge** | `AgentActivityMapper` | `services/api/src/runtime/state-machines/activity.mapper.ts` | 20 visual office activity states | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-004: Weighted Priority Queue & DLQ** | `TaskQueue` | `services/api/src/runtime/queue/task.queue.ts` | `URGENT` > `HIGH` > `NORMAL` > `LOW`, DLQ routing | `runtime.service.test.ts` (3 tests) |
| **REQ-RUN-005: DAG Task Dependency Engine** | `DependencyManager` | `services/api/src/runtime/dependencies/dependency.manager.ts` | `BLOCK`, `SKIP`, `RETRY_DEPENDENCY`, `ESCALATE` | `runtime.service.test.ts` (2 tests) |
| **REQ-RUN-006: Multi-Factor Agent Assignment** | `AgentAssignmentEngine` | `services/api/src/runtime/assignment/assignment.engine.ts` | Skill matching, capability matching, sovereignty | `runtime.service.test.ts` (3 tests) |
| **REQ-RUN-007: Workstation Concurrency & Resource Guard** | `ConcurrencyController` | `services/api/src/runtime/concurrency/concurrency.controller.ts` | Agent limits, global caps, host CPU/RAM guard | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-008: Pluggable Execution Provider Abstraction** | `ExecutionProvider`<br>`LLMExecutionProvider` | `services/api/src/runtime/execution/` | Canonical execution interface + Phase 2 LLM bridge | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-009: Semantic Task Output Validation** | `TaskValidator` | `services/api/src/runtime/execution/task.validator.ts` | Structural output validation per task type | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-010: Worker System & Atomic Claim** | `TaskWorker` | `services/api/src/runtime/worker/task.worker.ts` | `QUEUED` -> `ASSIGNED` -> `RUNNING`, timeouts, heartbeats | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-011: Agent Registry & Digital Personas** | `AgentRegistry` | `services/api/src/runtime/engine/agent.registry.ts` | 7 baseline personas (Rian, Farhan, Ahmad, etc.) | `runtime.service.test.ts` (3 tests) |
| **REQ-RUN-012: Core Agent Runtime Lifecycle** | `AgentRuntime` | `services/api/src/runtime/engine/agent.runtime.ts` | `createTask`, `pause`, `resume`, `cancel`, `retry`, recovery | `runtime.service.test.ts` (4 tests) |
| **REQ-RUN-013: AI Manager & Human Escalation** | `AIManager` | `services/api/src/runtime/engine/ai.manager.ts` | Normalization, risk evaluation, `WAITING_APPROVAL` | `runtime.service.test.ts` (1 test) |
| **REQ-RUN-014: WebSocket Telemetry & Event System** | `RuntimeEventEmitter` | `services/api/src/runtime/events/runtime-event.emitter.ts` | `task.*`, `agent.*`, `execution.*`, `agent.status.changed` | `runtime.service.test.ts` |
| **REQ-RUN-015: REST & Internal Service API** | `RuntimeController`<br>`RuntimeService` | `services/api/src/runtime/` | `/tasks`, `/runtime/agents`, `/runtime/status`, `/runtime/queue` | `npm run build --workspace=@kdi/api` |
| **REQ-RUN-016: Interactive Operator Console** | `AgentRuntimeConsole` | `apps/web/src/components/AgentRuntimeConsole.tsx` | Task dispatch, lifecycle controls, queue & DLQ monitor | `npm run build --workspace=@kdi/web` |

---

## 6. Phase 4: MetaGPT + Antigravity Engineering Integration Traceability Matrix

| Requirement | Implementation Component | Source File | Contract / Protocol | Verification Test Suite |
|---|---|---|---|---|
| **REQ-ENG-001: Engineering Provider Abstraction** | `EngineeringProvider` | `services/api/src/engineering/provider/engineering-provider.interface.ts` | 10 canonical lifecycle methods | `engineering.test.ts` |
| **REQ-ENG-002: Google Antigravity Provider** | `AntigravityEngineeringProvider` | `services/api/src/engineering/provider/antigravity.provider.ts` | Primary programmatic & fallback CLI | `engineering.test.ts` (Test A, B, J) |
| **REQ-ENG-003: Antigravity Python SDK Adapter** | `AntigravitySDKAdapter` | `services/api/src/engineering/adapter/antigravity-sdk.adapter.ts` | Python child bridge / `google.antigravity` | `engineering.test.ts` (Test J) |
| **REQ-ENG-004: Antigravity Non-Interactive CLI** | `AntigravityCLIAdapter` | `services/api/src/engineering/adapter/antigravity-cli.adapter.ts` | `agy --headless --json` + PID tracking | `engineering.test.ts` (Test A, B) |
| **REQ-ENG-005: OpenCode Decoupled Stub** | `OpenCodeAdapter` | `services/api/src/engineering/adapter/opencode.adapter.ts` | Inactive / deprecated compatibility stub | `engineering.test.ts` |
| **REQ-ENG-006: MetaGPT Software Company SOP Planner** | `MetaGPTPlannerService` | `services/api/src/engineering/metagpt/metagpt-planner.service.ts` | PM -> Architect -> PM -> Engineer SOP | `engineering.test.ts` (MetaGPT SOP tests) |
| **REQ-ENG-007: Normalized Engineering Plan Schema** | `EngineeringPlan`<br>`EngineeringTask` | `packages/types/src/index.ts` | Strict schema with acceptance criteria & risk | `engineering.test.ts` |
| **REQ-ENG-008: Git Worktree Workspace Isolation** | `WorkspaceManager` | `services/api/src/engineering/workspace/workspace-manager.ts` | Isolated worktrees + branch protection | `engineering.test.ts` (Test H) |
| **REQ-ENG-009: Protected Branch Defense Policy** | `WorkspaceManager.ensureBranchProtection`| `services/api/src/engineering/workspace/workspace-manager.ts` | `main/master/production` write restricted | `engineering.test.ts` (Test H) |
| **REQ-ENG-010: Command Risk Classifier** | `CommandClassifier` | `services/api/src/engineering/security/command-classifier.ts` | READ_ONLY, NORMAL, HIGH_RISK, FORBIDDEN | `engineering.test.ts` (Test E, F) |
| **REQ-ENG-011: Human-in-the-Loop Approval Gate** | `ApprovalGateService` | `services/api/src/engineering/security/approval-gate.service.ts` | Anti-self-approval + human approval token | `engineering.test.ts` (Test E, G) |
| **REQ-ENG-012: Prompt Injection Untrusted Boundary**| `PromptInjectionDefense`| `services/api/src/engineering/security/prompt-injection-defense.ts` | Authority Order: Security > Task > Repo | `engineering.test.ts` (Test D) |
| **REQ-ENG-013: Strict Secret Redaction Engine** | `redactSecretsFromString` | `packages/shared/src/index.ts` | Regex scrubber: Google, OpenAI, DB, PEM | `engineering.test.ts` (Test C) |
| **REQ-ENG-014: Zero Fake Success Verification Gate**| `VerificationGate` | `services/api/src/engineering/verification/verification-gate.ts` | Real test/lint/typecheck execution evidence | `engineering.test.ts` (Test B, I) |
| **REQ-ENG-015: Engineering Skills Catalog (10 Skills)**| `ENGINEERING_SKILLS_CATALOG`| `services/api/src/engineering/skills/engineering-skills.catalog.ts` | Reusable engineering expertise schemas | `engineering.test.ts` |
| **REQ-ENG-016: Specialized Engineering Agent Catalog**| `ENGINEERING_AGENT_DEFINITIONS`| `services/api/src/engineering/agents/engineering-agent.definitions.ts` | 12 custom personas with quality gates | `engineering.test.ts` |
| **REQ-ENG-017: PostgreSQL Operational Persistence** | `EngineeringRepository` | `services/api/src/engineering/persistence/engineering.repository.ts` | 8 operational engineering tables | `phase4_engineering_schema.sql` |
| **REQ-ENG-018: Neo4j Relationship Ingestion** | `Neo4jEngineeringService` | `services/api/src/engineering/persistence/neo4j-engineering.service.ts` | `EXECUTED`, `FOR_TASK`, `CHANGED`, `PRODUCED`| `engineering.test.ts` |
| **REQ-ENG-019: Realtime Correlated Event Pipeline** | `EngineeringEventEmitter`| `services/api/src/engineering/events/engineering-event.emitter.ts` | Redis Pub/Sub + WebSocket + 3D Activity | `engineering.test.ts` |
| **REQ-ENG-020: 3D Living Office Activity Bridge** | `EngineeringEventEmitter.toVisualActivity`| `services/api/src/engineering/events/engineering-event.emitter.ts` | Maps engineering phase to 20-state 3D office | `engineering.test.ts` |
| **REQ-ENG-021: AI Router Capability Provider Bridge**| `CompositeExecutionProvider` | `services/api/src/runtime/execution/composite-execution.provider.ts` | Direct LLM vs Antigravity dynamic dispatch | `runtime.service.test.ts` |
| **REQ-ENG-022: Engineering REST Controller** | `EngineeringController` | `services/api/src/engineering/engineering.controller.ts` | `/engineering/*` plan, execute, approve | `npm run build --workspace=@kdi/api` |
| **REQ-ENG-023: Interactive Engineering Console** | `EngineeringConsole` | `apps/web/src/components/EngineeringConsole.tsx` | Live UI, 7-phase stepper, diff & evidence viewer | `npm run build --workspace=@kdi/web` |

---

## 7. Phase 5: Neo4j Graph Memory & GraphRAG Traceability Matrix

| Requirement | Implementation Component | Source File | Contract / Protocol | Verification Test Suite |
|---|---|---|---|---|
| **REQ-GRAG-001: Neo4j Bolt Connection & Pooling** | `Neo4jConnectionService` | `services/api/src/graph/connection/neo4j-connection.service.ts` | `bolt://127.0.0.1:7687`, 20 pools, timeout 3s | `graph.test.ts` (Test 1) |
| **REQ-GRAG-002: Versioned DDL Schema Migrator** | `GraphSchemaMigrator` | `services/api/src/graph/schema/graph-schema.migrator.ts` | V001/V002 constraints, property & vector indexes | `graph.test.ts` (Test 2) |
| **REQ-GRAG-003: Graph Repository Abstraction** | `GraphRepository`<br>`Neo4jGraphRepository` | `services/api/src/graph/repository/` | 11 canonical graph CRUD & query methods | `graph.test.ts` (Test 3, 4) |
| **REQ-GRAG-004: Eventual Consistency & In-Memory Fallback** | `Neo4jGraphRepository` | `services/api/src/graph/repository/neo4j-graph.repository.ts` | Zero-crash local fallback when Neo4j is offline | `graph.test.ts` (Test 6, 17) |
| **REQ-GRAG-005: Event-Driven Graph Ingestion** | `GraphEventConsumer` | `services/api/src/graph/ingestion/graph-event.consumer.ts` | Redis / Runtime events (`task.*`, `engineering.*`) | `graph.test.ts` (Test 5, 18) |
| **REQ-GRAG-006: 3-Tier Layered Memory Model** | `MemoryService` | `services/api/src/graph/memory/memory.service.ts` | `WORKING`, `PROJECT`, `ORGANIZATIONAL` scopes | `graph.test.ts` (Test 8, 12) |
| **REQ-GRAG-007: Memory Provenance & Verification** | `GraphMemoryItem.provenance` | `packages/types/src/index.ts` | `sourceType`, `sourceId`, `createdBy`, `lastVerifiedAt` | `graph.test.ts` (Test 13) |
| **REQ-GRAG-008: Stale Detection & Supersession** | `MemoryService.supersedeMemory` | `services/api/src/graph/memory/memory.service.ts` | `SUPERSEDED` lifecycle, `STALE` confidence penalty | `graph.test.ts` (Test 12) |
| **REQ-GRAG-009: Architecture Decision Tracking (ADRs)**| `DecisionService` | `services/api/src/graph/memory/decision.service.ts` | `Decision` nodes, `HAS_DECISION`, `SUPERSEDED_BY` | `graph.test.ts` (Test 19, 20) |
| **REQ-GRAG-010: Deterministic Memory Extraction** | `MemoryExtractor` | `services/api/src/graph/memory/memory.extractor.ts` | Extracts bug fixes, test results, security findings | `graph.test.ts` (Bonus E2E) |
| **REQ-GRAG-011: Multi-Provider Embedding Engine** | `EmbeddingService` | `services/api/src/graph/embedding/embedding.service.ts` | Ollama, Gemini, & 384-dim deterministic fallback | `graph.test.ts` (Test 8) |
| **REQ-GRAG-012: Bounded Graph Topology Retriever** | `GraphRetriever` | `services/api/src/graph/retrieval/graph.retriever.ts` | Bounded k-hop (1–3 hops), project & task context | `graph.test.ts` (Test 7, 16) |
| **REQ-GRAG-013: Vector Semantic Retriever** | `SemanticRetriever` | `services/api/src/graph/retrieval/semantic.retriever.ts` | Dense cosine similarity matching, normalized [0, 1] | `graph.test.ts` (Test 8) |
| **REQ-GRAG-014: Normalized Hybrid Fusion Engine** | `HybridGraphRetriever` | `services/api/src/graph/retrieval/hybrid-graph.retriever.ts` | Reciprocal fusion: alpha, graph, recency, confidence | `graph.test.ts` (Test 9) |
| **REQ-GRAG-015: Context Engineering & Budgeting** | `GraphContextBuilder` | `services/api/src/graph/context/graph-context.builder.ts` | Scope priority tiering, token limit enforcement | `graph.test.ts` (Test 14) |
| **REQ-GRAG-016: Prompt Injection Defense Framing** | `GraphContextBuilder` | `services/api/src/graph/context/graph-context.builder.ts` | `UNTRUSTED_GRAPH_KNOWLEDGE_BOUNDARY` isolation | `graph.test.ts` (Test 15) |
| **REQ-GRAG-017: Multi-Tenant Boundary Isolation** | `HybridGraphRetriever` | `services/api/src/graph/retrieval/hybrid-graph.retriever.ts` | Scoped by `projectId`; cross-project leak blocked | `graph.test.ts` (Test 10) |
| **REQ-GRAG-018: Visibility Authorization Levels** | `GraphContextBuilder` | `services/api/src/graph/context/graph-context.builder.ts` | `PUBLIC`, `INTERNAL`, `PRIVATE`, `CONFIDENTIAL` | `graph.test.ts` (Test 11) |
| **REQ-GRAG-019: Anti-Hallucination GraphRAG** | `GraphRAGService` | `services/api/src/graph/graphrag/graphrag.service.ts` | Strict evidence grounding, `INSUFFICIENT_CONTEXT` | `graph.test.ts` (Bonus E2E) |
| **REQ-GRAG-020: Explicit Citable Attribution** | `GraphRAGResult.sources` | `services/api/src/graph/graphrag/graphrag.service.ts` | Node ID, type, confidence, snippet provenance | `graph.test.ts` (Bonus E2E) |
| **REQ-GRAG-021: Operational Truth Graph Recovery** | `GraphRebuildService` | `services/api/src/graph/ingestion/graph-rebuild.service.ts` | Idempotent reconstruct from PostgreSQL records | `graph.test.ts` (Test 19) |
| **REQ-GRAG-022: Graph Memory & GraphRAG REST API** | `GraphController` | `services/api/src/graph/graph.controller.ts` | `/memory/*` context, search, graphrag, rebuild | `graph.test.ts` |
| **REQ-GRAG-023: Interactive Graph Memory Console** | `GraphMemoryConsole` | `apps/web/src/components/GraphMemoryConsole.tsx` | Realtime telemetry, RAG studio, memory browser | `npm run build --workspace=@kdi/web` |





