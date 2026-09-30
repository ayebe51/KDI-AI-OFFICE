# Living Virtual Office Architecture

## 1. Overview
The **KDI AI Office Living Virtual Office** is an interactive, browser-based 3D digital twin of KDI's autonomous software engineering operations. It provides operators and public visitors with real-time visual insight into multi-agent collaborations, task workflows, system health, and delivered portfolio items.

## 2. Architectural Blueprint
```text
                         HOSTINGER
                    Public Web Frontend
                           │
                   React + PlayCanvas
                           │
                     HTTPS / WSS
                           │
                           ▼
                SECURE BACKEND GATEWAY
                           │
                ┌──────────┴──────────┐
                │                     │
            REST API              WebSocket
                │                     │
                └──────────┬──────────┘
                           │
                    KDI AI SERVER
                    Office Computer
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
Agent Runtime         AI Manager            Graph/DB
      │                                         │
      └────────────── Runtime Events ───────────┘
```

## 3. Core Architectural Components
1. **Hostinger Public Frontend:**
   - Serves static assets, Vite bundle, React UI application, and PlayCanvas WebGL runtime.
   - Communicates securely over HTTPS/WSS with the backend gateway.
   - Enforces zero-trust isolation: never receives database passwords, SSH keys, or raw confidential prompts.
2. **Secure Backend Gateway:**
   - Terminating gateway for REST endpoints (`/office/snapshot`, `/office/rooms`, `/office/agents`, etc.) and WebSocket telemetry (`/ws/v1/events`).
   - Sanitizes internal metrics, secret environment variables, and private repository diffs before broadcasting to public clients.
3. **Office Computer (Primary KDI AI Server):**
   - The authoritative operational source of truth.
   - Hosts PostgreSQL 16 (transactional data), Redis 7 (queue & event bus), Neo4j 5.20+ (Graph Memory & GraphRAG), and Ollama (local sovereign inference).
   - Runs `AgentRuntime`, `AIManager`, and Antigravity engineering execution engines.
4. **OfficeWorldStore (Frontend Store):**
   - Centralized state container holding rooms, digital employee agents, active meetings, server nodes, and office time.
   - Applies authoritative snapshots and incremental WebSocket event streams.
   - Automatically rejects out-of-order frames (`entityVersion`) and duplicate event IDs.
5. **PlayCanvas React Canvas Engine:**
   - Declarative 3D scene composition using `<Application>`, `<Entity>`, `<Camera>`, `<Render>`, and `@playcanvas/react/hooks`.
   - Procedural agent animation, waypoint pathfinding, and dynamic camera control.
   - Low-latency integrated GPU performance (> 60 FPS).
