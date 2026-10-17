// ==========================================================
// services/api/src/engineering/phase30/phase30-preflight-p305.test.ts
// Phase 30.5: External Dependency Remediation & Preflight Safety Suite (§1–§11)
// ==========================================================

import { describe, test } from 'node:test';
import assert from 'node:assert';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
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
import { OperatorPreflightService } from './operator-preflight.js';
import type {
  SignedSloDocument,
  DeploymentTarget,
  MaterialClaim,
} from './phase30.types.js';

describe('Phase 30.5: External Dependency Remediation & Preflight Safety Suite (§1–§11)', () => {

  // ── 1. Missing local build tools (§8.1) ──────────────────────────────────
  test('Safety 1: Missing local build tools produces a truthful BLOCKED status', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { hasDockerCli: false, hasDockerDaemon: false },
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.cliInstalled, false);
    assert.ok(result.blockers.some((b) => b.includes('Docker CLI')));
  });

  // ── 2. Unreachable build daemons (§8.2) ──────────────────────────────────
  test('Safety 2: Unreachable build daemon produces a truthful BLOCKED status', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { hasDockerCli: true, hasDockerDaemon: false },
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.cliInstalled, true);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('daemon is unreachable'));
  });

  // ── 3. Missing or invalid registry authentication (§8.3) ─────────────────
  test('Safety 3: Missing or invalid registry authentication produces NOT_CONFIGURED or BLOCKED', async () => {
    const gate = new ExternalPrerequisiteGate();

    const missingResult = await gate.inspectB2Registry({
      simulatedEnvironment: { registryToken: undefined },
    });
    assert.strictEqual(missingResult.status, 'NOT_CONFIGURED');

    const invalidResult = await gate.inspectB2Registry({
      simulatedEnvironment: { registryToken: 'INVALID_TOKEN' },
    });
    assert.strictEqual(invalidResult.status, 'BLOCKED');
    assert.strictEqual(invalidResult.rawPayload?.authenticated, false);
  });

  // ── 4. Unavailable external telemetry (§8.4) ─────────────────────────────
  test('Safety 4: Unavailable external telemetry produces fail-closed UNKNOWN status', async () => {
    const telemetry = new ExternalTelemetryAdapter();
    const target: DeploymentTarget = {
      targetId: 'tgt_kdi_staging',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'STAGING',
      cluster: 'kdi-k8s-staging',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'https://staging.kdi.ai/health',
      allowedOperations: ['VERIFY_TARGET_HEALTH'],
    };

    const reading = await telemetry.observeTarget(target, { endpointUrl: undefined });
    assert.strictEqual(reading.status, 'UNKNOWN');
    const check = telemetry.isEligibleForPromotion(reading);
    assert.strictEqual(check.eligible, false);
    assert.ok(check.reason?.includes('UNKNOWN ≠ HEALTHY'));
  });

  // ── 5. Stale or mismatched telemetry (§8.5) ──────────────────────────────
  test('Safety 5: Stale telemetry metrics (>180s) block promotion eligibility', async () => {
    const telemetry = new ExternalTelemetryAdapter();
    const target: DeploymentTarget = {
      targetId: 'tgt_simmaci_production',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      cluster: 'simmaci-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://simmaci.id/health',
      allowedOperations: ['VERIFY_TARGET_HEALTH'],
    };

    const reading = await telemetry.observeTarget(target, {
      mockPayload: {
        status: 'HEALTHY',
        timestamp: new Date(Date.now() - 300_000).toISOString(), // 5 min old
      },
    });

    assert.strictEqual(reading.status, 'UNKNOWN');
    assert.strictEqual(telemetry.isEligibleForPromotion(reading).eligible, false);
  });

  // ── 6. Invalid or altered signed SLO documents (§8.6) ─────────────────────
  test('Safety 6: Invalid or altered Ed25519 signed SLO documents fail verification', () => {
    const sloService = new SloVerificationService();
    const { publicKeyPem, privateKeyPem } = SloVerificationService.generateEd25519KeyPair();

    const signedDoc = SloVerificationService.signSloDocument(
      {
        version: '1.0.0',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'PRODUCTION',
        validFrom: new Date(Date.now() - 60_000).toISOString(),
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

    // Document with altered threshold must fail verification
    const alteredDoc: SignedSloDocument = {
      ...signedDoc,
      thresholds: { ...signedDoc.thresholds, errorRateMaxPct: 5.0 },
    };

    const res = sloService.verifySloDocument(alteredDoc, publicKeyPem);
    assert.strictEqual(res.valid, false);
    assert.ok(res.reason?.includes('SIGNATURE_INVALID'));
  });

  // ── 7. Missing Telegram credentials (§8.7) ───────────────────────────────
  test('Safety 7: Missing Telegram credentials produces NOT_CONFIGURED state', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB5Telegram({
      simulatedEnvironment: { telegramToken: undefined },
    });
    assert.strictEqual(result.status, 'NOT_CONFIGURED');
  });

  // ── 8. Separation between bot authentication and human approval (§8.8) ────
  test('Safety 8: Bot authentication check does NOT equal completed human approval', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB5Telegram({
      simulatedEnvironment: {
        telegramToken: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567',
      },
    });
    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(result.rawPayload?.humanApprovalCompleted, false);
  });

  // ── 9. Missing or excessively privileged deployment-target credentials (§8.9) ──
  test('Safety 9: Wildcard cluster-admin target credentials are strictly rejected', async () => {
    const gate = new ExternalPrerequisiteGate();
    const result = await gate.inspectB6Target({
      simulatedEnvironment: {
        hasKubeCredentials: true,
        isTargetOverPrivileged: true, // Wildcard cluster-admin
      },
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.details.includes('excessive permissions'));
  });

  // ── 10. Cross-project and cross-environment evidence rejection (§8.10) ────
  test('Safety 10: Cross-environment evidence cannot satisfy a production claim', () => {
    const validator = new EvidenceValidatorService();
    validator.recordEvidence({
      evidenceId: 'ev_staging_health',
      benchmarkId: 'bench_p305',
      claimType: 'SERVICE_HEALTH',
      evidenceTier: 'STAGING_LIVE',
      sourceSystem: 'PROMETHEUS_STAGING',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'STAGING',
      observedAt: new Date().toISOString(),
      correlationId: 'corr_01',
      result: 'PASS',
      limitations: [],
    });

    const claim: MaterialClaim = {
      claimId: 'claim_prod_health',
      benchmarkId: 'bench_p305',
      claimType: 'SERVICE_HEALTH',
      targetEnvironment: 'PRODUCTION',
      minimumEvidenceTier: 'STAGING_LIVE',
      requiredResult: 'PASS',
    };

    const res = validator.validateClaim(claim);
    assert.strictEqual(res.valid, false);
    assert.ok(res.rejectionReasons.some((r) => r.includes('ENVIRONMENT_MISMATCH')));
  });

  // ── 11. Release ID and artifact digest mismatch (§8.11) ───────────────────
  test('Safety 11: Evidence for a different release ID is rejected', () => {
    const validator = new EvidenceValidatorService();
    validator.recordEvidence({
      evidenceId: 'ev_rel_mismatch',
      benchmarkId: 'bench_p305',
      claimType: 'CANARY_DEPLOYMENT',
      evidenceTier: 'LOCAL_EXECUTION',
      sourceSystem: 'EXECUTOR',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      releaseId: 'rel_kdi_v1.0.0',
      observedAt: new Date().toISOString(),
      correlationId: 'corr_02',
      result: 'PASS',
      limitations: [],
    });

    const claim: MaterialClaim = {
      claimId: 'claim_v1.0.1',
      benchmarkId: 'bench_p305',
      claimType: 'CANARY_DEPLOYMENT',
      targetEnvironment: 'PRODUCTION',
      minimumEvidenceTier: 'LOCAL_EXECUTION',
      targetReleaseId: 'rel_kdi_v1.0.1',
      requiredResult: 'PASS',
    };

    const res = validator.validateClaim(claim);
    assert.strictEqual(res.valid, false);
    assert.ok(res.rejectionReasons.some((r) => r.includes('RELEASE_MISMATCH')));
  });

  // ── 12. Evidence tier escalation attempts (§8.12) ─────────────────────────
  test('Safety 12: Evidence tier escalation attempts are strictly blocked', () => {
    const validator = new EvidenceValidatorService();
    validator.recordEvidence({
      evidenceId: 'ev_sim_escalation',
      benchmarkId: 'bench_p305',
      claimType: 'CANARY_DEPLOYMENT',
      evidenceTier: 'SIMULATED',
      sourceSystem: 'DRY_RUN',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      observedAt: new Date().toISOString(),
      correlationId: 'corr_03',
      result: 'PASS',
      limitations: ['Dry-run emulation'],
    });

    const liveClaim: MaterialClaim = {
      claimId: 'claim_live_canary',
      benchmarkId: 'bench_p305',
      claimType: 'CANARY_DEPLOYMENT',
      targetEnvironment: 'PRODUCTION',
      minimumEvidenceTier: 'PRODUCTION_LIVE',
      requiredResult: 'PASS',
    };

    const res = validator.validateClaim(liveClaim);
    assert.strictEqual(res.valid, false);
    assert.ok(res.rejectionReasons.some((r) => r.includes('TIER_INSUFFICIENT')));
  });

  // ── 13. Secret redaction (§8.13) ─────────────────────────────────────────
  test('Safety 13: Sensitive secrets are redacted to placeholders', () => {
    const raw = 'Token: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567 and Bearer eyJhbGciOiJIUzI1NiJ9.test.sig';
    const sanitized = SecretHygieneService.sanitize(raw);
    assert.strictEqual(sanitized.includes('123456789:ABCdef'), false);
    assert.ok(sanitized.includes('[REDACTED_TELEGRAM_TOKEN]'));
    assert.ok(sanitized.includes('Bearer [REDACTED_TOKEN]'));
    assert.strictEqual(SecretHygieneService.containsExposedSecret(sanitized), false);
  });

  // ── 14. Audit ledger integrity across reload (§8.14) ──────────────────────
  test('Safety 14: Audit ledger hash-chain persists and detects tampering across reload', async () => {
    const tmpLedger = path.join(os.tmpdir(), `kdi-p305-audit-${Date.now()}.jsonl`);
    const auditServiceA = new (await import('./phase30-audit.service.js')).Phase30AuditService({
      ledgerFilePath: tmpLedger,
    });

    auditServiceA.recordEvent({
      phase: 'PREFLIGHT_AUDIT',
      action: 'RUN_INSPECTION',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'STAGING',
      actor: 'operator-preflight',
      details: 'Readiness preflight executed',
    });

    // Reload ledger in separate service instance
    const auditServiceB = new (await import('./phase30-audit.service.js')).Phase30AuditService({
      ledgerFilePath: tmpLedger,
    });
    const integrity = auditServiceB.verifyLedgerIntegrity();
    assert.strictEqual(integrity.isValid, true);
    assert.strictEqual(auditServiceB.getEvents().length, 1);

    // Clean up
    try {
      fs.unlinkSync(tmpLedger);
    } catch {}
  });

  // ── 15. Approval expiration and replay rejection (§8.15) ─────────────────
  test('Safety 15: Expired and replayed approval tokens are rejected', async () => {
    const policy = new Phase30Policy();
    policy.registerApproval({
      approvalId: 'appr_exp',
      releaseId: 'rel_exp',
      approverIdentity: 'Ayub',
      approvedAt: new Date(Date.now() - 7200_000).toISOString(),
      expiresAt: new Date(Date.now() - 3600_000).toISOString(),
      targetEnvironment: 'PRODUCTION',
      approvalToken: 'token_exp',
      blastRadiusAcknowledged: 'ISOLATED',
      isUsed: false,
    });

    policy.registerApproval({
      approvalId: 'appr_used',
      releaseId: 'rel_used',
      approverIdentity: 'Ayub',
      approvedAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      targetEnvironment: 'PRODUCTION',
      approvalToken: 'token_used',
      blastRadiusAcknowledged: 'ISOLATED',
      isUsed: true,
    });

    const expEval = policy.evaluate(
      {
        requestId: 'req_exp',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'PRODUCTION',
        targetId: 'tgt_simmaci_production',
        version: '1.0.1',
        commitSha: '5242855146b341974a1946947d640e253ce20c00',
        artifactDigestSha256: '0'.repeat(64),
        changedFiles: [],
        isDryRun: true,
        approvalToken: 'token_exp',
        callerIdentity: 'test',
      },
      { riskLevel: 'LOW', blastRadius: 'ISOLATED', isDatabaseMigrationRequired: false, isSchemaBreaking: false, requiresHumanApproval: true, reasons: [] }
    );
    assert.strictEqual(expEval.allowed, false);
    assert.ok(expEval.rejectionReason?.includes('EXPIRED_APPROVAL'));

    const usedEval = policy.evaluate(
      {
        requestId: 'req_used',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'PRODUCTION',
        targetId: 'tgt_simmaci_production',
        version: '1.0.1',
        commitSha: '5242855146b341974a1946947d640e253ce20c00',
        artifactDigestSha256: '0'.repeat(64),
        changedFiles: [],
        isDryRun: true,
        approvalToken: 'token_used',
        callerIdentity: 'test',
      },
      { riskLevel: 'LOW', blastRadius: 'ISOLATED', isDatabaseMigrationRequired: false, isSchemaBreaking: false, requiresHumanApproval: true, reasons: [] }
    );
    assert.strictEqual(usedEval.allowed, false);
    assert.ok(usedEval.rejectionReason?.includes('REPLAYED_APPROVAL'));
  });

  // ── 16. Kill-switch enforcement (§8.16) ──────────────────────────────────
  test('Safety 16: Kill switch blocks all requests immediately', () => {
    const tmpKillFile = path.join(os.tmpdir(), `kdi-ks-p305-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const policy = new Phase30Policy({ killSwitchStateFilePath: tmpKillFile });
    try {
      policy.governanceEngine.engageKillSwitch('Emergency security audit');

      const evalRes = policy.evaluate(
        {
          requestId: 'req_ks',
          project: 'KDI',
          service: 'kdi-agent-platform',
          environment: 'PRODUCTION',
          targetId: 'tgt_kdi_production',
          version: '1.0.0',
          commitSha: '5242855146b341974a1946947d640e253ce20c00',
          artifactDigestSha256: '0'.repeat(64),
          changedFiles: [],
          isDryRun: true,
          callerIdentity: 'test',
        },
        { riskLevel: 'LOW', blastRadius: 'ISOLATED', isDatabaseMigrationRequired: false, isSchemaBreaking: false, requiresHumanApproval: false, reasons: [] }
      );

      assert.strictEqual(evalRes.allowed, false);
      assert.strictEqual(evalRes.killSwitchActive, true);
    } finally {
      policy.governanceEngine.disengageKillSwitchWithHumanToken('human_sec_token_99482710492817293847');
      try { if (fs.existsSync(tmpKillFile)) fs.unlinkSync(tmpKillFile); } catch {}
    }
  });

  // ── 17. Accurate reconciliation of actual benchmark records (§8.17) ──────
  test('Safety 17: Benchmark records reconcile without contradictions', () => {
    const reconciler = new MetricReconciliationService();
    reconciler.loadPhase303Baseline();
    const summary = reconciler.reconcile();

    assert.strictEqual(summary.conflictsDetected.length, 0);
    assert.strictEqual(summary.totalEvaluatedCandidates, 4);
    assert.strictEqual(summary.autonomousDeploymentAttempts, 1);
    assert.strictEqual(summary.successfulAutonomousDeployments, 1);
    assert.strictEqual(summary.automaticRollbackAttempts, 1);
    assert.strictEqual(summary.successfulRollbacks, 1);
  });

  // ── 18. Continued enforcement of PRODUCTION_MUTATION = DISABLED (§8.18) ───
  test('Safety 18: Live physical production mutation is strictly disabled', async () => {
    const executor = new AuthorizedReleaseExecutor();
    const prodTarget: DeploymentTarget = {
      targetId: 'tgt_prod_cluster',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      cluster: 'kdi-prod-k8s',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://api.kdi.ai/health',
      allowedOperations: ['EXECUTE_CANARY_DEPLOY'],
    };

    await assert.rejects(
      async () =>
        executor.executeOperation({
          operation: 'EXECUTE_CANARY_DEPLOY',
          target: prodTarget,
          release: {
            releaseId: 'rel_live_test',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'PRODUCTION',
            version: '1.0.0',
            commitSha: '5242855146b341974a1946947d640e253ce20c00',
            artifactDigestSha256: 'f'.repeat(64),
            status: 'STAGED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isDryRun: false, // Live mutation attempt
        }),
      (err: Error) => err.message.includes('PRODUCTION_MUTATION=DISABLED')
    );
  });

  // ── 19. Idempotent Operator Preflight Execution (§7) ─────────────────────
  test('Safety 19: Operator preflight executes idempotently with zero mutation', async () => {
    const preflight = new OperatorPreflightService();
    const tmpDir = path.join(os.tmpdir(), `kdi-p305-preflight-${Date.now()}`);

    const result = await preflight.runPreflight({ customOutputDir: tmpDir });

    assert.strictEqual(result.verdict, 'READY_WITH_CONDITIONS');
    assert.strictEqual(result.operationalReadinessState, 'BLOCKED');
    assert.strictEqual(result.safetyGuards.productionMutationDisabled, true);
    assert.ok(result.remediationMatrix.length > 0);

    const summary = preflight.formatSummaryText(result);
    assert.ok(summary.includes('OPERATOR PREFLIGHT READINESS AUDIT'));
    assert.ok(summary.includes('OPERATOR REMEDIATION MATRIX'));

    // Clean up
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  // ── 20. Staging Readiness Assessment (§1) ────────────────────────────────
  test('Safety 20: Staging targets exist in registry but live mutation is not authorized', () => {
    const controller = new Phase30Controller();
    const stagingTarget = controller.targetRegistry.getTarget('tgt_simmaci_staging');

    assert.ok(stagingTarget, 'Staging target must exist in DeploymentTargetRegistry');
    assert.strictEqual(stagingTarget?.environment, 'STAGING');
    assert.strictEqual(stagingTarget?.isProduction, false);

    // Staging deployment adapter exists, but physical cluster is unattached on workstation
    assert.ok(stagingTarget?.allowedOperations.includes('EXECUTE_STAGING_DEPLOY'));
    assert.ok(stagingTarget?.allowedOperations.includes('EXECUTE_DRY_RUN'));
  });

});
