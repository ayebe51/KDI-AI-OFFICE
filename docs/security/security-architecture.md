# Security Architecture & Boundary Controls: KDI AI Office

## 1. Overview & Core Security Principles
The **KDI AI Office Security Architecture** enforces a **Zero-Trust Defense-in-Depth** model designed specifically for autonomous agent systems operating on a developer workstation.

---

## 2. Security Boundaries & Enclaves

```text
[ UNTRUSTED: Public Internet / Mobile Web Client ]
       │
       ▼ (Perimeter Guard: Edge VPS / Nginx WAF / SSL TLS 1.3)
[ ENCLAVE 1: Edge Gateway Relay (Public VPS) ]
       │
       ▼ (Encrypted Reverse Tunnel: FRPS -> FRPC / mTLS)
[ ENCLAVE 2: Core Control Plane (Office Workstation / FastAPI) ]
       │
       ▼ (Local IPC / Policy Engine Authorization)
[ ENCLAVE 3: Sandboxed Execution Worker (Docker / Non-Root User) ]
       │
       ▼ (Strict Loopback Binding: 127.0.0.1 Only)
[ ENCLAVE 4: Isolated Data Vaults (PostgreSQL, Neo4j, Redis, Secrets) ]
```

---

## 3. Cryptographic Standards
- **In-Transit Encryption:** All external communications mandate **TLS 1.3** with modern cipher suites (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
- **Data-at-Rest Encryption:** Sensitive credentials and provider keys in PostgreSQL `system_settings` are encrypted using **AES-256-GCM** with authenticated data (AEAD).
- **User Passwords:** Hashed using **Argon2id** (`m=65536, t=3, p=4`).
- **Session Tokens:** Signed JWTs using **Ed25519 (EdDSA)** or **RS256** with 1-hour expiration and refresh token rotation.
- **Audit Lineage:** Every audit log row incorporates a cryptographic SHA-256 hash chaining mechanism (`current_row_hash = SHA256(previous_row_hash + payload)`), making historical log tampering mathematically detectable.

---

## 4. Input Sanitization & Prompt Boundary Defenses
To defeat prompt injection attacks:
1. **XML/Delimited Prompt Enveloping:** Untrusted user inputs, repository comments, and external search texts are wrapped in strict XML tags (`<untrusted_input>...</untrusted_input>`) with clear instructions to the LLM to treat content within tags purely as data, never as executable meta-instructions.
2. **Deterministic Output Parsing:** Agents are forbidden from returning freeform chat for tool calls; all tool invocations must adhere strictly to JSON Schemas validated via Pydantic/Zod.
3. **Regex Sanity Filtering:** Outbound model outputs are scanned for attempts to escape shell boundaries or emit malicious bash pipelines (`|`, `;`, `&&`, `` ` ``).
