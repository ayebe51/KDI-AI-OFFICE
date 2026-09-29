# KDI AI Office

> **Living Virtual Office + Autonomous Multi-Agent Software Development Platform**

## 1. Project Overview
KDI AI Office is an autonomous multi-agent software engineering office operating on an enterprise workstation as a digital twin. It transforms an AI workforce into an interactive 3D virtual office while executing production-grade software engineering, testing, review, and deployment pipelines.

## 2. Monorepo Architecture
```text
kdi-ai-office/
├── apps/
│   └── web/                   # React 19 + Three.js + R3F 3D Living Office Frontend
├── services/
│   └── api/                   # NestJS Core API, WebSockets & Agent Runtime Backend
├── packages/
│   ├── types/                 # Shared TypeScript Type Definitions
│   ├── config/                # Environment schemas, rules & configuration constants
│   └── shared/                # Cross-subsystem utilities & logging interfaces
├── infrastructure/
│   ├── docker/                # Multi-stage production Dockerfiles & Nginx configs
│   ├── compose/               # Docker Compose files (Development & Production)
│   ├── env/                   # Environment variable blueprints (.env.production.example)
│   └── scripts/               # Host setup, deployment, health-checks & rollback scripts
└── docs/                      # Authoritative Phase 0 & Phase 0 Addendum Specifications
```

## 3. Environment Strategy: Laptop vs. Office Computer
- **Development Environment (Laptop):** Used for coding, testing, running Antigravity IDE, local development, and 3D preview.
- **Production Target (Office Computer):** 24/7 autonomous sovereign host executing NestJS, PostgreSQL 16, Redis 7, Neo4j 5, and local quantized Ollama CPU models.
- **Public Frontend (Hostinger):** Static build of `apps/web` hosted on web server, communicating with the Office Computer through a secure outbound TLS reverse tunnel.

## 4. Quick Start (Development)
```bash
# 1. Install dependencies across all monorepo workspaces
npm install

# 2. Validate production configuration blueprint
npm run validate:prod

# 3. Run typecheck and tests
npm run typecheck
npm run test

# 4. Start local development API
npm run dev:api

# 5. Start local frontend development server
npm run dev:web
```
