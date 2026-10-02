# Playable Character & Chibi Movement System

## 1. Character Identity & Selection Flow
Upon entering the KDI AI OFFICE, users are greeted with the **Character Selection Screen** (`CharacterSelectScreen.tsx`):

```
       KDI AI OFFICE
             ↓
  CHOOSE YOUR CHIBI AVATAR
  (Jhony • Sofia • Arya • Maya)
             ↓
     Custom Name Input
             ↓
      ENTER 3D OFFICE
```

Selection state is stored persistently in browser `localStorage('kdi_game_character')`, allowing returning users to seamlessly enter the office or switch avatars anytime via `[🎮 Ganti Karakter]`.

---

## 2. Chibi Character Model Architecture
The 3D character (`ChibiCharacterModel.tsx`) is procedurally built from high-quality low-poly primitives to deliver indie-game quality aesthetics without requiring large GLTF downloads:

| Component | Geometry | Proportions | Visual Role |
| :--- | :--- | :--- | :--- |
| **Head** | Rounded Box / Sphere | `0.72m × 0.65m × 0.68m` | Expressive cute chibi proportion (1:1.6 body ratio) |
| **Hair Cap** | Beveled Sculpted Cap | `0.76m × 0.40m × 0.72m` | Stylized pastel hair contour (espresso, caramel, honey) |
| **Eyes** | Dual Glossy Pills | `0.06m × 0.10m × 0.03m` | Distinct anime-style expressive pupil eyes |
| **Cheeks** | Subtle Blush Disks | `0.10m × 0.05m` | Pastel coral blushing highlights |
| **Torso** | Tapered Capsule | `0.52m × 0.55m × 0.38m` | Pastel cardigan/hoodie/suit coloring |
| **Limbs** | Articulated Appendages | `0.14m × 0.40m` (Arms & Legs) | Pendular animation during walking & running |
| **Shadow** | Ground Decal Disk | `0.90m` radius, soft opacity | Grounding the avatar softly on any floor |

---

## 3. Movement & Controller Engine
The `PlayerController.ts` orchestrates physics, velocity, rotation, and animation state:

### 3.1 Input Mapping
* **Keyboard (WASD / Arrow Keys)**:
  * `W / Up`: Forward relative to camera orientation.
  * `S / Down`: Backward relative to camera orientation.
  * `A / Left`: Strafe left.
  * `D / Right`: Strafe right.
  * `Shift`: Sprint/Run mode (`speed = 7.5 m/s` vs walk `speed = 4.2 m/s`).
  * `E / Space`: Proximity interaction trigger.
* **Touch & Mobile Support**:
  * On-screen virtual joystick or tap-to-move vector translation.
  * Mobile contextual interaction button.

### 3.2 Rotation & Smooth Turning
Avatar turning uses spherical linear interpolation (`slerp` on quaternions) towards the movement direction vector, guaranteeing no instant snappy snapping.

### 3.3 Dynamic Animation State
* **IDLE**: Gentle vertical breathing cycle (`amplitude = 0.02m`, frequency 1.5Hz).
* **WALKING**: Pendular arm and leg swing (frequency 4.5Hz) with subtle body tilt in the movement direction.
* **RUNNING**: Enhanced stride frequency (7.0Hz) with dynamic head tilt.

---

## 4. Collision & World Boundaries
Collision prevention is enforced on the CPU before applying translation:
* **Perimeter Walls**: Floor-specific bounding box (`x ∈ [-14.5, 14.5]`, `z ∈ [-18.5, 27.5]` on Ground Floor).
* **Hard Props & Walls**: Partition walls, reception desk, server racks, and elevator shafts are defined in collision tables. Attempts to traverse solid geometry are deflected with velocity vector projection along the tangent.
* **Fall Prevention**: Character height `y` is clamped to the active floor elevation plane, preventing players from clipping through ceilings or falling into the void.
