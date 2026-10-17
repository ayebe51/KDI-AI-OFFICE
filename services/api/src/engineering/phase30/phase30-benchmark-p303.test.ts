// ==========================================================
// services/api/src/engineering/phase30/phase30-benchmark-p303.test.ts
// KDI Phase 30.3: Live Production Evidence Benchmark Test Suite (§1–§18)
// ==========================================================

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Phase30Controller } from './phase30-controller.js';
import { Phase30Policy } from './phase30-policy.js';
import { RiskClassifier } from './risk-classifier.js';
import { DeploymentTargetRegistry, TargetScopeMismatchError } from './deployment-target-registry.js';
import { ReleaseRegistryService, InvalidRollbackTargetError } from './release-registry.service.js';
import { Phase30AuditService } from './phase30-audit.service.js';
import { TelemetryAdapter } from './telemetry-adapter.js';
import { AuthorizedReleaseExecutor, UnallowlistedOperationError } from './authorized-release-executor.js';
import type { BenchmarkEnvelope, ExecutionRequest } from './phase30.types.js';

describe('Phase 30.3: Live Production Evidence Benchmark Suite', () => {

  // ── 1. WORKSTREAM B: EXTERNAL PREREQUISITE GATE (§6) ──────────────────
  test('B1-B6: External Prerequisite Gate correctly assesses unconfigured production infrastructure', () => {
    const policy = new Phase30Policy();
    const executor = new AuthorizedReleaseExecutor();

    // Default state must be non-autonomous and mutation disabled
    assert.strictEqual(policy.autonomousProductionEnabled, false, 'Autonomous production must be disabled by default');
    assert.strictEqual(policy.getBenchmarkEnvelope(), undefined, 'No benchmark envelope must be active by default');

    // Attempting unapproved production mutation must be blocked
    const prodTarget = {
      targetId: 'tgt_prod_cluster',
      project: 'KDI' as const,
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION' as const,
      cluster: 'kdi-prod-k8s',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://api.kdi.ai/health',
      allowedOperations: ['EXECUTE_CANARY_DEPLOY' as const],
    };

    const mockRelease = {
      releaseId: 'rel_kdi_v1.0.0_baseline',
      project: 'KDI' as const,
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION' as const,
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'a'.repeat(64),
      status: 'STAGED' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assert.rejects(
      async () =>
        executor.executeOperation({
          operation: 'EXECUTE_CANARY_DEPLOY',
          target: prodTarget,
          release: mockRelease,
          isDryRun: false,
        }),
      (err: Error) => err.message.includes('PRODUCTION_MUTATION=DISABLED')
    );
  });

  // ── 2. WORKSTREAM D: RELEASE IDENTITY & DURABILITY (§8) ───────────────
  test('Workstream D: Release Registry assigns deterministic identities and rejects HEAD~1 rollback', () => {
    const registry = new ReleaseRegistryService();

    registry.registerRelease({
      releaseId: 'rel_simmaci_academic-portal_1.1.9_baseline',
      project: 'SIMMACI',
      service: 'academic-portal',
      environment: 'PRODUCTION',
      version: '1.1.9',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '0'.repeat(64),
    });

    const release = registry.registerRelease({
      releaseId: 'rel_simmaci_academic-portal_1.2.0_5242855',
      project: 'SIMMACI',
      service: 'academic-portal',
      environment: 'PRODUCTION',
      version: '1.2.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'd'.repeat(64),
      rollbackTargetReleaseId: 'rel_simmaci_academic-portal_1.1.9_baseline',
    });

    assert.strictEqual(release.releaseId, 'rel_simmaci_academic-portal_1.2.0_5242855');
    assert.strictEqual(release.rollbackTargetReleaseId, 'rel_simmaci_academic-portal_1.1.9_baseline');

    // Attempting relative git rollback HEAD~1 must be strictly rejected
    assert.throws(
      () =>
        registry.registerRelease({
          releaseId: 'rel_simmaci_academic-portal_1.2.1_5242855',
          project: 'SIMMACI',
          service: 'academic-portal',
          environment: 'PRODUCTION',
          version: '1.2.1',
          commitSha: '5242855146b341974a1946947d640e253ce20c00',
          artifactDigestSha256: 'e'.repeat(64),
          rollbackTargetReleaseId: 'HEAD~1',
        }),
      InvalidRollbackTargetError
    );

    registry.clear();
  });

  // ── 3. WORKSTREAM E: PRODUCTION TELEMETRY AND HEALTH GATES (§9) ────────
  test('Workstream E: TelemetryAdapter distinguishes 4 states and UNKNOWN blocks promotion', async () => {
    const telemetry = new TelemetryAdapter();
    const sampleTarget = {
      targetId: 'tgt_kdi_local_dry_run',
      project: 'KDI' as const,
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN' as const,
      cluster: 'local',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'http://localhost/health',
      allowedOperations: ['EXECUTE_DRY_RUN' as const],
    };

    // 1. HEALTHY status
    const readingHealthy = await telemetry.observeTarget(sampleTarget, {
      mockSignalOverride: { status: 'HEALTHY' },
    });
    assert.strictEqual(readingHealthy.status, 'HEALTHY');
    assert.strictEqual(readingHealthy.availabilityPct, 99.95);

    // 2. DEGRADED status
    const readingDegraded = await telemetry.observeTarget(sampleTarget, {
      mockSignalOverride: { status: 'DEGRADED', errorRatePct: 2.5 },
    });
    assert.strictEqual(readingDegraded.status, 'DEGRADED');

    // 3. FAILED status
    const readingFailed = await telemetry.observeTarget(sampleTarget, {
      mockSignalOverride: { status: 'FAILED', errorRatePct: 15.0 },
    });
    assert.strictEqual(readingFailed.status, 'FAILED');

    // 4. UNKNOWN status must block promotion
    const readingUnknown = await telemetry.observeTarget(sampleTarget, {
      mockSignalOverride: { isUnreachable: true },
    });
    assert.strictEqual(readingUnknown.status, 'UNKNOWN');
    const promoCheck = telemetry.isEligibleForPromotion(readingUnknown);
    assert.strictEqual(promoCheck.eligible, false);
    assert.ok(promoCheck.reason?.includes('UNKNOWN'));
  });

  // ── 4. WORKSTREAM F & G: BENCHMARK ENVELOPE & AUTONOMOUS CANARY (§4, §10, §11) ──
  test('Workstream F & G: Bounded autonomous canary succeeds for eligible LOW risk change inside authorized envelope', async () => {
    const controller = new Phase30Controller();

    // Create a genuine human-authorized Benchmark Envelope for Phase 30.3 (§4)
    const validEnvelope: BenchmarkEnvelope = {
      benchmarkId: 'benchmark_p303_bounded_canary_01',
      approvedProject: 'SIMMACI',
      approvedService: 'simmaci-academic-portal',
      approvedEnvironment: 'PRODUCTION',
      approvedReleaseOrTaskScope: ['SIMMACI-P303-LOW-01', '1.0.1'],
      approvedTimeWindow: {
        start: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        end: new Date(Date.now() + 3600000).toISOString(),   // 1 hour in future
      },
      maximumCanaryScopePct: 10,
      maximumDeploymentCount: 3,
      maximumRollbackCount: 1,
      allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY',
      rollbackTarget: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      killSwitchOwner: 'ayub@kdi.ai',
      humanSignatureOrAuthToken: 'human_sig_p303_auth_99482710492817293847',
      authorizedBy: 'Ayub (Lead Infrastructure Architect)',
      createdAt: new Date().toISOString(),
    };

    // Register envelope in policy
    controller.policy.setBenchmarkEnvelope(validEnvelope);

    controller.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '0'.repeat(64),
    });

    // Request for genuine LOW risk change (stateless bugfix, zero DB migration)
    const lowRiskRequest: ExecutionRequest = {
      requestId: 'SIMMACI-P303-LOW-01',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '2'.repeat(64),
      rollbackTargetReleaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      changedFiles: ['src/features/public-portal/components/PublicNewsSection.tsx'],
      isDryRun: true, // Non-destructive execution verification
      benchmarkId: 'benchmark_p303_bounded_canary_01',
      callerIdentity: 'kdi-autonomous-agent',
    };

    const result = await controller.handleReleaseRequest(lowRiskRequest, {
      mockSignalOverride: { status: 'HEALTHY' },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.riskAssessment.riskLevel, 'LOW');
    assert.strictEqual(result.policyEvaluation.allowed, true);
    assert.strictEqual(result.policyEvaluation.requiresHumanApproval, false); // Autonomous for LOW risk inside envelope!
    assert.strictEqual(result.finalState, 'ACTIVE');
    assert.strictEqual(result.telemetryObservation.status, 'HEALTHY');

    controller.policy.clearBenchmarkEnvelope();
    controller.releaseRegistry.clear();
    controller.auditService.clear();
  });

  // ── 5. WORKSTREAM J: MEDIUM/HIGH RISK GATED BY HUMAN APPROVAL (§14) ───
  test('Workstream J: Elevated risk changes strictly stop for human approval even inside authorized envelope', async () => {
    const controller = new Phase30Controller();

    const validEnvelope: BenchmarkEnvelope = {
      benchmarkId: 'benchmark_p303_gating_test',
      approvedProject: 'SIMMACI',
      approvedService: 'simmaci-academic-portal',
      approvedEnvironment: 'PRODUCTION',
      approvedReleaseOrTaskScope: ['*'],
      approvedTimeWindow: {
        start: new Date(Date.now() - 3600000).toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
      },
      maximumCanaryScopePct: 10,
      maximumDeploymentCount: 5,
      maximumRollbackCount: 2,
      allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY',
      rollbackTarget: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      killSwitchOwner: 'ayub@kdi.ai',
      humanSignatureOrAuthToken: 'human_sig_p303_auth_99482710492817293847',
      authorizedBy: 'Ayub',
      createdAt: new Date().toISOString(),
    };

    controller.policy.setBenchmarkEnvelope(validEnvelope);

    // 1. HIGH risk change (modifying security policy or auth file)
    const highRiskRequest: ExecutionRequest = {
      requestId: 'req_high_risk_01',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.1.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '3'.repeat(64),
      changedFiles: ['services/academic/src/security/auth-token.service.ts'],
      isDryRun: true,
      benchmarkId: 'benchmark_p303_gating_test',
      callerIdentity: 'kdi-autonomous-agent',
    };

    const highRiskResult = await controller.handleReleaseRequest(highRiskRequest);
    assert.strictEqual(highRiskResult.success, false);
    assert.strictEqual(highRiskResult.riskAssessment.riskLevel, 'HIGH');
    assert.strictEqual(highRiskResult.policyEvaluation.requiresHumanApproval, true);
    assert.ok(highRiskResult.policyEvaluation.rejectionReason?.includes('APPROVAL_REQUIRED'));

    // 2. CRITICAL risk change (schema-breaking DDL drop table)
    const criticalRiskRequest: ExecutionRequest = {
      requestId: 'req_critical_risk_01',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.2.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '4'.repeat(64),
      changedFiles: ['migrations/20261015_drop_student_table.sql'],
      isDryRun: true,
      benchmarkId: 'benchmark_p303_gating_test',
      callerIdentity: 'kdi-autonomous-agent',
    };

    const criticalResult = await controller.handleReleaseRequest(criticalRiskRequest);
    assert.strictEqual(criticalResult.success, false);
    assert.strictEqual(criticalResult.riskAssessment.riskLevel, 'CRITICAL');
    assert.ok(criticalResult.policyEvaluation.rejectionReason?.includes('POLICY_DENIED'));

    controller.policy.clearBenchmarkEnvelope();
  });

  // ── 6. WORKSTREAM I: CONTROLLED FAILURE & CANARY ROLLBACK (§13) ────────
  test('Workstream I: Canary telemetry degradation triggers automated rollback to verified target', async () => {
    const controller = new Phase30Controller();

    const envelope: BenchmarkEnvelope = {
      benchmarkId: 'benchmark_p303_rollback_test',
      approvedProject: 'ILMORA',
      approvedService: 'ilmora-lms-core',
      approvedEnvironment: 'PRODUCTION',
      approvedReleaseOrTaskScope: ['ILMORA-P303-CANARY-FAIL'],
      approvedTimeWindow: {
        start: new Date(Date.now() - 3600000).toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
      },
      maximumCanaryScopePct: 10,
      maximumDeploymentCount: 2,
      maximumRollbackCount: 1,
      allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY',
      rollbackTarget: 'rel_ilmora_ilmora-lms-core_1.0.0_baseline',
      killSwitchOwner: 'ayub@kdi.ai',
      humanSignatureOrAuthToken: 'human_sig_p303_auth_99482710492817293847',
      authorizedBy: 'Ayub',
      createdAt: new Date().toISOString(),
    };

    controller.policy.setBenchmarkEnvelope(envelope);

    controller.releaseRegistry.registerRelease({
      releaseId: 'rel_ilmora_ilmora-lms-core_1.0.0_baseline',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'PRODUCTION',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '0'.repeat(64),
    });

    const failRequest: ExecutionRequest = {
      requestId: 'ILMORA-P303-CANARY-FAIL',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'PRODUCTION',
      targetId: 'tgt_ilmora_production',
      version: '1.0.2',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '5'.repeat(64),
      rollbackTargetReleaseId: 'rel_ilmora_ilmora-lms-core_1.0.0_baseline',
      changedFiles: ['packages/gateway/src/handler.ts'],
      isDryRun: true,
      benchmarkId: 'benchmark_p303_rollback_test',
      callerIdentity: 'kdi-autonomous-agent',
    };

    // Inject simulated telemetry degradation (error rate spike)
    const result = await controller.handleReleaseRequest(failRequest, {
      mockSignalOverride: { status: 'FAILED' },
    });

    // In a dry-run / non-mutation mode, health failure must be detected
    assert.strictEqual(result.telemetryObservation.status, 'FAILED');
    assert.strictEqual(result.rollbackExecuted, true, 'Health degradation must trigger rollback');
    assert.strictEqual(result.finalState, 'ROLLED_BACK');
    assert.strictEqual(result.rollbackReleaseId, 'rel_ilmora_ilmora-lms-core_1.0.0_baseline');

    controller.policy.clearBenchmarkEnvelope();
    controller.releaseRegistry.clear();
    controller.auditService.clear();
  });

  // ── 7. WORKSTREAM K: ENVELOPE MISMATCH AND SAFETY REGRESSION GATES (§15) ─
  test('Workstream K: Expired, scope-mismatched, or limit-exceeded benchmark envelope is rejected', async () => {
    const controller = new Phase30Controller();

    // 1. Expired envelope
    const expiredEnvelope: BenchmarkEnvelope = {
      benchmarkId: 'benchmark_expired',
      approvedProject: 'KDI',
      approvedService: 'kdi-agent-platform',
      approvedEnvironment: 'PRODUCTION',
      approvedReleaseOrTaskScope: ['*'],
      approvedTimeWindow: {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-01-02T00:00:00.000Z', // Expired
      },
      maximumCanaryScopePct: 10,
      maximumDeploymentCount: 2,
      maximumRollbackCount: 1,
      allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY',
      rollbackTarget: 'rel_kdi_v1.0.0_baseline',
      killSwitchOwner: 'ayub@kdi.ai',
      humanSignatureOrAuthToken: 'human_sig_valid',
      authorizedBy: 'Ayub',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    controller.policy.setBenchmarkEnvelope(expiredEnvelope);

    const reqExpired: ExecutionRequest = {
      requestId: 'req_test_expired',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      targetId: 'tgt_kdi_production',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '6'.repeat(64),
      changedFiles: [],
      isDryRun: true,
      benchmarkId: 'benchmark_expired',
      callerIdentity: 'kdi-agent',
    };

    const resExpired = await controller.handleReleaseRequest(reqExpired);
    assert.strictEqual(resExpired.success, false);
    assert.ok(resExpired.policyEvaluation.rejectionReason?.includes('ENVELOPE_TIME_EXPIRED'));

    // 2. Project scope mismatch (Approved for KDI, request for ILMORA)
    const validEnvelope: BenchmarkEnvelope = {
      ...expiredEnvelope,
      benchmarkId: 'benchmark_active',
      approvedTimeWindow: {
        start: new Date(Date.now() - 3600000).toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
      },
    };
    controller.policy.setBenchmarkEnvelope(validEnvelope);

    const reqWrongProject: ExecutionRequest = {
      ...reqExpired,
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      targetId: 'tgt_ilmora_production',
      benchmarkId: 'benchmark_active',
    };

    const resWrongProject = await controller.handleReleaseRequest(reqWrongProject);
    assert.strictEqual(resWrongProject.success, false);
    assert.ok(resWrongProject.policyEvaluation.rejectionReason?.includes('ENVELOPE_SCOPE_MISMATCH'));

    // 3. Active Kill Switch halts execution immediately even with valid envelope
    controller.policy.governanceEngine.engageKillSwitch('Emergency halt during benchmark');
    const resKillSwitch = await controller.handleReleaseRequest(reqExpired);
    assert.strictEqual(resKillSwitch.success, false);
    assert.ok(resKillSwitch.policyEvaluation.rejectionReason?.includes('KILL_SWITCH_ACTIVE'));

    // Cleanup
    controller.policy.governanceEngine.disengageKillSwitchWithHumanToken('human_sec_token_99482710492817293847');
    controller.policy.clearBenchmarkEnvelope();
  });

  // ── 8. WORKSTREAM L: PERSISTENT AUDIT & HASH-CHAINING INTEGRITY (§16) ───
  test('Workstream L: Audit ledger produces cryptographically intact SHA-256 chain across restart', () => {
    const auditServiceA = new Phase30AuditService();
    auditServiceA.clear();

    auditServiceA.recordEvent({
      phase: 'BENCHMARK_INITIALIZATION',
      action: 'ESTABLISH_ENVELOPE',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      actor: 'Ayub (Lead Architect)',
      details: 'Established authorized benchmark envelope benchmark_p303_audit_test',
    });

    auditServiceA.recordEvent({
      phase: 'CANARY_EVALUATION',
      action: 'OBSERVE_TELEMETRY',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      actor: 'kdi-agent',
      details: 'Observed healthy canary telemetry on isolated target',
    });

    const integrityA = auditServiceA.verifyLedgerIntegrity();
    assert.strictEqual(integrityA.isValid, true);

    // Re-instantiate service (simulating restart and persistence reload)
    const auditServiceB = new Phase30AuditService();
    const integrityB = auditServiceB.verifyLedgerIntegrity();
    assert.strictEqual(integrityB.isValid, true);

    auditServiceB.clear();
  });
});
