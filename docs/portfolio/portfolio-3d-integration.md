# Portfolio 3D Digital Twin Integration

## 1. Spatial Placement & Room Architecture
The Portfolio Gallery is physically realized in the 3D office at coordinates `[0, 0, 24]` (`RM-PORTFOLIO`):
- **Museum Polished Floor:** High-reflectance black quartz flooring with ambient edge illumination.
- **Project Pedestals:** Elevated white quartz display pedestals distributed linearly across the gallery floor.
- **Holographic Floating Displays:** Interactive emissive screens above each pedestal presenting project branding, category badges, and active agent indicators.

## 2. Interaction Model
- **Hover:** Subtle emissive intensity shift on the pedestal display screen.
- **Click:** Emits `onSelectProject(project)` to `OfficeWorldStore`.
- **Overlay Transition:** Triggers `PublicProjectShowcaseModal` as a high-density React overlay directly above the WebGL canvas, allowing full deep inspection without camera disorientation.
- **Operator Graph Pivot:** Internal operators can toggle from the showcase directly into the Neo4j 3-hop Graph Memory inspector.
