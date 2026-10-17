// ==========================================================
// services/api/src/engineering/autonomous-delivery/phase-29-unit.test.ts
// Phase 29: Autonomous Delivery Engine Unit Tests (§1–§20)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { AutonomousDeliveryService } from './autonomous-delivery.service.js';
import { PHASE_29_REAL_TASKS } from './phase-29-catalog.data.js';

describe('Phase 29: Autonomous Delivery Unit Tests', () => {
  const service = new AutonomousDeliveryService();

  test('Unit 1: Autonomous classification assigns correct autonomy levels and blast radius', async () => {
    // Staging task -> Level 2
    const stagingTask = PHASE_29_REAL_TASKS.find((t) => t.deployment_requirement === 'STAGING_ONLY')!;
    const rec1 = await service.executeTask(stagingTask);
    assert.strictEqual(rec1.classification.autonomyLevel, 'LEVEL_2');
    assert.strictEqual(rec1.readyForDeployReached, true);
    assert.strictEqual(rec1.finalStatus, 'AUTONOMOUSLY_COMPLETED');

    // Live production task -> Level 3
    const prodTask = PHASE_29_REAL_TASKS.find((t) => t.deployment_requirement === 'LIVE_PRODUCTION' && !t.simulatedProductionFailure)!;
    const rec2 = await service.executeTask(prodTask, 'human_prod_approval_token_sec_994827104');
    assert.strictEqual(rec2.classification.autonomyLevel, 'LEVEL_3');
    assert.strictEqual(rec2.readyForDeployReached, true);
    assert.strictEqual(rec2.finalStatus, 'COMPLETED_WITH_HUMAN_APPROVAL');
  });

  test('Unit 2: Worktree allocation enforces project isolation and clean teardown', async () => {
    const task = PHASE_29_REAL_TASKS[0];
    const rec = await service.executeTask(task);
    assert.ok(rec.worktree.worktreePath.length > 0);
    assert.strictEqual(rec.worktree.cleanVerified, true);
    assert.strictEqual(rec.evidence.worktreeVerified, true);
  });

  test('Unit 3: Bounded repair loop repairs test failures on Attempt 2 without exceeding MAX_REPAIR_ATTEMPTS=3', async () => {
    const repairTask = PHASE_29_REAL_TASKS.find((t) => t.simulatedFaultOnFirstTest !== undefined)!;
    assert.ok(repairTask, 'Must have a task with simulated fault');

    const rec = await service.executeTask(repairTask);
    assert.strictEqual(rec.repairAttempts, 2, 'Should succeed on attempt 2 after repair');
    assert.strictEqual(rec.repairHistory.length, 2);
    assert.strictEqual(rec.repairHistory[0].retestPassed, false);
    assert.strictEqual(rec.repairHistory[1].retestPassed, true);
    assert.strictEqual(rec.validation.allGatesPassed, true);
  });

  test('Unit 4: READY_FOR_DEPLOY is technically distinct from deployment authorization', async () => {
    const prodTask = PHASE_29_REAL_TASKS.find((t) => t.deployment_requirement === 'LIVE_PRODUCTION' && !t.simulatedProductionFailure)!;

    // Execute without human approval token -> halts at WAITING_FOR_APPROVAL
    const recWithoutToken = await service.executeTask(prodTask, undefined);
    assert.strictEqual(recWithoutToken.readyForDeployReached, true, 'Must reach READY_FOR_DEPLOY');
    assert.strictEqual(recWithoutToken.finalStatus, 'ESCALATED', 'Must not self-deploy without token');
    assert.strictEqual(recWithoutToken.deploymentRecord, undefined, 'Deployment record must be absent');

    // Execute with valid token -> proceeds to deployment
    const recWithToken = await service.executeTask(prodTask, 'human_prod_approval_token_sec_994827104');
    assert.strictEqual(recWithToken.readyForDeployReached, true);
    assert.strictEqual(recWithToken.finalStatus, 'COMPLETED_WITH_HUMAN_APPROVAL');
    assert.ok(recWithToken.deploymentRecord !== undefined);
  });

  test('Unit 5: Post-deployment failure triggers automated canary rollback to RESTORED state', async () => {
    const rollbackTask = PHASE_29_REAL_TASKS.find((t) => t.simulatedProductionFailure !== undefined)!;
    assert.ok(rollbackTask, 'Must have a task with simulated production failure');

    const rec = await service.executeTask(rollbackTask, 'human_prod_approval_token_sec_994827104');
    assert.strictEqual(rec.finalStatus, 'ROLLED_BACK');
    assert.ok(rec.rollbackRecord !== undefined);
    assert.strictEqual(rec.rollbackRecord?.success, true);
    assert.strictEqual(rec.rollbackRecord?.postRollbackHealthVerified, true);
  });

  test('Unit 6: Scorecard metrics calculate accurately without double-counting', () => {
    const scorecard = service.generateScorecard();
    assert.ok(scorecard.totalTasks >= 5);
    assert.strictEqual(
      scorecard.totalTasks,
      scorecard.autonomousCompletions +
        scorecard.humanApprovedCompletions +
        scorecard.escalatedTasks +
        scorecard.blockedTasks +
        scorecard.failedTasks +
        scorecard.rolledBackTasks,
      'Mutually exclusive outcomes must sum exactly to total tasks'
    );
  });
});
