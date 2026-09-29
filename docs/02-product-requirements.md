# Product Requirements Specification: KDI AI Office

## 1. Introduction & Numbering Convention
This specification defines the formal functional and non-functional requirements for the **KDI AI Office** platform.
- **FR-xxx:** Functional Requirement (FR-001 through FR-032)
- **NFR-xxx:** Non-Functional Requirement (NFR-001 through NFR-013)
- **Priority Scale:**
  - **P0:** Mandatory for baseline release; architecture blocker.
  - **P1:** Critical feature for complete operational workflows.
  - **P2:** Desirable enhancement; secondary optimization.

---

## 2. Functional Requirements (FR)

### Module 1: Task Management & Scheduling
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-001** | Remote Task Ingestion | System must accept task requests submitted via Web UI / Mobile Web and queue them securely. | Allows developer to delegate tasks anytime from any device. | P0 | 1. API endpoint `/tasks` receives JSON payload with auth token.<br>2. Task saved to PostgreSQL within 200ms.<br>3. Task ID returned immediately. | API Gateway / Task Service |
| **FR-002** | Asynchronous Task Queuing | System must push accepted tasks to a prioritized Redis queue for background worker consumption. | Prevents request blocking and ensures resilient queue-based dispatching. | P0 | 1. Task enters `kdi:queue:tasks:pending`.<br>2. Worker acknowledges task via Redis consumer groups.<br>3. Zero lost tasks during restarts. | Redis Queue Manager |
| **FR-003** | Task Decomposition & Delegation | AI Manager must decompose high-level user tasks into hierarchical subtasks and assign them to specialized agents. | Complex engineering tasks require step-by-step specialist execution. | P0 | 1. Generates JSON plan with dependencies.<br>2. Nodes created in Neo4j (`Task-[:SUBTASK_OF]->ParentTask`).<br>3. Subtasks dispatched in topological order. | AI Manager / MetaGPT |
| **FR-004** | Task Cancellation & Abort | User must be able to cancel in-progress or queued tasks immediately. | Prevents runaway agent execution or redundant computation. | P0 | 1. `/tasks/:id/cancel` sets status to `CANCELLED`.<br>2. Active worker receives abort signal via Redis pub/sub within 1 second.<br>3. Running child processes gracefully killed. | Task Worker / Process Supervisor |
| **FR-005** | Human Approval Workflow | System must suspend task execution when a tool call or action requires human approval. | Ensures safety for destructive or high-risk operations. | P0 | 1. Emits `approval.required` WebSocket event.<br>2. Task state transitions to `WAITING_APPROVAL`.<br>3. Resumes execution only upon signed approval payload. | Policy Engine / Approval Service |

### Module 2: Agent Architecture & Execution
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-006** | Agent Catalog & Persona Registry | System must maintain active registry of 14 distinct agent roles with isolated personas, prompts, and capability boundaries. | Role isolation prevents prompt pollution and chaotic role drift. | P0 | 1. Registry loads 14 agent definitions.<br>2. Each agent verifies its role contract before task start.<br>3. Persona parameters immutable during execution. | Agent Runtime |
| **FR-007** | OpenCode Software Execution Engine | System must interface with OpenCode for sandboxed repository cloning, file edits, AST parsing, and diff generation. | Standardizes software engineering primitives. | P0 | 1. Executes operations inside sandboxed repo workspace.<br>2. Outputs unified git diffs.<br>3. Validates syntax before saving files. | OpenCode Adapter |
| **FR-008** | MetaGPT Multi-Agent Coordination | System must support MetaGPT SOP (Standard Operating Procedure) workflows for structured team handoffs. | Enables deterministic handoffs between PM, Architect, and Engineer. | P1 | 1. Artifacts passed via shared message pool.<br>2. Handoff states tracked in PostgreSQL & Neo4j.<br>3. Failure at any stage alerts AI Manager. | MetaGPT Orchestrator |
| **FR-009** | Reusable Skill Pipeline | Agents must load validated, modular skills (e.g., `git`, `test-runner`, `code-review`) on demand. | Promotes DRY operational logic and clean separation of concerns. | P0 | 1. Skills load dynamically based on task requirements.<br>2. Skill inputs and outputs validated via JSON Schema.<br>3. Failed skill step triggers structured retry. | Skill Engine |
| **FR-010** | Tool Sandbox & Execution Whitelist | System must restrict shell and filesystem execution to whitelisted commands and safe directory paths. | Prevents arbitrary remote code execution and host compromise. | P0 | 1. Denies commands outside whitelist.<br>2. Path traversal (`../`) outside repo root blocked.<br>3. Shell tool calls logged with full environment snapshot. | Sandbox Manager |

### Module 3: Knowledge, Graph & Memory
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-011** | Neo4j Knowledge Graph Persistence | System must maintain a real-time graph model representing projects, repositories, modules, files, commits, tasks, and agents. | Provides deep architectural reasoning and relationship queries. | P0 | 1. Graph schema enforced with unique constraints.<br>2. Cypher queries complete in <150ms.<br>3. Entity updates synchronized from PostgreSQL events. | Neo4j Graph Engine |
| **FR-012** | GraphRAG Context Ingestion | System must perform hybrid vector + graph retrieval to construct dense, hyper-relevant context for agents. | Prevents token wastage and reduces hallucinations. | P1 | 1. Fetches code dependencies up to 2 hops.<br>2. Injects relevant architecture decisions (ADRs).<br>3. Context size stays within model budget. | GraphRAG Engine |
| **FR-013** | Tiered Memory Segmentation | System must cleanly segment agent memory into short-term (context window), working (Redis), long-term (PostgreSQL), and graph (Neo4j). | Prevents unbounded context growth and memory leaks. | P0 | 1. Redis session purged upon task completion.<br>2. Key takeaways persisted to long-term memory.<br>3. Zero raw uncompressed conversation dumps. | Memory Manager |

### Module 4: Dynamic AI Router & Inference
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-014** | Multi-Provider Model Abstraction | System must interface with Gemini, Groq, OpenRouter, and Ollama through a unified SDK adapter. | Eliminates vendor lock-in and decouples agent logic from models. | P0 | 1. Standard request/response interface across providers.<br>2. Structured output parsing (JSON schema).<br>3. Supports streaming responses. | AI Router Core |
| **FR-015** | Dynamic Intelligent Routing | Router must select the optimal provider/model based on task complexity, context length, latency requirements, privacy flags, and budget. | Minimizes operational costs and maximizes reasoning quality. | P0 | 1. Privacy-flagged tasks routed exclusively to Ollama.<br>2. Complex architecture planning routed to high-tier cloud LLM.<br>3. Routing rules hot-reloadable from DB. | Routing Policy Engine |
| **FR-016** | Graceful Inference Fallback Chain | Router must automatically cascade to alternative providers or local Ollama upon API errors, timeouts, or rate limits (429). | Ensures high availability even during external API downtime. | P0 | 1. Detects provider 429/500/timeout within 5 seconds.<br>2. Attempts fallback provider in pre-configured chain.<br>3. Records fallback event in audit log. | Fallback Manager |

### Module 5: 3D Digital Twin Office & UX Core
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-017** | Interactive 3D Office Visualization | Web UI must render an interactive 3D digital office showing avatars, rooms, and live agent status animations. | Provides intuitive, at-a-glance operational observability. | P1 | 1. Renders 18 functional office rooms in Three.js.<br>2. Avatars visually reflect 20 distinct agent states.<br>3. Maintains >=45 FPS on standard mobile/desktop browsers. | 3D Frontend (R3F) |
| **FR-018** | Realtime WebSocket Event Streaming | System must broadcast agent status changes, task progress, and approval requests over low-latency WebSockets. | Enables instant UI updates without aggressive HTTP polling. | P0 | 1. WebSocket server broadcasts events in <100ms.<br>2. Supports automatic reconnect with missed event replay.<br>3. Rooms/channels isolated by task and agent. | Realtime Gateway |
| **FR-019** | Command Center & Admin Dashboard | UI must provide 2D management views: Task Board, Agent Detail, Approval Portal, Graph Explorer, LLM Spend, and Audit Logs. | Comprehensive system control and maintenance. | P0 | 1. Responsive mobile & desktop layouts.<br>2. 1-click approvals for pending actions.<br>3. Interactive Neo4j graph sub-view. | 2D Web Dashboard |

### Module 6: Living Virtual Office & Activity Engine
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-020** | Office Activity Engine & Avatar Movement | System must translate actual backend agent states into spatial room assignments and pathfinding movements across 18 office zones. | Digital Twin integrity: visuals reflect genuine operational reality, not fake animations. | P1 | 1. Moving between rooms triggers `MOVING` state.<br>2. NavMesh pathfinding completes smoothly.<br>3. Zero random state transitions without backend event. | Office Activity Engine |
| **FR-021** | Break & Refreshment Context Preservation | System must support `BREAK`, `COFFEE`, and `LUNCH` states in the Pantry/Break area while preserving full task memory. | Realistic office rhythms without loss of engineering context. | P1 | 1. Working context serialized to Redis before break.<br>2. Avatar walks to Pantry.<br>3. Context rehydrated and work resumed upon return. | Break Coordinator |
| **FR-022** | Non-Blocking Prayer Scheduling & Musholla | System must integrate configurable prayer times with Musholla visits (`PRAYING` state) while background AI tasks continue 24/7. | Cultural/spiritual authenticity and Islamic-friendly workplace simulation. | P1 | 1. Scheduled via timezone/geo coordinates.<br>2. Avatars convene in Musholla for Jamaah.<br>3. Background queue processing unaffected. | Prayer Scheduler |
| **FR-023** | Multi-Agent Collaborative Meetings | AI Manager must be able to call formal meetings in the Meeting Room when multiple agents share project or task dependencies. | Anchors multi-agent collaboration to real dependency graph relationships. | P1 | 1. Creates `office_meetings` record.<br>2. Avatars sit at conference table.<br>3. Meeting minutes and action items logged to Neo4j. | Meeting Engine |
| **FR-024** | Interactive Functional Whiteboard | System must dynamically project architectural diagrams, sequences, and ERDs generated by agents onto the glass whiteboard. | Tangible visual manifestation of technical reasoning. | P2 | 1. Renders SVG/Mermaid diagrams on whiteboard in 3D.<br>2. Updates live when Architect emits new designs. | Whiteboard Service |
| **FR-025** | Server Room Telemetry Display | Server racks in 3D Server Room must reflect real-time health checks of PostgreSQL, Redis, Neo4j, Ollama, and worker containers. | Immersive visual infrastructure observability. | P1 | 1. Racks blink green on healthy, amber on degraded, red on error.<br>2. Sourced directly from `/health` endpoints. | Infrastructure Monitor |
| **FR-026** | Public vs. Private 3D Zone Access | System must enforce dual-mode security, redacting private code, diffs, terminal logs, and salaries from unauthenticated public visitors. | Safe public portfolio hosting on public domains without data leakage. | P0 | 1. Unauthenticated users restricted to Public Zone.<br>2. Sensitive payloads stripped at Edge Gateway.<br>3. Full access unlocked only via verified JWT. | Security Policy Guard |

### Module 7: First-Class Portfolio & Project Showroom
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-027** | Interactive Portfolio Gallery & Project Rooms | System must provide 3D exhibition gallery and dedicated project rooms (e.g., *Koneksi Santri Room*) showcasing delivered software. | Showcases engineering capability and client solutions in an authentic digital twin. | P1 | 1. Displays cards, kiosks, and 3D showcases.<br>2. Interactive staging demos and architecture walls.<br>3. Supports 11 distinct project types. | Portfolio Subsystem |
| **FR-028** | Empirical AI Contribution Verification | Portfolio must display AI engineering contributions (planning, coding, testing, review) only when verified by real Git and task evidence. | Guarantees marketing honesty and verifiable technical integrity. | P0 | 1. Queries Neo4j for actual commits and task runs.<br>2. Unverified claims strictly omitted.<br>3. Links to public-safe diff summaries. | Verification Auditor |
| **FR-029** | Portfolio Content Management System | Authorized operators must be able to create, edit, feature, and publish portfolio case studies and media assets. | Easy maintenance of organizational portfolio without code redeployment. | P1 | 1. CRUD API and 2D CMS interface.<br>2. Image/video upload support.<br>3. Automated sensitive data redaction. | Portfolio CMS |

### Module 8: AI Workforce Compensation & Cost Accounting
| Req ID | Title | Description | Rationale | Pri | Acceptance Criteria | Component |
|---|---|---|---|---|---|---|
| **FR-030** | AI Workforce Compensation Simulation | System must calculate virtual employee compensation across 8 salary grades (Intern to Director) alongside actual cloud LLM expenses. | Simulates workforce economics, capacity planning, and project ROI. | P1 | 1. Configurable base salary, allowances, incentives.<br>2. Merges virtual pay with actual LLM/tool bills.<br>3. Outputs monthly simulated statements. | Compensation Engine |
| **FR-031** | Workload Mirror & Labor Mapping | System must map single-human developer responsibilities into equivalent specialized AI roles and calculate equivalent virtual workforce cost. | Visualizes developer leverage and identifies delegation opportunities. | P1 | 1. Inputs human responsibilities checklist.<br>2. Maps to equivalent AI specialist roles.<br>3. Displays cost comparison dashboard. | Workload Mirror |
| **FR-032** | Monthly Historical Workload & Budget Snapshots | System must preserve monthly historical snapshots of workload allocations, department costs, and multi-project billings. | Enables longitudinal analysis of workforce scaling and software spend. | P2 | 1. Stored in `workload_mirror_snapshots`.<br>2. Generates trend charts over quarterly intervals. | Financial Ledger |

---

## 3. Non-Functional Requirements (NFR)

### 3.1 Security (SEC)
| Req ID | Title | Description | Target Metric | Component |
|---|---|---|---|---|
| **NFR-001** | Zero Public Database Exposure | Internal storage engines (PostgreSQL, Neo4j, Redis) and Ollama must only bind to `127.0.0.1` or internal Docker networks. | 0 exposed internal ports on public IP. | Network / Docker Compose |
| **NFR-002** | Authenticated Remote Gateway | Remote access from external browsers must traverse an encrypted HTTPS/WSS reverse tunnel with JWT + mTLS/API-Key authentication. | 100% authenticated remote requests; rate-limited at edge. | Gateway / Reverse Proxy |
| **NFR-003** | Secrets Vault & Key Management | API keys and repository SSH tokens must be stored encrypted (AES-256-GCM) and injected in-memory only. | Zero plaintext secrets in git or logs. | Secrets Manager |
| **NFR-004** | Prompt Injection Defense | All incoming user instructions, git commit messages, and external inputs must pass input sanitization before entering agent prompts. | 100% tool calls sanitized; zero unescaped shell escapes. | Security Policy Engine |

### 3.2 Reliability & Fault Tolerance (REL)
| Req ID | Title | Description | Target Metric | Component |
|---|---|---|---|---|
| **NFR-005** | Graceful Host Reconnect | The office runtime must automatically re-establish its outbound reverse tunnel to the VPS gateway upon network drops. | Reconnect within 10 seconds of internet restoration. | Tunnel Client (SSH/Cloudflare/Frp) |
| **NFR-006** | Task Worker Crash Recovery | In-flight tasks interrupted by machine reboot or power outage must be marked `INTERRUPTED` and safely resumed or failed gracefully. | Zero orphaned tasks in perpetual `RUNNING` state. | Worker Supervisor |

### 3.3 Observability & Auditability (OBS)
| Req ID | Title | Description | Target Metric | Component |
|---|---|---|---|---|
| **NFR-007** | End-to-End Distributed Tracing | Every user action must generate a unique `trace_id` propagated through AI Manager, Agent, LLM Request, Tool Call, and Commit. | 100% of operations traceable in PostgreSQL and Neo4j. | OpenTelemetry / Logger |
| **NFR-008** | Immutable Audit Trail | Every command execution, git commit, approval decision, and security violation must be logged to an append-only audit table. | Zero audit deletions; cryptographic hash chaining. | Audit Service |

### 3.4 Performance & Resource Constraints (PERF)
| Req ID | Title | Description | Target Metric | Component |
|---|---|---|---|---|
| **NFR-009** | Local Host Resource Safeguard | Background workers must dynamically throttle concurrency when host CPU > 75% or RAM > 80%. | Host desktop remains fully responsive for human developer. | Resource Monitor |
| **NFR-010** | CPU-Friendly Inference Baseline | Ollama local inference must execute successfully without crash or freeze on modern multicore CPUs without requiring dedicated GPU. | Stable inference with 3B/7B Q4 models at >=5 tokens/sec. | Ollama Integration |

### 3.5 Maintainability & Extensibility (MAINT)
| Req ID | Title | Description | Target Metric | Component |
|---|---|---|---|---|
| **NFR-011** | Modular Provider & Skill Architecture | Adding a new LLM provider or skill must require only implementing an interface class without altering core workflow engines. | New provider added in < 100 lines of standard adapter code. | AI Router / Skill System |
| **NFR-012** | Database Migration Safety | Relational and graph schema changes must be versioned, idempotent, and support forward and backward rollbacks. | Automated schema migration verification in CI/local setup. | Database Migrations |

### 3.6 Recoverability (REC)
| Req ID | Title | Description | Target Metric | Component |
|---|---|---|---|---|
| **NFR-013** | Automated Database Snapshots | PostgreSQL relational tables and Neo4j graph databases must take daily automated local backups with point-in-time recovery. | RPO <= 24 hours; RTO <= 30 minutes on fresh workstation install. | Backup Daemon |
