// ==========================================================
// services/api/src/engineering/phase30/phase30-activation-p307.test.ts
// KDI Phase 30.7: External Provisioning Verification & Staging Readiness Activation Test Suite (§1–§15)
// ==========================================================

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { ExternalPrerequisiteGate } from './external-prerequisite-gate.js';
import { StagingReadinessStateMachine } from './staging-readiness.state-machine.js';
import { SloVerificationService } from './slo-verification.service.js';
import { ExternalTelemetryAdapter } from './external-telemetry.adapter.js';
import { OperatorPreflightService } from './operator-preflight.js';
import { StagingPilotService } from './staging-pilot.service.js';
import { ReleaseRegistryService } from './release-registry.service.js';
import { DeploymentTargetRegistry } from './deployment-target-registry.js';
import { Phase30AuditService } from './phase30-audit.service.js';
import { AuthorizedReleaseExecutor } from './authorized-release-executor.js';
import type {
  SignedSloDocument,
  StagingPilotSpecification,
  DeploymentTarget,
} from './phase30.types.js';

describe('Phase 30.7: External Provisioning Verification & Staging Readiness Activation Suite (§1–§15)', () => {
  const gate = new ExternalPrerequisiteGate();
  const stateMachine = new StagingReadinessStateMachine();
  const telemetryAdapter = new ExternalTelemetryAdapter();

  // ----------------------------------------------------------
  // Workstream B: Build Environment 5-State Verification (§4)
  // ----------------------------------------------------------
  it('Build Env 1: Distinguishes NOT_INSTALLED when Docker CLI is absent from PATH and disk', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { buildState: 'NOT_INSTALLED' },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.buildState, 'NOT_INSTALLED');
    assert.strictEqual(result.rawPayload?.cliInstalled, false);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('[NOT_INSTALLED]'));
  });

  it('Build Env 2: Distinguishes NOT_IN_PATH when Docker binary exists on disk but is absent from PATH', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { buildState: 'NOT_IN_PATH' },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.buildState, 'NOT_IN_PATH');
    assert.strictEqual(result.rawPayload?.cliInstalled, false);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('[NOT_IN_PATH]'));
  });

  it('Build Env 3: Distinguishes DAEMON_UNREACHABLE when Docker CLI is in PATH but daemon is stopped', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { buildState: 'DAEMON_UNREACHABLE' },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.buildState, 'DAEMON_UNREACHABLE');
    assert.strictEqual(result.rawPayload?.cliInstalled, true);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('[DAEMON_UNREACHABLE]'));
  });

  it('Build Env 4: Distinguishes CONFIGURED_UNVERIFIED when remote build runner is configured but unverified', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { remoteBuildRunnerConfigured: true },
    });

    assert.strictEqual(result.status, 'CONFIGURED_UNVERIFIED');
    assert.strictEqual(result.rawPayload?.buildState, 'CONFIGURED_UNVERIFIED');
    assert.strictEqual(result.rawPayload?.cliInstalled, false);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('[CONFIGURED_UNVERIFIED]'));
  });

  it('Build Env 5: Distinguishes VERIFIED when Docker daemon responds successfully', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: { buildState: 'VERIFIED' },
    });

    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(result.rawPayload?.buildState, 'VERIFIED');
    assert.strictEqual(result.rawPayload?.cliInstalled, true);
    assert.strictEqual(result.rawPayload?.daemonReachable, true);
    assert.ok(result.details.includes('[VERIFIED]'));
  });

  // ----------------------------------------------------------
  // Workstream C: Staging Registry Claims & Permissions (§5)
  // ----------------------------------------------------------
  it('Registry 1: Separates 4 registry claims and permissions without conflating read and write', async () => {
    const readOnlyCheck = await gate.inspectB2Registry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        registryToken: 'ghp_validStagingReadOnlyToken12345',
        registryWriteAuthorized: false,
      },
    });

    assert.strictEqual(readOnlyCheck.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(readOnlyCheck.rawPayload?.authenticated, true);
    assert.strictEqual(readOnlyCheck.rawPayload?.writeAuthorized, false);

    const perms = readOnlyCheck.rawPayload?.permissions;
    assert.ok(perms);
    assert.strictEqual(perms.registryAuthentication, true);
    assert.strictEqual(perms.canInspectOrPull, true);
    assert.strictEqual(perms.canPushOrPublish, false); // Read does NOT imply write!
    assert.strictEqual(perms.artifactVerified, false);
  });

  it('Registry 2: Registry write authorization is granted only when explicitly configured', async () => {
    const writeCheck = await gate.inspectB2Registry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        registryToken: 'ghp_validStagingWriteToken12345',
        registryWriteAuthorized: true,
      },
    });

    assert.strictEqual(writeCheck.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(writeCheck.rawPayload?.authenticated, true);
    assert.strictEqual(writeCheck.rawPayload?.writeAuthorized, true);
    assert.strictEqual(writeCheck.rawPayload?.permissions?.canPushOrPublish, true);
  });

  it('Registry 3: Unconfigured registry returns NOT_CONFIGURED with all 4 permissions false', async () => {
    const unconfigured = await gate.inspectB2Registry({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {},
    });

    assert.strictEqual(unconfigured.status, 'NOT_CONFIGURED');
    assert.strictEqual(unconfigured.rawPayload?.authenticated, false);
    assert.strictEqual(unconfigured.rawPayload?.writeAuthorized, false);
    assert.strictEqual(unconfigured.rawPayload?.permissions?.registryAuthentication, false);
    assert.strictEqual(unconfigured.rawPayload?.permissions?.canInspectOrPull, false);
    assert.strictEqual(unconfigured.rawPayload?.permissions?.canPushOrPublish, false);
    assert.strictEqual(unconfigured.rawPayload?.permissions?.artifactVerified, false);
  });

  // ----------------------------------------------------------
  // Workstream D: Real Staging Telemetry (§6)
  // ----------------------------------------------------------
  it('Telemetry 1: Rejects telemetry tagged for wrong environment (PRODUCTION vs STAGING)', async () => {
    const target: DeploymentTarget = {
      targetId: 'kdi-staging-target',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      cluster: 'k8s-staging-cluster',
      isProduction: false,
      requiresHumanApproval: true,
      healthEndpoint: 'http://localhost:9999/health',
      allowedOperations: ['EXECUTE_STAGING_DEPLOY', 'VERIFY_TARGET_HEALTH'],
    };

    const reading = await telemetryAdapter.observeTarget(target, {
      mockPayload: {
        status: 'HEALTHY',
        p95LatencyMs: 120,
        errorRatePct: 0.05,
        availabilityPct: 99.98,
        timestamp: new Date().toISOString(),
      },
    });

    assert.strictEqual(reading.status, 'HEALTHY');
    assert.strictEqual(reading.source, 'TEST_ADAPTER');

    // Promotion eligibility with staging threshold
    const stagingSlos = {
      p95LatencyMaxMs: 500,
      errorRateMaxPct: 1.0,
      availabilityMinPct: 99.0,
    };
    const eligibility = telemetryAdapter.isEligibleForPromotion(reading, stagingSlos);
    assert.strictEqual(eligibility.eligible, true);
  });

  it('Telemetry 2: Stale telemetry (>180s) strictly blocks promotion and returns UNKNOWN', async () => {
    const target: DeploymentTarget = {
      targetId: 'kdi-staging-target',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      cluster: 'k8s-staging-cluster',
      isProduction: false,
      requiresHumanApproval: true,
      healthEndpoint: 'http://localhost:9999/health',
      allowedOperations: ['EXECUTE_STAGING_DEPLOY', 'VERIFY_TARGET_HEALTH'],
    };

    const staleTimestamp = new Date(Date.now() - 240_000).toISOString(); // 4 minutes ago
    const reading = await telemetryAdapter.observeTarget(target, {
      mockPayload: {
        status: 'HEALTHY',
        p95LatencyMs: 100,
        errorRatePct: 0.01,
        availabilityPct: 99.99,
        timestamp: staleTimestamp,
      },
    });

    assert.strictEqual(reading.status, 'UNKNOWN');
    assert.ok(reading.rawSignals?.error.includes('STALE_METRIC'));

    const eligibility = telemetryAdapter.isEligibleForPromotion(reading);
    assert.strictEqual(eligibility.eligible, false);
    assert.ok(eligibility.reason?.includes('UNKNOWN'));
  });

  // ----------------------------------------------------------
  // Workstream E: Signed Staging SLO (§7)
  // ----------------------------------------------------------
  it('Staging SLO 1: Valid signed staging SLO document with Ed25519 signature is verified independently', () => {
    const { publicKeyPem, privateKeyPem } = SloVerificationService.generateEd25519KeyPair();

    const stagingPayload = {
      version: '1.0.0',
      project: 'SIMMACI' as const,
      service: 'simmaci-academic-portal',
      environment: 'STAGING' as const,
      validFrom: new Date(Date.now() - 60_000).toISOString(),
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      thresholds: {
        p95LatencyMaxMs: 500,
        errorRateMaxPct: 1.0,
        availabilityMinPct: 99.0,
      },
      keyId: 'ed25519-staging-sec-01',
    };

    const signedDoc = SloVerificationService.signSloDocument(stagingPayload, privateKeyPem);
    const sloService = new SloVerificationService();
    const verification = sloService.verifySloDocument(signedDoc, publicKeyPem);

    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.verifiedThresholds?.p95LatencyMaxMs, 500);
    assert.strictEqual(verification.verifiedThresholds?.errorRateMaxPct, 1.0);
    assert.strictEqual(verification.verifiedScope?.environment, 'STAGING');
  });

  it('Staging SLO 2: Rejects unsigned, altered, or expired staging SLO documents', () => {
    const { publicKeyPem, privateKeyPem } = SloVerificationService.generateEd25519KeyPair();

    const stagingPayload = {
      version: '1.0.0',
      project: 'SIMMACI' as const,
      service: 'simmaci-academic-portal',
      environment: 'STAGING' as const,
      validFrom: new Date(Date.now() - 60_000).toISOString(),
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      thresholds: {
        p95LatencyMaxMs: 500,
        errorRateMaxPct: 1.0,
        availabilityMinPct: 99.0,
      },
      keyId: 'ed25519-staging-sec-01',
    };

    const signedDoc = SloVerificationService.signSloDocument(stagingPayload, privateKeyPem);

    // Alter threshold
    const tamperedDoc: SignedSloDocument = {
      ...signedDoc,
      thresholds: { ...signedDoc.thresholds, p95LatencyMaxMs: 200 },
    };

    const sloService = new SloVerificationService();
    const verification = sloService.verifySloDocument(tamperedDoc, publicKeyPem);

    assert.strictEqual(verification.valid, false);
    assert.ok(verification.reason?.includes('SIGNATURE_INVALID'));
  });

  // ----------------------------------------------------------
  // Workstream F: Telegram Approval State Separation (§8)
  // ----------------------------------------------------------
  it('Approval 1: Separates 5 Telegram claims and confirms bot auth check != human release approval', async () => {
    const check = await gate.inspectB5Telegram({
      simulatedEnvironment: {
        telegramToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz012345678',
      },
    });

    assert.strictEqual(check.status, 'VERIFIED_READ_ONLY');
    const p = check.rawPayload;
    assert.ok(p);
    assert.strictEqual(p.credentialsConfigured, true);
    assert.strictEqual(p.providerAuthVerified, true);
    assert.strictEqual(p.approvalDeliveryVerified, false); // Delivery != configuration!
    assert.strictEqual(p.humanApprovalReceived, false); // Bot auth != human approval!
    assert.strictEqual(p.releaseAuthorizationValid, false); // Historic approval != execution auth!
  });

  it('Approval 2: Missing Telegram token returns NOT_CONFIGURED with all 5 claims false', async () => {
    const check = await gate.inspectB5Telegram({
      simulatedEnvironment: {},
    });

    assert.strictEqual(check.status, 'NOT_CONFIGURED');
    const p = check.rawPayload;
    assert.ok(p);
    assert.strictEqual(p.credentialsConfigured, false);
    assert.strictEqual(p.providerAuthVerified, false);
    assert.strictEqual(p.approvalDeliveryVerified, false);
    assert.strictEqual(p.humanApprovalReceived, false);
    assert.strictEqual(p.releaseAuthorizationValid, false);
  });

  // ----------------------------------------------------------
  // Workstream G: Kubernetes Staging Target & Permissions (§9)
  // ----------------------------------------------------------
  it('Target 1: Evaluates Kubernetes permissions beyond single can-i probe, rejecting cluster-admin', async () => {
    const overPrivileged = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        hasKubeCredentials: true,
        targetNamespace: 'staging',
        isTargetOverPrivileged: true,
      },
    });

    assert.strictEqual(overPrivileged.status, 'BLOCKED');
    assert.strictEqual(overPrivileged.rawPayload?.hasCredentials, true);
    assert.strictEqual(overPrivileged.rawPayload?.excessivePrivilege, true);
    assert.strictEqual(overPrivileged.rawPayload?.hasExcessiveClusterPrivilege, true);
    assert.strictEqual(overPrivileged.rawPayload?.canMutate, false);
    assert.ok(overPrivileged.details.includes('wildcard cluster-admin detected'));
  });

  it('Target 2: Validates strict staging namespace scoping and evaluates RoleBindings', async () => {
    const scopedTarget = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        hasKubeCredentials: true,
        targetNamespace: 'staging',
        isTargetOverPrivileged: false,
        evaluatedRoleBindings: true,
      },
    });

    assert.strictEqual(scopedTarget.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(scopedTarget.rawPayload?.hasCredentials, true);
    assert.strictEqual(scopedTarget.rawPayload?.targetNamespace, 'staging');
    assert.strictEqual(scopedTarget.rawPayload?.isNamespaceRestricted, true);
    assert.strictEqual(scopedTarget.rawPayload?.evaluatedRoleBindings, true);
    assert.strictEqual(scopedTarget.rawPayload?.canInspectWorkload, true);
    assert.strictEqual(scopedTarget.rawPayload?.canMutate, false); // Zero mutation during inspection!
  });

  it('Target 3: Rejects target when namespace is not staging', async () => {
    const wrongNamespace = await gate.inspectB6Target({
      targetEnvironment: 'STAGING',
      simulatedEnvironment: {
        hasKubeCredentials: true,
        targetNamespace: 'default',
        isTargetOverPrivileged: false,
      },
    });

    assert.strictEqual(wrongNamespace.status, 'BLOCKED');
    assert.strictEqual(wrongNamespace.rawPayload?.targetNamespace, 'default');
    assert.strictEqual(wrongNamespace.rawPayload?.isNamespaceRestricted, false);
    assert.ok(wrongNamespace.details.includes('requires \'staging\''));
  });

  // ----------------------------------------------------------
  // Workstream H & I: End-to-End Readiness & Safety Controls (§10, §11)
  // ----------------------------------------------------------
  it('Readiness 1: Truthful evaluation on current workstation returns BLOCKED for staging', async () => {
    const stagingPrereqs = await gate.inspectStagingPrerequisites();
    const report = stateMachine.evaluateReadiness({
      prerequisites: stagingPrereqs,
      safetyInvariantsPassed: true,
      stagingMutationAuthorized: false,
    });

    // On this workstation, Docker daemon and KUBECONFIG are absent -> BLOCKED
    assert.strictEqual(report.overallState, 'BLOCKED');
    assert.strictEqual(report.safetyInvariantsPass, true);
    assert.strictEqual(report.stagingMutationAuthorized, false);
    assert.ok(report.unresolvedBlockers.length > 0);
  });

  it('Readiness 2: Critical safety invariant violation immediately produces NO_GO', () => {
    const mockPrereqs = {
      B1_BUILD: { id: 'B1_BUILD' as const, name: 'B1', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B2_REGISTRY: { id: 'B2_REGISTRY' as const, name: 'B2', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B3_TELEMETRY: { id: 'B3_TELEMETRY' as const, name: 'B3', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B4_SLO: { id: 'B4_SLO' as const, name: 'B4', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B5_APPROVAL: { id: 'B5_APPROVAL' as const, name: 'B5', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B6_TARGET: { id: 'B6_TARGET' as const, name: 'B6', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
    };

    const report = stateMachine.evaluateReadiness({
      prerequisites: mockPrereqs,
      safetyInvariantsPassed: false,
    });

    assert.strictEqual(report.overallState, 'NO_GO');
    assert.strictEqual(report.safetyInvariantsPass, false);
  });

  it('Readiness 3: Production mutation guard strictly blocks any attempt to target production through staging pilot', async () => {
    const stagingPilot = new StagingPilotService();

    const spec: StagingPilotSpecification = {
      pilotId: 'pilot-sec-p307-prod-leak',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      targetId: 'tgt_simmaci_production', // Registered production target (must be rejected for staging pilot)
      candidateReleaseId: 'rel-simmaci-307-cand',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: 'sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      rollbackBaselineReleaseId: 'rel-simmaci-base-306',
      sloVersion: '1.0.0',
      maxReplicaCount: 1,
      quotaLimit: 1,
      healthGateCriteria: {
        maxErrorRatePct: 1.0,
        maxP95LatencyMs: 500,
        minAvailabilityPct: 99.0,
      },
      callerIdentity: 'operator-agent',
    };

    const validation = stagingPilot.validateCandidateReadiness(spec);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.rejectionReason?.includes('PRODUCTION_TARGET_FORBIDDEN'));
  });

  it('Readiness 4: Active kill switch blocks staging operations immediately', () => {
    const mockPrereqs = {
      B1_BUILD: { id: 'B1_BUILD' as const, name: 'B1', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B2_REGISTRY: { id: 'B2_REGISTRY' as const, name: 'B2', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B3_TELEMETRY: { id: 'B3_TELEMETRY' as const, name: 'B3', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B4_SLO: { id: 'B4_SLO' as const, name: 'B4', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B5_APPROVAL: { id: 'B5_APPROVAL' as const, name: 'B5', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
      B6_TARGET: { id: 'B6_TARGET' as const, name: 'B6', status: 'VERIFIED_READ_ONLY' as const, evidenceTier: 'LOCAL_TEST' as const, details: '', blockers: [], checkedAt: '' },
    };

    const report = stateMachine.evaluateReadiness({
      prerequisites: mockPrereqs,
      safetyInvariantsPassed: true,
      killSwitchActive: true,
    });

    assert.strictEqual(report.overallState, 'BLOCKED');
    assert.ok(report.unresolvedBlockers.some((b) => b.includes('KILL_SWITCH_ACTIVE')));
  });

  // ----------------------------------------------------------
  // Workstream J: Preflight Reliability (§12)
  // ----------------------------------------------------------
  it('Preflight Reliability: Executes idempotently with phase 30.7, writes kdi-phase-30-7-readiness.json, and preserves git state', async () => {
    const preflight = new OperatorPreflightService();
    const tmpDir = path.join(os.tmpdir(), `kdi-preflight-p307-${Date.now()}`);

    const result = await preflight.runPreflight({ customOutputDir: tmpDir, phase: '30.7' });

    assert.strictEqual(result.phase, '30.7');
    assert.strictEqual(result.verdict, 'READY_WITH_CONDITIONS');
    assert.strictEqual(result.localEngineeringReadiness, 'READY');
    assert.strictEqual(result.operationalReadinessState, 'BLOCKED'); // Truthful evaluation
    assert.strictEqual(result.stagingDeploymentAuthorization, 'UNAUTHORIZED');
    assert.strictEqual(result.safetyGuards.productionMutationDisabled, true);
    assert.strictEqual(result.safetyGuards.stagingMutationAuthorized, false);

    // Verify machine-readable JSON artifacts
    const p307Json = path.join(tmpDir, 'kdi-phase-30-7-readiness.json');
    assert.ok(fs.existsSync(p307Json));
    const data307 = JSON.parse(fs.readFileSync(p307Json, 'utf-8'));
    assert.strictEqual(data307.phase, '30.7');
    assert.strictEqual(data307.verdict, 'READY_WITH_CONDITIONS');
    assert.strictEqual(data307.operationalReadinessState, 'BLOCKED');

    // Verify summary formatting contains Phase 30.7 header
    const summary = preflight.formatSummaryText(result);
    assert.ok(summary.includes('KDI PHASE 30.7: OPERATOR PREFLIGHT READINESS AUDIT'));
    assert.ok(summary.includes('[1] LOCAL ENGINEERING READINESS'));
    assert.ok(summary.includes('[2] STAGING INTEGRATION PREREQUISITES'));
    assert.ok(summary.includes('[3] STAGING DEPLOYMENT AUTHORIZATION'));
    assert.ok(summary.includes('[4] PRODUCTION PREREQUISITES'));
    assert.ok(summary.includes('OPERATOR REMEDIATION MATRIX'));

    // Cleanup
    try {
      if (fs.existsSync(p307Json)) fs.unlinkSync(p307Json);
      const p306Json = path.join(tmpDir, 'kdi-phase-30-6-readiness.json');
      if (fs.existsSync(p306Json)) fs.unlinkSync(p306Json);
      const p305Json = path.join(tmpDir, 'kdi-phase-30-5-readiness.json');
      if (fs.existsSync(p305Json)) fs.unlinkSync(p305Json);
      fs.rmdirSync(tmpDir);
    } catch {}
  });
});
