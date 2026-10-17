// ==========================================================
// services/api/src/engineering/live-operations/phase-27-unit.test.ts
// Phase 27: Production Safety Policy, Blast Radius & Kill Switch Unit Tests (§1–§9, §15–§17)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { SafetyPolicyEngine, PolicyDeniedError } from './safety-policy.engine.js';
import { LiveOperationsService } from './live-operations.service.js';
import type { ProductionActionRequest } from './phase-27.types.js';

describe('Phase 27: Production Safety Policy Core Unit Tests', () => {
  const policyEngine = new SafetyPolicyEngine();
  const operationsService = new LiveOperationsService();

  // ── 1. Action Risk Classification (§2–§6) ─────────────────────────
  test('Safety Policy: Correctly classifies actions into Risk Tiers 0 through 4', () => {
    // Level 0: READ_ONLY
    assert.strictEqual(policyEngine.classifyActionRisk('read_metrics'), 'READ_ONLY');
    assert.strictEqual(policyEngine.classifyActionRisk('inspect_process_status'), 'READ_ONLY');
    assert.strictEqual(policyEngine.classifyActionRisk('check_backup_status'), 'READ_ONLY');

    // Level 1: LOW_RISK_AUTONOMOUS
    assert.strictEqual(policyEngine.classifyActionRisk('restart_stateless_worker'), 'LOW_RISK_AUTONOMOUS');
    assert.strictEqual(policyEngine.classifyActionRisk('clear_bounded_cache'), 'LOW_RISK_AUTONOMOUS');
    assert.strictEqual(policyEngine.classifyActionRisk('retry_transient_health_check'), 'LOW_RISK_AUTONOMOUS');

    // Level 2: CONTROLLED_AUTONOMOUS
    assert.strictEqual(policyEngine.classifyActionRisk('invoke_approved_rollback'), 'CONTROLLED_AUTONOMOUS');
    assert.strictEqual(policyEngine.classifyActionRisk('purge_temporary_disk_spool'), 'CONTROLLED_AUTONOMOUS');
    assert.strictEqual(policyEngine.classifyActionRisk('reconcile_stateless_replica_drift'), 'CONTROLLED_AUTONOMOUS');

    // Level 3: HUMAN_APPROVAL_REQUIRED
    assert.strictEqual(policyEngine.classifyActionRisk('destructive_database_migration'), 'HUMAN_APPROVAL_REQUIRED');
    assert.strictEqual(policyEngine.classifyActionRisk('change_security_policy'), 'HUMAN_APPROVAL_REQUIRED');
    assert.strictEqual(policyEngine.classifyActionRisk('production_secret_change'), 'HUMAN_APPROVAL_REQUIRED');

    // Level 4: FORBIDDEN
    assert.strictEqual(policyEngine.classifyActionRisk('drop_table'), 'FORBIDDEN');
    assert.strictEqual(policyEngine.classifyActionRisk('delete_production_database'), 'FORBIDDEN');
    assert.strictEqual(policyEngine.classifyActionRisk('disable_audit_logging'), 'FORBIDDEN');
    assert.strictEqual(policyEngine.classifyActionRisk('bypass_human_approval'), 'FORBIDDEN');
  });

  // ── 2. Forbidden Action Technical Block (§6) ───────────────────────
  test('Safety Policy: Technically blocks Level 4 Forbidden actions with POLICY_DENIED', () => {
    const forbiddenRequest: ProductionActionRequest = {
      incidentId: 'INC-FORBIDDEN-01',
      projectId: 'SIMMACI',
      environment: 'PRODUCTION',
      action: 'drop_table',
      target: 'prescriptions_history',
      risk: 'FORBIDDEN',
      blastRadius: 'SINGLE_SERVICE',
      reversible: false,
      idempotent: false,
      rollbackAvailable: false,
      verificationPlan: 'Verify table dropped',
    };

    const result = policyEngine.evaluatePolicy(forbiddenRequest);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.policyDecision, 'POLICY_DENIED');
    assert.strictEqual(result.risk, 'FORBIDDEN');

    assert.throws(
      () => {
        policyEngine.assertExecutionPermitted(forbiddenRequest);
      },
      (err: any) => err instanceof PolicyDeniedError
    );
  });

  // ── 3. Blast Radius Boundaries (§8) ────────────────────────────────
  test('Safety Policy: Restricts multi-service, multi-project, and global blast radius', () => {
    // Single process/container allows low-risk autonomous
    assert.strictEqual(policyEngine.isBlastRadiusAcceptableForAutonomy('SINGLE_PROCESS', 'LOW_RISK_AUTONOMOUS'), true);
    assert.strictEqual(policyEngine.isBlastRadiusAcceptableForAutonomy('SINGLE_CONTAINER', 'LOW_RISK_AUTONOMOUS'), true);

    // Single service allows controlled autonomous
    assert.strictEqual(policyEngine.isBlastRadiusAcceptableForAutonomy('SINGLE_SERVICE', 'CONTROLLED_AUTONOMOUS'), true);

    // Multi-service, multi-project, global MUST NOT be autonomous
    assert.strictEqual(policyEngine.isBlastRadiusAcceptableForAutonomy('MULTI_SERVICE', 'CONTROLLED_AUTONOMOUS'), false);
    assert.strictEqual(policyEngine.isBlastRadiusAcceptableForAutonomy('MULTI_PROJECT', 'CONTROLLED_AUTONOMOUS'), false);
    assert.strictEqual(policyEngine.isBlastRadiusAcceptableForAutonomy('GLOBAL', 'LOW_RISK_AUTONOMOUS'), false);
  });

  // ── 4. Global Safety Kill Switch (§17) ─────────────────────────────
  test('Safety Policy: Global kill switch immediately halts all autonomous mutations', () => {
    const testEngine = new SafetyPolicyEngine();
    assert.strictEqual(testEngine.isKillSwitchActive(), false);

    // Engage kill switch
    testEngine.engageKillSwitch('Operator emergency halt: external network incident');
    assert.strictEqual(testEngine.isKillSwitchActive(), true);

    const normalAutonomousRequest: ProductionActionRequest = {
      incidentId: 'INC-KILL-SWITCH-01',
      projectId: 'ILMORA',
      environment: 'PRODUCTION',
      action: 'restart_stateless_worker',
      target: 'grading-worker-01',
      risk: 'LOW_RISK_AUTONOMOUS',
      blastRadius: 'SINGLE_PROCESS',
      reversible: true,
      idempotent: true,
      rollbackAvailable: true,
      verificationPlan: 'Probe process pid',
    };

    const evalResult = testEngine.evaluatePolicy(normalAutonomousRequest);
    assert.strictEqual(evalResult.allowed, false);
    assert.strictEqual(evalResult.policyDecision, 'REQUIRE_HUMAN_APPROVAL');
    assert.strictEqual(evalResult.killSwitchActive, true);
    assert.ok(evalResult.reasons[0].includes('KILL_SWITCH_ACTIVE'));

    // Disengage kill switch and recheck
    testEngine.disengageKillSwitch();
    assert.strictEqual(testEngine.isKillSwitchActive(), false);
    const retryResult = testEngine.evaluatePolicy(normalAutonomousRequest);
    assert.strictEqual(retryResult.allowed, true);
    assert.strictEqual(retryResult.policyDecision, 'ALLOW_AUTONOMOUS');
  });

  // ── 5. Secret Masking & Zero Leakage (§16) ─────────────────────────
  test('Secret Masking: Strips credentials, tokens, DB passwords, and private keys', () => {
    const rawSecretLog = `
      Connecting with postgres://admin:superSecretPass123@prod-db.kdi.local:5432/main
      api_key: 'mock_api_key_sample_token_for_mask_test_998877'
      Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
      -----BEGIN PRIVATE KEY-----
      MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VNBX...
      -----END PRIVATE KEY-----
    `;

    const sanitized = operationsService.maskSecrets(rawSecretLog);

    assert.ok(!sanitized.includes('superSecretPass123'), 'DB password must not leak');
    assert.ok(!sanitized.includes('mock_api_key_sample_token_for_mask_test_998877'), 'API key must not leak');
    assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT token must not leak');
    assert.ok(!sanitized.includes('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VNBX'), 'Private key must not leak');

    assert.ok(sanitized.includes('[REDACTED_PASSWORD]'));
    assert.ok(sanitized.includes('[REDACTED_SECRET]'));
    assert.ok(sanitized.includes('[REDACTED_JWT_TOKEN]'));
    assert.ok(sanitized.includes('[REDACTED_PRIVATE_KEY]'));
  });

  // ── 6. Precondition Enforcement (§9) ───────────────────────────────
  test('Safety Policy: Enforces mandatory preconditions before autonomous mutation', () => {
    // Missing target instance
    const missingTargetRequest: ProductionActionRequest = {
      incidentId: 'INC-PRE-01',
      projectId: 'SIMMACI',
      environment: 'PRODUCTION',
      action: 'restart_stateless_worker',
      target: '', // Missing!
      risk: 'LOW_RISK_AUTONOMOUS',
      blastRadius: 'SINGLE_PROCESS',
      reversible: true,
      idempotent: true,
      rollbackAvailable: true,
      verificationPlan: 'Check health endpoint',
    };

    const res = policyEngine.evaluatePolicy(missingTargetRequest);
    assert.strictEqual(res.allowed, false);
    assert.ok(res.unmetPreconditions.includes('TARGET_IDENTIFIED'));

    // Missing verification plan
    const missingVerificationRequest: ProductionActionRequest = {
      incidentId: 'INC-PRE-02',
      projectId: 'SIMMACI',
      environment: 'PRODUCTION',
      action: 'restart_stateless_worker',
      target: 'worker-proc-99',
      risk: 'LOW_RISK_AUTONOMOUS',
      blastRadius: 'SINGLE_PROCESS',
      reversible: true,
      idempotent: true,
      rollbackAvailable: true,
      verificationPlan: '', // Missing!
    };

    const res2 = policyEngine.evaluatePolicy(missingVerificationRequest);
    assert.strictEqual(res2.allowed, false);
    assert.ok(res2.unmetPreconditions.includes('VERIFICATION_PLAN_AVAILABLE'));
  });
});
