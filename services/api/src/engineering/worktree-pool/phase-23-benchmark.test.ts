// ==========================================================
// services/api/src/engineering/worktree-pool/phase-23-benchmark.test.ts
// Phase 23: Benchmark Execution & Final Verdict Suite (§18, §19, §27, §28)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Phase23BenchmarkEngine } from '../benchmark-p23/phase-23-benchmark.engine.js';

describe('Phase 23: Benchmark Matrix & Hard Task Verification (§18, §19, §27)', () => {
  const engine = new Phase23BenchmarkEngine();

  test('Benchmark 1: Execute 20 Benchmark Matrix Runs and Verify >= 50% Latency Reduction', async () => {
    const { scorecard, hardTaskResults, runs } = await engine.runFullBenchmarkMatrix();

    console.log('\n============================================================');
    console.log('PHASE 23 BENCHMARK MATRIX (20 EXECUTIONS)');
    console.log('============================================================');
    console.log(`Runs Completed:                 ${runs.length}`);
    console.log(`Baseline Machine Cycle:         ${scorecard.baselineMachineCycleMs} ms`);
    console.log(`Optimized Machine Cycle:        ${scorecard.optimizedMachineCycleMs} ms`);
    console.log(`Overall Improvement:            ${scorecard.overallImprovementPct}%`);
    console.log(`Worktree Overhead (Before):     ${scorecard.worktreeOverheadBeforeMs} ms`);
    console.log(`Worktree Overhead (After):      ${scorecard.worktreeOverheadAfterMs} ms`);
    console.log(`Process Startup (Before):       ${scorecard.processStartupBeforeMs} ms`);
    console.log(`Process Startup (After):        ${scorecard.processStartupAfterMs} ms`);
    console.log(`Test Startup (Before):          ${scorecard.testStartupBeforeMs} ms`);
    console.log(`Test Startup (After):           ${scorecard.testStartupAfterMs} ms`);
    console.log(`P50 (Median):                   ${scorecard.p50Ms} ms`);
    console.log(`P95:                            ${scorecard.p95Ms} ms`);
    console.log(`P99:                            ${scorecard.p99Ms} ms`);
    console.log(`Pool Hit Rate:                  ${scorecard.poolHitRatePct}%`);
    console.log(`Pool Miss Rate:                 ${scorecard.poolMissRatePct}%`);
    console.log(`Quarantine Count:               ${scorecard.quarantineCount}`);
    console.log(`Recovery Success Rate:          ${scorecard.recoverySuccessRatePct}%`);
    console.log(`Cross-Task Contamination:       ${scorecard.crossTaskContaminationCount}`);
    console.log(`Secret Leakage:                 ${scorecard.secretLeakageCount}`);
    console.log(`Safety Violations:              ${scorecard.safetyViolationsCount}`);
    console.log(`Approval Bypasses:              ${scorecard.approvalBypassesCount}`);
    console.log(`Regressions:                    ${scorecard.regressionsCount}`);
    console.log('============================================================\n');

    // Section 27: Acceptance Criteria
    assert.strictEqual(runs.length, 20);
    assert.ok(scorecard.overallImprovementPct >= 50.0, `Expected >= 50% improvement, got ${scorecard.overallImprovementPct}%`);
    assert.strictEqual(scorecard.crossTaskContaminationCount, 0);
    assert.strictEqual(scorecard.secretLeakageCount, 0);
    assert.strictEqual(scorecard.safetyViolationsCount, 0);
    assert.strictEqual(scorecard.approvalBypassesCount, 0);
    assert.strictEqual(scorecard.regressionsCount, 0);
    assert.strictEqual(scorecard.recoverySuccessRatePct, 100.0);
  });

  test('Benchmark 2: Real Hard Tasks (SIMMACI, ILMORA, KDI) Performance Validation', async () => {
    const { hardTaskResults } = await engine.runFullBenchmarkMatrix();

    console.log('\n============================================================');
    console.log('REAL HARD TASKS EVALUATION (BEFORE vs AFTER)');
    console.log('============================================================');
    for (const r of hardTaskResults) {
      console.log(`[${r.project}] ${r.taskId}`);
      console.log(`  Before: ${r.beforeMs.total} ms | After: ${r.afterMs.total} ms | Reduction: ${r.reductionPct}%`);
      console.log(`  Pool Hit: ${r.poolHit} | Isolation Verified: ${r.isolationVerified} | Approval Gated: ${r.approvalGated}`);

      assert.ok(r.reductionPct >= 75.0, `Task ${r.taskId} reduction (${r.reductionPct}%) should exceed 75%`);
      assert.strictEqual(r.isolationVerified, true);
      assert.strictEqual(r.approvalGated, true);
    }
    console.log('============================================================\n');

    assert.strictEqual(hardTaskResults.length, 3);
  });
});
