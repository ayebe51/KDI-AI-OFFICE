# Network Security & Firewall Policies — KDI AI Office

## 1. Network Boundary Segmentation
Network exposure is governed by 4 strict access tiers:

| Tier | Policy Identifier | Target Services | Permitted Bindings |
| :--- | :--- | :--- | :--- |
| **Tier 1** | `PUBLIC_ALLOWED` | Public Frontend (Hostinger) | Ingress ports 80/443 |
| **Tier 2** | `INTERNAL_ONLY` | PostgreSQL (5432), Redis (6379), Neo4j (7687) | `127.0.0.1` / Docker internal bridge (`172.30.0.0/16`) |
| **Tier 3** | `LOOPBACK_ONLY` | Ollama Inference (11434), Local API (3000) | `127.0.0.1` strictly |
| **Tier 4** | `BLOCKED` | All other ports | Drop all unsolicited WAN packets |

## 2. Ingress Encryption & Reverse Proxy Tunnel
- External connections from Hostinger to the Office PC use an authenticated Cloudflare/FRP reverse proxy tunnel with mutual TLS (mTLS).
- Zero router port forwarding or direct WAN IP exposure is permitted on the physical office internet connection.
