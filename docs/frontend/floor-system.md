# Multi-Floor Navigation & Elevator Transition System

## 1. Multi-Floor Architecture
The KDI AI OFFICE is structured as a 3-tier vertical building defined through typed floor metadata (`WorldDefinitions.ts`):

```typescript
export type FloorId = 'GROUND' | 'FLOOR_2' | 'ROOFTOP';

export interface FloorMeta {
  id: FloorId;
  name: string;
  floorNumber: number;
  shortLabel: string;
  description: string;
  spawnPoint: { x: number; y: number; z: number };
  ambientColor: string;
}
```

---

## 2. Floor Inventory & Atmosphere

| Floor ID | Number | Title | Atmosphere & Key Props | Spawn Coordinate |
| :--- | :--- | :--- | :--- | :--- |
| `GROUND` | 1 | Ground Floor: Lobby, Sales & Labs | Busy day-lit corporate lobby, neon sign, Naya sales pod, server room, and front yard food cart. | `[0.0, 0.0, 24.0]` |
| `FLOOR_2` | 2 | Floor 2: Open Space & Studio | Creative studio with softbox lights, social media desks, finance office, and glowing sleep capsules. | `[7.5, 0.0, 11.0]` |
| `ROOFTOP` | 3 | Rooftop Garden & Lounge | Evening twilight ambience, warm fairy lights, circular stone fire pit, teak bar, and pastel bean bags. | `[7.5, 0.0, 8.0]` |

---

## 3. Elevator Lift Mechanics (`ElevatorModal.tsx` & `LiftEntity.tsx`)

### 3.1 3D Elevator Entity
Each floor features a consistent 3D elevator portal:
* Brushed warm metal door frame with soft floor level indicator display.
* Indicator screen displaying active floor number.
* Interactive proximity zone (`[E] Naik/Turun Lift`).

### 3.2 Smooth Floor Transition Sequence
To eliminate instant jarring teleportation:
1. **Trigger**: Player approaches lift and presses `[E]` (or selects floor from the HUD quick switcher).
2. **Floor Selection**: `ElevatorModal.tsx` presents the cozy floor directory with preview descriptions.
3. **Chime & Door Animation**: Selecting a destination triggers a gentle audio elevator chime and a brief 450ms visual fade effect.
4. **Spatial Re-anchoring**:
   - The scene unmounts inactive floor geometries.
   - The active floor scene mounts seamlessly.
   - Player avatar position $\vec{P}$ is placed at the landing coordinate outside the elevator doors.
   - The camera smoothly re-centers with damped damping.
   - Proximity detectors and HUD location labels update instantaneously.
