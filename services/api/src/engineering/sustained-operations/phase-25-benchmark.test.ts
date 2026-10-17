// ==========================================================
// services/api/src/engineering/sustained-operations/phase-25-benchmark.test.ts
// Phase 25: Multi-Wave Sustained Workload Benchmark Suite (24 Real Tasks, 4 Waves) (§1, §2, §11, §12, §16, §21)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { SustainedOperationsService } from './sustained-operations.service.js';
import { PHASE_25_REAL_TASKS } from './phase-25-catalog.data.js';

describe('Phase 25: Sustained Multi-Wave Operational Benchmark Suite', () => {
  test('Benchmark: Execute 24 Real Engineering Tasks Across 4 Workload Waves without Resetting Environment', async () => {
    // Single persistent service instance across all 4 waves to rigorously detect leaks and degradation (§2, §11)
    const service = new SustainedOperationsService({ poolSize: 3, maxRepairAttempts: 2 });
    await service.initialize();

    console.log('\n============================================================');
    console.log('KDI PHASE 25: SUSTAINED MULTI-WAVE BENCHMARK (24 REAL TASKS)');
    console.log('============================================================');

    const waves = [
      { waveIndex: 1, waveName: 'Wave 1: Core System & Data Integrity', tasks: PHASE_25_REAL_TASKS.slice(0, 6) },
      { waveIndex: 2, waveName: 'Wave 2: Resilient Error Handling & Repair', tasks: PHASE_25_REAL_TASKS.slice(6, 12) },
      { waveIndex: 3, waveName: 'Wave 3: Crash Recovery & Controlled Escalation', tasks: PHASE_25_REAL_TASKS.slice(12, 18) },
      { waveIndex: 4, waveName: 'Wave 4: Interleaved Sustained Endurance', tasks: PHASE_25_REAL_TASKS.slice(18, 24) },
    ];

    for (const wave of waves) {
      console.log(`\n▶ Commencing ${wave.waveName} (${wave.tasks.length} tasks)...`);
      const metrics = await service.executeWave(wave.waveIndex, wave.waveName, wave.tasks);

      console.log(`  ✔ Completed: ${metrics.completedCount}/${metrics.tasksCount} | Escalated: ${metrics.escalatedCount} | Retries: ${metrics.retryCount} | Repairs: ${metrics.repairCount}`);
      console.log(`  ✔ Latency: Exec P50: ${metrics.executionP50Ms}ms | Exec P95: ${metrics.executionP95Ms}ms | Total P50: ${metrics.totalLifecycleP50Ms}ms`);
      console.log(`  ✔ Resource State: RSS: ${metrics.resourceState.rssMb}MB | Heap: ${metrics.resourceState.heapUsedMb}MB | Active Leases: ${metrics.resourceState.activeLeases}`);
      console.log(`  ✔ State Invariants: ${metrics.invariantsVerified ? 'PASSED (0 violations)' : 'FAILED'}`);

      assert.strictEqual(metrics.invariantsVerified, true, `All 6 state invariants must hold after ${wave.waveName}`);
    }

    const scorecard = service.generateScorecard();

    console.log('\n============================================================');
    console.log('PHASE 25 SCORECARD & ENDURANCE REPORT');
    console.log('============================================================');
    console.log(`Total Tasks Processed:       ${scorecard.totalTasks}`);
    console.log(`Ready for Deploy:            ${scorecard.readyForDeployTasks}`);
    console.log(`Escalated (Controlled):      ${scorecard.escalatedTasks}`);
    console.log(`Lost / Corrupted Tasks:      ${scorecard.queueReliability.lostTasks}`);
    console.log(`Duplicate Tasks Blocked:     ${scorecard.queueReliability.duplicateTasks}`);
    console.log(`Starvation Events:           ${scorecard.queueReliability.starvationEvents}`);
    console.log(`Worktree Recycles:           ${scorecard.worktreeHealth.totalRecycles}`);
    console.log(`Worktree Leak Detected:      ${scorecard.resourceEndurance.worktreeLeakDetected}`);
    console.log(`Memory Leak Detected:        ${scorecard.resourceEndurance.memoryLeakDetected}`);
    console.log(`Cross-Project Contamination: ${scorecard.reliability.crossProjectContaminationCount}`);
    console.log(`Human Interventions:        ${scorecard.humanInterventionCount}`);
    console.log(`Production Deployed:         ${scorecard.productionDeploymentPerformed} (STRICTLY PRESERVED)`);
    console.log('============================================================\n');

    // Section 20 Acceptance Criteria
    assert.strictEqual(scorecard.totalTasks, 24, 'Must process exactly 24 real engineering tasks');
    assert.strictEqual(scorecard.waves.length, 4, 'Must execute exactly 4 workload waves');
    assert.strictEqual(scorecard.readyForDeployTasks, 23, '23 tasks must reach READY_FOR_DEPLOY');
    assert.strictEqual(scorecard.escalatedTasks, 1, '1 task must escalate cleanly after max repair attempts');
    assert.strictEqual(scorecard.queueReliability.lostTasks, 0, 'Zero lost tasks allowed');
    assert.strictEqual(scorecard.queueReliability.starvationEvents, 0, 'Zero starvation events allowed');
    assert.strictEqual(scorecard.reliability.crossProjectContaminationCount, 0, 'Zero cross-project contamination');
    assert.strictEqual(scorecard.resourceEndurance.worktreeLeakDetected, false, 'Zero worktree leaks allowed');
    assert.strictEqual(scorecard.resourceEndurance.memoryLeakDetected, false, 'No memory leak detected');
    assert.strictEqual(scorecard.humanInterventionCount, 0, 'Zero human intervention allowed');
    assert.strictEqual(scorecard.productionDeploymentPerformed, false, 'Production deployment must NOT be performed in Phase 25');
  });
});
