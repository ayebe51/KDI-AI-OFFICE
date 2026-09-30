# Server Room & Infrastructure Observability

## 1. 10 Active Infrastructure Server Racks
The 3D Server Room directly maps to KDI's actual running backend infrastructure:

1. **`srv-postgres`**: PostgreSQL 16 Transactional Storage
2. **`srv-redis`**: Redis 7 Cache & Queue Transport
3. **`srv-neo4j`**: Neo4j 5.20+ Community Graph Memory & GraphRAG
4. **`srv-ollama`**: Ollama Local Sovereign LLM Runtime
5. **`srv-ai-router`**: Multi-Provider Dynamic AI Router
6. **`srv-metagpt`**: MetaGPT SOP Role Coordinator
7. **`srv-antigravity`**: Antigravity AST Patch & Verification Engine
8. **`srv-workers`**: Autonomous Task Worker Pool
9. **`srv-websocket`**: Real-Time Telemetry Event Gateway
10. **`srv-api`**: NestJS Core REST Gateway

## 2. Dynamic Realtime LED Mapping
The rack cabinet status pilot lights reflect live health checks:
- **`ONLINE` / `UP`:** Solid emerald green (`#10b981`)
- **`DEGRADED`:** Amber warning pulse (`#f59e0b`) with latency display
- **`OFFLINE` / `ERROR`:** Red alert strobe (`#ef4444`) with system alert broadcast
