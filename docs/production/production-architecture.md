# Production Architecture — KDI AI Office

## 1. Physical & Deployment Topology
The canonical runtime for KDI AI Office is the physical Office Computer. Public client requests are ingested through Hostinger and securely proxied via an encrypted tunnel to the local runtime.

```text
INTERNET
   │
   ▼
Hostinger / Public Frontend (React + Vite)
   │
   ▼
Encrypted Reverse Proxy Tunnel (Cloudflare / FRP)
   │
   ▼
Office Computer (Canonical Runtime Host: Windows 11, Intel Core i5, 16GB RAM)
   ├── KDI Core API (NestJS :3000)
   ├── WebSocket Digital Twin Gateway (:3000)
   ├── Autonomous Operations Engine & Human Command Center
   ├── Multi-Agent Runtime & Task Scheduler (3 Autonomous Worker Slots)
   ├── MetaGPT Roleplay Orchestrator
   ├── Antigravity Engineering Execution Sandbox
   ├── Dynamic AI Router (Ollama + Gemini + Groq + OpenRouter)
   ├── PostgreSQL 16 Relational Database (:5432 - Internal Only)
   ├── Redis 7 Event Queue & In-Memory Broker (:6379 - Internal Only)
   └── Neo4j 5.20 Graph Database (:7687 / :7474 - Internal Only)
```

## 2. Network Isolation & Binding Policy
- **Public Surface**: Zero database or internal service ports are bound to public WAN interfaces (`0.0.0.0`).
- **Internal Loopback**: PostgreSQL, Redis, and Neo4j bind exclusively to `127.0.0.1` or the private Docker bridge network (`172.30.0.0/16`).
- **Secure Ingress**: External web traffic reaches the API exclusively through TLS-encrypted tunnels.

## 3. Storage Architecture
- **Drive C: (Windows System Drive)**: Restricted headroom (~5.4 GB free). Dedicated exclusively to core operating system processes.
- **Drive D: (Data & Backup Vault)**: High capacity (~250 GB free). Designated as the mandatory primary location for PostgreSQL data volumes, Neo4j transaction logs, encrypted backups (`D:\kdi-backups`), and offsite staging (`D:\kdi-offsite-vault`).
