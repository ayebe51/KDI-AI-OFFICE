# Audit Architecture & Immutable Traceability: KDI AI Office

## 1. Overview & Regulatory Imperative
The **Audit System** in **KDI AI Office** guarantees complete, non-repudiable accountability for every action executed by human operators and autonomous AI agents. 

Because agents have capability to modify code, author tests, and commit git revisions, every step must be provably linked:

```text
User
  ↓ (Prompt & Delegation)
Task
  ↓ (Subtask Assignment)
Agent Persona
  ↓ (Inference & Thought)
LLM Request & Response
  ↓ (Tool Invocation)
Tool Action
  ↓ (Sandboxed Execution)
Command / AST Edit
  ↓ (Filesystem Mutation)
File Modification
  ↓ (Verification)
Test Suite Execution
  ↓ (Working Branch)
Git Commit Hash
  ↓ (High-Risk Intercept)
Human Approval Decision
```

---

## 2. Multi-Store Audit Architecture

To provide both cryptographic immutability and interactive graph exploration, audit data is persisted concurrently across two primary engines:

```mermaid
graph TD
    EventSource[Tool Execution / Git Commit / Approval] --> AuditLogger[Central Audit Interceptor]
    
    AuditLogger -->|1. Immutable Append-Only Ledger| PG[(PostgreSQL: audit_logs & tool_calls)]
    AuditLogger -->|2. Topological Lineage Edges| Neo[(Neo4j: :Commit -[:VERIFIED_BY]-> :Test)]
    
    PG --> HashChain[Cryptographic SHA-256 Hash Chain]
    Neo --> GraphExplorer[Interactive Lineage Explorer UI]
```

---

## 3. Cryptographic Hash Chaining (Tamper Evident)

In PostgreSQL `audit_logs`, each record is mathematically linked to the preceding entry:

```text
Row N Hash = SHA256(Row N-1 Hash || Timestamp || ActorID || Action || Resource || PayloadHash)
```

- If an attacker or compromised agent attempts to alter or delete an earlier log entry, the cryptographic hash chain breaks, immediately triggering an `AUDIT_TAMPERING_DETECTED` system alarm.

---

## 4. Neo4j Audit Lineage Traversal (Cypher)

The complete audit path from a deployed Git commit back to the originating human user can be queried in a single Cypher traversal:

```cypher
MATCH (c:Commit {hash: $commitHash})
MATCH path = (u:User)-[:CREATES]->(t:Task)-[:HAS_RUN]->(e:Execution)-[:PRODUCES]->(c)
OPTIONAL MATCH (c)-[:MODIFIES]->(f:File)
OPTIONAL MATCH (c)-[:VERIFIED_BY]->(ts:Test)
OPTIONAL MATCH (t)-[:REQUIRES_APPROVAL]->(app:Approval)<-[:DECIDES]-(approver:User)

RETURN u.username AS InitiatingUser,
       t.title AS OriginalTask,
       e.assigned_agent AS ExecutingAgent,
       c.hash AS Commit,
       collect(DISTINCT f.path) AS ModifiedFiles,
       collect(DISTINCT ts.name) AS VerifiedTests,
       app.status AS ApprovalStatus,
       approver.username AS ApprovedBy;
```

---

## 5. Audit Log Retention & Compliance Policy
- **Retention Period:** 365 days minimum online; monthly compressed archives stored locally and backed up.
- **Zero In-Place Deletions:** `DELETE` and `UPDATE` permissions on the `audit_logs` table are revoked from application database roles; only `INSERT` and `SELECT` are granted.
- **Export Formats:** Supports automated export to JSON Lines (`.jsonl`) and CSV for external compliance reviews.
