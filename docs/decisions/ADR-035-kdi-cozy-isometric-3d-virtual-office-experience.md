# ADR-035: KDI Cozy Isometric 3D Virtual Office Experience

## Status
Accepted

## Context
KDI is an autonomous AI software office and engineering organization. Earlier iterations presented technical dashboards, complex analytics charts, and architectural wireframes that felt like raw programmer tools rather than an inviting, understandable software company headquarters.

User testing and reference analysis of modern web gaming experiences (e.g. `kantor.iniwebsitemu.com`) revealed that a cozy, warm, low-poly isometric virtual world with chibi avatars dramatically enhances visitor engagement, makes AI agents approachable, and allows potential clients to naturally explore portfolios and consult on custom software development.

## Decision
**KDI uses a cozy isometric 3D game-like virtual office as its primary frontend experience.**

1. **Visual Direction**:
   - Cozy, pastel-colored low-poly 3D world with soft shadows and warm interior lighting.
   - Top-down isometric camera with a narrow field of view (`fov = 32°`).
   - Chibi-proportioned avatars with expressive facial features, blush highlights, and smooth pendular walk animations.
   - Distinct architectural zones: Front Yard, Gerobak Kopi Mang Ujang, Reception Lobby with glowing soft neon sign "Koneksi Digital Inovasi", Sales Pod with Sinta Account Manager, Executive CEO Room, Floor 2 Creative Studio & Sleep Capsules, and Rooftop Fire Pit Lounge with warm fairy lights.
2. **Framework & Engine**:
   - Retain PlayCanvas React (`@playcanvas/react`, `playcanvas`) on React 18, Vite 6, and TypeScript 5.7.
   - Maintain strict separation: PlayCanvas renders the 3D spatial world; React overlays contextual dialogues, portfolios, and management modals.
3. **No Clutter & No Permanent Dashboards**:
   - The 3D canvas spans 100% of the viewport.
   - Permanent sidebars, dense analytics grids, and raw status tables are strictly banished from the default viewport.
   - All management tools, portfolios, and dialogues are accessed contextually via in-world spatial proximity (`[E]`) or non-intrusive HUD shortcuts.

## Consequences
### Positive
- Exceptional first-impression aesthetics ("wow factor") with game-asset polish.
- Visitors instantly perceive KDI as a living, modern software company.
- Zero feature regression: all backend agents, runtime schedulers, GraphRAG memories, and WebSocket telemetry feeds remain 100% active and connected.

### Negative
- Requires maintaining dual procedural geometry and texture shaders for WebGL performance.
- Mobile devices require responsive touch-joystick and simplified camera damping.
