# Agent Permissions & Access Control Matrix: KDI AI Office

## 1. Permission Architecture & Risk Stratification
The **KDI AI Office** security model implements the **Principle of Least Privilege (PoLP)**. No agent receives superuser or unmediated host access. Permissions are categorized by action types and mapped directly to four operational risk levels.

---

## 2. Risk Levels & Approval Gates

| Risk Level | Definition & Criteria | Approval Requirement | Execution Mode |
|---|---|---|---|
| **LOW** | Read-only operations, local documentation edits, running unit tests on non-production branches, internal queries to Neo4j/Postgres. | **Automatic** (No human approval needed). | Direct automated execution. |
| **MEDIUM** | Creating local working branches, committing code to task-specific branches, adding new test files, modifying development config files. | **Audited Auto** (Allowed if within task scope, logged to audit stream). | Automated with instant notification. |
| **HIGH** | Pushing git branches to remote repositories, database schema migrations (`ALTER`, `CREATE INDEX`), installing third-party npm/pip packages, deleting test data. | **Mandatory Human Approval** (Blocks until developer signs off in dashboard). | Suspended awaiting interactive sign-off. |
| **CRITICAL** | Production deployment, direct commits to `main`/`master`, `DROP TABLE`/`TRUNCATE`, destructive file deletion, modifying secrets or SSH keys. | **Mandatory Human Approval + MFA / Master Key** (Default blocked for all agents). | Strict block; human execution preferred. |

---

## 3. Comprehensive Agent Permission Matrix

| Agent Persona | READ | WRITE | EXECUTE | COMMIT | PUSH | DEPLOY | MIGRATE | DELETE | ADMIN | Max Risk Autonomy |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **AI Manager** | ✅ | ✅ (Plans) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **Product Manager** | ✅ | ✅ (Docs) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **Business Analyst** | ✅ | ✅ (Specs)| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **System Architect** | ✅ | ✅ (ADRs) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **Database Architect** | ✅ | ✅ (DDL) | ⚠️ (Dry-run)| ❌ | ❌ | ❌ | ⚠️ (Requires Approval) | ❌ | ❌ | HIGH (Gated) |
| **Frontend Engineer** | ✅ | ✅ (UI) | ✅ (npm test)| ✅ (Branch)| ⚠️ (Gated)| ❌ | ❌ | ❌ | ❌ | MEDIUM |
| **Backend Engineer** | ✅ | ✅ (API) | ✅ (Local test)| ✅ (Branch)| ⚠️ (Gated)| ❌ | ❌ | ❌ | ❌ | MEDIUM |
| **Software Engineer** | ✅ | ✅ (Code)| ✅ (Local test)| ✅ (Branch)| ⚠️ (Gated)| ❌ | ❌ | ❌ | ❌ | MEDIUM |
| **DevOps Engineer** | ✅ | ✅ (Config)| ✅ (Docker inspect)| ✅ (Branch)| ⚠️ (Gated)| ⚠️ (Gated)| ❌ | ❌ | ❌ | HIGH (Gated) |
| **QA Engineer** | ✅ | ✅ (Tests)| ✅ (Test runners)| ✅ (Branch)| ❌ | ❌ | ❌ | ❌ | ❌ | MEDIUM |
| **Security Engineer** | ✅ | ✅ (Reports)| ✅ (Linters/Scanners)| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **Code Reviewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **Researcher** | ✅ | ✅ (Notes)| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | LOW |
| **Technical Writer** | ✅ | ✅ (Docs) | ❌ | ✅ (Branch)| ⚠️ (Gated)| ❌ | ❌ | ❌ | ❌ | MEDIUM |

*Legend: ✅ = Permitted autonomously; ⚠️ = Gated by Mandatory Human Approval; ❌ = Strictly Forbidden.*

---

## 4. Forbidden Action Catalog (Universal Prohibitions)
Regardless of persona or prompt instruction, the following actions are globally blocked by the Sandboxed Execution Engine:

1. **Unrestricted Shell Execution:** Spawning interactive shells (`/bin/bash`, `powershell.exe`, `cmd.exe`) without command whitelisting.
2. **Path Traversal Escapes:** Any filesystem operation attempting to access parent paths (`../`, `C:\Windows`, `/etc/`, `/root`) outside the dedicated task workspace directory.
3. **Direct Database Drop:** Running `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE`, or `TRUNCATE` against live environments without explicit emergency override flags.
4. **Secret Exfiltration:** Emitting API keys, `.env` file contents, or private SSH keys into chat responses, logs, or git commits.
5. **Main Branch Mutation:** Direct pushes or force pushes (`git push --force`) to protected branches (`main`, `master`, `release/*`).
6. **Network Sniffing & Port Scanning:** Initiating unauthorized outbound socket scans against internal office networks.

---

## 5. Policy Enforcement & Audit Mechanism
Every tool invocation checks policy rules through the `PolicyEngine` before calling the underlying system driver:

```typescript
// Conceptual Policy Interceptor
export async function enforceToolPolicy(
  agent: AgentPersona,
  toolCall: ToolCallRequest
): Promise<PolicyDecision> {
  const risk = evaluateRisk(toolCall);
  
  if (isForbidden(agent, toolCall)) {
    await auditLogViolation(agent, toolCall, "FORBIDDEN_ACTION_BLOCKED");
    throw new SecurityException(`Action ${toolCall.action} is strictly forbidden for ${agent.role}`);
  }

  if (risk === RiskLevel.HIGH || risk === RiskLevel.CRITICAL) {
    const approvalId = await createApprovalRequest(agent, toolCall, risk);
    return { status: "WAITING_APPROVAL", approvalId };
  }

  return { status: "ALLOWED" };
}
```
