// ==========================================================
// services/api/src/engineering/operations-hardening/phase-28-hardening.test.ts
// Phase 28: Incident Correlation, Real Timings, CFR, No-False-Resolution & DR Tests (§5, §7, §8, §12, §18, §24)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { OperationsHardeningService } from './operations-hardening.service.js';
import { PHASE_28_HARDENED_SCENARIOS } from './phase-28-catalog.data.js';

describe('Phase 28: Hardened Operations Operational Pathways Tests', () => {
  // ── 1. Multi-Alert Deduplication & Correlation (§7) ─────────────────
  test('Incident Correlation: Deduplicates multiple alert signals for the same root failure into one incident', async () => {
    const service = new OperationsHardeningService();
    const scenario2 = PHASE_28_HARDENED_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-02-MULTI-ALERT-DEDUPLICATION')!;

    // 1st alert arrives -> creates incident
    const rec1 = await service.ingestAndProcessAlert({
      incidentId: 'ALERT-001',
      projectId: scenario2.projectId,
      service: scenario2.service,
      failureCategory: scenario2.failureCategory,
      currentSignals: scenario2.signals,
      declaredExpectedVersion: scenario2.declaredExpectedVersion,
    });
    assert.strictEqual(rec1.incidentId, 'ALERT-001');
    assert.strictEqual(rec1.currentState, 'RESOLVED');

    // 2nd, 3rd, 4th duplicate alerts arrive during the same event
    const rec2 = await service.ingestAndProcessAlert({
      incidentId: 'ALERT-002',
      projectId: scenario2.projectId,
      service: scenario2.service,
      failureCategory: scenario2.failureCategory,
      currentSignals: scenario2.signals,
    });
    const rec3 = await service.ingestAndProcessAlert({
      incidentId: 'ALERT-003',
      projectId: scenario2.projectId,
      service: scenario2.service,
      failureCategory: scenario2.failureCategory,
      currentSignals: scenario2.signals,
    });

    assert.strictEqual(rec2.incidentId, 'ALERT-001', 'Must be correlated into original canonical incident');
    assert.strictEqual(rec3.incidentId, 'ALERT-001', 'Must be correlated into original canonical incident');
    assert.ok(rec1.correlatedAlertIds.includes('ALERT-002'));
    assert.ok(rec1.correlatedAlertIds.includes('ALERT-003'));
  });

  // ── 2. Real Timings (MTTD / MTTA / MTTR) vs Policy Latency (§5) ─────
  test('Operational Timings: Distinguishes actual operational MTTD/MTTA/MTTR from microsecond policy latency', async () => {
    const service = new OperationsHardeningService();
    const scenario3 = PHASE_28_HARDENED_SCENARIOS.find(
      (s) => s.scenarioId === 'SCENARIO-03-POST-DEPLOY-REGRESSION-REAL-TIMINGS'
    )!;

    const rec = await service.ingestAndProcessAlert({
      incidentId: scenario3.scenarioId,
      projectId: scenario3.projectId,
      service: scenario3.service,
      failureCategory: scenario3.failureCategory,
      currentSignals: scenario3.signals,
      declaredExpectedVersion: scenario3.declaredExpectedVersion,
      knownRollbackTargetVersion: scenario3.knownRollbackTargetVersion,
      incidentOnsetTimeOffsetMs: 19000,
    });

    assert.strictEqual(rec.currentState, 'RESTORED');
    // Real operational timestamps
    assert.ok(rec.realMttdMs >= 18000, 'Real MTTD reflects actual elapsed time from incident onset');
    assert.ok(rec.realMttrMs >= 18000, 'Real MTTR reflects actual time to restore service');

    // Policy evaluation latency is control-plane code timing
    assert.ok(rec.policyEvaluationLatencyMs < 100, 'Control plane policy latency is fast');
  });

  // ── 3. No-False-Resolution Guard (§24) ───────────────────────────────
  test('No-False-Resolution Guard: Rejects premature resolution when underlying error budget is still degraded', async () => {
    const service = new OperationsHardeningService();
    const scenario14 = PHASE_28_HARDENED_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-14-NO-FALSE-RESOLUTION-GUARD')!;

    const rec = await service.ingestAndProcessAlert({
      incidentId: scenario14.scenarioId,
      projectId: scenario14.projectId,
      service: scenario14.service,
      failureCategory: scenario14.failureCategory,
      currentSignals: scenario14.signals,
      injectedPrematureResolution: scenario14.injectedPrematureResolution,
    });

    assert.strictEqual(rec.currentState, 'WAITING_FOR_HUMAN_APPROVAL');
    assert.strictEqual(rec.verificationResult?.verified, false);
    assert.ok(rec.verificationResult?.details.includes('NO_FALSE_RESOLUTION_GUARD'));
  });

  // ── 4. Isolated Recovery Sandbox DR Validation (§12) ─────────────────
  test('Disaster Recovery: Validates backup freshness and restore in isolated recovery sandbox', () => {
    const service = new OperationsHardeningService();
    const validation = service.sliMonitor.executeSandboxBackupValidation();

    assert.strictEqual(validation.sandboxRestoreSuccessful, true);
    assert.strictEqual(validation.verificationEnvironment, 'ISOLATED_RECOVERY_SANDBOX');
    assert.strictEqual(validation.backupIntegrityChecksumValid, true);
    assert.ok(validation.rpoObservedMinutes < 15, 'RPO must be under 15 minutes');
    assert.ok(validation.rtoObservedMinutes < 15, 'RTO must be under 15 minutes');
  });

  // ── 5. Change Failure Rate & Causality Attribution (§18) ────────────
  test('Production Quality: Tracks deployments, rollbacks, and change failure rate with causality', () => {
    const service = new OperationsHardeningService();
    const initialCFR = service.sliMonitor.getChangeFailureMetrics();

    assert.strictEqual(initialCFR.totalDeployments, 14);
    assert.strictEqual(initialCFR.rollbackDeployments, 1);
    assert.strictEqual(initialCFR.changeFailureRatePct, 7.14);
    assert.strictEqual(initialCFR.causalityAttribution.externalCaused, 1);

    // Record clean deployment
    service.sliMonitor.recordDeployment(true, false);
    const updatedCFR = service.sliMonitor.getChangeFailureMetrics();
    assert.strictEqual(updatedCFR.totalDeployments, 15);
    assert.strictEqual(updatedCFR.successfulDeployments, 14);
    assert.ok(updatedCFR.changeFailureRatePct < 7.14);
  });
});
