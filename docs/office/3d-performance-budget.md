# 3D Performance Budget & Optimization Specification

## 1. Performance Target & Philosophy
- Target Hardware: Standard laptops with **integrated graphics (Intel Iris Xe, Apple M-series, AMD Radeon Vega)**.
- Frame Rate Target: **Stable 60 FPS** ($\le 16.6\text{ms}$ frame time budget).
- Memory Budget: $< 150\text{ MB}$ JS Heap usage.

## 2. Optimization Techniques Implemented
1. **Procedural Geometry Primitives:** Workstations, server racks, and character avatars leverage optimized PlayCanvas procedural primitives (`box`, `capsule`, `cylinder`, `sphere`) rather than dense multi-megabyte polygon meshes.
2. **Material Sharing:** Common materials (metals, glass, plastics, woods) are instanced and shared across entities using `@playcanvas/react/hooks` (`useMaterial`).
3. **Throttled Update Loops:** Raycasting and proximity checks run on-demand or at throttled intervals rather than evaluating unbounded calculations every render frame.
4. **2D Accessibility Fallback:** Devices lacking WebGL 2.0 or experiencing high GPU pressure can seamlessly toggle into the high-contrast 2D Office Mode.
