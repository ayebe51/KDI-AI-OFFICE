# ADR-021: PlayCanvas React as KDI Living Office Runtime

## Status
**APPROVED** (Phase 6 Canonical Decision)

## Context
Following the successful initial technical spike in Phase 1 Correction, Phase 6 requires scaling from a single workstation proof-of-concept to a full Living Virtual Office comprising 14 modular architectural rooms, multiple concurrently active digital employee avatars, real-time deterministic pathfinding, dynamic camera systems, interactive whiteboard, Islamic prayer sanctuary, and server infrastructure monitoring.

A critical architectural mandate was established:
- Canonical frontend stack: **React, TypeScript, Vite, `@playcanvas/react`, `playcanvas`**.
- Strictly prohibit replacing PlayCanvas React with React Three Fiber (R3F) or Three.js.
- Ensure compatibility with integrated laptop graphics without requiring dedicated GPUs.

## Decision
1. **PlayCanvas React (`@playcanvas/react`) & PlayCanvas Engine (`playcanvas`)** are established as the permanent canonical 3D rendering runtime for the KDI AI Living Virtual Office.
2. Architecture separation:
   - **Backend (Office Computer):** Authoritative source of truth for all operational states, task assignments, activity states, room layouts, and infrastructure health.
   - **WebSocket (`/ws/v1/events`):** Real-time telemetry transport streaming normalized `office.*` events.
   - **OfficeWorldStore:** Frontend authoritative state store maintaining rooms, agents, meetings, server nodes, version sequencing, and deduplication.
   - **React UI Shell:** Application navigation, modals, HUD overlays, high-contrast accessibility fallback, and interactive inspectors.
   - **PlayCanvas React (`<Application />`, `<Entity />`, `<Camera />`, `<Render />`): High-efficiency declarative WebGL 2.0 rendering layer.

## Architectural Flow
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

## Consequences
- **Positive:**
  - Lightweight memory usage (< 120 MB JS Heap) and fast initial bundle loading.
  - Native procedural animations with zero garbage collection overhead.
  - Integrated graphics compatibility achieving stable 60 FPS frame time budgets (< 16.6ms).
  - High-contrast 2D fallback mode ensures universal accessibility across all client devices.
- **Negative:**
  - Requires maintaining PlayCanvas entity component hierarchies rather than standard DOM elements for 3D objects.
