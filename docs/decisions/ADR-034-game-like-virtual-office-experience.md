# ADR-034: Game-Like Virtual Office 3D Experience

**Status**: Accepted  
**Date**: 2026-09-30  
**Deciders**: KDI Engineering  
**Supersedes**: None (extends ADR-009, ADR-015, ADR-021, ADR-022)

---

## Context

KDI AI Office has a rich backend system: AI agent runtime, GraphRAG, MetaGPT, WebSocket realtime, task orchestration, portfolio, workforce valuation, and more. The 3D frontend previously presented this as a "3D Digital Twin" proof-of-concept with a static camera orbit and click-to-inspect interaction model.

User feedback and competitive analysis (ref: `kantor.iniwebsitemu.com`) indicate that a **game-like explorable virtual office** creates significantly higher engagement and communicates the value of having a "living AI team" more intuitively than a dashboard with a 3D decorative layer.

---

## Decision

**KDI AI Office will present its 3D frontend as an explorable virtual office game experience, while keeping all existing backend architecture, API contracts, and features completely intact.**

The 3D experience layer is a **presentation rework only**. No backend regression is introduced.

---

## What Changed (Frontend Only)

### New Components

| File | Purpose |
|------|---------|
| `3d/character/CharacterTypes.ts` | `PlayableCharacter` model, `PLAYABLE_CHARACTERS` roster |
| `3d/character/PlayerController.ts` | WASD movement, camera-relative direction, world bounds |
| `3d/character/PlayerAvatar.tsx` | PlayCanvas 3D player entity with bob animation |
| `3d/camera/ThirdPersonCamera.tsx` | Follow camera, mouse/touch orbit, scroll zoom |
| `3d/interaction/ProximityDetector.ts` | Radius-based NPC/object detection |
| `3d/core/GameOfficeApp.tsx` | Main game orchestrator (replaces old 3D tab view) |
| `components/game/CharacterSelectScreen.tsx` | Game-like character selection entry point |
| `components/game/GameHUD.tsx` | Minimal game HUD (interaction prompt, controls hint) |
| `components/game/GameConversationUI.tsx` | Dialog panel connecting to KDI `/agents/:id/chat` |

### Modified

| File | Change |
|------|--------|
| `App.tsx` | 3D tab now routes through CharacterSelectScreen → GameOfficeApp |
| `3d/index.ts` | New exports added |

### Preserved Intact

- All backend APIs
- WebSocket / OfficeWorldStore realtime system
- Authentication / Authorization
- All modal overlays (Agent, Project, Server, Whiteboard, Prayer)
- Office2DFallback accessibility mode
- All room components (OfficeScene, 14 rooms)
- NPC AgentAvatar (still backend-driven positions and states)
- Portfolio, Workforce, Dashboard, Runtime, Engineering, Graph tabs

---

## Architecture Diagram

```
BROWSER
  │
  ├─ App.tsx (React shell, auth, WS lifecycle)
  │    │
  │    └─ [3D tab]
  │         │
  │         ├─ CharacterSelectScreen (entry point)
  │         │
  │         └─ GameOfficeApp
  │              │
  │              ├─ Application (PlayCanvas)
  │              │    ├─ ThirdPersonCamera (follow)
  │              │    ├─ OfficeLighting
  │              │    ├─ PlayerAvatar (WASD-driven)
  │              │    └─ OfficeScene (14 rooms + AgentAvatars)
  │              │
  │              ├─ GameHUD (minimal overlay)
  │              ├─ GameConversationUI → KDI API /agents/:id/chat
  │              └─ [Existing modals: Agent, Project, Server, Whiteboard, Prayer]
  │
  └─ OfficeWorldStore ← WebSocket ← KDI Backend
```

---

## Consequences

### Positive
- 3D experience feels like exploring a virtual office, not using a dashboard
- Character selection creates clear player agency and identity
- WASD movement + third-person camera is industry-standard game feel
- Proximity-based interaction is more natural than click-to-select
- Conversation UI matches game dialog conventions
- All existing backend features preserved and accessible

### Negative / Accepted Risks
- PlayCanvas `@playcanvas/react` does not natively support character controller physics; WASD movement uses pure JS with world-bound clamping (no physics-based collision detection beyond bounds)
- Conversation fallback (when `/agents/:id/chat` is unavailable) uses local reply templates — this is acceptable for offline/dev scenarios
- No skeletal animation system (PlayCanvas procedural animation only via `useAppEvent`); full GLTF character rigs are a future phase upgrade

---

## Future Phases

- GLTF/GLB character models with skeleton animation (walk, run, idle, talk)
- AI-narrated room tour for first-time visitors
- Minimap (conditional on actual playtesting showing navigation difficulty)
- Click-to-move as alternative to WASD
- Character customization (skin color, accessories)
