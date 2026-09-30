# Portfolio Performance Budget & Hardware Acceptance

## 1. Objectives & Metrics
- **Initial Contentful Paint (ICP):** < 1.2s for 2D portfolio view.
- **Client Frame Timing:** < 16.6ms per frame (stable 60 FPS in 3D Gallery on integrated Intel GPUs).
- **Network Footprint:** Lazy loading for all media assets, screenshots, and videos.

## 2. Optimization Strategies
1. **Asset Deferral:** Screenshots and videos use `loading="lazy"` and metadata-only preloading.
2. **Local Fallback Cache:** `FALLBACK_PUBLIC_PROJECTS` delivers immediate rendering even under zero network connectivity or API cold-start conditions.
3. **Chunk Optimization:** Vite manual chunking separates React core, PlayCanvas engine, and Lucide icons.
4. **Memory Footprint:** Lightbox modals dismount video elements upon close, freeing GPU hardware decoder contexts.
