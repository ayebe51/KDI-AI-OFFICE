# Isometric Camera System: Architecture & Controls

## 1. Camera Projection & Angle Philosophy
The camera system (`CozyIsometricCamera.tsx`) delivers an authentic **cozy isometric perspective**:
* **Narrow Field of View (FOV)**: Set to `32.0°` (approximating true orthographic projection while retaining subtle perspective depth).
* **Isometric Azimuth (Yaw)**: Default `135.0°` (viewing the office diagonally from the Southeast corner).
* **Isometric Pitch**: Default `35.0°` (elevated top-down angle, balancing floor plan readability with vertical wall art and avatar facial expressions).
* **Distance**: Default `22.0m` from the target focal point.

---

## 2. Mathematical Coordinate Formulation
The 3D camera position $\vec{C}$ relative to the focal point $\vec{T} = [x_t, y_t, z_t]$ is computed via spherical coordinates:

$$\begin{aligned}
\theta &= \text{yaw} \times \frac{\pi}{180} \\
\phi &= \text{pitch} \times \frac{\pi}{180} \\
C_x &= T_x + D \cdot \cos(\phi) \cdot \sin(\theta) \\
C_y &= T_y + D \cdot \sin(\phi) \\
C_z &= T_z + D \cdot \cos(\phi) \cdot \cos(\theta)
\end{aligned}$$

Where:
* $D$ is the current camera distance (`12.0m` to `36.0m`).
* $\vec{T}$ tracks either the **Player Avatar**, a **Followed Agent**, or the **Floor Center** in Overview Mode.

---

## 3. Smooth Damping (Lerp Engine)
To prevent disorienting camera snapping during fast movement or teleportation:
* **Focal Point Lerp**: $\vec{T}_{\text{curr}} = \text{lerp}(\vec{T}_{\text{curr}}, \vec{T}_{\text{target}}, 0.08)$
* **Yaw & Pitch Smoothing**: Rotational inputs use critically damped springs to deliver soft, game-like drag responsiveness without jitter.

---

## 4. Interaction & Controls

### 4.1 Mouse & Desktop
* **Right-Click Drag**: Freely orbit camera yaw (`0°` to `360°`) and pitch (clamped between `15.0°` and `60.0°`).
* **Mouse Scroll Wheel**: Smoothly adjust zoom distance between `12.0m` (close-up portrait inspection) and `28.0m` (wide room framing).

### 4.2 Touch & Mobile
* **Two-Finger Drag**: Orbit viewing angles.
* **Pinch-to-Zoom**: Dynamically scale camera distance with touch separation distance.

---

## 5. Specialized Camera Modes

### 5.1 Owner Overview Mode
Activated via the HUD or Owner Control Panel:
* Pitch transitions to `55.0°` (tactical top-down bird's-eye view).
* Distance zooms out to `36.0m`.
* Focus shifts to the architectural center of the active floor.
* Entire team activity, meetings, and server rooms are visible at a single glance.

### 5.2 Follow Agent Mode
When the Owner selects **"Follow Agent"** from the Agent Inspector:
* Camera focal point $\vec{T}$ rebinds to the target AI agent's real-time coordinate.
* As the agent walks across rooms, conducts code reviews, or takes a coffee break, the camera glides along with them.
* Re-engaging player movement immediately releases the follow lock back to the player avatar.
