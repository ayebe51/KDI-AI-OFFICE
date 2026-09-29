# Product Requirements Document (PRD): KDI AI Office

## 1. Document Control
- **Document Title:** Product Requirements Document — KDI AI Office
- **Document Version:** 1.1.0 (Phase 0 Addendum: Living Office, Portfolio & Workforce Compensation Extension)
- **Status:** Baseline Approved
- **Author:** Principal Product Architect & Systems Architecture Team

---

## 2. Problem Statement
Software engineering in modern multi-repository and multi-service environments (such as *Koneksi Santri*, core microservices, and internal administrative tooling) demands substantial cognitive overhead for routine tasks:
1. **Context Fragmentation:** Investigating bug reports across repositories requires reading code, inspecting logs, tracing commits, and executing regression tests—tasks that pull the senior developer away from strategic architecture.
2. **Idle Off-Hours Downtime:** When the lead developer leaves the office or is away from the desktop workstation, background maintenance, dependency scanning, refactoring, and test authoring grind to a halt.
3. **Execution Bottlenecks in Mobile Environments:** While remote, a developer diagnosing a production or staging issue via a mobile phone lacks a reliable, secure, and sandboxed execution environment capable of safely cloning repositories, reproducing issues, running tests, and preparing clean diffs.
4. **Fragility of Monolithic Coding Bots:** Existing autonomous coding agents often suffer from infinite loops, unrestricted shell risks, lack of granular audit trails, hardcoded vendor lock-in, and unpredictable destruction of existing repositories.
5. **Workforce Disconnect & Portfolio Opacity:** Traditional developer dashboards present static, sterile tables that fail to communicate genuine workforce activity or showcase completed software achievements (*Koneksi Santri*) to external clients and team members in an engaging, authentic digital space.

---

## 3. Product Vision & Goals

### 3.1 Vision
To deliver an intelligent, secure, resilient, and visually captivating **Living Multi-Agent AI Software Office** residing on the local workstation, accessible anywhere via a secure remote 3D digital twin dashboard, capable of executing asynchronous engineering workflows with human-in-the-loop oversight, while serving as a dynamic showcase for software portfolio assets and workforce simulations.

### 3.2 Strategic Goals
- **G-1 (Asynchronous Productivity):** Enable the developer to delegate background engineering tasks from mobile or remote browsers and receive fully tested, peer-reviewed git pull requests/diffs upon return.
- **G-2 (Safe Autonomy):** Maintain zero unauthorized destructive changes through strict risk-categorized approval gates and sandboxed tool execution.
- **G-3 (Knowledge Persistence & Graph Lineage):** Store all project context, architecture decisions, dependency graphs, bug traces, and task lineage in Neo4j and PostgreSQL.
- **G-4 (Hybrid Inference Efficiency):** Dynamically optimize LLM spend, latency, and privacy by routing requests across Gemini, Groq, OpenRouter, and local CPU-friendly Ollama.
- **G-5 (Living Digital Twin Observability):** Provide a real-time, warm, professional 3D virtual office displaying actual backend states (coding, meetings, breaks, prayers) across 18 functional zones.
- **G-6 (First-Class Portfolio & Showroom):** Dynamically showcase completed and active client software products with verified empirical AI contributions and interactive case studies.
- **G-7 (AI Workforce Compensation & Workload Mirror):** Provide realistic financial and labor simulations mapping complex human workloads to equivalent digital teams and calculating multi-project cost allocations.

### 3.3 Non-Goals
- **NG-1:** Replacing human engineering judgment or eliminating the developer's primary IDE (Antigravity IDE remains the primary coding workstation).
- **NG-2:** Deploying untracked or autonomous changes directly to production clusters without explicit human sign-off.
- **NG-3:** Requiring expensive multi-GPU server infrastructure; the local office runtime must operate cleanly on standard consumer/office workstation hardware.
- **NG-4:** Providing public, unauthenticated access to internal office execution environments, private code, or actual financial records.
- **NG-5:** Implementing legally binding human payroll; workforce compensation is strictly an internal operational simulation.

---

## 4. Target Users & Personas

### Persona 1: Senior Lead Developer (Human Master)
- **Context:** Primary developer, architect, and repository owner.
- **Needs:** Complete control, transparency of agent decisions, high-speed execution, non-intrusive background assistance, zero hallucinated repository corruption.
- **Usage Modes:**
  - *In-Office:* Working in Antigravity IDE, delegating secondary subtasks, inspecting graphs and audit logs.
  - *Remote / Mobile:* Checking agent progress via phone, submitting high-level task descriptions, approving high-risk git operations.

### Persona 2: AI Team Coordinator (System Agent)
- **Role:** AI Manager and MetaGPT-based workflow orchestrator.
- **Needs:** Clear task breakdown policies, capability-to-agent mapping, resource constraints, real-time heartbeat monitoring.

### Persona 3: Prospective Client / External Visitor (Public Guest)
- **Context:** Client evaluating technology capabilities or exploring delivered software.
- **Needs:** Immersive guided tour, project showcase, interactive portfolio demonstrations, zero access to sensitive internal repositories.

---

## 5. Primary Use Cases

### 5.1 Use Case A — Remote Task Submission (Mobile Operator)
- User from mobile web submits: *"Periksa bug modul pickup Koneksi Santri. Kalau low risk, perbaiki, test, commit, lalu laporkan."*
- Agent reproduces, patches, tests, commits to local branch, and reports back within 3 minutes.

### 5.2 Use Case B — Autonomous Multi-Step Engineering Pipeline
- End-to-end delegation: Request -> Plan -> Analyze -> Implement -> Test -> Review -> Report.

### 5.3 Use Case C — Human Approval Gate (High-Risk Operation)
- High-risk operations (schema migrations, remote pushes) suspend execution and await cryptographic sign-off.

### 5.4 Use Case D — Coordinated AI Team Handoff
- MetaGPT pipeline coordinating PM, Architect, Engineer, QA, and Security agents.

### 5.5 Use Case E — Living Virtual Office & Guided Tour (Visitor Experience)
- An external visitor opens the public domain.
- The 3D office renders in Public Mode. A guided tour walks the visitor from Reception into the Portfolio Gallery, highlighting *Koneksi Santri* on the digital display wall.
- The visitor observes avatars working at the Engineering Floor, moving to the Meeting Room, or taking a coffee break in the Pantry, reflecting true system activity without exposing private code.

### 5.6 Use Case F — Workload Mirror Analysis (Executive Planning)
- The lead developer opens the Workload Mirror view.
- The system analyzes 7 distinct developer responsibilities (IT ops, web administration, WordPress, UI/UX, content, support) and calculates an equivalent virtual AI team of 5 specialized agents.
- The system presents estimated virtual compensation (Rp 77.000.000) versus actual cloud LLM expense (Rp 1.850.000), providing clear metrics on automation ROI and capacity planning.

---

## 6. Key Performance Indicators (KPIs)
1. **Safety Compliance Rate:** 100% of actions classified as HIGH/CRITICAL pass through verified human approval.
2. **Visual Fidelity & Synchronicity:** 100% of 3D avatar animations and room positions map to verifiable backend states.
3. **Inference Availability:** 99.9% uptime enabled by automatic fallback across cloud providers and local Ollama.
4. **Local Resource Headroom:** Workstation CPU utilization kept below 75% and RAM below 80% during peak multi-agent runs.
5. **Portfolio Integrity Index:** 100% of listed AI project contributions supported by verifiable Git commits and task runs.
