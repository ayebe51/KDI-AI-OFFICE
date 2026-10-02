# NPC System: AI Workforce as Living In-World Entities

## 1. Core Principle & Architectural Boundary
In KDI AI OFFICE, NPCs are not decorative static dummies, nor are they fake randomized simulations. They are **direct spatial manifestations of actual backend AI agents**:

```
┌─────────────────────────────────────────────────────────────┐
│                       KDI BACKEND                           │
│  Agent Runtime • Task System • Neo4j • Redis Pub/Sub        │
└──────────────────────────────┬──────────────────────────────┘
                               │ WebSocket Envelope
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    OFFICE WORLD STORE                       │
│  Synchronized agent states: IDLE, WORKING, MEETING, THINKING│
└──────────────────────────────┬──────────────────────────────┘
                               │ Spatial Dispatch
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      3D OFFICE NPCS                         │
│  Physical Desks • Live Activities • Dialogue Consoles       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Catalog & In-World Spatial Anchors

| Agent / NPC | Role | Room / Spatial Zone | In-World Visual Anchor | Backend ID |
| :--- | :--- | :--- | :--- | :--- |
| **Naya** | Account Manager | Sales Pod (Ground Floor) | Sales Desk 1 with KPI Billboard | `AGT-SALES-001` |
| **Citra** | Office Host & Receptionist | Main Lobby (Ground Floor) | Curved Oak Reception Counter | `AGT-RECEPT-001` |
| **Farhan** | Lead AI Software Engineer | Engineering Floor (Ground Floor) | Developer Pod 1 | `AGT-ENG-001` |
| **Dr. Zahra** | AI Research Scientist | AI Research Lab (Ground Floor) | GraphRAG Research Console | `AGT-RES-001` |
| **Alya** | Creative & Content Strategist | Creative Studio (Floor 2) | Media & Studio Station | `AGT-MKT-001` |
| **Pak Joko** | Cafe & Hospitality Host | Front Yard (Ground Floor) | Kopi Corner Pak Joko Kiosk | `NPC-FOOD-001` |
| **Danang** | Rooftop Lounge Host | Rooftop Garden | Rooftop Teak Bar Counter | `NPC-BAR-001` |

---

## 3. Strict Rule: No Random Business Simulation
* **Prohibited Behavior**: The frontend **never** generates random fictitious meetings, fake code commits, synthetic client deals, or hallucinated system incidents.
* **Permitted Ambient Behavior**: When an agent's backend status is `IDLE`, they may execute subtle ambient idle breathing, slight neck turns, or typing animations at their assigned desk.
* **State Synchronization**: When a real task is dispatched from the Task Queue or Antigravity runtime, the backend emits `agent.status.changed`. The agent immediately transitions visually to `WORKING` or `MEETING`, updates their speech overhead indicator, and directs their gaze to the relevant task terminal.

---

## 4. NPC Interaction Matrix
When the player approaches any NPC within 3.6m:
1. An ambient overhead nameplate with their official KDI role glows softly.
2. The HUD displays `[E] Bicara dengan {Name}`.
3. Triggering interaction opens the specialized conversation modal:
   - **Naya**: Custom account management interface with 4 business actions.
   - **AI Engineers & Scientists**: GraphRAG-powered conversational dialogue or technical inspection.
   - **Hospitality NPCs (Pak Joko / Danang)**: Warm cozy dialogue and amenity menus.
