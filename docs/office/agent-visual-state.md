# Agent Visual State Specification

## 1. Visual Manifestation Matrix

| Backend Activity | Visual Clip | Emissive Color | Intensity | Description |
|---|---|---|---|---|
| `OFFLINE` | `IDLE` | `#0f172a` | 0.1 | Process inactive / offline |
| `IDLE` | `IDLE` | `#0284c7` | 0.35 | Standing by at workstation |
| `WORKING` | `IDLE` / `SIT` | `#059669` | 0.9 | Active operational execution |
| `THINKING` | `THINK` | `#7c3aed` | 0.8 | Context analysis / AST dependency mapping |
| `PLANNING` | `THINK` | `#0891b2` | 0.8 | Architectural planning / task breakdown |
| `CODING` | `TYPE` | `#059669` | 0.95 | Surgical AST patch synthesis |
| `DEBUGGING` | `TYPE` | `#d97706` | 0.85 | Test failure diagnosis |
| `TESTING` | `TYPE` | `#059669` | 0.9 | Running automated verification test suites |
| `REVIEWING` | `THINK` | `#9333ea` | 0.75 | Static security & code review |
| `MEETING` | `MEETING` | `#4f46e5` | 0.7 | Participating in conference at whiteboard |
| `BREAK` | `SIT` | `#ea580c` | 0.4 | Scheduled wellness pause |
| `COFFEE` | `COFFEE` | `#92400e` | 0.5 | Refreshing at pantry espresso station |
| `LUNCH` | `SIT` | `#d97706` | 0.4 | Midday recess |
| `PRAYING` | `PRAY` | `#0d9488` | 0.6 | Performing Salah in Musholla sanctuary |
| `READING` | `READ` | `#0284c7` | 0.4 | Consulting internal ADRs and specifications |
| `TRAINING` | `THINK` | `#6d28d9` | 0.7 | Vector index curation & model calibration |
| `WAITING_APPROVAL` | `IDLE` | `#e11d48` | 0.8 | Suspended awaiting human operator signature |
| `ERROR` | `ERROR` | `#dc2626` | 1.0 | Urgent exception alert strobe |
| `COMPLETED` | `CELEBRATE` | `#059669` | 0.6 | Task completed successfully |

## 2. Agent Identity Elements
- **Role Badge & Department Palette:**
  - Engineering: Emerald (`#10b981`)
  - Management: Gold (`#eab308`)
  - Architecture: Violet (`#8b5cf6`)
  - Research: Purple (`#a855f7`)
  - QA: Cyan (`#06b6d4`)
  - Security: Red (`#ef4444`)
- **Overhead Status Halo:** Pulsing ring above head reflecting current activity state.
- **Glowing Visor:** Emissive programmer visor reflecting real-time thinking/coding cadence.
