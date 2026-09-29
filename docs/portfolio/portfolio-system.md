# Portfolio Subsystem & Project Showcase: KDI AI Office

## 1. Overview & Architectural Placement
In **KDI AI Office**, the **Portfolio** is not an isolated secondary page or static marketing brochure. It is a **First-Class Operational Subsystem** and an integral experiential destination within the 3D Digital Twin Office.

```text
Visitor Entrance (Reception)
      ↓
Portfolio Gallery (Interactive Display Wall & Kiosks)
      ↓
Project Showcase / Dedicated Project Rooms (e.g., Koneksi Santri Room)
      ↓
Project Detail Experience (Hybrid 3D Environment + UI Overlay)
      ↓
Architecture Deep-Dive & Verified Case Studies (Sourced from Real Git & Graph Data)
```

---

## 2. Supported Project Types & Categorization
The portfolio manages 11 diverse software and engineering domains:

1. **Web Application:** Single-page apps, dashboards, client portals.
2. **Mobile Application:** React Native, Flutter, Android/iOS native apps (*Koneksi Santri Mobile*).
3. **SaaS Platforms:** Multi-tenant cloud services and subscription systems.
4. **AI Systems:** Multi-agent architectures, RAG systems, local LLM integrations.
5. **Automation & Workflows:** Headless scraping, data extraction pipelines, cron ETLs.
6. **Internal Systems:** Administrative back-office suites, inventory, management tooling.
7. **Websites & CMS:** High-performance Jamstack, WordPress headless, web portals.
8. **UI/UX Design Systems:** Component libraries, design tokens, Figma prototypes.
9. **Graphic & Asset Design:** Marketing collateral, branding vectors, 3D low-poly models.
10. **Research Projects:** Benchmark studies, algorithmic investigations, academic papers.
11. **Experimental & Prototypes:** Proof-of-concept sandboxes, exploratory spikes.

---

## 3. Project Data Model Specification

Each portfolio item conforms to the following schema stored in PostgreSQL `portfolio_projects`:

```json
{
  "project_id": "prj_01J9X8K2M4N5P6Q7R8S9T0V1W2",
  "name": "Koneksi Santri",
  "category": "MOBILE_APPLICATION",
  "status": "PRODUCTION",
  "year": 2026,
  "visibility": "PUBLIC",
  "featured": true,
  "display_order": 1,
  "tagline": "Real-time Islamic Boarding School Student Management & Parent Pickup Portal",
  "description": "Comprehensive school and student management platform providing real-time parent notifications, academic attendance, and automated pickup dispatch.",
  "problem": "Manual gate dispatch caused chaotic congestion during student pickup hours, with zero real-time verification of authorized guardians.",
  "solution": "An event-driven mobile and web platform pairing automated RFID gate checkouts with instant push notifications and parent mobile verifications.",
  "technologies": ["React Native", "TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker"],
  "features": [
    "QR-coded guardian pickup verification",
    "Real-time student checkout status push notifications",
    "Teacher classroom attendance sync",
    "Administrative billing and tuition dashboard"
  ],
  "ai_contributions": {
    "planning": "Decomposed pickup state machine requirements into formal user stories",
    "architecture": "Designed Redis pub/sub event pipeline and OpenAPI specification",
    "coding": "Authored PickupService.ts null check fix and controller handlers",
    "testing": "Generated 42 Jest unit tests achieving 94% branch coverage",
    "security_review": "Scanned endpoints for IDOR vulnerabilities and sanitized token outputs"
  },
  "media": {
    "hero_image_url": "https://cdn.kdioffice.internal/media/koneksi-santri-hero.webp",
    "screenshots": [
      "https://cdn.kdioffice.internal/media/ks-parent-app.webp",
      "https://cdn.kdioffice.internal/media/ks-gate-kiosk.webp"
    ],
    "video_demo_url": "https://cdn.kdioffice.internal/media/ks-demo.mp4"
  },
  "links": {
    "live_demo_url": "https://demo.koneksisantri.internal",
    "public_repo_url": "https://github.com/kdi/koneksi-santri-public",
    "architecture_doc_uri": "workspace://docs/projects/koneksi-santri/architecture.md"
  }
}
```

---

## 4. Physical 3D Presentation & Exhibition Zones

### 4.1 The Portfolio Gallery (Zone 6)
- **Interactive Project Wall:** Massive curved digital display wall showcasing floating interactive project cards.
- **Kiosk Terminals:** Low-poly touch kiosks where visitors click to browse projects filtered by technology or category.
- **Holographic Pedestals:** 3 rotating glass pedestals highlighting **Featured Projects** with 3D floating icons.

### 4.2 Dedicated Project Rooms (e.g., *Koneksi Santri Room*, Zone 8)
Major strategic products have a dedicated physical showroom in the virtual building:
- **Wall 1 (Product Overview):** Problem, solution, target audience, and live student counter metric.
- **Wall 2 (Architecture Wall):** Sanitized high-level Mermaid architectural diagram projected onto glass.
- **Wall 3 (Interface Gallery):** Framed high-resolution mobile screenshots and UI mockups.
- **Center Kiosk:** Interactive terminal running the live staging web demo.
- **Timeline Table:** Chronological milestone progression from Concept to Production.

---

## 5. Empirical AI Contribution Traceability
To ensure integrity and prevent exaggerated marketing claims:
- AI Contributions are **NEVER fabricated or hallucinated**.
- The Portfolio Engine queries PostgreSQL `tasks`, `tool_calls`, and Neo4j `:Commit` nodes:
  ```cypher
  MATCH (p:Project {id: $projectId})<-[:WORKS_ON]-(a:Agent)
  MATCH (p)<-[:BELONGS_TO]-(t:Task)-[:HAS_RUN]->(e:Execution)-[:PRODUCES]->(c:Commit)
  RETURN a.role AS AgentRole, count(DISTINCT t) AS TasksCompleted, count(DISTINCT c) AS CommitsAuthored;
  ```
- If an agent did not physically execute tasks on a project, that contribution category remains unlisted.

---

## 6. Project Case Study Standard Format
Every in-depth project case study adheres to a rigorous engineering structure:
1. **Context & Problem Statement:** Real-world organizational pain point.
2. **Technical Research:** Evaluated alternatives and library selections.
3. **Architecture & Schema Design:** Microservice vs monolith, database ERD, caching strategy.
4. **Implementation & Autonomous Engineering:** Sprints executed by the AI engineering team.
5. **Technical Challenges & Solutions:** Concurrency bottlenecks, race conditions, edge-case fixes.
6. **Automated QA & Security Review:** Test coverage numbers, pen-test findings, regression audits.
7. **Empirical Outcomes & Lessons Learned:** Quantifiable performance improvements and takeaways.

---

## 7. Portfolio Content Management System (CMS)
Administrators (via Private Mode Dashboard) manage portfolio assets:
- **Operations:** Create, Edit, Reorder, Feature, Publish, Unpublish, Archive.
- **Asset Uploads:** Direct upload of WebP screenshots and MP4 video recordings.
- **Sanitization Guard:** Before publishing, the Security Guard automatically scans case studies and architecture diagrams to ensure internal office IPs, database passwords, and non-public git branches are redacted.

---

## 8. Guided Tour Experience (`START TOUR`)
For new visitors entering via Reception:
1. **Step 1 — Welcome & Reception:** Avatar receptionist greets visitor; company mission overview.
2. **Step 2 — Portfolio Gallery:** Camera glides along the curved project wall highlighting recent releases.
3. **Step 3 — Featured Showcase (*Koneksi Santri*):** Enters the dedicated Project Room; inspects live demo.
4. **Step 4 — Engineering Floor:** Camera visits the open floor, showing active AI engineers at work.
5. **Step 5 — Architecture & Whiteboard:** Highlights system design methodologies.
6. **Step 6 — Contact & Delegation:** Concludes back at Reception with a call-to-action to delegate a task.
- *Controls:* User can pause, resume, skip steps, or exit to Free Explore at any moment.
