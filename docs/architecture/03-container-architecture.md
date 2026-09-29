# Container Architecture (C4 Level 2): KDI AI Office

## 1. Overview & Execution Containers
This document details the **C4 Level 2 Container Architecture** of the **KDI AI Office**. It outlines the distinct containerized services, databases, runtimes, and their network communication boundaries across the Edge Cloud VPS and the Local Office Workstation.

---

## 2. Container Architecture Diagram (C4 Level 2)

```mermaid
C4Container
    title Container Architecture - KDI AI Office

    Person(user, "Developer / Operator", "Uses browser on Mobile or Desktop")

    System_Boundary(edge_vps, "Edge Cloud VPS (Hostinger / VPS Gateway)") {
        Container(web_ui, "3D Web Dashboard", "React 19, Three.js, R3F, Vite", "Provides 3D digital twin office, Kanban task board, diff review, and approval portal.")
        Container(vps_gateway, "Edge Reverse Proxy & Tunnel Server", "Nginx / Traefik & FRP/SSH Server", "Terminates HTTPS/WSS, verifies Edge JWT, forwards traffic through encrypted reverse tunnel.")
    }

    System_Boundary(local_pc, "Local Office Workstation (Primary Execution Host)") {
        Container(tunnel_client, "Tunnel Client", "FRP Client / Cloudflared / WireGuard", "Maintains persistent outbound encrypted tunnel to VPS Gateway.")
        Container(api_gateway, "Core API & Realtime Server", "FastAPI / Python 3.12 (or NestJS)", "Exposes REST endpoints, manages WebSocket event broadcasts, validates auth tokens.")
        
        Container(task_supervisor, "Task Supervisor & AI Manager", "Python / MetaGPT Orchestrator", "Decomposes tasks into subtasks, manages agent state machines, monitors execution.")
        
        Container(agent_pool, "Agent Worker Pool", "Celery / RQ / Python Workers", "Executes 14 specialized agent personas, loads skills, and requests tool executions.")
        
        Container(ai_router, "Dynamic AI Router Service", "Python LiteLLM / Custom Routing", "Manages model capabilities, cost estimation, quota enforcement, and fallback cascades.")
        
        Container(opencode_exec, "OpenCode Execution Engine", "OpenCode CLI / Node.js Sandbox", "Provides sandboxed git worktree operations, AST parsing, code editing, and diff creation.")

        ContainerDb(postgres, "Relational Database", "PostgreSQL 16", "Stores users, tasks, task runs, tool calls, audit logs, and provider metrics.")
        ContainerDb(redis, "In-Memory Broker & Cache", "Redis 7 (Alpine)", "Handles task queues, event streams, distributed mutex locks, and rate limits.")
        ContainerDb(neo4j, "Knowledge Graph Database", "Neo4j 5 Enterprise / Community", "Maintains AST dependencies, commit-task lineage, and GraphRAG knowledge topology.")
        
        Container(ollama, "Local Inference Engine", "Ollama Daemon", "Executes quantized local models (Qwen2.5-Coder, DeepSeek) on workstation CPU/GPU.")
    }

    System_Ext(gemini_api, "Google Gemini API", "Cloud Inference")
    System_Ext(groq_api, "Groq Cloud API", "Cloud Inference")
    System_Ext(openrouter_api, "OpenRouter API", "Cloud Inference")
    System_Ext(git_server, "Git Host (GitHub/GitLab)", "Version Control")

    Rel(user, web_ui, "Interacts with UI", "HTTPS")
    Rel(web_ui, vps_gateway, "API requests & live event stream", "HTTPS / WSS")
    Rel(vps_gateway, tunnel_client, "Multiplexed tunnel traffic", "mTLS Tunnel / Port 7000")
    Rel(tunnel_client, api_gateway, "Forwarded internal HTTP/WS", "HTTP / 127.0.0.1:8000")

    Rel(api_gateway, redis, "Publishes events & queues tasks", "Redis Protocol / 6379")
    Rel(api_gateway, postgres, "Reads/writes task state & audit", "TCP / 5432")

    Rel(task_supervisor, redis, "Listens for tasks & publishes state", "Redis Protocol")
    Rel(task_supervisor, postgres, "Updates task records", "TCP / 5432")
    Rel(task_supervisor, neo4j, "Queries & mutates task graph", "Bolt / 7687")

    Rel(agent_pool, task_supervisor, "Reports execution status & artifacts", "Redis Pub/Sub")
    Rel(agent_pool, opencode_exec, "Executes file edits & diffs", "Internal gRPC / IPC")
    Rel(agent_pool, ai_router, "Dispatches prompt requests", "HTTP / 127.0.0.1:8001")

    Rel(opencode_exec, git_server, "Pulls/pushes branch data", "SSH / Git")
    
    Rel(ai_router, ollama, "Local fallback & private inference", "HTTP / 11434")
    Rel(ai_router, gemini_api, "High-order planning & reasoning", "HTTPS / 443")
    Rel(ai_router, groq_api, "Low-latency streaming code/chat", "HTTPS / 443")
    Rel(ai_router, openrouter_api, "Specialist reasoning models", "HTTPS / 443")
```

---

## 3. Container Roles & Specifications

| Container ID | Container Name | Base Technology | Host Location | Memory / CPU Limits | Purpose |
|---|---|---|---|---|---|
| **C-01** | `kdi-web-ui` | React 19, Three.js, Nginx | Hostinger VPS / Edge | 512 MB / 0.5 CPU | Serves static 3D web dashboard assets. |
| **C-02** | `kdi-vps-gateway` | Nginx + FRP Server | Edge VPS | 1 GB / 1.0 CPU | Edge reverse proxy, SSL termination, and secure reverse tunnel endpoint. |
| **C-03** | `kdi-tunnel-client` | FRP Client / WireGuard | Local Office PC | 256 MB / 0.2 CPU | Outbound-initiated encrypted tunnel connection to Edge VPS. |
| **C-04** | `kdi-api-server` | FastAPI / Uvicorn | Local Office PC | 1 GB / 1.0 CPU | REST API gateway, WebSocket hub, and authentication validator. |
| **C-05** | `kdi-task-supervisor`| Python / MetaGPT | Local Office PC | 2 GB / 2.0 CPU | Task decomposition, state machine runner, and SOP coordinator. |
| **C-06** | `kdi-agent-workers` | Python / Celery / RQ | Local Office PC | 4 GB / 4.0 CPU (Max) | Specialist agent executor workers (scaled dynamically 1-4 workers). |
| **C-07** | `kdi-ai-router` | Python LiteLLM wrapper | Local Office PC | 512 MB / 1.0 CPU | Model capability routing, quota enforcement, and fallback cascade. |
| **C-08** | `kdi-opencode-engine`| Node.js 20 / OpenCode | Local Office PC | 2 GB / 2.0 CPU | Isolated repository sandboxes, AST parsing, and git diff generators. |
| **C-09** | `kdi-postgres` | PostgreSQL 16 (Alpine) | Local Office PC | 2 GB / 2.0 CPU | Relational persistence, audit logs, user sessions, and task runs. |
| **C-10** | `kdi-redis` | Redis 7 (Alpine) | Local Office PC | 1 GB / 1.0 CPU | Event streaming, task priority queues, and distributed mutex locks. |
| **C-11** | `kdi-neo4j` | Neo4j 5.20+ Enterprise | Local Office PC | 3 GB / 2.0 CPU | Code knowledge graph, task lineage, and GraphRAG vector indexing. |
| **C-12** | `kdi-ollama` | Ollama Daemon | Local Office PC | Dynamic (4-8 GB RAM)| Local quantized LLM inference for privacy-sensitive and offline tasks. |
