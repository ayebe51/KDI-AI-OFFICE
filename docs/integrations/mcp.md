# Integration Specification: Model Context Protocol (MCP) (`mcp.md`)

## 1. Overview & Purpose
**KDI AI Office** integrates the **Model Context Protocol (MCP)** as a standard interface for exposing structured tools, resources, and contextual prompts to agents. MCP decouples model reasoning from concrete external tools and data stores.

---

## 2. Architecture: MCP Client & Server Topology

```text
Specialist Agent (MetaGPT / Persona)
        ↓
MCP Client Subsystem (Core Agent Runtime)
        ↓ (Standard MCP JSON-RPC Protocol over Stdio / SSE)
┌────────────────────────────────────────────────────────┐
│ KDI Internal MCP Servers (Sandboxed Host Processes)    │
├─────────────────────────┬──────────────────────────────┤
│ 1. mcp-git-server       │ Local Git worktrees, commits │
│ 2. mcp-filesystem       │ Scoped workspace read/writes │
│ 3. mcp-neo4j-graph      │ Cypher queries & AST search  │
│ 4. mcp-test-runner      │ Sandboxed test executions    │
│ 5. mcp-doc-tools        │ Markdown & OpenAPI specs     │
└─────────────────────────┴──────────────────────────────┘
```

---

## 3. Sandboxing & Security Guardrails for MCP
1. **Transport Isolation:** All MCP servers run as child processes over standard I/O (`stdio`) with restricted environment variables.
2. **Capability Scoping:** Each agent persona is granted access only to a whitelisted set of MCP servers. For example:
   - `Product Manager` has access to `mcp-doc-tools` and `mcp-neo4j-graph`, but is blocked from `mcp-git-server` write tools.
   - `QA Engineer` has access to `mcp-test-runner` and `mcp-filesystem` (read-only for src, write for tests).
3. **Parameter Validation:** All MCP tool arguments are validated against strict JSON Schemas prior to dispatch.
4. **Audit Interception:** Every JSON-RPC request and response is captured by the central event bus for security auditing.

---

## 4. Canonical MCP Server Registration

Configured in `config/mcp-servers.json`:

```json
{
  "mcpServers": {
    "kdi-git": {
      "command": "node",
      "args": ["/opt/kdi/mcp-servers/git-server/dist/index.js"],
      "env": {
        "WORKSPACE_ROOT": "D:/apss-source/workspaces"
      }
    },
    "kdi-neo4j": {
      "command": "python",
      "args": ["-m", "kdi_mcp.neo4j_server"],
      "env": {
        "NEO4J_URI": "bolt://127.0.0.1:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "${NEO4J_SECRET_PASSWORD}"
      }
    }
  }
}
```
