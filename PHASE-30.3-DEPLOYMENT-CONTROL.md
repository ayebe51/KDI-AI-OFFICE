# KDI PHASE 30.3 — DEPLOYMENT CONTROL & BENCHMARK ENVELOPE SPECIFICATION
**Document Version:** 1.0.0  
**Timestamp:** 2026-10-15T13:28:30+07:00  
**Phase:** 30.3 Live Production Evidence Benchmark  
**Authoritative Verdict:** READY_WITH_CONDITIONS  

---

## 1. Authority Model: Bounded Autonomy Envelope (§4)

Phase 30.3 strictly prohibits granting broad, unconstrained, or permanent autonomous production authority.

Production testing operates exclusively within a narrowly scoped, human-authorized **Benchmark Envelope**. The envelope defines exact constraints, quotas, and cryptographic proof of human delegation.

### 1.1 Benchmark Envelope Schema (§4)

```typescript
export interface BenchmarkEnvelope {
  benchmarkId: string;
  approvedProject: 'KDI' | 'SIMMACI' | 'ILMORA';
  approvedService: string;
  approvedEnvironment: 'PRODUCTION' | 'STAGING' | 'LOCAL_DRY_RUN';
  approvedReleaseOrTaskScope: string[];
  approvedTimeWindow: {
    start: string; // ISO 8601 UTC
    end: string;   // ISO 8601 UTC
  };
  maximumCanaryScopePct: number;    // E.g., max 10%
  maximumDeploymentCount: number;   // E.g., max 3 deployments
  maximumRollbackCount: number;     // E.g., max 1 rollback
  allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY' | 'MANUAL_APPROVAL_REQUIRED';
  rollbackTarget: string;           // Explicit release ID (rel_...)
  killSwitchOwner: string;          // Lead operator email/identity
  humanSignatureOrAuthToken: string;// Cryptographic HMAC/Ed25519 signature
  authorizedBy: string;             // Human authorizer name/role
  createdAt: string;                // ISO 8601 UTC
}
```

### 1.2 Boundary Invariants & Evaluation Rules
1. **Self-Authorization Prohibition:** The agent cannot create, self-sign, or enlarge a benchmark envelope.
2. **Deterministic Risk Eligibility:** Only releases independently classified as `LOW` risk by `RiskClassifier` are eligible for autonomous canary under `allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY'`.
3. **Elevated Risk Boundary (§14):** Medium, High, Critical, and Unknown risk changes MUST stop at the human approval boundary, even when submitted within an active benchmark envelope.
4. **Time-Window Enclosure:** Requests evaluated before `start` or after `end` are strictly rejected with `ENVELOPE_TIME_EXPIRED`.
5. **Project / Service / Environment Lockdown:** Any mismatch between request attributes and envelope scopes triggers immediate `ENVELOPE_SCOPE_MISMATCH`.
6. **Quota Hard Stops:** When `envelopeDeploymentCount >= maximumDeploymentCount`, further autonomous deployments are blocked with `ENVELOPE_LIMIT_EXCEEDED`.
7. **Default State:**
   ```text
   PHASE30_AUTONOMY_ENABLED = false
   PRODUCTION_MUTATION = DISABLED
   ```

---

## 2. Authoritative Call Graph & Control Plane (§7)

The authoritative, single-entry execution pipeline is strictly wired as follows:

```text
[Engineering Change / Request]
             ↓
    Phase30Controller (§11)
             ↓
     RiskClassifier (§11)
             ↓
     Phase30Policy (§11, §4)
             ↓
 DeploymentTargetRegistry (§11)
             ↓
   ReleaseRegistryService (§12)
             ↓
ReleaseDeploymentAdapter (§11)
             ↓
AuthorizedReleaseExecutor (§11)
             ↓
      Deployment Target
             ↓
    TelemetryAdapter (§13)
             ↓
        Health Gate
        ┌────┴────┐
        ↓         ↓
     HEALTHY   DEGRADED / FAILED
        ↓         ↓
     PROMOTION  AUTOMATED ROLLBACK
        ↓         ↓
     AuditService (SHA-256 Chained Ledger)
```

---

## 3. Deployment Bypass Audit (§7)

Every potential execution path in the repository was inspected to verify that no autonomous process can bypass the Phase 30 control plane.

| Execution Path Discovered | Implementation Mechanism | Classification | Control Mechanism & Protection |
|---|---|---|---|
| `Phase30Controller.handleReleaseRequest()` | In-process TypeScript orchestrator | **CONTROL_PLANE_ONLY** | Authoritative path. Enforces risk, policy, quota, target registry, and audit. |
| Direct SSH / SCP commands | Terminal / SSH client | **BLOCKED** | No SSH keys or remote agent keys present on workstation. |
| Docker CLI commands | `docker run / push / build` | **BLOCKED** | Docker engine/CLI not installed or accessible in PATH. |
| Direct shell deployments (`kubectl`, `helm`) | Terminal / pwsh / bash | **BLOCKED** | Kubeconfig not configured; executor blocks raw shell scripts. |
| CI/CD Webhook triggers | HTTP POST to GitHub/GitLab | **HUMAN_ONLY** | CI pipeline triggers require human access tokens not available to agent. |
| Emergency Manual Shell Scripts | `scripts/emergency-rollback.ps1` | **HUMAN_ONLY** | Explicitly documented as emergency human operator script; not callable by agent. |
| Unit / Safety Test Harnesses | `node --test` test files | **TEST_ONLY** | Executes against mock targets and dry-run adapters; zero production mutation. |

**Result:** Zero autonomous bypass paths exist. All autonomous deployment attempts are strictly constrained to `Phase30Controller`.

---

## 4. Release Identity & Durability (§8)

### 4.1 Release Identifier Standard
Every release registered in `ReleaseRegistryService` follows the deterministic naming standard:
```text
rel_<project>_<service>_<version>_<commitSha7>
```
*Example:* `rel_simmaci_simmaci-academic-portal_1.0.1_5242855`

### 4.2 Explicit Rollback Target Enforcement
- All candidate releases targeting production or staging must declare a verified, pre-existing `rollbackTargetReleaseId`.
- Relative Git references such as `HEAD~1`, `HEAD^`, or `master~1` are **strictly rejected** with `InvalidRollbackTargetError`.
- Rollback target existence and environment matching are verified before any deployment operation is dispatched.

### 4.3 Persistence & Process Durability
- The release registry state is persisted to disk in `ReleaseRegistryService` via atomic JSON writes.
- Across process restart, the active release, target release, and rollback history are restored and verified.
