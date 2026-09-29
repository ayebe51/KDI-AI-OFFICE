# ADR-002: Cloud VPS as Edge Gateway & Relay Instead of Primary Runtime

## Status
**APPROVED** (Phase 0 Baseline)

## Context
A cloud VPS node (Hostinger) is available. We had to decide whether to run the entire agent execution stack on this VPS or restrict its role to edge routing and presentation.

Standard VPS tiers offer modest hardware (e.g., 2 to 4 vCPUs, 4GB to 8GB RAM, shared storage), which is insufficient to run Neo4j, PostgreSQL, Redis, local Ollama, MetaGPT, OpenCode, and full compilation test runners concurrently without crashing or severe throttling.

## Decision
We designate the **Cloud VPS strictly as an Edge Gateway, Reverse Tunnel Relay, and Static Web Presentation Host**. It shall **NOT** act as the primary execution environment.

## Rationale
1. **Resource Preservation:** Running heavy multi-agent AST analysis, builds, and local model inference on a low-spec VPS causes immediate out-of-memory (OOM) crashes and CPU starvation.
2. **NAT & Firewall Bypass:** The office workstation is behind NAT without a public IP or port forwarding. An edge VPS provides a stable public static IP where the 3D Web UI can connect, while the office computer maintains an outbound reverse tunnel (FRP/SSH).
3. **Attack Surface Minimization:** If the public VPS is compromised or targeted by DDoS, the attacker gains access only to the proxy layer; internal databases, source code, and developer credentials remain protected behind the reverse tunnel boundary.

## Consequences
- **Positive:** Maximum system stability, low-cost VPS requirements, enhanced perimeter security, reliable public access.
- **Negative:** Requires maintaining the outbound reverse tunnel connection between the office workstation and the VPS.
