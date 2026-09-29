# ADR-015: PlayCanvas React & PlayCanvas Engine for 3D Digital Twin

## Status
**APPROVED** (Phase 1 Correction)

## Context
In early Phase 0 documentation, React Three Fiber (R3F) and Three.js were referenced as a candidate 3D rendering stack. However, evaluation during Phase 0.5 Architecture Gate and Phase 1 Foundation demonstrated that PlayCanvas Engine (`playcanvas`) paired with its official declarative React wrapper (`@playcanvas/react`) provides substantial technical advantages for the Living Virtual Office Digital Twin:
1. Enterprise web performance with lower memory footprint and superior WebGL/WebGPU pipeline optimization.
2. Built-in, high-efficiency entity-component-system (ECS) mapping naturally to declarative React component trees.
3. Native handling of complex architectural scenes, materials, lighting, GLTF/GLB models, and responsive resize lifecycle without memory leaks.
4. Smooth interoperability with standard React overlays (HUD), event dispatchers, and external state management.

## Options Considered
1. **Three.js + React Three Fiber (R3F):** Flexible but heavier memory overhead, inconsistent React 19/18 peer dependency resolution, and greater boilerplate for complex material and scene management.
2. **Babylon.js + react-babylonjs:** Feature-rich but larger initial bundle size and less intuitive React-ECS ergonomics.
3. **PlayCanvas React (`@playcanvas/react` + `playcanvas`):** Standard web-first game and visualization engine, lightweight (< 600 kB gzip full engine), native GLTF/GLB asset streaming, declarative React bindings, and official AI coding agent skills support.

## Decision
Adopt **PlayCanvas React (`@playcanvas/react`)** and **PlayCanvas Engine (`playcanvas`)** as the official, canonical 3D rendering foundation for the KDI AI Office 3D Digital Twin.

Architectural flow:
```text
React Application Shell
       │
       ▼
PlayCanvas React (<Application />)
       │
       ▼
PlayCanvas Engine
       │
       ▼
3D Office Scene (Lighting, Camera, Floor, Desk)
       │
       ▼
Agent Entity (ENGINEER-001)
       │
       ▼
Animation / Pointer Interaction
       │
       ▲
Agent3DStateAdapter (Normalized Visual State)
       ▲
       │
WebSocket Client (Telemetry Stream)
       ▲
       │
Backend Realtime Service (agent.status.changed)
```

## Rationale
- Declarative scene composition (`<Application>`, `<Entity>`, `<Camera>`, `<Light>`, `<Render>`) aligns seamlessly with existing React frontend architecture.
- Full mobile and desktop responsiveness without requiring heavy custom resize event listeners.
- Deterministic state adapter (`Agent3DStateAdapter`) decouples backend engineering states (`AgentState`) from 3D visual manifestations (`VisualStateConfig`), ensuring zero fake timer loops.
- Clear public vs. private data boundary: the 3D entity layer only receives sanitized view models (`SelectedAgentDetail`), completely isolating internal secrets, git diffs, and private credentials.

## Consequences
- **Positive:**
  - Fast bundle loading and initial scene mount.
  - Native WebGL 2.0 rendering with graceful 2D fallback for unsupported client environments.
  - High frame rates (>= 60 FPS) with low memory usage.
  - Full TypeScript typing across all components.
- **Negative:**
  - Transition from R3F patterns requires using `@playcanvas/react` hooks (`useMaterial`, `useAppEvent`) and PlayCanvas component primitives.
