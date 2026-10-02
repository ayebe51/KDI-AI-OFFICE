# REFERENCE CHARACTER IDENTITY AUDIT & REPLACEMENT REPORT

## 1. Executive Summary & Audit Mandate

During the earlier phases of building the 3D virtual office, the public website `https://kantor.iniwebsitemu.com/` was referenced as a gameplay and visual benchmark for cozy isometric rendering, top-down camera exploration, and chibi styling.

However, pursuant to strict intellectual property and brand autonomy directives:
- **Reference website is permitted ONLY for**: visual style, game feel, isometric presentation, environment concept, navigation concept, interaction concept, and NPC interaction patterns.
- **Reference website is STRICTLY PROHIBITED for**: character names, character identities, character personalities, character backstories, character dialogue, character appearances, character-specific branding, or character-specific content.

A comprehensive codebase audit was executed across `apps/web/src`, `services/api/src`, `packages/`, configuration files, and documentation to detect, isolate, and replace all reference-derived identities.

---

## 2. Methodology & Codebase Scan Scope

The scan encompassed all layers:
- **PlayCanvas 3D Scene Components**: Floor environments (`GroundFloor.tsx`, `Floor2OpenSpace.tsx`, `RooftopGarden.tsx`), interactable definitions (`WorldDefinitions.ts`), character models (`ChibiCharacterModel.tsx`, `PlayerAvatar.tsx`).
- **Game UI & Modals**: Dialogue modals (`NayaDialogueModal.tsx`, `FoodCartModal.tsx`, `CozyPortfolioModal.tsx`, `CEORoomModal.tsx`), character selector (`CharacterSelectScreen.tsx`).
- **Centralized Registries**: `KDICharacterRegistry.ts`, `CharacterTypes.ts`.
- **Backend API & Digital Employee Directory**: `agents.service.ts`, `agents.controller.ts`, workforce services.
- **Documentation & Architecture Decision Records**: `docs/frontend/`, `docs/decisions/`.

---

## 3. Detected Entities, Origin Assessment & Remediation Actions

| Detected Entity / Name | Code / Asset Location | Origin Assessment | Reference-Derived? | Action Taken | Replacement Character / Identity | Asset & Dialogue Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sinta** (Account Manager) | `SintaDialogueModal.tsx`, `GroundFloor.tsx`, `GameOfficeApp.tsx`, `WorldDefinitions.ts`, `agents.service.ts`, `agents.controller.ts` | Matched reference website's sales character persona & naming. | **YES (REFERENCE-DERIVED)** | **REPLACED** | **Naya** (Account Manager, `AGT-SALES-001`) | Created original KDI character definition, original dusty rose/peach palette, professional consultation dialogue, and dedicated `NayaDialogueModal.tsx`. Preserved backward-compatible route aliases. |
| **Mang Ujang** (Coffee Seller) | `FoodCartModal.tsx`, `GroundFloor.tsx`, `WorldDefinitions.ts` | Matched informal reference kiosk persona & naming. | **YES (REFERENCE-DERIVED)** | **REPLACED** | **Pak Joko** (Cafe & Hospitality Host, `NPC-FOOD-001`) | Created original barista identity (`Kopi Corner Pak Joko`), authentic warm Indonesian hospitality dialogue, and cozy tea/coffee menu. |
| **Ayu** (Receptionist) | Reference site reception desk | Potential name inheritance during early prototype | **YES (REFERENCE-DERIVED)** | **REPLACED** | **Citra** (Office Host & Receptionist, `AGT-RECEPT-001`) | Created original front-desk ambassador with sky-blue corporate uniform, gold KDI pin, and navigational assistance dialogues. |
| **Nadia / Dr. Nadia** (AI Research) | `ResearchRoom.tsx`, `agents.service.ts` | Overlapped with reference finance/admin name `Nadia`. | **POTENTIAL COLLISION** | **REPLACED** | **Dr. Zahra** (AI Research Scientist, `AGT-RES-001`) | Renamed and given unique GraphRAG/deep learning research identity with violet accent palette. |
| **Maya** (QA Specialist) | `QARoom.tsx`, early registry draft | Overlapped with reference graphic designer `Maya`. | **POTENTIAL COLLISION** | **REPLACED** | **Hana** (QA & Verification Specialist, `AGT-QA-001`) | Renamed and given distinctive mint-green aesthetic, automated regression metrics, and empirical dialogue. |
| **Reza** (Rooftop Bar Host) | Early rooftop prototype | Informal staff name from reference context. | **YES (REFERENCE-DERIVED)** | **REPLACED** | **Danang** (Rooftop Lounge Host, `NPC-BAR-001`) | Created original community host persona with terracotta styling, sunset mocktails, and acoustic relaxation vibe. |
| **Nisa / Laras** (Social Media Specialist) | Floor 2 Studio prototype | Overlapped with reference social media manager. | **YES (REFERENCE-DERIVED)** | **REPLACED** | **Alya** (Creative & Content Strategist, `AGT-MKT-001`) | Created original creative lead with lavender blazer, digital camera, and branding storytelling dialogue. |
| **Reference URLs** (`*.iniwebsitemu.com`) | `CozyPortfolioModal.tsx` | Demo URLs in project portfolio mock data. | **YES (REFERENCE-DERIVED)** | **REPLACED** | Sanitized to canonical KDI domain (`*.kdi-ai-office.com`). | All external links verified to point to official KDI showcase domains. |

---

## 4. Master Replacement Mapping Table

```text
OLD / DETECTED             REASON                              NEW KDI CHARACTER
──────────────             ──────                              ─────────────────
Sinta (Account Manager) → Reference identity copied         → Naya (Account Manager, AGT-SALES-001)
Mang Ujang (Coffee)     → Reference kiosk identity copied   → Pak Joko (Hospitality Host, NPC-FOOD-001)
Ayu (Receptionist)      → Reference reception persona       → Citra (Office Host, AGT-RECEPT-001)
Dr. Nadia (Research)    → Potential collision with reference→ Dr. Zahra (AI Research Scientist, AGT-RES-001)
Maya (QA)               → Potential collision with reference→ Hana (QA & Verification, AGT-QA-001)
Reza (Rooftop Bar)      → Reference staff name              → Danang (Rooftop Host, NPC-BAR-001)
Nisa/Laras (Marketing)  → Reference social media persona    → Alya (Creative Strategist, AGT-MKT-001)
Reference Demo URLs     → Reference domain lingering        → Canonical KDI Domains (*.kdi-ai-office.com)
```

---

## 5. Architectural Integrity & Operational Preservation

1. **Separation of Presentation vs Operational Identity**:
   - The visual character identity (`Naya`, `Farhan`, `Ahmad`, etc.) governs front-end presentation, 3D character avatars, dialogue style, and client-facing branding.
   - The operational backend identity (`AGT-SALES-001`, `AGT-ENG-001`, etc.) remains 100% stable in the Agent Runtime, Task Queue, GraphRAG database, and telemetry channels.
2. **Preservation of Office Functional Areas**:
   - The **Sales Pod** remains fully functional with lead recording, quote generation, and WhatsApp handoff.
   - The **Food Cart** kiosk remains an authentic welcoming landmark.
   - The **CEO Suite**, **Engineering Floor**, **QA Lab**, and **Rooftop Lounge** remain core interactive zones.
3. **Multi-Mode Consistency**:
   - Public Visitors, Internal Team Members, and Owner Mode all interact with the unified, canonical KDI character roster.
