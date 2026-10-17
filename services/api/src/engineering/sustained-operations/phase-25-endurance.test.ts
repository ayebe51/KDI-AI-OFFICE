// ==========================================================
// services/api/src/engineering/sustained-operations/phase-25-endurance.test.ts
// Phase 25: Worktree Endurance, Exhaustion, Restart & Isolation Tests (§6, §7, §14, §15)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SustainedOperationsService } from './sustained-operations.service.js';
import { PHASE_25_REAL_TASKS } from './phase-25-catalog.data.js';

describe('Phase 25: Endurance, Exhaustion, Restart & Cross-Project Isolation Suite', () => {
  // ── 1. Worktree Pool Endurance Over Multiple Cycles (§6) ───────────
  test('Worktree Endurance: Continuously leases, executes, resets, and returns worktrees over 15 repeated cycles with zero leak', async () => {
    const service = new SustainedOperationsService({ poolSize: 3 });
    await service.initialize();

    for (let i = 0; i < 15; i++) {
      const baseTask = PHASE_25_REAL_TASKS[i % PHASE_25_REAL_TASKS.length];
      const task = { ...baseTask, taskId: `ENDURANCE-TASK-${i + 1}`, injectedFailurePattern: 'NONE' as const };
      const rec = await service.executeTask(task, 0);

      assert.strictEqual(rec.finalStatus, 'READY_FOR_DEPLOY');
      assert.strictEqual(rec.attemptCount, 1);
    }

    const scorecard = service.generateScorecard();
    assert.strictEqual(scorecard.worktreeHealth.totalRecycles, 15, 'Must record 15 verified worktree recycles');
    assert.strictEqual(scorecard.resourceEndurance.worktreeLeakDetected, false, 'Zero worktree leak allowed at cycle end');
  });

  // ── 2. Worktree Pool Exhaustion & Safe Backpressure Queueing (§7) ──
  test('Worktree Exhaustion: High contention safely enqueues tasks and resumes once leases are returned without deadlocks or duplicates', async () => {
    // Sized to a tight pool of 2 worktrees
    const service = new SustainedOperationsService({ poolSize: 2 });
    await service.initialize();

    const tasks = [
      { ...PHASE_25_REAL_TASKS[0], taskId: 'EXHAUST-TASK-1' },
      { ...PHASE_25_REAL_TASKS[1], taskId: 'EXHAUST-TASK-2' },
      { ...PHASE_25_REAL_TASKS[2], taskId: 'EXHAUST-TASK-3' },
      { ...PHASE_25_REAL_TASKS[3], taskId: 'EXHAUST-TASK-4' },
    ];

    // Execute concurrently: 4 tasks competing for 2 slots
    const results = await Promise.all(tasks.map((t) => service.executeTask(t, 10)));

    for (const rec of results) {
      assert.strictEqual(rec.finalStatus, 'READY_FOR_DEPLOY');
    }

    const scorecard = service.generateScorecard();
    assert.strictEqual(scorecard.completedTasks, 4);
    assert.strictEqual(scorecard.worktreeHealth.duplicateWorktreesDetected, 0);
  });

  // ── 3. Restart Safety Under Sustained Load (§14) ───────────────────
  test('Restart Safety: Mid-load system interruption recovers queue and active tasks from disk ledger with zero state loss', async () => {
    const tempLedger = path.join(os.tmpdir(), `kdi-test-restart-ledger-${Date.now()}.json`);
    const service1 = new SustainedOperationsService({ poolSize: 3, ledgerFilePath: tempLedger });
    await service1.initialize();

    // Execute 3 tasks to populate active ledger
    await service1.executeTask({ ...PHASE_25_REAL_TASKS[0], taskId: 'RESTART-TASK-1' });
    await service1.executeTask({ ...PHASE_25_REAL_TASKS[1], taskId: 'RESTART-TASK-2' });

    assert.ok(fs.existsSync(tempLedger), 'Ledger file must exist on disk before simulated host restart');

    // Simulate Host Crash & Executor Restart: initialize clean service instance
    const service2 = new SustainedOperationsService({ poolSize: 3, ledgerFilePath: tempLedger });
    await service2.initialize();

    const recoveryResult = service2.recoverFromRestart(tempLedger);

    assert.strictEqual(recoveryResult.recoveredTasksCount, 2, 'Must recover exactly 2 tasks from disk ledger');
    assert.strictEqual(recoveryResult.queueRestored, true);
    assert.strictEqual(recoveryResult.stateIntegrityPreserved, true);

    // Continue execution after restart
    const postRestartRec = await service2.executeTask({ ...PHASE_25_REAL_TASKS[2], taskId: 'POST-RESTART-TASK-3' });
    assert.strictEqual(postRestartRec.finalStatus, 'READY_FOR_DEPLOY');

    // Clean up temp file
    try {
      fs.unlinkSync(tempLedger);
    } catch {
      // Ignore
    }
  });

  // ── 4. Cross-Project Isolation (§15) ───────────────────────────────
  test('Cross-Project Isolation: Interleaved execution across SIMMACI, ILMORA, and KDI maintains zero cross-project contamination', async () => {
    const service = new SustainedOperationsService({ poolSize: 3 });
    await service.initialize();

    const interleavedTasks = [
      { ...PHASE_25_REAL_TASKS[0], taskId: 'ISO-SIMMACI-1' },
      { ...PHASE_25_REAL_TASKS[1], taskId: 'ISO-ILMORA-1' },
      { ...PHASE_25_REAL_TASKS[2], taskId: 'ISO-KDI-1' },
      { ...PHASE_25_REAL_TASKS[3], taskId: 'ISO-SIMMACI-2' },
      { ...PHASE_25_REAL_TASKS[4], taskId: 'ISO-ILMORA-2' },
      { ...PHASE_25_REAL_TASKS[5], taskId: 'ISO-KDI-2' },
    ];

    for (const task of interleavedTasks) {
      const rec = await service.executeTask(task, 0);
      assert.strictEqual(rec.finalStatus, 'READY_FOR_DEPLOY');
      assert.strictEqual(rec.project, task.project);
    }

    const scorecard = service.generateScorecard();
    assert.strictEqual(scorecard.reliability.crossProjectContaminationCount, 0, 'Zero cross-project contamination allowed (§15)');
  });
});
