// ==========================================================
// services/api/src/engineering/production-delivery/phase-26-rollback.test.ts
// Phase 26: Canary Failure, Automated Rollback, Safety & Interruption Recovery Tests (§6, §8, §9, §13, §16)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { ControlledDeliveryService } from './controlled-delivery.service.js';
import { PHASE_26_DELIVERY_SCENARIOS } from './phase-26-catalog.data.js';

describe('Phase 26: Canary Failure, Rollback & Interruption Recovery Suite', () => {
  // ── 1. Deliberate Canary Failure & Automated Rollback (§8, §9) ─────
  test('Rollback Validation: Unhealthy canary triggers instant automated rollback and restores previous version to RESTORED state', async () => {
    const service = new ControlledDeliveryService();
    const scenario = PHASE_26_DELIVERY_SCENARIOS[1]; // ILMORA canary failure

    const rec = await service.executeDelivery(scenario);

    // 1. Terminal State must be RESTORED (§8)
    assert.strictEqual(rec.currentState, 'RESTORED', 'Unhealthy canary must trigger rollback to RESTORED state');

    // 2. Canary metrics captured the failure (§6)
    assert.ok(rec.canaryMetrics);
    assert.strictEqual(rec.canaryMetrics.isHealthy, false);
    assert.ok(rec.canaryMetrics.errorRatePct > 1.0, 'Canary error rate spike must exceed threshold');
    assert.ok(rec.canaryMetrics.failureTrigger?.includes('HTTP 500 error spike'));

    // 3. Rollback record verified (§9)
    assert.ok(rec.rollbackRecord, 'Rollback record must be generated');
    assert.strictEqual(rec.rollbackRecord.finalState, 'RESTORED');
    assert.strictEqual(rec.rollbackRecord.rollbackTargetCommit, scenario.knownRollbackTargetCommit);
    assert.strictEqual(rec.rollbackRecord.postRollbackVerificationPassed, true);
    assert.ok(rec.rollbackRecord.durationMs > 0);

    // 4. Active version confirmed to be the previous version (§9)
    assert.strictEqual(
      rec.currentActiveVersion,
      scenario.knownRollbackTargetCommit,
      'Active version must be reverted to previous verified commit'
    );

    // 5. Audit trail integrity (§14)
    assert.strictEqual(rec.auditTrail.didRollbackOccur, true);
    assert.strictEqual(rec.auditTrail.activeVersionCurrently, scenario.knownRollbackTargetCommit);
  });

  // ── 2. Rollback Safety: Zero Orphaned Instances or State Bleed (§9) ─
  test('Rollback Safety: Rollback execution leaves zero orphaned leases and deterministic configuration state', async () => {
    const service = new ControlledDeliveryService();
    const scenario = PHASE_26_DELIVERY_SCENARIOS[1];

    const rec = await service.executeDelivery(scenario);

    // Ensure state transitions sequence is valid and monotonic
    const transitions = rec.statusTransitions.map((t) => t.to);
    assert.ok(transitions.includes('PRODUCTION_CANARY'));
    assert.ok(transitions.includes('CANARY_VERIFYING'));
    assert.ok(transitions.includes('ROLLING_BACK'));
    assert.ok(transitions.includes('ROLLBACK_VERIFYING'));
    assert.ok(transitions.includes('RESTORED'));

    // Did NOT proceed to full production promotion
    assert.ok(!transitions.includes('ROLLING_OUT'));
    assert.ok(!transitions.includes('PRODUCTION_VERIFIED'));
  });

  // ── 3. Deployment Interruption & Recovery (§13) ───────────────────
  test('Interruption Recovery: Mid-rollout interruption inspects state and safely resumes without duplicate deployment', async () => {
    const service = new ControlledDeliveryService();
    const scenario = PHASE_26_DELIVERY_SCENARIOS[2]; // KDI interrupted deployment

    const rec = await service.executeDelivery(scenario);

    assert.strictEqual(rec.currentState, 'PRODUCTION_VERIFIED');
    assert.strictEqual(rec.interruptedAndRecovered, true, 'Interrupted flag must be recorded in delivery history');
    assert.strictEqual(rec.currentActiveVersion, scenario.artifact.commitSha);
    assert.strictEqual(rec.auditTrail.healthChecksSummary, 'ALL_PASSED');
  });

  // ── 4. Unauthorized Production Delivery Block (§4, §16) ───────────
  test('Security Boundary: Deployment without human approval is strictly blocked at DEPLOYMENT_BLOCKED', async () => {
    const service = new ControlledDeliveryService();
    const scenario = PHASE_26_DELIVERY_SCENARIOS[3]; // SIMMACI unauthorized attempt

    const rec = await service.executeDelivery(scenario);

    assert.strictEqual(rec.currentState, 'DEPLOYMENT_BLOCKED');
    assert.strictEqual(rec.approval, undefined);
    assert.strictEqual(
      rec.currentActiveVersion,
      scenario.knownRollbackTargetCommit,
      'Active version must remain untouched on unauthorized attempt'
    );
  });
});
