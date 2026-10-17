// ==========================================================
// services/api/src/engineering/production-delivery/phase-26-benchmark.test.ts
// Phase 26: Controlled Production Delivery & Rollback Benchmark Suite (§1, §17, §18, §19, §20, §21)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { ControlledDeliveryService } from './controlled-delivery.service.js';
import { PHASE_26_DELIVERY_SCENARIOS } from './phase-26-catalog.data.js';

describe('Phase 26: Controlled Production Delivery & Rollback Benchmark Suite', () => {
  test('Benchmark: Execute 5 Real Controlled Delivery Scenarios Across SIMMACI, ILMORA, and KDI', async () => {
    const service = new ControlledDeliveryService();

    console.log('\n============================================================');
    console.log('KDI PHASE 26: CONTROLLED PRODUCTION DELIVERY BENCHMARK');
    console.log('============================================================');

    for (const scenario of PHASE_26_DELIVERY_SCENARIOS) {
      console.log(`\n▶ Executing Scenario: ${scenario.scenarioId} (${scenario.project}) - ${scenario.title}...`);
      const rec = await service.executeDelivery(scenario);

      console.log(`  ✔ Current State:  ${rec.currentState}`);
      console.log(`  ✔ Active Version: ${rec.currentActiveVersion}`);
      console.log(`  ✔ Duration:       ${rec.durationMs}ms`);
      console.log(`  ✔ Audit Status:   ${rec.auditTrail.healthChecksSummary}`);

      assert.strictEqual(
        rec.currentState,
        scenario.expectedFinalState,
        `Scenario ${scenario.scenarioId} must reach expected terminal state ${scenario.expectedFinalState}`
      );
    }

    const scorecard = service.generateScorecard();

    console.log('\n============================================================');
    console.log('PHASE 26 DELIVERY SCORECARD & PERFORMANCE METRICS');
    console.log('============================================================');
    console.log(`Total Controlled Deliveries:       ${scorecard.totalDeliveries}`);
    console.log(`Successful Production Deliveries:  ${scorecard.successfulProductionDeliveries}`);
    console.log(`Verified Staging Deliveries:       ${scorecard.verifiedStagingDeliveries}`);
    console.log(`Controlled Automated Rollbacks:    ${scorecard.controlledRollbacks}`);
    console.log(`Blocked Deployments (Safety):      ${scorecard.blockedDeliveries}`);
    console.log(`Unauthorized Attempts Blocked:     ${scorecard.unauthorizedAttemptsBlocked}`);
    console.log(`Interrupted Deployments Recovered: ${scorecard.interruptedRecoveries}`);
    console.log(`Secret Leakage Detected:           ${scorecard.secretLeakageDetected}`);
    console.log(`Artifact Immutability Verified:    ${scorecard.artifactImmutabilityVerified}`);
    console.log(`Human Production Approval Guard:   ${scorecard.humanProductionApprovalEnforced}`);
    console.log('------------------------------------------------------------');
    console.log(`Avg Precheck Duration:             ${scorecard.performance.avgPrecheckDurationMs}ms`);
    console.log(`Avg Staging Deployment Duration:   ${scorecard.performance.avgStagingDurationMs}ms`);
    console.log(`Avg Staging Verification Duration: ${scorecard.performance.avgStagingVerificationMs}ms`);
    console.log(`Avg Approval-to-Prod Duration:     ${scorecard.performance.avgApprovalToProdDurationMs}ms`);
    console.log(`Avg Canary Verification Duration:  ${scorecard.performance.avgCanaryVerificationMs}ms`);
    console.log(`Avg Rollback Duration:             ${scorecard.performance.avgRollbackDurationMs}ms`);
    console.log(`Avg Post-Rollback Verify Duration: ${scorecard.performance.avgPostRollbackVerificationMs}ms`);
    console.log('============================================================\n');

    // Section 20 Acceptance Criteria Validations
    assert.strictEqual(scorecard.totalDeliveries, 5, 'Must evaluate 5 controlled delivery scenarios');
    assert.strictEqual(scorecard.successfulProductionDeliveries, 2, '2 deliveries must reach PRODUCTION_VERIFIED');
    assert.strictEqual(scorecard.controlledRollbacks, 1, '1 deliberate failure must trigger and complete rollback');
    assert.strictEqual(scorecard.blockedDeliveries, 2, '2 unsafe/unauthorized deliveries must be blocked');
    assert.strictEqual(scorecard.unauthorizedAttemptsBlocked, 1, '1 unauthorized delivery attempt must be blocked');
    assert.strictEqual(scorecard.interruptedRecoveries, 1, '1 interrupted delivery must be safely recovered');
    assert.strictEqual(scorecard.secretLeakageDetected, false, 'Zero secret leakage allowed');
    assert.strictEqual(scorecard.artifactImmutabilityVerified, true, 'Artifact immutability verified');
    assert.strictEqual(scorecard.humanProductionApprovalEnforced, true, 'Human approval must be strictly enforced');
  });
});
