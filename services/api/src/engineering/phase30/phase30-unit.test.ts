// ==========================================================
// services/api/src/engineering/phase30/phase30-unit.test.ts
// Phase 30.2: Authorized Production Execution Unit Tests (§11–§14)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { RiskClassifier } from './risk-classifier.js';
import { DeploymentTargetRegistry, TargetScopeMismatchError, UnknownDeploymentTargetError } from './deployment-target-registry.js';
import { ReleaseRegistryService, InvalidRollbackTargetError, DuplicateReleaseError } from './release-registry.service.js';
import { Phase30AuditService } from './phase30-audit.service.js';
import { TelemetryAdapter } from './telemetry-adapter.js';
import { AuthorizedReleaseExecutor, UnallowlistedOperationError, ProductionMutationDisabledError } from './authorized-release-executor.js';

describe('Phase 30.2: Core Components Unit Tests', () => {
  // ── 1. Risk Classifier ───────────────────────────────────────────
  test('RiskClassifier: Detects schema breaking DDL and marks CRITICAL risk', () => {
    const classifier = new RiskClassifier();
    const res = classifier.classify({
      requestId: 'req_01',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.2.0',
      commitSha: 'c0ffee1',
      artifactDigestSha256: 'a'.repeat(64),
      changedFiles: ['migrations/003_drop_table_legacy_exams.sql'],
      isDryRun: false,
      callerIdentity: 'test-agent',
    });

    assert.strictEqual(res.riskLevel, 'CRITICAL');
    assert.strictEqual(res.blastRadius, 'PLATFORM');
    assert.strictEqual(res.isSchemaBreaking, true);
    assert.strictEqual(res.requiresHumanApproval, true);
  });

  // ── 2. Deployment Target Registry ─────────────────────────────────
  test('DeploymentTargetRegistry: Validates targets and rejects cross-project mismatches', () => {
    const registry = new DeploymentTargetRegistry();

    // Valid lookup
    const target = registry.getTarget('tgt_simmaci_staging');
    assert.strictEqual(target.project, 'SIMMACI');
    assert.strictEqual(target.environment, 'STAGING');

    // Reject unknown target
    assert.throws(
      () => registry.getTarget('tgt_nonexistent_cluster'),
      UnknownDeploymentTargetError
    );

    // Reject cross-project mismatch
    assert.throws(
      () =>
        registry.validateRequestScope({
          requestId: 'req_02',
          project: 'ILMORA', // Mismatch: target is SIMMACI
          service: 'simmaci-academic-portal',
          environment: 'STAGING',
          targetId: 'tgt_simmaci_staging',
          version: '1.0.0',
          commitSha: 'abc',
          artifactDigestSha256: 'def',
          changedFiles: [],
          isDryRun: true,
          callerIdentity: 'test-agent',
        }),
      TargetScopeMismatchError
    );
  });

  // ── 3. Release Registry ──────────────────────────────────────────
  test('ReleaseRegistry: Tracks explicit releases and rejects relative HEAD~1 rollback targets', () => {
    const tmpStorage = path.join(os.tmpdir(), `kdi-test-registry-${Date.now()}.json`);
    const registry = new ReleaseRegistryService({ storageFilePath: tmpStorage });

    // Reject HEAD~1
    assert.throws(
      () =>
        registry.registerRelease({
          releaseId: 'rel_test_bad_rb',
          project: 'SIMMACI',
          service: 'simmaci-academic-portal',
          environment: 'STAGING',
          version: '1.0.1',
          commitSha: 'c1',
          artifactDigestSha256: 'd1',
          rollbackTargetReleaseId: 'HEAD~1',
        }),
      InvalidRollbackTargetError
    );

    // Register baseline release
    const base = registry.registerRelease({
      releaseId: 'rel_simmaci_v1.0.0',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.0',
      commitSha: 'c0',
      artifactDigestSha256: 'd0',
    });
    registry.updateReleaseStatus(base.releaseId, 'ACTIVE');

    // Register release with valid rollback target
    const nextRel = registry.registerRelease({
      releaseId: 'rel_simmaci_v1.0.1',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      version: '1.0.1',
      commitSha: 'c1',
      artifactDigestSha256: 'd1',
      rollbackTargetReleaseId: 'rel_simmaci_v1.0.0',
    });
    assert.strictEqual(nextRel.rollbackTargetReleaseId, 'rel_simmaci_v1.0.0');

    // Test persistence across restart
    const restartedRegistry = new ReleaseRegistryService({ storageFilePath: tmpStorage });
    const loaded = restartedRegistry.getRelease('rel_simmaci_v1.0.1');
    assert.strictEqual(loaded.releaseId, 'rel_simmaci_v1.0.1');
    assert.strictEqual(loaded.rollbackTargetReleaseId, 'rel_simmaci_v1.0.0');

    registry.clear();
  });

  // ── 4. Audit Service ─────────────────────────────────────────────
  test('Phase30AuditService: Records events with valid SHA-256 hash chaining and secret sanitization', () => {
    const tmpLog = path.join(os.tmpdir(), `kdi-test-audit-${Date.now()}.jsonl`);
    const audit = new Phase30AuditService({ ledgerFilePath: tmpLog });

    const ev1 = audit.recordEvent({
      phase: 'TEST_PHASE',
      action: 'TEST_ACTION',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      actor: 'unit-tester',
      details: 'Connecting with password: "SuperSecretPassword123!" and token=eyJhbGciOiJIUzI1NiJ9.secret.sig',
    });

    assert.ok(!ev1.details.includes('SuperSecretPassword123!'), 'Password must be sanitized');
    assert.ok(ev1.details.includes('[REDACTED]'), 'Details must contain [REDACTED]');

    audit.recordEvent({
      phase: 'TEST_PHASE_2',
      action: 'ANOTHER_ACTION',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      actor: 'unit-tester',
      details: 'Clean event',
    });

    const verifyRes = audit.verifyLedgerIntegrity();
    assert.strictEqual(verifyRes.isValid, true, 'Hash chain must be completely valid');

    audit.clear();
  });

  // ── 5. Telemetry Adapter ─────────────────────────────────────────
  test('TelemetryAdapter: UNKNOWN health status strictly prevents promotion (§14)', async () => {
    const telemetry = new TelemetryAdapter();
    const reading = await telemetry.observeTarget(
      {
        targetId: 'tgt_simmaci_production',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'PRODUCTION',
        cluster: 'simmaci-k8s-prod',
        isProduction: true,
        requiresHumanApproval: true,
        healthEndpoint: 'https://simmaci.kdi-office.id/health',
        allowedOperations: ['EXECUTE_PROMOTION'],
      },
      { mockSignalOverride: { isUnreachable: true } }
    );

    assert.strictEqual(reading.status, 'UNKNOWN');
    const promoCheck = telemetry.isEligibleForPromotion(reading);
    assert.strictEqual(promoCheck.eligible, false);
    assert.ok(promoCheck.reason?.includes('UNKNOWN'));
  });

  // ── 6. Authorized Release Executor ───────────────────────────────
  test('AuthorizedReleaseExecutor: Rejects unallowlisted operations and enforces production mutation guard', async () => {
    const executor = new AuthorizedReleaseExecutor();

    // Reject non-allowlisted operation
    await assert.rejects(
      async () =>
        executor.executeOperation({
          operation: 'DROP_DATABASE' as any,
          target: {
            targetId: 'tgt_kdi_local_dry_run',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'LOCAL_DRY_RUN',
            cluster: 'local',
            isProduction: false,
            requiresHumanApproval: false,
            healthEndpoint: 'http://localhost/health',
            allowedOperations: ['EXECUTE_DRY_RUN'],
          },
          release: {
            releaseId: 'rel_1',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'LOCAL_DRY_RUN',
            version: '1.0.0',
            commitSha: 'a',
            artifactDigestSha256: 'b',
            status: 'DRAFT',
            createdAt: '',
            updatedAt: '',
          },
          isDryRun: true,
        }),
      UnallowlistedOperationError
    );

    // Reject real production mutation under Phase 30.2
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
            releaseId: 'rel_2',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'PRODUCTION',
            version: '1.0.0',
            commitSha: 'a',
            artifactDigestSha256: 'b',
            status: 'DRAFT',
            createdAt: '',
            updatedAt: '',
          },
          isDryRun: false, // Forbidden in Phase 30.2
        }),
      ProductionMutationDisabledError
    );
  });
});
