// ==========================================================
// services/api/src/engineering/phase30/phase30-staging-p306.test.ts
// Phase 30.6: Staging Integration & Controlled Pilot Safety Suite (§1–§10)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  ExternalPrerequisiteGate,
  StagingReadinessStateMachine,
  StagingPilotService,
  OperatorPreflightService,
  SloVerificationService,
  Phase30AuditService,
  Phase30Policy,
  SecretHygieneService,
  ProductionMutationDisabledError,
  type StagingPilotSpecification,
  type SignedSloDocument,
} from './index.js';

describe('Phase 30.6: Staging Environment Integration & Controlled Pilot Suite (§1–§10)', () => {
  // Helper to generate valid Ed25519 keypair and signed SLO
  function createSignedSlo(
    environment: 'STAGING' | 'PRODUCTION',
    overrides?: Partial<SignedSloDocument>
  ): { doc: SignedSloDocument; publicKeyPem: string; privateKeyPem: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const payload = {
      version: '1.0.0',
      project: 'SIMMACI' as const,
      service: 'simmaci-academic-portal',
      environment,
      validFrom: new Date(Date.now() - 60_000).toISOString(),
      validUntil: new Date(Date.now() + 3600_000).toISOString(),
      thresholds: {
        p95LatencyMaxMs: environment === 'STAGING' ? 500 : 200,
        errorRateMaxPct: environment === 'STAGING' ? 1.0 : 0.5,
        availabilityMinPct: 99.5,
      },
      keyId: 'ed25519-key-kdi-2026',
      ...overrides,
    };

    const canonicalBuffer = SloVerificationService.canonicalize(payload);
    const signature = crypto.sign(null, canonicalBuffer, privateKey).toString('hex');
    const doc: SignedSloDocument = { ...payload, signature };

    return { doc, publicKeyPem, privateKeyPem };
  }

  // ── Workstream B: Separate Staging and Production Prerequisites (§4) ──────

  test('Staging Prereq 1: Missing Docker daemon produces truthful BLOCKED for staging container build', async () => {
    const gate = new ExternalPrerequisiteGate();
    const b1 = await gate.inspectB1BuildService({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: { hasDockerCli: true, hasDockerDaemon: false },
    });
    assert.strictEqual(b1.status, 'BLOCKED');
    assert.strictEqual(b1.evidenceTier, 'LOCAL_TEST');
    assert.ok(b1.details.includes('unreachable'));
  });

  test('Staging Prereq 2: Staging registry check validates staging namespace and does not require production write access', async () => {
    const gate = new ExternalPrerequisiteGate();
    const b2 = await gate.inspectB2Registry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: { registryToken: 'ghp_staging_read_token_123456789' },
    });
    assert.strictEqual(b2.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(b2.name, 'Staging OCI Artifact Registry');
    assert.ok(b2.details.includes('ghcr.io/koneksi-digital-inovasi/staging'));
    assert.ok(b2.details.includes('Production write credentials not required'));
  });

  test('Staging Prereq 3: Telemetry scoped to wrong environment is strictly rejected', async () => {
    const gate = new ExternalPrerequisiteGate();
    const b3 = await gate.inspectB3Telemetry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        telemetryEndpoint: 'https://apm.internal/api',
        telemetryEnvironment: 'PRODUCTION', // Mismatched environment
      },
    });
    assert.strictEqual(b3.status, 'BLOCKED');
    assert.ok(b3.details.includes('Telemetry environment mismatch'));
  });

  test('Staging Prereq 4: Production SLO cannot satisfy staging SLO requirement (scope isolation)', async () => {
    const gate = new ExternalPrerequisiteGate();
    const { doc, publicKeyPem } = createSignedSlo('PRODUCTION');

    const b4 = await gate.inspectB4SignedSlo({
      targetEnvironment: 'STAGING',
      sloDocument: doc,
      sloPublicKeyPem: publicKeyPem,
    });

    assert.strictEqual(b4.status, 'BLOCKED');
    assert.ok(b4.details.includes('SLO environment mismatch'));
  });

  test('Staging Prereq 5: Valid signed staging SLO document is verified independently of production SLO', async () => {
    const gate = new ExternalPrerequisiteGate();
    const { doc, publicKeyPem } = createSignedSlo('STAGING');

    const b4 = await gate.inspectB4SignedSlo({
      targetEnvironment: 'STAGING',
      sloDocument: doc,
      sloPublicKeyPem: publicKeyPem,
    });

    assert.strictEqual(b4.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(b4.name, 'Signed Staging SLO Configuration');
    assert.ok(b4.details.includes('staging SLO verified'));
  });

  test('Staging Prereq 6: Bot authentication check does NOT equal human staging release approval', async () => {
    const gate = new ExternalPrerequisiteGate();
    const b5 = await gate.inspectB5Telegram({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: { telegramToken: '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ_12345678' },
    });

    assert.strictEqual(b5.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(b5.rawPayload?.humanApprovalCompleted, false);
    assert.ok(b5.details.includes('Bot authentication does not equal approval completion'));
  });

  test('Staging Prereq 7: Target credentials with wrong namespace or excessive permissions are rejected', async () => {
    const gate = new ExternalPrerequisiteGate();

    // 1. Wrong namespace
    const wrongNs = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: { hasKubeCredentials: true, targetNamespace: 'production' },
    });
    assert.strictEqual(wrongNs.status, 'BLOCKED');
    assert.ok(wrongNs.details.includes('Target namespace mismatch for staging'));

    // 2. Over-privileged cluster-admin
    const overPriv = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: { hasKubeCredentials: true, isTargetOverPrivileged: true, targetNamespace: 'staging' },
    });
    assert.strictEqual(overPriv.status, 'BLOCKED');
    assert.ok(overPriv.details.includes('excessive permissions'));
  });

  // ── Workstream C: Staging Readiness State Machine (§5) ────────────────────

  test('State Machine 1: Critical safety invariant violation produces NO_GO', () => {
    const sm = new StagingReadinessStateMachine();
    const report = sm.evaluateReadiness({
      prerequisites: {} as any,
      safetyInvariantsPassed: false,
    });
    assert.strictEqual(report.overallState, 'NO_GO');
    assert.strictEqual(report.safetyInvariantsPass, false);
  });

  test('State Machine 2: Secret leakage produces NO_GO', () => {
    const sm = new StagingReadinessStateMachine();
    const report = sm.evaluateReadiness({
      prerequisites: {} as any,
      safetyInvariantsPassed: true,
      hasSecretLeakage: true,
    });
    assert.strictEqual(report.overallState, 'NO_GO');
  });

  test('State Machine 3: Active kill switch blocks staging operations', () => {
    const sm = new StagingReadinessStateMachine();
    const report = sm.evaluateReadiness({
      prerequisites: {} as any,
      safetyInvariantsPassed: true,
      killSwitchActive: true,
    });
    assert.strictEqual(report.overallState, 'BLOCKED');
    assert.ok(report.unresolvedBlockers.some((b) => b.includes('KILL_SWITCH_ACTIVE')));
  });

  test('State Machine 4: Progresses through VERIFIED_READ_ONLY, READY_FOR_STAGING_VALIDATION, to STAGING_VALIDATION_PASSED', () => {
    const sm = new StagingReadinessStateMachine();
    const verifiedPrereqs: any = {
      B1_BUILD: { id: 'B1_BUILD', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B2_REGISTRY: { id: 'B2_REGISTRY', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B3_TELEMETRY: { id: 'B3_TELEMETRY', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B4_SLO: { id: 'B4_SLO', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B5_APPROVAL: { id: 'B5_APPROVAL', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B6_TARGET: { id: 'B6_TARGET', status: 'VERIFIED_READ_ONLY', blockers: [] },
    };

    // Level 1: All verified read-only
    const r1 = sm.evaluateReadiness({ prerequisites: verifiedPrereqs, safetyInvariantsPassed: true });
    assert.strictEqual(r1.overallState, 'VERIFIED_READ_ONLY');

    // Level 2: Validation plan active
    const r2 = sm.evaluateReadiness({ prerequisites: verifiedPrereqs, safetyInvariantsPassed: true, validationPlanActive: true });
    assert.strictEqual(r2.overallState, 'READY_FOR_STAGING_VALIDATION');

    // Level 3: Validation contract passed
    const r3 = sm.evaluateReadiness({ prerequisites: verifiedPrereqs, safetyInvariantsPassed: true, validationContractPassed: true });
    assert.strictEqual(r3.overallState, 'STAGING_VALIDATION_PASSED');
  });

  test('State Machine 5: Proposed candidate without explicit human authorization transitions to STAGING_PILOT_AUTHORIZATION_REQUIRED', () => {
    const sm = new StagingReadinessStateMachine();
    const verifiedPrereqs: any = {
      B1_BUILD: { id: 'B1_BUILD', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B2_REGISTRY: { id: 'B2_REGISTRY', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B3_TELEMETRY: { id: 'B3_TELEMETRY', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B4_SLO: { id: 'B4_SLO', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B5_APPROVAL: { id: 'B5_APPROVAL', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B6_TARGET: { id: 'B6_TARGET', status: 'VERIFIED_READ_ONLY', blockers: [] },
    };

    const report = sm.evaluateReadiness({
      prerequisites: verifiedPrereqs,
      safetyInvariantsPassed: true,
      candidateProposed: true,
      stagingMutationAuthorized: false, // NOT authorized
    });

    assert.strictEqual(report.overallState, 'STAGING_PILOT_AUTHORIZATION_REQUIRED');
    assert.ok(report.unresolvedBlockers.some((b) => b.includes('STAGING_PILOT_AUTHORIZATION_REQUIRED')));
  });

  test('State Machine 6: Fully authorized and verified pilot transitions to STAGING_PILOT_PASSED', () => {
    const sm = new StagingReadinessStateMachine();
    const verifiedPrereqs: any = {
      B1_BUILD: { id: 'B1_BUILD', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B2_REGISTRY: { id: 'B2_REGISTRY', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B3_TELEMETRY: { id: 'B3_TELEMETRY', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B4_SLO: { id: 'B4_SLO', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B5_APPROVAL: { id: 'B5_APPROVAL', status: 'VERIFIED_READ_ONLY', blockers: [] },
      B6_TARGET: { id: 'B6_TARGET', status: 'VERIFIED_READ_ONLY', blockers: [] },
    };

    const report = sm.evaluateReadiness({
      prerequisites: verifiedPrereqs,
      safetyInvariantsPassed: true,
      stagingMutationAuthorized: true,
      pilotExecutedSuccessfully: true,
    });

    assert.strictEqual(report.overallState, 'STAGING_PILOT_PASSED');
  });

  // ── Workstream D & E: Release Readiness & Controlled Staging Pilot (§6, §7) ──

  function createValidSpec(overrides?: Partial<StagingPilotSpecification>): StagingPilotSpecification {
    return {
      pilotId: 'pilot_simmaci_01',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      targetId: 'tgt_simmaci_staging',
      candidateReleaseId: 'rel_simmaci_simmaci-academic-portal_1.0.1_5242855',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'a'.repeat(64),
      rollbackBaselineReleaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      sloVersion: 'v1.0.0-staging',
      maxReplicaCount: 1,
      quotaLimit: 1,
      healthGateCriteria: {
        maxErrorRatePct: 0.5,
        maxP95LatencyMs: 250,
        minAvailabilityPct: 99.5,
      },
      authorizedBy: 'Ayub (Lead Architect)',
      authorizationToken: 'auth_token_staging_human_99482710492817293847',
      authorizationWindow: {
        validFrom: new Date(Date.now() - 60_000).toISOString(),
        validUntil: new Date(Date.now() + 3600_000).toISOString(),
      },
      callerIdentity: 'autonomous-preflight-operator',
      ...overrides,
    };
  }

  test('Release Readiness 1: Missing pre-existing rollback baseline release is rejected', async () => {
    const pilotService = new StagingPilotService();
    const spec = createValidSpec({ rollbackBaselineReleaseId: 'rel_non_existent_baseline' });

    const result = await pilotService.executeStagingPilot(spec);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'BLOCKED');
    assert.ok(result.errorMessage?.includes('BASELINE_NOT_FOUND'));
  });

  test('Release Readiness 2: Artifact digest drift throws ArtifactDigestMismatchError', async () => {
    const pilotService = new StagingPilotService();

    // Register baseline release first
    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'b'.repeat(64),
    });

    // Register candidate with digest 'a'*64
    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.1_5242855',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'a'.repeat(64),
      rollbackTargetReleaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
    });

    // Spec attempts to deploy with a drifted digest 'c'*64
    const spec = createValidSpec({
      artifactDigestSha256: 'sha256:' + 'c'.repeat(64),
    });

    await assert.rejects(
      async () => pilotService.executeStagingPilot(spec, { dryRunOnly: false }),
      /ArtifactDigestMismatchError/
    );
  });

  test('Staging Pilot 1: Dry-run validation executes with zero mutations and outputs STAGING_VALIDATION_PASSED', async () => {
    const pilotService = new StagingPilotService();

    // Seed baseline
    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'b'.repeat(64),
    });

    const spec = createValidSpec();
    const result = await pilotService.executeStagingPilot(spec, { dryRunOnly: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'STAGING_VALIDATION_PASSED');
    assert.strictEqual(result.rollbackTriggered, false);
    assert.ok(result.auditTrail.some((a) => a.includes('DRY_RUN')));
  });

  test('Staging Pilot 2: Attempting physical mutation without authorization halts with STAGING_PILOT_AUTHORIZATION_REQUIRED', async () => {
    const pilotService = new StagingPilotService();

    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'b'.repeat(64),
    });

    const spec = createValidSpec({
      authorizationToken: undefined,
      authorizedBy: undefined,
    });

    const result = await pilotService.executeStagingPilot(spec, { dryRunOnly: false });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'STAGING_PILOT_AUTHORIZATION_REQUIRED');
    assert.ok(result.errorMessage?.includes('STAGING_PILOT_AUTHORIZATION_REQUIRED'));
  });

  test('Staging Pilot 3: Synthetic fixture tokens are strictly rejected for physical staging mutations', async () => {
    const pilotService = new StagingPilotService();

    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'b'.repeat(64),
    });

    const spec = createValidSpec({
      authorizationToken: 'synthetic_fixture_token_unauthorized',
    });

    const result = await pilotService.executeStagingPilot(spec, { dryRunOnly: false });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'STAGING_PILOT_AUTHORIZATION_REQUIRED');
    assert.ok(result.errorMessage?.includes('SYNTHETIC_TOKEN_REJECTED'));
  });

  test('Staging Pilot 4: Production mutation guard strictly blocks any attempt to target production through staging service', async () => {
    const pilotService = new StagingPilotService();
    const spec = createValidSpec({
      targetId: 'tgt_simmaci_production', // Target production!
      environment: 'STAGING',
    });

    const result = await pilotService.executeStagingPilot(spec, { dryRunOnly: false });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'BLOCKED');
    assert.ok(result.errorMessage?.includes('PRODUCTION_TARGET_FORBIDDEN'));
  });

  // ── Workstream F: Failure Recovery Verification (§8) ──────────────────────

  test('Failure Recovery 1: Target probe failure triggers automated rollback to baseline release', async () => {
    const pilotService = new StagingPilotService();

    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'b'.repeat(64),
    });

    const spec = createValidSpec();
    const result = await pilotService.executeStagingPilot(spec, {
      dryRunOnly: false,
      targetProbeFails: true, // Injected target failure
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.rollbackTriggered, true);
    assert.strictEqual(result.rollbackReleaseId, 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline');

    // Candidate must be marked FAILED
    const candidate = pilotService.releaseRegistry.getRelease(spec.candidateReleaseId);
    assert.strictEqual(candidate?.status, 'FAILED');

    // Baseline must be restored to ACTIVE
    const baseline = pilotService.releaseRegistry.getRelease(spec.rollbackBaselineReleaseId);
    assert.strictEqual(baseline?.status, 'ACTIVE');
  });

  test('Failure Recovery 2: Telemetry degradation triggers automated rollback to baseline release', async () => {
    const pilotService = new StagingPilotService();

    pilotService.releaseRegistry.registerRelease({
      releaseId: 'rel_simmaci_simmaci-academic-portal_1.0.0_baseline',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:' + 'b'.repeat(64),
    });

    const spec = createValidSpec();
    const result = await pilotService.executeStagingPilot(spec, {
      dryRunOnly: false,
      simulatedTelemetry: {
        targetId: 'tgt_simmaci_staging',
        status: 'DEGRADED',
        errorRatePct: 4.8, // Exceeds 0.5% max
        p95LatencyMs: 650, // Exceeds 250ms max
        availabilityPct: 95.2,
        timestamp: new Date().toISOString(),
        source: 'TEST_ADAPTER',
      },
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.rollbackTriggered, true);
    assert.ok(result.errorMessage?.includes('Telemetry health gate failed'));
  });

  // ── Workstream G: Evidence & Audit Integrity (§9) ─────────────────────────

  test('Audit Integrity: Audit events maintain SHA-256 hash chaining across process restarts', () => {
    const tmpLedger = path.join(os.tmpdir(), `kdi-audit-p306-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
    try {
      const auditService1 = new Phase30AuditService({ ledgerFilePath: tmpLedger });
      auditService1.recordEvent({
        phase: 'STAGING_PILOT',
        action: 'PILOT_INITIATED',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'STAGING',
        releaseId: 'rel_001',
        actor: 'operator',
        details: 'Initial staging audit event',
      });
      auditService1.recordEvent({
        phase: 'STAGING_PILOT',
        action: 'DEPLOY_VERIFIED',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'STAGING',
        releaseId: 'rel_001',
        actor: 'operator',
        details: 'Target verified healthy',
      });

      // Reload in fresh instance
      const auditService2 = new Phase30AuditService({ ledgerFilePath: tmpLedger });
      const verification = auditService2.verifyLedgerIntegrity();
      assert.strictEqual(verification.isValid, true);
      assert.strictEqual(auditService2.getEvents().length, 2);
    } finally {
      try { if (fs.existsSync(tmpLedger)) fs.unlinkSync(tmpLedger); } catch {}
    }
  });

  // ── Workstream H: Extended Operator Preflight (§10) ───────────────────────

  test('Operator Preflight: Executes idempotently, separates staging from production, and writes sanitized JSON', async () => {
    const preflight = new OperatorPreflightService();
    const tmpDir = path.join(os.tmpdir(), `kdi-preflight-p306-${Date.now()}`);

    const result = await preflight.runPreflight({ customOutputDir: tmpDir });

    assert.strictEqual(result.phase, '30.6');
    assert.strictEqual(result.verdict, 'READY_WITH_CONDITIONS');
    assert.strictEqual(result.localEngineeringReadiness, 'READY');
    assert.strictEqual(result.operationalReadinessState, 'BLOCKED'); // Truthful workstation evaluation
    assert.strictEqual(result.stagingDeploymentAuthorization, 'UNAUTHORIZED');
    assert.strictEqual(result.safetyGuards.productionMutationDisabled, true);

    // Verify machine-readable JSON artifacts
    const p306Json = path.join(tmpDir, 'kdi-phase-30-6-readiness.json');
    assert.ok(fs.existsSync(p306Json));
    const data = JSON.parse(fs.readFileSync(p306Json, 'utf-8'));
    assert.strictEqual(data.phase, '30.6');
    assert.strictEqual(data.verdict, 'READY_WITH_CONDITIONS');

    // Verify summary formatting contains separated sections
    const summary = preflight.formatSummaryText(result);
    assert.ok(summary.includes('[1] LOCAL ENGINEERING READINESS'));
    assert.ok(summary.includes('[2] STAGING INTEGRATION PREREQUISITES'));
    assert.ok(summary.includes('[3] STAGING DEPLOYMENT AUTHORIZATION'));
    assert.ok(summary.includes('[4] PRODUCTION PREREQUISITES'));
    assert.ok(summary.includes('OPERATOR REMEDIATION MATRIX'));

    // Cleanup
    try {
      if (fs.existsSync(p306Json)) fs.unlinkSync(p306Json);
      const p305Json = path.join(tmpDir, 'kdi-phase-30-5-readiness.json');
      if (fs.existsSync(p305Json)) fs.unlinkSync(p305Json);
      fs.rmdirSync(tmpDir);
    } catch {}
  });
});
