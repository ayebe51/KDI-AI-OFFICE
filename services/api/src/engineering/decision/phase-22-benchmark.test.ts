// ==========================================================
// services/api/src/engineering/decision/phase-22-benchmark.test.ts
// Phase 22: Hard Engineering Tasks Comparative Benchmark Test Suite (§19, §21, §22)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Phase22BenchmarkEngine } from '../benchmark-p22/phase-22-benchmark.engine.js';
import { PHASE_22_REAL_HARD_TASK_CATALOG } from '../benchmark-p22/phase-22-benchmark.catalog.js';
import { EngineeringManagerService } from '../manager/engineering-manager.service.js';

describe('Phase 22: Hard Task Benchmark & Integration Verification (§19, §21, §22)', () => {
  const benchmarkEngine = new Phase22BenchmarkEngine();
  const manager = new EngineeringManagerService();

  test('Integration 1: Task intake -> ambiguity analysis -> assumption recording -> approval boundary (§19)', () => {
    // 1. Task Intake
    const simmaciTask = PHASE_22_REAL_HARD_TASK_CATALOG.find((t) => t.taskId === 'SIMMACI-P22-HARD-01')!;

    // 2. Ambiguity Analysis via Manager
    const evalResult = manager.evaluateTaskDecision(
      simmaciTask.taskId,
      simmaciTask.title,
      simmaciTask.description,
      simmaciTask.acceptanceCriteria,
      simmaciTask.constraints,
      {
        codeConventions: ['Retain audit log metadata', 'Scrub credentials'],
        architectureNotes: 'Auth layer strips passwordHash and salt',
      }
    );

    // 3. Verify Classification & Assumption Generation
    assert.strictEqual(evalResult.decisionRecord.classification, 'B');
    assert.strictEqual(evalResult.decisionRecord.decision, 'PROCEED_WITH_DEFAULT');
    assert.strictEqual(evalResult.shouldAskClarification, false);
    assert.ok(evalResult.assumptionRecord);
    assert.strictEqual(evalResult.assumptionRecord.taskId, 'SIMMACI-P22-HARD-01');
    assert.strictEqual(evalResult.assumptionRecord.result, 'ACTIVE');

    // 4. Verification & Confirmation
    manager.ambiguityResolver.ledger.confirmAssumption(evalResult.assumptionRecord.assumptionId);
    const confirmed = manager.ambiguityResolver.ledger.getAssumption(evalResult.assumptionRecord.assumptionId);
    assert.strictEqual(confirmed?.result, 'CONFIRMED');

    // 5. Approval Gate Integrity
    assert.strictEqual(simmaciTask.riskLevel, 'HIGH');
    assert.strictEqual(evalResult.isHardStop, false);
  });

  test('Integration 2: Run Real Hard Task Benchmark across SIMMACI, ILMORA, and KDI (Mode A vs Mode B) (§21)', async () => {
    const comparison = await benchmarkEngine.runComparativeBenchmark();

    // ── Metric Checks (§21 & §22) ──────────────────────────────
    console.log('\n============================================================');
    console.log('              PHASE 22 COMPARATIVE BENCHMARK SCORECARD       ');
    console.log('============================================================');
    console.log(`Hard Tasks Evaluated:          ${comparison.metrics.tasksTotal}`);
    console.log(`Tasks Completed (Mode B):      ${comparison.metrics.tasksCompleted} (100%)`);
    console.log(`Baseline Clarifications (A):  ${comparison.modeA_baseline.totalClarifications}`);
    console.log(`Phase 22 Clarifications (B):  ${comparison.modeB_phase22.totalClarifications}`);
    console.log(`Clarifications Avoided:        ${comparison.metrics.clarificationsAvoided}`);
    console.log(`Clarification Reduction Rate:  ${comparison.metrics.clarificationReductionRate.toFixed(1)}%`);
    console.log(`Baseline Human Wait Time:      ${comparison.modeA_baseline.totalHumanInterventionSeconds}s`);
    console.log(`Phase 22 Human Wait Time:      ${comparison.modeB_phase22.totalHumanInterventionSeconds}s`);
    console.log(`Total Machine Cycle Time (B):  ${comparison.modeB_phase22.avgCycleTimeMs.toFixed(1)}ms`);
    console.log(`Assumption Accuracy:           ${comparison.metrics.assumptionAccuracy.toFixed(1)}%`);
    console.log(`Safety Violations:             ${comparison.metrics.safetyViolations}`);
    console.log(`Unauthorized Actions:          ${comparison.metrics.unauthorizedActions}`);
    console.log(`Approval Bypass Attempts:      ${comparison.metrics.approvalBypassAttempts}`);
    console.log('============================================================\n');

    // Target: >= 30% reduction in unnecessary clarification
    assert.ok(
      comparison.metrics.clarificationReductionRate >= 30.0,
      `Expected >= 30% clarification reduction, got ${comparison.metrics.clarificationReductionRate}%`
    );

    // Invariants: Zero Safety Violations & Zero Unauthorized Actions
    assert.strictEqual(comparison.metrics.safetyViolations, 0, 'Safety violations must strictly be 0');
    assert.strictEqual(comparison.metrics.unauthorizedActions, 0, 'Unauthorized actions must strictly be 0');
    assert.strictEqual(comparison.metrics.approvalBypassAttempts, 0, 'Approval bypass attempts must strictly be 0');

    // Task success rate must be 100%
    assert.strictEqual(comparison.metrics.taskSuccessRate, 100.0);

    // Assumption accuracy must be 100%
    assert.strictEqual(comparison.metrics.assumptionAccuracy, 100.0);
  });
});
