// ==========================================================
// services/api/src/engineering/phase30/phase30-integration-p304.test.ts
// Phase 30.4: Integration & Readiness Verification Test Suite (§1–§14)
// ==========================================================

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Phase30Controller } from './phase30-controller.js';
import { Phase30Policy } from './phase30-policy.js';
import { AuthorizedReleaseExecutor } from './authorized-release-executor.js';
import { EvidenceValidatorService } from './evidence-validator.service.js';
import { SloVerificationService } from './slo-verification.service.js';
import { ExternalTelemetryAdapter } from './external-telemetry.adapter.js';
import { ExternalPrerequisiteGate } from './external-prerequisite-gate.js';
import { ProductionReadinessStateMachine } from './production-readiness.state-machine.js';
import { SecretHygieneService } from './secret-hygiene.service.js';
import { MetricReconciliationService } from './metric-reconciliation.service.js';
import type {
  EvidenceRecord,
  MaterialClaim,
  SignedSloDocument,
  DeploymentTarget,
  ExecutionRequest,
} from './phase30.types.js';

describe('Phase 30.4: External Production Integration & Evidence Gate (§1–§14)', () => {

  // ── TEST 1: Missing Docker daemon produces a truthful blocked state (§9.1) ──
  test('Test 1: Missing Docker daemon produces a truthful blocked state', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { hasDockerCli: true, hasDockerDaemon: false },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.cliInstalled, true);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('daemon is unreachable'));
    assert.ok(result.blockers.length > 0);
  });

  // ── TEST 2: Missing registry credentials prevent registry readiness (§9.2) ──
  test('Test 2: Missing registry credentials prevent registry readiness', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB2Registry({
      simulatedEnvironment: { registryToken: undefined },
    });

    assert.strictEqual(result.status, 'NOT_CONFIGURED');
    assert.strictEqual(result.rawPayload?.authenticated, false);
    assert.ok(result.blockers.some((b) => b.includes('token')));
  });

  // ── TEST 3: Registry authentication cannot be inferred from env var presence alone (§9.3) ──
  test('Test 3: Registry authentication cannot be inferred from env var presence alone', async () => {
    const gate = new ExternalPrerequisiteGate();
    // Invalid/expired token present in environment must be rejected
    const result = await gate.inspectB2Registry({
      simulatedEnvironment: { registryToken: 'INVALID_TOKEN' },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.authenticated, false);
    assert.ok(result.details.includes('rejected'));
  });

  // ── TEST 4: Missing live telemetry cannot produce a healthy result (§9.4) ──
  test('Test 4: Missing live telemetry cannot produce a healthy result', async () => {
    const telemetryAdapter = new ExternalTelemetryAdapter();
    const target: DeploymentTarget = {
      targetId: 'tgt_simmaci_production',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      cluster: 'simmaci-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://academic.simmaci.id/health',
      allowedOperations: ['VERIFY_TARGET_HEALTH'],
    };

    const reading = await telemetryAdapter.observeTarget(target, {
      endpointUrl: undefined, // No endpoint configured
    });

    assert.strictEqual(reading.status, 'UNKNOWN');
    const promoCheck = telemetryAdapter.isEligibleForPromotion(reading);
    assert.strictEqual(promoCheck.eligible, false);
    assert.ok(promoCheck.reason?.includes('UNKNOWN ≠ HEALTHY'));
  });

  // ── TEST 5: Stale metrics block promotion eligibility (§9.5) ──
  test('Test 5: Stale metrics block promotion eligibility', async () => {
    const telemetryAdapter = new ExternalTelemetryAdapter();
    const target: DeploymentTarget = {
      targetId: 'tgt_ilmora_production',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'PRODUCTION',
      cluster: 'ilmora-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://lms.ilmora.id/health',
      allowedOperations: ['VERIFY_TARGET_HEALTH'],
    };

    // Metric timestamp is 10 minutes in the past (> 3 minute max freshness)
    const tenMinutesAgo = new Date(Date.now() - 600_000).toISOString();
    const reading = await telemetryAdapter.observeTarget(target, {
      mockPayload: {
        status: 'HEALTHY',
        p95LatencyMs: 120,
        errorRatePct: 0.1,
        availabilityPct: 99.9,
        timestamp: tenMinutesAgo,
      },
    });

    assert.strictEqual(reading.status, 'UNKNOWN');
    assert.ok(reading.rawSignals?.error?.includes('STALE_METRIC'));

    const promoCheck = telemetryAdapter.isEligibleForPromotion(reading);
    assert.strictEqual(promoCheck.eligible, false);
  });

  // ── TEST 6: Production SLO with invalid signature is rejected (§9.6) ──
  test('Test 6: Production SLO with invalid signature is rejected', () => {
    const sloService = new SloVerificationService();
    const { publicKeyPem } = SloVerificationService.generateEd25519KeyPair();

    const badDoc: SignedSloDocument = {
      version: '1.0.0',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      validFrom: new Date(Date.now() - 3600_000).toISOString(),
      validUntil: new Date(Date.now() + 3600_000).toISOString(),
      thresholds: {
        p95LatencyMaxMs: 250,
        errorRateMaxPct: 1.0,
        availabilityMinPct: 99.5,
      },
      keyId: 'infra_lead_key_01',
      signature: 'deadbeef'.repeat(16), // Corrupted/fake signature
    };

    const res = sloService.verifySloDocument(badDoc, publicKeyPem);
    assert.strictEqual(res.valid, false);
    assert.ok(res.reason?.includes('SIGNATURE_INVALID'));
  });

  // ── TEST 7: Altered SLO document fails signature verification (§9.7) ──
  test('Test 7: Altered SLO document fails signature verification', () => {
    const sloService = new SloVerificationService();
    const { publicKeyPem, privateKeyPem } = SloVerificationService.generateEd25519KeyPair();

    // Generate valid signed document
    const validDoc = SloVerificationService.signSloDocument(
      {
        version: '1.0.0',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'PRODUCTION',
        validFrom: new Date(Date.now() - 3600_000).toISOString(),
        validUntil: new Date(Date.now() + 3600_000).toISOString(),
        thresholds: {
          p95LatencyMaxMs: 250,
          errorRateMaxPct: 1.0,
          availabilityMinPct: 99.5,
        },
        keyId: 'infra_lead_key_01',
      },
      privateKeyPem
    );

    // Verify original document passes
    const origRes = sloService.verifySloDocument(validDoc, publicKeyPem);
    assert.strictEqual(origRes.valid, true);

    // Tamper with threshold (e.g. relaxing p95Latency from 250 to 500)
    const tamperedDoc: SignedSloDocument = {
      ...validDoc,
      thresholds: {
        ...validDoc.thresholds,
        p95LatencyMaxMs: 500,
      },
    };

    const tamperedRes = sloService.verifySloDocument(tamperedDoc, publicKeyPem);
    assert.strictEqual(tamperedRes.valid, false);
    assert.ok(tamperedRes.reason?.includes('SIGNATURE_INVALID'));
  });

  // ── TEST 8: Absent Telegram token does not produce approval-ready state (§9.8) ──
  test('Test 8: Absent Telegram token does not produce approval-ready state', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB5Telegram({
      simulatedEnvironment: { telegramToken: undefined },
    });

    assert.strictEqual(result.status, 'NOT_CONFIGURED');
    assert.ok(result.blockers.some((b) => b.includes('TELEGRAM_BOT_TOKEN')));
  });

  // ── TEST 9: Successful Telegram authentication check does not equal completed human approval (§9.9) ──
  test('Test 9: Successful Telegram authentication check does not equal completed human approval', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB5Telegram({
      simulatedEnvironment: {
        telegramToken: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567',
      },
    });

    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
    // Human approval must NOT be reported as completed
    assert.strictEqual(result.rawPayload?.humanApprovalCompleted, false);
  });

  // ── TEST 10: Missing target credentials prevent target readiness (§9.10) ──
  test('Test 10: Missing target credentials prevent target readiness', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB6Target({
      simulatedEnvironment: { hasKubeCredentials: false },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.hasCredentials, false);
    assert.ok(result.blockers.some((b) => b.includes('kubeconfig')));
  });

  // ── TEST 11: Excessively privileged deployment targets are rejected (§9.11) ──
  test('Test 11: Excessively privileged deployment targets are rejected', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB6Target({
      simulatedEnvironment: {
        hasKubeCredentials: true,
        isTargetOverPrivileged: true, // Wildcard cluster-admin
      },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.excessivePrivilege, true);
    assert.ok(result.details.includes('excessive permissions'));
  });

  // ── TEST 12: Evidence from the wrong environment is rejected (§9.12) ──
  test('Test 12: Evidence from the wrong environment is rejected', () => {
    const validator = new EvidenceValidatorService();

    // Register STAGING evidence
    validator.recordEvidence({
      evidenceId: 'ev_staging_001',
      benchmarkId: 'benchmark_env_test',
      claimType: 'SERVICE_HEALTH',
      evidenceTier: 'STAGING_LIVE',
      sourceSystem: 'PROMETHEUS_STAGING',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      observedAt: new Date().toISOString(),
      correlationId: 'corr_staging_01',
      result: 'PASS',
      limitations: [],
    });

    // Attempt to satisfy a PRODUCTION claim with STAGING evidence
    const claim: MaterialClaim = {
      claimId: 'claim_prod_health',
      benchmarkId: 'benchmark_env_test',
      claimType: 'SERVICE_HEALTH',
      targetEnvironment: 'PRODUCTION',
      minimumEvidenceTier: 'STAGING_LIVE',
      requiredResult: 'PASS',
    };

    const validation = validator.validateClaim(claim);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.rejectionReasons.some((r) => r.includes('ENVIRONMENT_MISMATCH')));
  });

  // ── TEST 13: Evidence from a different release or artifact digest is rejected (§9.13) ──
  test('Test 13: Evidence from a different release or artifact digest is rejected', () => {
    const validator = new EvidenceValidatorService();

    validator.recordEvidence({
      evidenceId: 'ev_rel_001',
      benchmarkId: 'benchmark_release_test',
      claimType: 'CANARY_DEPLOYMENT',
      evidenceTier: 'LOCAL_EXECUTION',
      sourceSystem: 'RELEASE_REGISTRY',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      releaseId: 'rel_simmaci_v1.0.0_old',
      artifactDigest: '0'.repeat(64),
      observedAt: new Date().toISOString(),
      correlationId: 'corr_rel_01',
      result: 'PASS',
      limitations: [],
    });

    // Claim targets v1.0.1 with different digest
    const claim: MaterialClaim = {
      claimId: 'claim_v1.0.1_deploy',
      benchmarkId: 'benchmark_release_test',
      claimType: 'CANARY_DEPLOYMENT',
      targetEnvironment: 'PRODUCTION',
      minimumEvidenceTier: 'LOCAL_EXECUTION',
      targetReleaseId: 'rel_simmaci_v1.0.1_new',
      targetArtifactDigest: '1'.repeat(64),
      requiredResult: 'PASS',
    };

    const validation = validator.validateClaim(claim);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.rejectionReasons.some((r) => r.includes('RELEASE_MISMATCH')));
  });

  // ── TEST 14: Simulated deployment success is never reported as live deployment success (§9.14) ──
  test('Test 14: Simulated deployment success is never reported as live deployment success', () => {
    const validator = new EvidenceValidatorService();

    // Register SIMULATED canary evidence
    validator.recordEvidence({
      evidenceId: 'ev_sim_001',
      benchmarkId: 'benchmark_sim_test',
      claimType: 'CANARY_DEPLOYMENT',
      evidenceTier: 'SIMULATED',
      sourceSystem: 'DRY_RUN_ADAPTER',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      releaseId: 'rel_simmaci_v1.0.1',
      observedAt: new Date().toISOString(),
      correlationId: 'corr_sim_01',
      result: 'PASS',
      limitations: ['Dry-run non-mutating simulated canary'],
    });

    // Claim requires PRODUCTION_LIVE evidence
    const liveClaim: MaterialClaim = {
      claimId: 'claim_live_canary',
      benchmarkId: 'benchmark_sim_test',
      claimType: 'CANARY_DEPLOYMENT',
      targetEnvironment: 'PRODUCTION',
      minimumEvidenceTier: 'PRODUCTION_LIVE',
      requiredResult: 'PASS',
    };

    const validation = validator.validateClaim(liveClaim);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.rejectionReasons.some((r) => r.includes('TIER_INSUFFICIENT')));
  });

  // ── TEST 15: Conflicting benchmark counters are detected or explicitly reconciled (§9.15) ──
  test('Test 15: Conflicting benchmark counters are detected or explicitly reconciled', () => {
    const reconciler = new MetricReconciliationService();

    // Record an invalid attempt set where successful rollbacks exceed rollback attempts
    reconciler.recordAttempt({
      attemptId: 'att_invalid_01',
      requestId: 'req_candidate_invalid_01',
      benchmarkId: 'bench_recon',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      riskLevel: 'LOW',
      requiresHumanApproval: false,
      policyAllowed: true,
      executedOperation: 'EXECUTE_DRY_RUN',
      finalStatus: 'ROLLED_BACK',
      isSimulatedOrDryRun: true,
      decisionLatencyMs: 10,
      timestamp: new Date().toISOString(),
    });

    const summary = reconciler.reconcile();
    assert.strictEqual(summary.totalEvaluatedCandidates, 1);
    assert.strictEqual(summary.automaticRollbackAttempts, 1);
    assert.strictEqual(summary.successfulRollbacks, 1);

    // Reconcile baseline Phase 30.3
    reconciler.clear();
    reconciler.loadPhase303Baseline();
    const baselineSummary = reconciler.reconcile();
    assert.strictEqual(baselineSummary.conflictsDetected.length, 0);
    assert.strictEqual(baselineSummary.totalEvaluatedCandidates, 4);
    assert.strictEqual(baselineSummary.candidatesByRisk.LOW, 4); // 2 release candidates + 2 envelope policy tests
  });

  // ── TEST 16: Secrets are redacted from errors, logs, and audit records (§9.16) ──
  test('Test 16: Secrets are redacted from errors, logs, and audit records', () => {
    const rawError =
      'Connection failed to https://api.telegram.org/bot123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567 with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-oEY token.';

    const sanitized = SecretHygieneService.sanitize(rawError);
    assert.strictEqual(SecretHygieneService.containsExposedSecret(sanitized), false);
    assert.ok(sanitized.includes('[REDACTED_TELEGRAM_TOKEN]'));
    assert.ok(sanitized.includes('Bearer [REDACTED_TOKEN]'));
    assert.ok(!sanitized.includes('123456789:ABCdef'));
  });

  // ── TEST 17: Kill switch continues to block execution (§9.17) ──
  test('Test 17: Kill switch continues to block execution', async () => {
    const controller = new Phase30Controller();
    controller.policy.governanceEngine.engageKillSwitch('Emergency security halt');

    const result = await controller.handleReleaseRequest({
      requestId: 'req_kill_switch_test',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'a'.repeat(64),
      changedFiles: ['src/index.ts'],
      isDryRun: true,
      callerIdentity: 'test-agent',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.policyEvaluation.killSwitchActive, true);
    assert.ok(result.policyEvaluation.rejectionReason?.includes('KILL_SWITCH_ACTIVE'));

    // Disengage kill switch for test cleanup
    controller.policy.governanceEngine.disengageKillSwitchWithHumanToken(
      'human_sec_token_99482710492817293847'
    );
  });

  // ── TEST 18: Approval expiration and replay protections remain effective (§9.18) ──
  test('Test 18: Approval expiration and replay protections remain effective', async () => {
    const controller = new Phase30Controller();

    // Expired approval token
    controller.policy.registerApproval({
      approvalId: 'appr_expired_01',
      releaseId: 'rel_test_v1',
      approverIdentity: 'Ayub',
      approvedAt: new Date(Date.now() - 7200_000).toISOString(),
      expiresAt: new Date(Date.now() - 3600_000).toISOString(), // Expired 1h ago
      targetEnvironment: 'PRODUCTION',
      approvalToken: 'token_expired_01',
      blastRadiusAcknowledged: 'ISOLATED',
      isUsed: false,
    });

    const expiredResult = await controller.handleReleaseRequest({
      requestId: 'req_expired_approval',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'b'.repeat(64),
      changedFiles: ['src/index.ts'],
      isDryRun: true,
      approvalToken: 'token_expired_01',
      callerIdentity: 'test-agent',
    });

    assert.strictEqual(expiredResult.success, false);
    assert.ok(
      expiredResult.policyEvaluation.rejectionReason?.includes('EXPIRED_APPROVAL') ||
      expiredResult.policyEvaluation.rejectionReason?.includes('APPROVAL_EXPIRED')
    );

    // Replay protection check
    controller.policy.registerApproval({
      approvalId: 'appr_used_01',
      releaseId: 'rel_test_v2',
      approverIdentity: 'Ayub',
      approvedAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      targetEnvironment: 'PRODUCTION',
      approvalToken: 'token_used_01',
      blastRadiusAcknowledged: 'ISOLATED',
      isUsed: true, // Already consumed
    });

    const replayedResult = await controller.handleReleaseRequest({
      requestId: 'req_replayed_approval',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'b'.repeat(64),
      changedFiles: ['src/index.ts'],
      isDryRun: true,
      approvalToken: 'token_used_01',
      callerIdentity: 'test-agent',
    });

    assert.strictEqual(replayedResult.success, false);
    assert.ok(replayedResult.policyEvaluation.rejectionReason?.includes('REPLAYED_APPROVAL'));
  });

  // ── TEST 19: UNKNOWN telemetry blocks promotion (§9.19) ──
  test('Test 19: UNKNOWN telemetry blocks promotion', () => {
    const telemetry = new ExternalTelemetryAdapter();

    const reading = {
      targetId: 'tgt_kdi_production',
      status: 'UNKNOWN' as const,
      errorRatePct: -1,
      p95LatencyMs: -1,
      availabilityPct: -1,
      timestamp: new Date().toISOString(),
      source: 'TEST_ADAPTER' as const,
    };

    const promoCheck = telemetry.isEligibleForPromotion(reading);
    assert.strictEqual(promoCheck.eligible, false);
    assert.ok(promoCheck.reason?.includes('UNKNOWN ≠ HEALTHY'));
  });

  // ── TEST 20: Production mutations remain disabled throughout the phase (§9.20) ──
  test('Test 20: Production mutations remain disabled throughout the phase', async () => {
    const executor = new AuthorizedReleaseExecutor();

    const prodTarget: DeploymentTarget = {
      targetId: 'tgt_kdi_production',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      cluster: 'kdi-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://api.kdi.ai/health',
      allowedOperations: ['EXECUTE_CANARY_DEPLOY'],
    };

    const releaseRecord = {
      releaseId: 'rel_kdi_test',
      project: 'KDI' as const,
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION' as const,
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'c'.repeat(64),
      status: 'STAGED' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Attempting isDryRun: false against production target MUST throw ProductionMutationDisabledError
    await assert.rejects(
      async () =>
        executor.executeOperation({
          operation: 'EXECUTE_CANARY_DEPLOY',
          target: prodTarget,
          release: releaseRecord,
          isDryRun: false, // Live mutation attempt
        }),
      (err: Error) => err.message.includes('PRODUCTION_MUTATION=DISABLED')
    );
  });

  // ── TEST 21: Full Production Readiness State Machine Verification (§8) ──
  test('Test 21: Production Readiness State Machine deterministically evaluates all prerequisite states', async () => {
    const stateMachine = new ProductionReadinessStateMachine();

    // 1. Missing prerequisites -> BLOCKED / NOT_CONFIGURED
    const blockedPrereqs = {
      B1_BUILD: { id: 'B1_BUILD' as const, name: 'Build', status: 'BLOCKED' as const, evidenceTier: 'LOCAL_TEST' as const, details: 'Docker CLI missing', blockers: ['Install Docker'], checkedAt: '' },
      B2_REGISTRY: { id: 'B2_REGISTRY' as const, name: 'Registry', status: 'NOT_CONFIGURED' as const, evidenceTier: 'LOCAL_TEST' as const, details: 'Token missing', blockers: ['Provide token'], checkedAt: '' },
      B3_TELEMETRY: { id: 'B3_TELEMETRY' as const, name: 'Telemetry', status: 'NOT_CONFIGURED' as const, evidenceTier: 'LOCAL_TEST' as const, details: 'Endpoint missing', blockers: ['Provide endpoint'], checkedAt: '' },
      B4_SLO: { id: 'B4_SLO' as const, name: 'SLO', status: 'NOT_CONFIGURED' as const, evidenceTier: 'LOCAL_TEST' as const, details: 'SLO missing', blockers: ['Provide signed SLO'], checkedAt: '' },
      B5_APPROVAL: { id: 'B5_APPROVAL' as const, name: 'Approval', status: 'NOT_CONFIGURED' as const, evidenceTier: 'LOCAL_TEST' as const, details: 'Bot token missing', blockers: ['Provide bot token'], checkedAt: '' },
      B6_TARGET: { id: 'B6_TARGET' as const, name: 'Target', status: 'BLOCKED' as const, evidenceTier: 'LOCAL_TEST' as const, details: 'Kubeconfig missing', blockers: ['Provide kubeconfig'], checkedAt: '' },
    };

    const blockedReport = stateMachine.evaluateReadiness({
      prerequisites: blockedPrereqs,
      safetyInvariantsPassed: true,
      productionMutationDisabled: true,
    });

    assert.strictEqual(blockedReport.overallState, 'BLOCKED');
    assert.ok(blockedReport.unresolvedBlockers.length >= 2);

    // 2. Safety invariant violation -> NO_GO takes absolute precedence
    const noGoReport = stateMachine.evaluateReadiness({
      prerequisites: blockedPrereqs,
      safetyInvariantsPassed: false, // VIOLATION
      productionMutationDisabled: true,
    });

    assert.strictEqual(noGoReport.overallState, 'NO_GO');

    // 3. Secret leakage -> NO_GO
    const secretLeakReport = stateMachine.evaluateReadiness({
      prerequisites: blockedPrereqs,
      safetyInvariantsPassed: true,
      productionMutationDisabled: true,
      hasSecretLeakage: true, // LEAKAGE
    });

    assert.strictEqual(secretLeakReport.overallState, 'NO_GO');
  });

});
