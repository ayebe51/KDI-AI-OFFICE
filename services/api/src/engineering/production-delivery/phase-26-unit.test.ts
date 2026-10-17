// ==========================================================
// services/api/src/engineering/production-delivery/phase-26-unit.test.ts
// Phase 26: Delivery State Machine, Approval Gate, Precheck & Secret Masking Unit Tests (§3, §4, §10, §11, §12, §15, §16)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { DeliveryStateMachineEngine, UnauthorizedProductionDeliveryError, IllegalDeliveryStateTransitionError } from './delivery-state-machine.engine.js';
import { DeliveryValidatorService } from './delivery-validator.service.js';
import { ControlledDeliveryService } from './controlled-delivery.service.js';
import { PHASE_26_DELIVERY_SCENARIOS } from './phase-26-catalog.data.js';

describe('Phase 26: Controlled Delivery Core Unit Tests', () => {
  const stateMachine = new DeliveryStateMachineEngine();
  const validator = new DeliveryValidatorService();

  // ── 1. Delivery State Machine Legal Transitions (§15) ─────────────
  test('Delivery State Machine: Permits valid lifecycle progression from READY_FOR_DEPLOY through STAGING to PRODUCTION', () => {
    assert.strictEqual(stateMachine.canTransition('READY_FOR_DEPLOY', 'AWAITING_APPROVAL'), true);
    assert.strictEqual(stateMachine.canTransition('AWAITING_APPROVAL', 'APPROVED'), true);
    assert.strictEqual(stateMachine.canTransition('APPROVED', 'STAGING_DEPLOYING'), true);
    assert.strictEqual(stateMachine.canTransition('STAGING_DEPLOYING', 'STAGING_VERIFYING'), true);
    assert.strictEqual(stateMachine.canTransition('STAGING_VERIFYING', 'STAGING_VERIFIED'), true);
    assert.strictEqual(stateMachine.canTransition('STAGING_VERIFIED', 'PRODUCTION_CANARY'), true);
    assert.strictEqual(stateMachine.canTransition('PRODUCTION_CANARY', 'CANARY_VERIFYING'), true);
    assert.strictEqual(stateMachine.canTransition('CANARY_VERIFYING', 'ROLLING_OUT'), true);
    assert.strictEqual(stateMachine.canTransition('ROLLING_OUT', 'PRODUCTION_VERIFIED'), true);
  });

  // ── 2. Illegal State Transition Blocking (§15) ─────────────────────
  test('Delivery State Machine: Strictly rejects illegal state jumps with IllegalDeliveryStateTransitionError', () => {
    assert.throws(
      () => {
        stateMachine.assertTransition('READY_FOR_DEPLOY', 'PRODUCTION_VERIFIED', 'DEP-TEST-01', true);
      },
      (err: any) => err instanceof IllegalDeliveryStateTransitionError
    );

    assert.throws(
      () => {
        stateMachine.assertTransition('STAGING_DEPLOYING', 'ROLLING_OUT', 'DEP-TEST-02', true);
      },
      (err: any) => err instanceof IllegalDeliveryStateTransitionError
    );
  });

  // ── 3. Human Approval Boundary Security Guard (§4, §16) ───────────
  test('Security Boundary: Rejects any attempt to enter production states without human approval with UnauthorizedProductionDeliveryError', () => {
    // Attempt to transition to PRODUCTION_CANARY without approval
    assert.throws(
      () => {
        stateMachine.assertTransition('STAGING_VERIFIED', 'PRODUCTION_CANARY', 'DEP-UNAUTH-01', false);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedProductionDeliveryError);
        assert.ok(err.message.includes('without verified human approval'));
        return true;
      }
    );

    // With explicit human approval, transition succeeds cleanly
    assert.doesNotThrow(() => {
      stateMachine.assertTransition('STAGING_VERIFIED', 'PRODUCTION_CANARY', 'DEP-AUTH-01', true);
    });
  });

  // ── 4. Pre-Deploy Validation Success (§3) ─────────────────────────
  test('Pre-Deploy Validation: Passes all 11 integrity and environment checks for a valid immutable artifact', () => {
    const scenario = PHASE_26_DELIVERY_SCENARIOS[0]; // SIMMACI valid scenario
    const precheck = validator.validatePreDeploy(scenario.artifact, scenario.targetEnvironment, {
      knownRollbackTargetCommit: scenario.knownRollbackTargetCommit,
      requireDatabaseMigrationCheck: true,
      migrationType: 'FORWARD_COMPATIBLE',
    });

    assert.strictEqual(precheck.isValid, true);
    assert.strictEqual(precheck.sourceCommitVerified, true);
    assert.strictEqual(precheck.artifactDigestVerified, true);
    assert.strictEqual(precheck.buildCompleted, true);
    assert.strictEqual(precheck.requiredSecretsPresent, true);
    assert.strictEqual(precheck.databaseMigrationSafe, true);
    assert.strictEqual(precheck.rollbackTargetExists, true);
    assert.strictEqual(precheck.blockReasons.length, 0);
  });

  // ── 5. Pre-Deploy Validation Rejection on Missing Rollback (§3, §8) ─
  test('Pre-Deploy Validation: Fails and blocks deployment if rollback target is absent (§3)', () => {
    const scenario = PHASE_26_DELIVERY_SCENARIOS[4]; // ILMORA missing rollback target
    const precheck = validator.validatePreDeploy(scenario.artifact, scenario.targetEnvironment, {
      knownRollbackTargetCommit: '', // Missing rollback target
    });

    assert.strictEqual(precheck.isValid, false);
    assert.strictEqual(precheck.rollbackTargetExists, false);
    assert.ok(precheck.blockReasons.some((r) => r.includes('Rollback target commit is not established')));
  });

  // ── 6. Database Migration Safety Classification (§10) ──────────────
  test('Database Migration Safety: Accepts FORWARD_COMPATIBLE migrations and flags destructive ones', () => {
    const artifact = PHASE_26_DELIVERY_SCENARIOS[0].artifact;

    // 1. Forward compatible: clean
    const res1 = validator.validatePreDeploy(artifact, 'PRODUCTION', {
      knownRollbackTargetCommit: 'f1e2d3c4b5a6',
      requireDatabaseMigrationCheck: true,
      migrationType: 'FORWARD_COMPATIBLE',
    });
    assert.strictEqual(res1.databaseMigrationSafe, true);

    // 2. Destructive without recovery: blocked
    const res2 = validator.validatePreDeploy(artifact, 'PRODUCTION', {
      knownRollbackTargetCommit: 'f1e2d3c4b5a6',
      requireDatabaseMigrationCheck: true,
      migrationType: 'DESTRUCTIVE_UNRECOVERABLE' as any,
    });
    assert.strictEqual(res2.databaseMigrationSafe, false);
    assert.ok(res2.blockReasons.some((r) => r.includes('Database migration is destructive')));
  });

  // ── 7. Production Secret Sanitization & Masking (§11) ──────────────
  test('Secret Masking: Sanitizes database passwords, tokens, and API keys from logs and telemetry', () => {
    const rawLog =
      'Connected to postgres://app:super_secret_pw123@db.prod.internal:5432/main with api_key: sec_tok_994821 and password=super_secret_pw123';
    const sanitized = validator.sanitizeSecrets(rawLog, ['super_secret_pw123', 'sec_tok_994821']);

    assert.ok(!sanitized.includes('super_secret_pw123'), 'Raw password must not be present');
    assert.ok(!sanitized.includes('sec_tok_994821'), 'Raw API token must not be present');
    assert.ok(sanitized.includes('***MASKED***'));
  });

  // ── 8. Deployment Idempotency (§12) ────────────────────────────────
  test('Deployment Idempotency: Correctly detects when an artifact digest is already active in production', async () => {
    const service = new ControlledDeliveryService();
    const scenario = PHASE_26_DELIVERY_SCENARIOS[0];

    assert.strictEqual(
      service.isArtifactAlreadyDeployed(scenario.artifact.artifactDigestSha256, 'PRODUCTION'),
      false
    );

    // Execute delivery
    await service.executeDelivery(scenario);

    // Query again: now it is already deployed
    assert.strictEqual(
      service.isArtifactAlreadyDeployed(scenario.artifact.artifactDigestSha256, 'PRODUCTION'),
      true,
      'Must identify artifact digest as already deployed in target environment (§12)'
    );
  });
});
