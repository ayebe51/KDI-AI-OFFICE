# ADR-031: KDI Production Reliability Model

## Status
Accepted (Phase 10 — Production Hardening)

## Context
KDI AI Office has unified an autonomous multi-agent engineering platform across NestJS API, PostgreSQL, Redis, Neo4j, Ollama, Antigravity, and PlayCanvas 3D Virtual Office. To run 24/7 autonomously on canonical physical office hardware (Windows 11 host with Intel Core i5-1334U and 16GB RAM), the system requires deterministic service management, bounded resource governance, crash loop protection, graceful shutdown, and worker orphan recovery.

## Decision
1. **Canonical Host Authority**: The Office Computer is the sole canonical AI execution environment. Public ingress is mediated via Hostinger frontend and an encrypted reverse-proxy tunnel (Cloudflare/FRP) to `127.0.0.1:3000`. Direct external access to database ports (5432, 6379, 7687) is strictly forbidden.
2. **Deterministic Startup Order**: Services initialize strictly based on dependency topological order:
   - Infrastructure & Databases (PostgreSQL -> Redis -> Neo4j)
   - Core API & AI Router
   - Worker Runtime & Antigravity Sandbox
   - Autonomy Engine & WebSocket Gateway
3. **Crash Loop Protection**: Unchecked aggressive restarts are prohibited. Service failures transition through:
   `NORMAL` -> `FAILING` -> `BACKOFF` -> `CRASH_LOOP` -> `ESCALATED`
   Backoff employs exponential scaling with random jitter up to 30s. Exceeding 5 failures pauses automatic restarts and escalates to Incident Management.
4. **Graceful Draining & Worker Recovery**: SIGTERM/SIGINT signals initiate an ordered drain: incoming work is paused, in-flight tasks finish safe steps or requeue, database connection pools close cleanly, and WebSocket clients are notified. Active workers emit heartbeats every 10s; heartbeats missing > 30s trigger orphan task recovery.
5. **Idempotency Everywhere**: All mutating retries, event replays, notifications, graph syncs, and financial ledger writes require an `idempotency_key` backed by cryptographic hashing.

## Consequences
- **Positive**: Zero resource exhaustion caused by uncontrolled restart loops; zero lost tasks when worker processes terminate unexpectedly; predictable startup and shutdown sequences.
- **Negative**: Services take a few seconds to boot in strict topological order; temporary failures incur progressive backoff delays.
