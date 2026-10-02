# Owner Mode & Executive Management in 3D Office

## 1. Single Shared World Architecture
A founding tenet of KDI AI OFFICE is **One World, Multiple Perspectives**:
* The Owner does **not** get redirected to a separate boring administrative portal.
* The Owner selects their chibi character and walks through the exact same front yard, lobby, sales area, and rooftop as a public visitor.
* The 3D world is augmented contextually with authorized executive powers.

```
       SHARED 3D VIRTUAL WORLD
 ┌─────────────────────────────────┐
 │       KDI AI HEADQUARTERS       │
 └────────────────▲────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
  PUBLIC VISITOR       OWNER MODE
  • Explore Lobby      • Full Exploration
  • View Portfolio     • Agent Inspector
  • Talk to Naya       • Direct Task Assignment
  • Taste Coffee       • Executive Command Suite
                       • Workload Valuation
                       • Graph Memory & Autonomy
```

---

## 2. Cryptographic Security & Backend Enforcement
* **Zero Frontend Role Trust**: Privileged operations (approving tasks, querying full financial benchmark gaps, pausing autonomy) are strictly validated on the backend using JWT tokens and cryptographic signatures.
* **Unauthorized Access**: If a visitor attempts to invoke owner endpoints, the backend returns HTTP 403 `FORBIDDEN` and records an audit log.

---

## 3. Owner In-World Interaction Capabilities

### 3.1 Agent Inspector (`AgentInspectorModal.tsx`)
Approaching or clicking any agent in Owner Mode displays their un-sanitized operational ledger:
* **Current Task**: Detailed objective name, progress percentage, and step trace.
* **Execution Trace**: Real-time stdout/stderr from Antigravity or MetaGPT.
* **Resource Consumption**: LLM token spend, tool API fees, and cumulative USD cost.
* **Virtual Compensation**: Market salary benchmark and FTE equivalence.
* **Camera Follow**: Button `[🎯 Follow Agent]` locks the isometric camera to the agent as they move between desks.

### 3.2 In-World Work Assignment
The Owner can assign tasks directly in conversation with an agent:
$$\text{Owner Prompt} \longrightarrow \text{KDI Manager} \longrightarrow \text{Task Queue} \longrightarrow \text{MetaGPT Engine} \longrightarrow \text{Antigravity Runtime}$$
The target agent immediately transitions from `IDLE` to `WORKING` in the 3D office.

### 3.3 Tactical Overview Mode
Toggling the Overview button zooms the camera out to $D = 36\text{m}$ at a $55^\circ$ angle, allowing the Owner to survey all rooms, ongoing meetings, active tasks, and server health indicators simultaneously.

### 3.4 Autonomy Policy Management
From the in-game Owner Panel, the Owner can:
* **Emergency Halt**: Immediately pause all background agents and ongoing automation loops.
* **Safe Mode Switch**: Restrict agents to read-only tools and Level 1 low-risk tasks.
* **Action Approvals**: Inspect pending Level 3/4 high-risk actions (e.g. database schema migrations or production git pushes) with full reasoning traces and approve or reject them.
