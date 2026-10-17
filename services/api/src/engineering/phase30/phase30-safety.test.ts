// ==========================================================
// services/api/src/engineering/phase30/phase30-safety.test.ts
// Phase 30.2: Safety Regression & Non-Bypassable Boundary Tests (§17, §18)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { Phase30Controller } from './phase30-controller.js';
import { Phase30Policy } from './phase30-policy.js';
import { TargetScopeMismatchError } from './deployment-target-registry.js';
import { InvalidRollbackTargetError } from './release-registry.service.js';

describe('Phase 30.2: Safety Regression & Policy Gate Tests (§17)', () => {
  test('Safety 1: Production deployment is rejected when human approval is missing', async () => {
    const controller = new Phase30Controller();
    const result = await controller.handleReleaseRequest({
      requestId: 'sec_req_01',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.2.0',
      commitSha: 'a1b2c3d',
      artifactDigestSha256: 'a'.repeat(64),
      changedFiles: ['src/portal.ts'],
      isDryRun: false,
      callerIdentity: 'autonomous-agent',
      // No approvalToken!
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.policyEvaluation.allowed, false);
    assert.ok(result.policyEvaluation.rejectionReason?.includes('APPROVAL_REQUIRED'));
  });

  test('Safety 2: Expired human approval token is rejected', async () => {
    const controller = new Phase30Controller();
    controller.policy.registerApproval({
      approvalId: 'appr_expired_1',
      releaseId: 'rel_simmaci_test',
      approverIdentity: 'Ayub (Lead Architect)',
      approvedAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() - 60000).toISOString(), // Expired 1 minute ago
      targetEnvironment: 'PRODUCTION',
      approvalToken: 'token_expired_123',
      blastRadiusAcknowledged: 'SERVICE',
      isUsed: false,
    });

    const result = await controller.handleReleaseRequest({
      requestId: 'sec_req_02',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.2.0',
      commitSha: 'a1b2c3d',
      artifactDigestSha256: 'a'.repeat(64),
      changedFiles: ['src/portal.ts'],
      isDryRun: false,
      callerIdentity: 'autonomous-agent',
      approvalToken: 'token_expired_123',
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.policyEvaluation.rejectionReason?.includes('EXPIRED_APPROVAL'));
  });

  test('Safety 3: Replayed/already used human approval token is rejected', async () => {
    const controller = new Phase30Controller();
    controller.policy.registerApproval({
      approvalId: 'appr_used_1',
      releaseId: 'rel_simmaci_test',
      approverIdentity: 'Ayub (Lead Architect)',
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      targetEnvironment: 'PRODUCTION',
      approvalToken: 'token_used_123',
      blastRadiusAcknowledged: 'SERVICE',
      isUsed: true, // Already consumed!
    });

    const result = await controller.handleReleaseRequest({
      requestId: 'sec_req_03',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      targetId: 'tgt_simmaci_production',
      version: '1.2.0',
      commitSha: 'a1b2c3d',
      artifactDigestSha256: 'a'.repeat(64),
      changedFiles: ['src/portal.ts'],
      isDryRun: false,
      callerIdentity: 'autonomous-agent',
      approvalToken: 'token_used_123',
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.policyEvaluation.rejectionReason?.includes('REPLAYED_APPROVAL'));
  });

  test('Safety 4: Wrong environment approval token is rejected', async () => {
    const controller = new Phase30Controller();
    controller.policy.registerApproval({
      approvalId: 'appr_staging_only',
      releaseId: 'rel_simmaci_test',
      approverIdentity: 'Ayub (Lead Architect)',
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      targetEnvironment: 'STAGING', // Token is only valid for STAGING
      approvalToken: 'token_staging_only',
      blastRadiusAcknowledged: 'SERVICE',
      isUsed: false,
    });

    const result = await controller.handleReleaseRequest({
      requestId: 'sec_req_04',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION', // Request targets PRODUCTION
      targetId: 'tgt_simmaci_production',
      version: '1.2.0',
      commitSha: 'a1b2c3d',
      artifactDigestSha256: 'a'.repeat(64),
      changedFiles: ['src/portal.ts'],
      isDryRun: false,
      callerIdentity: 'autonomous-agent',
      approvalToken: 'token_staging_only',
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.policyEvaluation.rejectionReason?.includes('WRONG_ENVIRONMENT_APPROVAL'));
  });

  test('Safety 5: Cross-project deployment request is rejected before execution', async () => {
    const controller = new Phase30Controller();
    await assert.rejects(
      async () =>
        controller.handleReleaseRequest({
          requestId: 'sec_req_05',
          project: 'ILMORA', // Mismatch with SIMMACI target
          service: 'simmaci-academic-portal',
          environment: 'STAGING',
          targetId: 'tgt_simmaci_staging',
          version: '1.0.0',
          commitSha: 'a1b2c3d',
          artifactDigestSha256: 'a'.repeat(64),
          changedFiles: [],
          isDryRun: true,
          callerIdentity: 'autonomous-agent',
        }),
      TargetScopeMismatchError
    );
  });

  test('Safety 6: Active Kill Switch blocks all execution requests immediately', async () => {
    const tmpKillFile = path.join(os.tmpdir(), `kdi-ks-p302-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const policy = new Phase30Policy({ killSwitchStateFilePath: tmpKillFile });
    const controller = new Phase30Controller(undefined, policy);
    try {
      // Engage Kill Switch
      controller.policy.governanceEngine.engageKillSwitch('Emergency operator halt');

      const result = await controller.handleReleaseRequest({
        requestId: 'sec_req_06',
        project: 'KDI',
        service: 'kdi-agent-platform',
        environment: 'LOCAL_DRY_RUN',
        targetId: 'tgt_kdi_local_dry_run',
        version: '1.0.0',
        commitSha: 'a1b2c3d',
        artifactDigestSha256: 'a'.repeat(64),
        changedFiles: [],
        isDryRun: true,
        callerIdentity: 'autonomous-agent',
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.policyEvaluation.rejectionReason?.includes('KILL_SWITCH_ACTIVE'));
    } finally {
      // Disengage kill switch for subsequent tests
      controller.policy.governanceEngine.disengageKillSwitchWithHumanToken('human_sec_token_99482710492817293847');
      try { if (fs.existsSync(tmpKillFile)) fs.unlinkSync(tmpKillFile); } catch {}
    }
  });

  test('Safety 7: Relative Git HEAD~1 rollback targets are strictly rejected', async () => {
    const controller = new Phase30Controller();
    await assert.rejects(
      async () =>
        controller.handleReleaseRequest({
          requestId: 'sec_req_07',
          project: 'SIMMACI',
          service: 'simmaci-academic-portal',
          environment: 'STAGING',
          targetId: 'tgt_simmaci_staging',
          version: '1.0.1',
          commitSha: 'a1b2c3d',
          artifactDigestSha256: 'a'.repeat(64),
          rollbackTargetReleaseId: 'HEAD~1', // Prohibited!
          changedFiles: [],
          isDryRun: false,
          callerIdentity: 'autonomous-agent',
        }),
      InvalidRollbackTargetError
    );
  });

  test('Safety 8: Unknown Telemetry status blocks promotion and halts deployment', async () => {
    const controller = new Phase30Controller();
    const result = await controller.handleReleaseRequest(
      {
        requestId: 'sec_req_08',
        project: 'SIMMACI',
        service: 'simmaci-academic-portal',
        environment: 'STAGING',
        targetId: 'tgt_simmaci_staging',
        version: '1.0.2',
        commitSha: 'a1b2c3d',
        artifactDigestSha256: 'a'.repeat(64),
        changedFiles: [],
        isDryRun: false,
        callerIdentity: 'autonomous-agent',
      },
      { mockSignalOverride: { isUnreachable: true } } // Forces UNKNOWN
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.telemetryObservation.status, 'UNKNOWN');
    assert.strictEqual(result.finalState, 'FAILED');
  });
});
