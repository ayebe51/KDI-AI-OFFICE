# Security Threat Model: KDI AI Office

## 1. Methodology & Scope
This threat model follows the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) combined with a structured **Asset-Threat-Surface-Mitigation Matrix**.

It evaluates the security posture of the **KDI AI Office** across its edge gateway, local office workstation, multi-agent runtimes, execution sandboxes, and third-party cloud LLM connections.

---

## 2. Core Assets Under Protection

1. **Source Code & Git Repositories:** Proprietary intellectual property, business logic, customer code (*Koneksi Santri*).
2. **Secrets & Credentials:** API keys (Gemini, Groq, OpenRouter), SSH deployment keys, database passwords.
3. **Internal Databases:** PostgreSQL relational data, Redis queues, and Neo4j knowledge graphs.
4. **Host Workstation System Integrity:** The local physical computer (preventing host OS takeover, malware, or disk destruction).
5. **Human Authority & Sovereignty:** Ensuring agents cannot bypass approval gates or deploy unauthorized code.

---

## 3. Comprehensive Threat Analysis Matrix

| Threat ID | Threat Name | Affected Asset | Attack Surface | Initial Risk | Mitigation Architecture | Residual Risk |
|---|---|---|---|:---:|---|:---:|
| **TH-01** | **Direct Prompt Injection** | Agent Persona & Tool Engine | User task prompt, issue descriptions, external web scraping. | **HIGH** | Input sanitization; strict delimiter tagging (`<task_prompt>`); output schema validation; system prompts marked immutable. | **LOW** |
| **TH-02** | **Indirect Prompt Injection** | Agent Persona & Tools | Malicious comments inside third-party repositories or dependencies. | **HIGH** | Separation of code data from reasoning instructions; read-only AST parsing before content is shown to LLM. | **LOW** |
| **TH-03** | **Command Injection in Shell** | Workstation Host OS | `tool_shell` arguments; test runner flags. | **CRITICAL** | Whitelisted binaries only; arguments passed as structured arrays (no raw subshell `bash -c`); zero shell interpolation. | **LOW** |
| **TH-04** | **Secret / Credential Leakage** | API Keys & SSH Tokens | LLM output, git commits, audit logs, error stack traces. | **CRITICAL** | Pre-commit secret scanning (Gitleaks rules); in-memory runtime injection; automatic regex redaction on all log outputs. | **LOW** |
| **TH-05** | **Tool Abuse / Path Traversal** | Local Filesystem | `tool_filesystem` read/write calls. | **CRITICAL** | Strict workspace chroot sandbox; path normalization; blocking any path containing `../` or pointing outside worktree. | **LOW** |
| **TH-06** | **Privilege Escalation** | Office Runtime & DBs | Agent trying to execute administrative or database DDL actions. | **HIGH** | Role-based permission matrix; mandatory human approval gate for `HIGH`/`CRITICAL` risks; non-root Docker execution. | **LOW** |
| **TH-07** | **Malicious MCP Tool Invocation** | MCP Server Process | Untrusted third-party MCP plugins. | **HIGH** | Whitelist of internal MCP servers only; stdio transport isolation; granular per-agent MCP permission scopes. | **LOW** |
| **TH-08** | **Server-Side Request Forgery (SSRF)** | Office Internal Network | `tool_browser`, webhook fetchers. | **HIGH** | Network egress filter blocking private IP ranges (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`). | **LOW** |
| **TH-09** | **Agent Runaway / Infinite Loops** | Workstation CPU/RAM, Cloud Quotas | Iterative self-correction loops. | **MEDIUM** | Max iteration counter (cap at 5 retries); hard token and step limits; circuit breaker; host resource throttle. | **LOW** |
| **TH-10** | **Destructive Git & DB Actions** | Repositories & Databases | Agent executing `git push --force` or `DROP TABLE`. | **CRITICAL** | Hard block in tool layer: destructive commands rejected; migrations require dry-run + signed human approval token. | **NEGLIGIBLE** |
| **TH-11** | **Unauthorized Deployment** | Production Servers | DevOps / Deployment agents. | **CRITICAL** | Agents completely lack production deployment keys; deployment can only be executed by Human Developer in Antigravity IDE. | **NEGLIGIBLE** |
| **TH-12** | **Data Exfiltration via LLM** | Proprietary Source Code | Cloud LLM inference calls. | **MEDIUM** | Privacy classification engine; confidential files routed strictly to local offline Ollama models. | **LOW** |
| **TH-13** | **Cloud Provider Compromise** | Prompt Content & In-Flight Data | Upstream API breach (e.g., cloud provider interception). | **MEDIUM** | Code obfuscation options; fallback to local sovereign Ollama; TLS 1.3 encryption in transit. | **LOW** |

---

## 4. Defense-in-Depth Layered Architecture

```text
Layer 1: Edge Perimeter (VPS Gateway)
  └── SSL/TLS 1.3 Termination, WAF Rate Limiting, Edge JWT Verification
Layer 2: Transport Security (Reverse Tunnel)
  └── Outbound mTLS / Encrypted FRP Tunnel (No open router ports)
Layer 3: Application Security (FastAPI Core)
  └── Cryptographic Session Tokens, Role Guards, Input Sanitization
Layer 4: Agent Governance (Policy Engine)
  └── Persona Capability Boundaries, Mandatory Human Approval Gates
Layer 5: Execution Sandbox (OpenCode & Tool Engine)
  └── Sandboxed Git Worktrees, Path Traversal Defense, Command Whitelisting
Layer 6: Infrastructure Isolation (Docker & Host)
  └── Non-Root Containers, Localhost-Only DB Bindings, Resource Throttling
```
