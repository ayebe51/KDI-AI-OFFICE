# Target Runtime Environment Requirements: Office Computer

## 1. Executive Summary & Purpose
This document establishes the hardware, operating system, network, runtime, and security requirements for the **Office Computer (Komputer Kantor)**.

The Office Computer is the designated sovereign host for the production AI Office runtime. It will execute the core backend services, multi-agent orchestrator, database tier, local inference fallback, and worker pools.

> **CRITICAL RULE ON OFFICE COMPUTER SPECIFICATIONS:**  
> The actual physical hardware specifications of the office computer are currently **UNKNOWN**.  
> The values documented below represent the technical requirements and validation thresholds that the office computer must meet upon commissioning. Do not assume or fabricate hardware values.

---

## 2. Actual Hardware Status of Office Computer
- **Status:** **PENDING COMMISSIONING / PHYSICAL AUDIT**
- **CPU:** `UNKNOWN`
- **RAM:** `UNKNOWN`
- **GPU:** `UNKNOWN`
- **Storage / SSD:** `UNKNOWN`
- **OS:** `UNKNOWN`
- **Network Bandwidth:** `UNKNOWN`

---

## 3. Comprehensive Target System Requirements

| Domain | Specification Item | Requirement Level | Threshold / Target Criteria | Rationale |
|---|---|:---:|---|---|
| **Operating System** | 64-bit OS (Linux / Windows 11 Pro with WSL2) | **REQUIRED** | Ubuntu 22.04/24.04 LTS (Recommended) OR Windows 11 Pro 64-bit with WSL2 | Docker containerization and persistent process daemon stability. |
| **CPU Architecture** | Multi-Core x86_64 Processor | **REQUIRED** | Min: 8 Cores / 16 Threads<br>Rec: 12-16 Cores | High concurrency for multi-agent loops, Ollama CPU quantization, and database workloads. |
| **System Memory (RAM)**| Physical RAM | **REQUIRED** | Min: 32 GB DDR4/DDR5<br>Rec: 64 GB DDR4/DDR5 | PostgreSQL buffer cache, Neo4j JVM heap (4GB), Redis (1GB), and Ollama model context in RAM. |
| **Primary Storage** | High-Speed NVMe SSD | **REQUIRED** | Min: 512 GB NVMe SSD<br>Rec: 1 TB+ NVMe SSD | Fast random I/O for AST indexing, SQLite/PostgreSQL WAL writes, and model loading. |
| **Dedicated GPU** | NVIDIA / AMD Graphics Card | **OPTIONAL** | Min: None (Pure CPU mode supported)<br>Rec: NVIDIA RTX 3060/4060 (8GB-16GB VRAM) | **NOT MANDATORY:** Ollama is explicitly configured to run on CPU threads. Dedicated GPU accelerates inference if available. |
| **Standard Display** | Standard Integrated VGA | **REQUIRED** | Basic video output (HDMI/DisplayPort) | Physical workstation display output. |
| **Node.js Runtime** | Node.js Engine | **REQUIRED** | Node.js v20.x or v22.x LTS (or v24.x) | NestJS backend API and TypeScript tooling runtime. |
| **Python Runtime** | Python Engine | **REQUIRED** | Python 3.10, 3.11, or 3.12 (64-bit) | MetaGPT, OpenCode tool scripts, and Tree-sitter parsers. |
| **Container Engine** | Docker Engine & Docker Compose | **REQUIRED** | Docker Engine >= 24.0, Docker Compose v2 (Compose plugin) | Containerized deployment of PostgreSQL 16, Redis 7, Neo4j 5, and FRP client. |
| **Network & Internet** | Stable Internet Connection | **REQUIRED** | Min: 20 Mbps Symmetric<br>Rec: 50+ Mbps Fiber | Outbound TLS reverse tunnel to VPS, pulling LLM cloud APIs (Gemini, Groq, OpenRouter). |
| **Inbound Ports** | Router Port Forwarding | **FORBIDDEN (0 Open Ports)** | **Zero open inbound ports** permitted on office network | All external traffic reaches the office computer via the outbound-initiated FRP reverse tunnel. |
| **Local Ports** | Internal Loopback Bindings | **REQUIRED** | `127.0.0.1:3000` (API)<br>`127.0.0.1:5432` (Postgres)<br>`127.0.0.1:6379` (Redis)<br>`127.0.0.1:7687` (Neo4j Bolt)<br>`127.0.0.1:11434` (Ollama) | Internal daemon communications; strictly bound to loopback and Docker bridge. |
| **Storage Capacity** | Free Disk Allocation | **REQUIRED** | Min: 100 GB dedicated partition for AI Office data | Database volumes, local Ollama models (4GB-8GB), Git worktrees, and log archives. |
| **Core Services** | System Daemons | **REQUIRED** | Systemd (Linux) or Windows Service Manager | Auto-restart daemons on reboot (FRP client, Docker engine, watchdog). |
| **User Permissions** | Administrative Rights | **REQUIRED** | Sudo / Administrator access | Required for initial Docker daemon installation and systemd service registration. |

---

## 4. Laptop vs. Office Computer Independence Principle

```text
┌─────────────────────────┐               ┌───────────────────────────┐
│     DEVELOPER LAPTOP    │               │      OFFICE COMPUTER      │
│  (Intermittent Session) │               │     (24/7 Sovereign Host) │
├─────────────────────────┤               ├───────────────────────────┤
│ • Code Authoring        │  Git Push /   │ • 24/7 AI Office Runtime  │
│ • Unit & Syntax Testing │  CI Artifact  │ • Multi-Agent Workers     │
│ • Local 3D R3F UI Build ├──────────────>│ • PostgreSQL / Neo4j / DB │
│ • Reviewing Commits     │               │ • Local Ollama Fallback   │
│ • Power Status: SHUTDOWN│               │ • Power Status: ALWAYS ON │
└─────────────────────────┘               └───────────────────────────┘
```

> **ACCEPTANCE TEST CRITERIA:**  
> When the developer shuts down or disconnects their laptop (`Laptop OFF`), the **AI Office** running on the Office Computer must continue operating 24/7 without interruption.
