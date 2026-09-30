# ADR-024: Public Portfolio as 2D + 3D Hybrid Experience

## Status
**ACCEPTED**

## Context
KDI AI Office features an immersive 3D living digital twin rendered via PlayCanvas WebGL. While the 3D office is engaging for spatial storytelling and showcasing real-time agent presence, forcing visitors to navigate in 3D solely to read a case study or inspect tech stack components causes friction on mobile devices, low-end hardware, or screen readers.

## Decision
1. **Hybrid Presentation Architecture:**
   - **3D Digital Twin Enhancement:** The Portfolio Gallery room (`RM-PORTFOLIO`) features interactive 3D pedestals and holographic screens. Clicking a pedestal opens the rich `PublicProjectShowcaseModal` without leaving the 3D office.
   - **First-Class 2D Public Portfolio (`PortfolioGalleryView`):** A high-performance, indexable, semantic 2D view is provided with instant filtering by category and technology, real-time search, responsive grid cards, and deep linking (`/project/:slug`).
2. **Mutual Decoupling & Fault Isolation:**
   - If WebGL 2.0 is unavailable or crashes, the 2D Portfolio remains 100% operational.
   - If the backend portfolio API is slow or temporarily offline, the frontend falls back to a reliable local public cache, ensuring zero blank pages for external visitors.
3. **Accessibility & Reduced Motion:**
   - Respects `prefers-reduced-motion` media queries by disabling decorative transitions.
   - All modals include standard ARIA attributes (`role="dialog"`, `aria-modal="true"`) and keyboard Escape navigation.

## Consequences
- **Positive:** Maximum accessibility, integrated-GPU friendliness, mobile responsiveness, and SEO crawlability, while retaining 3D digital twin immersion as a first-class feature.
- **Negative:** Requires maintaining both 2D and 3D visual components connected to the same underlying public project data store.
