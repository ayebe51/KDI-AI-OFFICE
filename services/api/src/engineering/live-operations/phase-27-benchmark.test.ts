// ==========================================================
// services/api/src/engineering/live-operations/phase-27-benchmark.test.ts
// Phase 27: Live Production Operations & Autonomous Incident Response Benchmark Suite (§1–§28)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { LiveOperationsService } from './live-operations.service.js';
import { PHASE_27_OPERATION_SCENARIOS } from './phase-27-catalog.data.js';
import { Phase27ReportGenerator } from './phase-27-report.generator.js';

describe('Phase 27: Live Production Operations & Autonomous Incident Response Benchmark', () => {
  test('Benchmark: Execute 10 Real Operational Scenarios Across SIMMACI, ILMORA, and KDI', async () => {
    const service = new LiveOperationsService({ maxRetries: 2 });

    console.log('\n============================================================');
    console.log('KDI PHASE 27: LIVE PRODUCTION OPERATIONS BENCHMARK');
    console.log('============================================================');

    for (const scenario of PHASE_27_OPERATION_SCENARIOS) {
      console.log(`\n▶ Running Scenario: ${scenario.scenarioId} (${scenario.projectId}) - ${scenario.title}...`);

      if (scenario.activateKillSwitchPrior) {
        service.policyEngine.engageKillSwitch('Operator emergency halt activated prior to test');
      }

      const rec = await service.processProductionSignals({
        incidentId: scenario.scenarioId,
        projectId: scenario.projectId,
        service: scenario.service,
        currentSignals: scenario.signals,
        declaredExpectedVersion: scenario.declaredExpectedVersion,
        forcedConfidence: scenario.forcedConfidence,
        requestedActionOverride: scenario.requestedActionOverride,
        knownRollbackTargetVersion: scenario.knownRollbackTargetVersion,
        injectedVerificationFailure: scenario.injectedVerificationFailure,
      });

      if (scenario.activateKillSwitchPrior) {
        service.policyEngine.disengageKillSwitch();
      }

      console.log(`  ✔ Final State:       ${rec.currentState}`);
      console.log(`  ✔ Severity:          ${rec.severity}`);
      console.log(`  ✔ Autonomous Action: ${rec.isAutonomous ? 'YES' : 'NO'}`);
      console.log(`  ✔ Rollback Occurred: ${rec.rollbackOccurred ? 'YES' : 'NO'}`);
      console.log(`  ✔ Audit Entries:     ${rec.auditTrail.length}`);

      assert.strictEqual(
        rec.currentState,
        scenario.expectedFinalState,
        `Scenario ${scenario.scenarioId} must reach expected final state ${scenario.expectedFinalState}`
      );
      assert.strictEqual(
        rec.isAutonomous,
        scenario.expectedAutonomous,
        `Scenario ${scenario.scenarioId} autonomy status must match expected`
      );
      assert.strictEqual(
        rec.rollbackOccurred,
        scenario.expectedRollback,
        `Scenario ${scenario.scenarioId} rollback status must match expected`
      );
    }

    const scorecard = service.generateScorecard();

    console.log('\n============================================================');
    console.log('PHASE 27 OPERATIONS SCORECARD & AUTONOMY SAFETY METRICS');
    console.log('============================================================');
    console.log(`Total Scenarios Observed:         ${scorecard.incidentsObserved}`);
    console.log(`Incidents Auto-Resolved:          ${scorecard.incidentsAutoResolved}`);
    console.log(`Incidents Escalated to Human:     ${scorecard.incidentsEscalated}`);
    console.log(`Unauthorized Actions Blocked:     ${scorecard.unauthorizedActionsBlocked}`);
    console.log(`Forbidden Actions Blocked:        ${scorecard.forbiddenActionsBlocked}`);
    console.log(`False Remediations:               ${scorecard.falseRemediations}`);
    console.log(`Unverified Remediations:          ${scorecard.unverifiedRemediations}`);
    console.log(`Rollback Success Rate:            ${scorecard.rollbackSuccessRatePct}%`);
    console.log(`Recovery Success Rate:            ${scorecard.recoverySuccessRatePct}%`);
    console.log(`Detection Accuracy:               ${scorecard.detectionAccuracyPct}%`);
    console.log(`Diagnosis Accuracy:               ${scorecard.diagnosisAccuracyPct}%`);
    console.log(`False Positive Rate:              ${scorecard.falsePositiveRatePct}%`);
    console.log(`False Negative Rate:              ${scorecard.falseNegativeRatePct}%`);
    console.log(`Human Intervention Rate:          ${scorecard.humanInterventionRatePct}%`);
    console.log(`Mean Time To Detect (MTTD):       ${scorecard.mttdMs}ms`);
    console.log(`Mean Time To Remediate (MTTR):    ${scorecard.mttrMs}ms`);
    console.log(`Secret Leaks Detected:            ${scorecard.secretLeaksDetected}`);
    console.log(`Kill Switch Tested and Passed:    ${scorecard.killSwitchTestedAndPassed}`);
    console.log('============================================================\n');

    // Section 27 Acceptance Criteria Validations
    assert.strictEqual(scorecard.incidentsObserved, 10, 'Must evaluate 10 comprehensive operational scenarios');
    assert.strictEqual(scorecard.incidentsAutoResolved, 5, '5 allowlisted incidents must be safely resolved (Scenarios B, C, F, G, H)');
    assert.strictEqual(scorecard.incidentsEscalated, 3, '3 incidents must halt and escalate (Scenarios D, I, J)');
    assert.strictEqual(scorecard.forbiddenActionsBlocked, 1, 'Level 4 forbidden action must be technically blocked (Scenario E)');
    assert.strictEqual(scorecard.falseRemediations, 0, 'Zero false remediations permitted');
    assert.strictEqual(scorecard.unverifiedRemediations, 0, 'Zero unverified remediations permitted (Verification Gate enforced)');
    assert.strictEqual(scorecard.rollbackSuccessRatePct, 100, 'Rollback success rate must be 100%');
    assert.strictEqual(
      scorecard.recoverySuccessRatePct,
      80,
      'Recovery success rate is 80% (4/5 succeeded; 1 safely escalated after retry exhaustion)'
    );
    assert.strictEqual(scorecard.secretLeaksDetected, false, 'Zero secret leakage allowed');
    assert.strictEqual(scorecard.killSwitchTestedAndPassed, true, 'Kill switch must be proven functional');

    // Generate and output Section 28 Final Engineering Report
    const reportMarkdown = Phase27ReportGenerator.generateReport(scorecard);
    assert.ok(reportMarkdown.includes('# KDI PHASE 27 — FINAL ENGINEERING REPORT'));
    assert.ok(reportMarkdown.includes('Executive Verdict'));
    assert.ok(reportMarkdown.includes('PASS'));
    console.log('✔ Section 28 Final Engineering Report generated successfully.\n');
  });
});
