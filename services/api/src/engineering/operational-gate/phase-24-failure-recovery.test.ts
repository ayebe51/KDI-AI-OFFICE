// ==========================================================
// services/api/src/engineering/operational-gate/phase-24-failure-recovery.test.ts
// Phase 24: Failure Recovery, Restart Safety & Idempotency Test Suite (§4–§7, §13)
// ==========================================================

import { describe, test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Phase24OperationalGateService } from './phase-24-operational-gate.service.js';
import { PHASE_24_REAL_TASKS } from './phase-24-catalog.data.js';

describe('Phase 24: Failure Recovery, Restart Safety & Idempotency (§4–§7)', () => {
  let tempBaseDir: string;
  let gateService: Phase24OperationalGateService;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kdi-p24-failure-test-'));
    gateService = new Phase24OperationalGateService({
      baseStorageDir: path.join(tempBaseDir, 'pool'),
      enableFastExecution: true,
      maxRepairAttempts: 3,
    });
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempBaseDir)) {
        fs.rmSync(tempBaseDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ── 1. Failure Scenario A: Agent Process Failure (§4.A, §5) ───────
  test('Failure Recovery A: Agent process crash preserves state and recovers to READY_FOR_DEPLOY', async () => {
    const task = PHASE_24_REAL_TASKS[0]; // SIMMACI-REAL-01
    const record = await gateService.executeRealTask(task, 'AGENT_PROCESS_FAILURE');

    assert.strictEqual(record.finalStatus, 'READY_FOR_DEPLOY');
    assert.strictEqual(record.attemptCount, 2);
    assert.ok(record.auditTrail.failuresEncountered.includes('AGENT_PROCESS_FAILURE'));
    assert.ok(record.auditTrail.recoveryActionsTaken.length > 0);
    assert.strictEqual(record.definitionOfDone.isReadyForDeploy, true);
    assert.strictEqual(record.humanInterventionCount, 0, 'Recovery must be autonomous');
  });

  // ── 2. Failure Scenario B: Test Failure & Autonomous Repair (§4.B, §5) ─
  test('Failure Recovery B: Test assertion failure triggers self-repair loop and passes on re-test', async () => {
    const task = PHASE_24_REAL_TASKS[3]; // ILMORA-REAL-04
    const record = await gateService.executeRealTask(task, 'TEST_FAILURE');

    assert.strictEqual(record.finalStatus, 'READY_FOR_DEPLOY');
    assert.strictEqual(record.attemptCount, 2);
    assert.ok(record.auditTrail.failuresEncountered.includes('TEST_FAILURE'));
    assert.strictEqual(record.auditTrail.repairAttempts, 1);
    assert.ok(record.auditTrail.recoveryActionsTaken.some((a) => a.includes('self-repair')));
    assert.strictEqual(record.testResult.status, 'PASSED');
    assert.strictEqual(record.definitionOfDone.isReadyForDeploy, true);
    assert.strictEqual(record.humanInterventionCount, 0, 'Repair must be autonomous');
  });

  // ── 3. Failure Scenario C: Execution Timeout Recovery (§4.C, §5) ──
  test('Failure Recovery C: Execution timeout triggers lease recovery and clean retry', async () => {
    const task = PHASE_24_REAL_TASKS[6]; // KDI-REAL-07
    const record = await gateService.executeRealTask(task, 'TIMEOUT');

    assert.strictEqual(record.finalStatus, 'READY_FOR_DEPLOY');
    assert.strictEqual(record.attemptCount, 2);
    assert.ok(record.auditTrail.failuresEncountered.includes('TIMEOUT'));
    assert.ok(record.auditTrail.recoveryActionsTaken.some((a) => a.includes('Lease timeout')));
    assert.strictEqual(record.definitionOfDone.isReadyForDeploy, true);
  });

  // ── 4. Failure Scenario D: Execution State Failure (§4.D, §5) ─────
  test('Failure Recovery D: Interrupted execution state recovers cleanly without lost state', async () => {
    const task = PHASE_24_REAL_TASKS[1]; // SIMMACI-REAL-02
    const record = await gateService.executeRealTask(task, 'EXECUTION_STATE_FAILURE');

    assert.strictEqual(record.finalStatus, 'READY_FOR_DEPLOY');
    assert.strictEqual(record.attemptCount, 2);
    assert.ok(record.auditTrail.failuresEncountered.includes('EXECUTION_STATE_FAILURE'));
    assert.ok(record.auditTrail.recoveryActionsTaken.some((a) => a.includes('State machine')));
    assert.strictEqual(record.definitionOfDone.isReadyForDeploy, true);
  });

  // ── 5. Restart Safety: State Preserved and Resumed (§6) ────────────
  test('Restart Safety: Host crash during active task recovers state from ledger and reaches READY_FOR_DEPLOY', async () => {
    const task = PHASE_24_REAL_TASKS[4]; // ILMORA-REAL-05
    const restartValidation = await gateService.validateRestartSafety(task);

    assert.strictEqual(restartValidation.result, 'PASS');
    assert.strictEqual(restartValidation.statePreserved, true);
    assert.strictEqual(restartValidation.taskResumed, true);
    assert.strictEqual(restartValidation.finalVerification, true);
  });

  // ── 6. Idempotency: Duplicate Requests Handled Consistently (§7) ───
  test('Idempotency: Repeated task dispatches suppress duplicate runs without corrupting final state', async () => {
    const task = PHASE_24_REAL_TASKS[7]; // KDI-REAL-08
    const idempotencyValidation = await gateService.validateIdempotency(task);

    assert.strictEqual(idempotencyValidation.result, 'PASS');
    assert.strictEqual(idempotencyValidation.initialState, 'READY_FOR_DEPLOY');
    assert.strictEqual(idempotencyValidation.finalState, 'READY_FOR_DEPLOY');
  });
});
