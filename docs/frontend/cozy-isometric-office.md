# Cozy Isometric 3D Office: Implementation Architecture

## 1. System Overview
The **KDI Cozy Isometric 3D Office** is the central playable headquarters of PT Koneksi Digital Inovasi. Built using `@playcanvas/react` and `playcanvas` engine within a React 18 / Vite 6 / TypeScript 5.7 runtime, it merges WebGL 3D game exploration with an enterprise AI engineering platform.

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Browser Viewport                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                  PlayCanvas 3D Canvas                   │ │
│ │  ┌───────────────┐  ┌────────────────┐  ┌────────────┐  │ │
│ │  │ Ground Floor  │  │ Floor 2 Open   │  │  Rooftop   │  │ │
│ │  │ Yard + Lobby  │  │ Studio+Capsule │  │ Lounge+Fire │  │ │
│ │  └───────▲───────┘  └───────▲────────┘  └─────▲──────┘  │ │
│ │          │                  │                 │         │ │
│ │          └──────────────────┼─────────────────┘         │ │
│ │                      Lift System                        │ │
│ └─────────────────────────────┼───────────────────────────┘ │
│ ┌─────────────────────────────▼───────────────────────────┐ │
│ │             CozyGameHUD & Contextual React Modals       │ │
│ │  [E] Prompt • Floor Switcher • Dialogue • Portfolio     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. World Hierarchy & Zone Layout

### 2.1 Ground Floor (`GROUND`)
1. **Front Yard & Parking**:
   - Paved stone entrance walkway flanked by low-poly blossom trees and pastel planters.
   - Designated parking bays with parked electric vehicle and commuter scooters.
   - **Kopi Corner Pak Joko**: Signature welcoming cafe kiosk with striped awning, boiling kettle, warm lantern, and Pak Joko NPC.
2. **Reception Lobby**:
   - Central curved reception desk in light warm oak with office host Citra.
   - **"Koneksi Digital Inovasi" Soft Neon Sign**: Illuminated glowing typographic signage mounted above the reception backdrop.
   - Interactive Portfolio Kiosk allowing visitors to explore live client websites.
   - Vertical Lift foyer connecting Ground, Floor 2, and Rooftop.
3. **Sales & Client Engagement Pod**:
   - 3 modular sales workstations with ergonomic chairs and monitors.
   - Sales KPI dashboard billboard.
   - **Naya Account Manager NPC** offering lead recording, consultation, and WhatsApp quotation.
4. **Executive CEO Office**:
   - Executive oak desk, high-back leather chair, dual monitors, award trophies, and meeting bookshelf.
   - CEO Terminal providing direct access to Command Center, Scraper, Templates, and Financial Benchmarks.
5. **Preserved Core Zones**:
   - Engineering Floor (5 active AI developer stations).
   - Systems Architecture Lab & Research Pod.
   - Server Room with live telemetry LED indicators.
   - Musholla (prayer sanctuary with mihrab, sajadah, wudu portal).
   - Pantry & Coffee break bar.

### 2.2 Floor 2 Open Space (`FLOOR_2`)
1. **Creative & Content Pod**: Shared collaborative bench for copywriting, creative assets, and video scripting.
2. **Finance & Accounting Desk**: Compact office suite with filing cabinets, ledger monitors, and calculator props.
3. **Sleep Capsules**: 2 futuristic, cozy sleeping pods with warm interior amber backlighting for recharging.
4. **Creative Studio**: High-end production studio featuring green/white backdrop, tripod studio camera, softbox lights, and boom microphone with Alya NPC.
5. **Floor 2 Lift Landing**: Direct elevator access point.

### 2.3 Rooftop Garden & Lounge (`ROOFTOP`)
1. **Rooftop Bar**: Teak bar counter with barstools, bottles, and lounge host Danang.
2. **Fire Pit Lounge**: Circular stone fire pit with animated warm glowing embers, encircled by pastel bean bags (sage, blush, linen).
3. **Pergola & Fairy Lights**: Wooden lattice pergola woven with warm glowing fairy lights creating a relaxed twilight ambience.
4. **Panoramic City Backdrop**: Low-poly horizon silhouette giving vertical depth to the open-air retreat.

---

## 3. Spatial Interaction Flow
* Proximity detection runs every tick via `ProximityDetector.ts`, testing Euclidean distance to interactables (threshold: `3.6m`).
* When the player presses `[E]` (or taps the HUD prompt on mobile), the corresponding React contextual modal mounts over the scene.
* The 3D engine pauses player movement while a modal is open to ensure seamless interaction without accidental camera drift.
