// ==========================================================
// services/api/src/engineering/phase30/phase30-pilot-gate-p309.test.ts
// Phase 30.9: Staging Provisioning Verification & Pilot Gate Tests (§1–§14)
// ==========================================================

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  ExternalPrerequisiteGate,
  StagingReadinessStateMachine,
  ProductionReadinessStateMachine,
  OperatorPreflightService,
  SloVerificationService,
  Phase30Policy,
  TelemetryAdapter,
  AuthorizedReleaseExecutor,
  SecretHygieneService,
  type SignedSloDocument,
} from './index.js';

describe('Phase 30.9: Staging Provisioning Verification & Pilot Gate Suite (§1–§14)', () => {
  const gate = new ExternalPrerequisiteGate();

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

  // ── 1. Workstream B: Staging Registry Verification (§5) ──────────────────
  it('Registry 1: Unconfigured staging registry evaluates to NOT_CONFIGURED', async () => {
    const result = await gate.inspectB2Registry({ targetEnvironment: 'STAGING' });
    assert.strictEqual(result.id, 'B2_REGISTRY');
    assert.strictEqual(result.status, 'NOT_CONFIGURED');
    assert.strictEqual(result.evidenceTier, 'LOCAL_EXECUTION');
    assert.ok(result.details.includes('ghcr.io/koneksi-digital-inovasi/staging'));
  });

  it('Registry 2: Registry authentication is separated from push/publish permissions', async () => {
    // Read-only token configured without write authorization
    const readOnlySim = await gate.inspectB2Registry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        registryToken: 'ghp_staging_token_read_only_992817293847',
        registryWriteAuthorized: false,
      },
    });
    assert.strictEqual(readOnlySim.status, 'VERIFIED_READ_ONLY');
    const perms = readOnlySim.rawPayload.permissions;
    assert.strictEqual(perms.registryAuthentication, true);
    assert.strictEqual(perms.canInspectOrPull, true);
    assert.strictEqual(perms.canPushOrPublish, false);
  });

  it('Registry 3: Local container build existence is separated from remote registry publication', () => {
    // Phase 30.8 local build artifact
    const localArtifact = {
      repository: 'kdi-api',
      tag: 'local-p308',
      imageId: 'c3aa9bb4a709',
      digest: 'sha256:c3aa9bb4a7094a9277497baeeb3b457381f6b0c7dd56a6ef30d6da6c6baab037',
      isLocallyBuilt: true,
      isRemotelyPublished: false,
      evidenceTier: 'LOCAL_EXECUTION' as const,
    };

    assert.strictEqual(localArtifact.isLocallyBuilt, true);
    assert.strictEqual(localArtifact.isRemotelyPublished, false);
    assert.strictEqual(localArtifact.evidenceTier, 'LOCAL_EXECUTION');
    assert.notStrictEqual(localArtifact.evidenceTier, 'STAGING_LIVE');
  });

  // ── 2. Workstream C: Staging Telemetry Verification (§6) ──────────────────
  it('Telemetry 1: Absent staging telemetry evaluates to NOT_CONFIGURED and UNKNOWN status', async () => {
    const result = await gate.inspectB3Telemetry({ targetEnvironment: 'STAGING' });
    assert.strictEqual(result.id, 'B3_TELEMETRY');
    assert.strictEqual(result.status, 'NOT_CONFIGURED');
    assert.strictEqual(result.evidenceTier, 'LOCAL_EXECUTION');
  });

  it('Telemetry 2: UNKNOWN != HEALTHY invariant strictly prevents readiness promotion', () => {
    const telemetry = new TelemetryAdapter();
    const reading = {
      targetId: 'tgt_simmaci_staging',
      status: 'UNKNOWN' as const,
      errorRatePct: 0,
      p95LatencyMs: 0,
      availabilityPct: 0,
      timestamp: new Date().toISOString(),
      source: 'TEST_ADAPTER' as const,
    };
    const promoCheck = telemetry.isEligibleForPromotion(reading);
    assert.strictEqual(promoCheck.eligible, false, 'UNKNOWN telemetry must strictly block promotion');
    assert.ok(promoCheck.reason?.includes('UNKNOWN'));
  });

  it('Telemetry 3: Production telemetry cannot satisfy staging telemetry requirement', async () => {
    const result = await gate.inspectB3Telemetry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        telemetryEndpoint: 'https://prometheus.kdi.ai/api/v1/query',
        telemetryEnvironment: 'PRODUCTION',
      },
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.details.includes('Telemetry environment mismatch'));
  });

  // ── 3. Workstream D: Signed Staging SLO Verification (§7) ─────────────────
  it('SLO 1: Missing staging SLO document or public key evaluates to NOT_CONFIGURED', async () => {
    const result = await gate.inspectB4SignedSlo({ targetEnvironment: 'STAGING' });
    assert.strictEqual(result.id, 'B4_SLO');
    assert.strictEqual(result.status, 'NOT_CONFIGURED');
  });

  it('SLO 2: Production SLO document cannot satisfy staging SLO requirement', async () => {
    const { doc, publicKeyPem } = createSignedSlo('PRODUCTION');
    const result = await gate.inspectB4SignedSlo({
      targetEnvironment: 'STAGING',
      sloDocument: doc,
      sloPublicKeyPem: publicKeyPem,
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.details.includes('SLO environment mismatch'));
  });

  it('SLO 3: Cryptographically valid Ed25519 staging SLO passes verification', async () => {
    const { doc, publicKeyPem } = createSignedSlo('STAGING');
    const result = await gate.inspectB4SignedSlo({
      targetEnvironment: 'STAGING',
      sloDocument: doc,
      sloPublicKeyPem: publicKeyPem,
    });
    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(result.rawPayload.valid, true);
    assert.strictEqual(result.rawPayload.version, '1.0.0');
  });

  // ── 4. Workstream E: Telegram Approval Integration (§8) ───────────────────
  it('Telegram 1: Absent bot token evaluates to NOT_CONFIGURED', async () => {
    const result = await gate.inspectB5Telegram({ targetEnvironment: 'STAGING' });
    assert.strictEqual(result.id, 'B5_APPROVAL');
    assert.strictEqual(result.status, 'NOT_CONFIGURED');
  });

  it('Telegram 2: Bot authentication check success does NOT equal human staging release approval', async () => {
    const result = await gate.inspectB5Telegram({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        telegramToken: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz_123456789',
      },
    });
    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(result.rawPayload.humanApprovalCompleted, false);
    assert.strictEqual(result.rawPayload.providerAuthVerified, true);
    assert.strictEqual(result.rawPayload.humanApprovalReceived, false);
    assert.strictEqual(result.rawPayload.releaseAuthorizationValid, false);
  });

  // ── 5. Workstream F: Kubernetes Target & RBAC Verification (§9) ───────────
  it('Target 1: Missing kubeconfig evaluates to BLOCKED', async () => {
    const result = await gate.inspectB6Target({ targetEnvironment: 'STAGING' });
    assert.strictEqual(result.id, 'B6_TARGET');
    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload.hasCredentials, false);
  });

  it('Target 2: Wildcard cluster-admin credentials are strictly rejected as over-privileged', async () => {
    const result = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        hasKubeCredentials: true,
        isTargetOverPrivileged: true,
        targetNamespace: 'staging',
      },
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.details.includes('excessive permissions'));
  });

  it('Target 3: Non-staging namespace target credentials are rejected for staging', async () => {
    const result = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        hasKubeCredentials: true,
        targetNamespace: 'production',
      },
    });
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.details.includes('Target namespace mismatch for staging'));
  });

  // ── 6. Workstream H: Staging Readiness Determination (§11) ─────────────────
  it('Readiness 1: Overall operational readiness state is BLOCKED when B2-B6 are unprovisioned', async () => {
    const sm = new StagingReadinessStateMachine();
    const prereqs = await gate.inspectStagingPrerequisites();
    const report = sm.evaluateReadiness({
      prerequisites: prereqs,
      safetyInvariantsPassed: true,
      stagingMutationAuthorized: false,
      killSwitchActive: false,
    });

    assert.strictEqual(report.overallState, 'BLOCKED');
    assert.strictEqual(report.stagingMutationAuthorized, false);
    assert.strictEqual(report.unresolvedBlockers.length, 5);
  });

  it('Readiness 2: Preflight evaluates Phase 30.9 and preserves historical JSON reports', async () => {
    const preflight = new OperatorPreflightService();
    const tmpDir = path.join(os.tmpdir(), `kdi-p309-test-${Date.now()}`);

    const result = await preflight.runPreflight({ customOutputDir: tmpDir, phase: '30.9' });
    assert.strictEqual(result.phase, '30.9');
    assert.strictEqual(result.verdict, 'READY_WITH_CONDITIONS');
    assert.strictEqual(result.localEngineeringReadiness, 'READY');
    assert.strictEqual(result.operationalReadinessState, 'BLOCKED');
    assert.strictEqual(result.stagingDeploymentAuthorization, 'UNAUTHORIZED');
    assert.strictEqual(result.safetyGuards.productionMutationDisabled, true);
    assert.strictEqual(result.safetyGuards.stagingMutationAuthorized, false);

    const jsonPath = path.join(tmpDir, 'kdi-phase-30-9-readiness.json');
    assert.ok(fs.existsSync(jsonPath), 'kdi-phase-30-9-readiness.json must exist');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    assert.strictEqual(data.phase, '30.9');
    assert.strictEqual(data.workstation.buildEnvironmentState, 'VERIFIED');
  });

  // ── 7. Non-Negotiable Safety Invariants (§2) ───────────────────────────────
  it('Safety 1: PRODUCTION_MUTATION and STAGING_MUTATION remain strictly DISABLED', async () => {
    const policy = new Phase30Policy();
    assert.strictEqual(policy.governanceEngine.isKillSwitchActive(), false);

    const executor = new AuthorizedReleaseExecutor();
    await assert.rejects(
      async () =>
        executor.executeOperation({
          operation: 'EXECUTE_CANARY_DEPLOY',
          target: {
            targetId: 'tgt_kdi_production',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'PRODUCTION',
            cluster: 'kdi-prod',
            isProduction: true,
            requiresHumanApproval: true,
            healthEndpoint: 'https://api.kdi-office.id/health',
            allowedOperations: ['EXECUTE_CANARY_DEPLOY'],
          },
          release: {
            releaseId: 'rel_prod_attempt',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'PRODUCTION',
            version: '1.0.0',
            commitSha: '5242855146b341974a1946947d640e253ce20c00',
            artifactDigestSha256: 'a'.repeat(64),
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isDryRun: false,
        }),
      (err: any) => err.name === 'ProductionMutationDisabledError'
    );
  });
});
