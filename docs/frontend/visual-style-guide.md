# Visual Style Guide: KDI Cozy Isometric 3D Virtual Office

## 1. Executive Summary & Design Philosophy
The visual direction of **KDI AI OFFICE** transforms a high-performance AI engineering organization into a **playable, cozy isometric 3D headquarters**. The aesthetic is inspired by premium cozy indie simulation titles (Animal Crossing, Tiny Glade, Townsmen, Habbo modern low-poly) combined with clean Scandinavian architectural minimalism and warm ambient illumination.

### Key Visual Pillars
* **Cozy & Welcoming**: Warm light temperatures (2700K - 3200K), soft pastel tones, and rounded organic geometry.
* **Low-Poly & Clean**: Geometric simplicity with carefully beveled edges and minimal clutter. No high-frequency noise or harsh specular shines.
* **Chibi Proportions**: Expressive, lovable character silhouettes with oversized heads, round torsos, blush cheeks, and gentle bobbing physics.
* **Data-Driven & Living**: The world is not a static diorama; agents, server racks, and meeting whiteboards reflect live Redis/WebSocket telemetry.

---

## 2. Color Palette Direction
The palette avoids oversaturated primary colors and cyberpunk stark neon gradients. Instead, it employs calibrated soft pastels, warm woods, and serene earth tones:

| Tone | Hex Code | Material Context | Usage |
| :--- | :--- | :--- | :--- |
| **Warm Alabaster** | `#FFFBF5` | Interior walls, primary partition panels | Base structure, spacious cleanliness |
| **Soft Sand / Linen** | `#F4EFE6` | Ceramic floors, reception tiles | Warm grounded interior walking surface |
| **Sage Green** | `#88A795` | Planters, moss partitions, lounge cushions | Organic accent, calming presence |
| **Pale Eucalyptus** | `#A8C2B3` | Secondary vegetation, bean bags | Rooftop garden, break area |
| **Blush Terracotta** | `#DCAE9E` | Soft seating, decorative accents | Warm human focal points |
| **Light Warm Oak** | `#CDB296` | Executive CEO desk, reception countertop, pergolas | Natural wood material |
| **Muted Slate Teal** | `#3B6B75` | Workstation dividers, developer desks | Professional engineering focus |
| **Soft Amber Glow** | `#FFE08A` | Fairy lights, task lamps, Naya accent badge | Warm illumination & interactive cues |
| **Gentle Neon Cyan** | `#38BDF8` | "Koneksi Digital Inovasi" Signage | Subtle backlit typography, non-blinding |

---

## 3. Materials & Shading Strategy
1. **Diffuse & Matte Dominance**: 90% of surfaces use matte materials with high roughness (0.75 - 0.95) to create a tactile, soft clay/plastic/wood finish.
2. **Subtle Specularity**: Metals and glass use soft specular highlights with no harsh mirrors. Windows utilize frosted translucency with subtle opacity (0.15 - 0.25).
3. **No Realistic PBR Noise**: Avoid high-contrast micro-bump maps or gritty concrete grunge textures. Purity of form and color provides clarity.
4. **Clean Decals & Textures**: Canvas-backed textures are filtered with bilinear interpolation for smooth edges even when viewed up close.

---

## 4. Lighting & Ambient Atmosphere
* **Directional Sun**: Warm sunlight positioned at `[15, 25, 20]` with subtle amber warmth (`#FFF5E4`, intensity 0.85). Soft shadow maps with PCF filtering avoid harsh pixelation.
* **Ambient Hemispheric Fill**: Sky color `#EDF4FA` and ground bounce `#F0EAE1` ensuring no corner is pitch-black.
* **Interior Warm Points**: Discreet point lights placed over reception, CEO desk, sleep capsules, and rooftop fire pit (color `#FFE8B6`, intensity 0.6 - 1.2, radius 4m - 8m).
* **Fairy Lights**: Strung across the rooftop pergola and yard trees, emitting static warm amber glow without flashing or strobe effects.

---

## 5. Camera & Viewport Standards
* **Projection**: Top-down Isometric (near-orthographic with narrow Field of View `fov = 32°`).
* **Viewing Angles**:
  * Default Yaw: `135°` (standard isometric diagonal looking northwest across the office floor).
  * Default Pitch: `35°` (depicting vertical depth while preserving readability of wall signs and desks).
  * Default Distance: `22.0m` (player exploration), zooming to `14.0m` for dialogues and `36.0m` for Owner Overview.
* **Framing Dynamics**:
  * Smooth Exponential Lerp: Camera position smoothly tracks the player avatar with factor `0.08` per frame.
  * Clamped Orbit: Player can rotate camera with right-click or touch drag between `15°` and `60°` pitch.

---

## 6. Character Proportions & Scale System
* **Grid Unit**: 1 world unit = 1 meter.
* **Chibi Ratios**:
  * Total Height: `1.7m` (stylized compact height).
  * Head Ratio: `1:1.6` head-to-body ratio (oversized rounded head, width `0.72m`, height `0.65m`).
  * Torso: Rounded capsule (`0.55m` height, `0.48m` width).
  * Limbs: Stubby, rounded appendages with pendular walk cycle animations.
* **Facial Expressiveness**:
  * Minimalist glossy black pill eyes (`#1e293b`).
  * Subtle pink blush cheeks (`#f87171` at 40% opacity).
  * Distinct pastel hair caps and role-based badges.

---

## 7. Architectural & Furniture Proportions
* **Ceiling & Wall Clearance**: Standard wall height `3.2m`, interior partition height `1.2m` to maintain unobstructed isometric sightlines.
* **Doors & Portals**: Width `1.8m`, height `2.4m` ensuring ample room for chibi silhouettes.
* **Desks & Workstations**: Height `0.75m`, width `1.6m`, depth `0.85m`.
* **Corridors & Walkways**: Minimum clearance of `2.8m` to prevent cramped traversal or collision snagging.

---

## 8. UI Density & Interaction Design
* **Uncluttered 3D Dominance**: The 3D viewport spans 100% of the screen. Zero permanent tables, analytics charts, or status panels clutter the viewport.
* **Contextual Proximity Prompt**: A floating pill badge `[E] Action` smoothly fades in when within 3.6m of an interactive NPC or prop.
* **Game-Like Dialogues**: NPC conversations display through centered speech modals styled as polished game text panels with avatar portraits, role badges, and action buttons.
* **Owner Elevation**: A single discreet `👑 OWNER` badge in the top navigation activates the full command suite on demand without interrupting public immersion.
