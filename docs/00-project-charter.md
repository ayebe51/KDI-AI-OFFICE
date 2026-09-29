# Project Charter: KDI AI Office

## 1. Executive Summary & Project Identification
- **Project Name:** KDI AI Office
- **Codename:** Project Antigravity Office
- **Sponsor / Lead Developer:** KDI Chief Developer & System Architect
- **Primary Runtime Execution Host:** Local Office Workstation (Windows / WSL2 / Docker Environment)
- **Edge Relay / Gateway:** Cloud VPS (Hostinger / Independent Linux Node)
- **Frontend Presentation Layer:** 3D Web Dashboard (Hostinger Web Domain / WebGL / Three.js)
- **Document Version:** 1.0.0
- **Status:** Approved for Phase 0 (Architecture & Specification Baseline)

---

## 2. Project Vision & Long-term Evolution
The ultimate vision of **KDI AI Office** is to construct an autonomous, event-driven, multi-agent AI Software Office that operates seamlessly as a force multiplier for human software engineering. The project follows a four-stage evolutionary trajectory:

1. **Stage 1 — AI Assistant:** Single-task reactive assistants executing discrete instructions, analyzing code snippets, drafting pull requests, and providing contextual information.
2. **Stage 2 — AI Engineer:** Asynchronous autonomous agents capable of receiving a ticket or issue, planning execution, modifying files, running local unit tests, generating diffs, and presenting structured reviews.
3. **Stage 3 — AI Engineering Team:** A coordinated multi-agent team (Manager, Architect, Frontend, Backend, Database, QA, Security, Code Reviewer) with role-specialized context, automated handoffs, peer review cycles, and hierarchical escalation.
4. **Stage 4 — AI Software Company:** Fully orchestrated enterprise software lifecycle management including backlog grooming, architecture validation, continuous autonomous regression testing, dependency upgrades, release packaging, and self-healing deployment operations.

---

## 3. Core Principles & Philosophy

### 3.1 Developer-Centric Primacy (Human in the Loop)
- The human developer remains the principal architect and supreme decision authority.
- The human workstation (Antigravity IDE) remains the center of real-time development.
- AI Office operates primarily to handle background workloads, off-hours asynchronous tasks, automated peer reviews, regression discovery, and multi-file refactoring while the developer is away from the workstation or focusing on high-level design.
- Destructive actions, production deployments, schema migrations, and repository pushes to protected branches are gated by **Mandatory Human Approval**.

### 3.2 Clear Separation of Concerns
To prevent monolithic drift and chaotic agent behavior, the system rigorously enforces architectural boundaries:
- **Human:** Goal setter, reviewer, final authority.
- **AI Office:** Platform coordination, event hub, dashboard, operational boundary.
- **AI Manager:** Decomposer of goals into tasks, assigner, progress tracker, escalation dispatcher.
- **Agents:** Persona, domain responsibilities, memory retrieval, reasoning logic.
- **Skills:** Composable, validated procedural recipes (e.g., repository analysis, test execution).
- **Tools:** Sandboxed atomic primitives with strict capability limits (e.g., git CLI, filesystem read/write, test runner).
- **Models:** Swappable inference engines (Ollama local, Gemini, Groq, OpenRouter) selected dynamically by routing policies.
- **Memory & Graph:** Triple-tier knowledge storage (PostgreSQL relational state, Redis ephemeral state, Neo4j knowledge and dependency topology).

### 3.3 Resource-Conscious Local Execution
- The primary execution host is the local office computer equipped with standard consumer/workstation hardware (SSD, multicore CPU, standard memory, standard VGA).
- The architecture **MUST NOT** mandate a dedicated high-end GPU for core operation.
- Heavy reasoning and large-context comprehension are routed to cloud LLMs (Google Gemini, Groq, OpenRouter).
- Local Ollama instances are reserved for lightweight, privacy-sensitive, offline, or fallback tasks using compact quantized models (e.g., 3B to 8B parameter models running on CPU/standard GPU).
- Worker processes and agent invocations are strictly bounded by concurrency limits, task queues, and resource-aware scheduling to prevent host exhaustion.

---

## 4. Scope & Boundaries

### 4.1 In Scope
- Multi-agent orchestration engine combining MetaGPT workflow topologies with OpenCode software engineering tool execution.
- Relational state persistence for users, projects, tasks, execution runs, audit logs, and provider metrics in PostgreSQL.
- Fast ephemeral queuing, event pub/sub, distributed locking, and rate limiting in Redis.
- Knowledge graph and code dependency lineage in Neo4j (GraphRAG, AST mapping, task lineage, policy validation).
- Dynamic AI Router with multi-provider failover, cost-latency optimization, and privacy routing.
- Sandboxed tool execution with capability-based security, command whitelisting, and approval workflows.
- Web-based 3D digital twin office visualization built on React Three Fiber and Tailwind CSS.
- Secure reverse tunnel / gateway architecture bridging cloud VPS / Hostinger frontend to the on-premise office workstation.

### 4.2 Out of Scope
- Direct unmediated public exposure of internal databases (PostgreSQL, Neo4j, Redis) or Ollama endpoints.
- Fully unprompted autonomous commits or deployments directly to production without human review.
- High-frequency automated trading, financial transactions, or unmonitored external internet scrapers.
- Replacement of developer's primary IDE; the AI Office acts as an asynchronous parallel team, not an IDE replacement.

---

## 5. Stakeholders & Governance
- **Product Owner & Principal Architect:** Primary Human Developer
- **Operational Users:** Remote Mobile Human Operator, Desktop Lead Developer
- **System Agents:** AI Manager, System Architect, Software Engineers, QA, Security, Ops
- **Auditor / Regulatory Role:** Automated Audit Logger & Security Policy Enforcement Layer

---

## 6. Success Criteria
1. **Zero-Trust Local Boundary:** No external attacker can access internal office tools without passing through authenticated, rate-limited, and audited VPS gateway tunnels.
2. **Autonomous Task Completion Rate:** Over 85% of well-specified low/medium-risk background engineering tasks (bug reproduction, test authoring, localized bug fixing) completed without human intervention.
3. **Traceability:** 100% of tool executions, git commits, and model invocations correlated with a specific task ID, agent ID, and authorization token in PostgreSQL and Neo4j.
4. **Resilience:** Uninterrupted background operation with graceful fallback to alternative LLM providers or local Ollama when primary cloud APIs suffer rate limits or outages.
