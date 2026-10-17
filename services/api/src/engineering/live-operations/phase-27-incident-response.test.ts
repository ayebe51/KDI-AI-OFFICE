// ==========================================================
// services/api/src/engineering/live-operations/phase-27-incident-response.test.ts
// Phase 27: Confidence Gating, Auto-Rollback, Database Safety & Verification Tests (§10–§15, §20–§22)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { LiveOperationsService } from './live-operations.service.js';
import { PHASE_27_OPERATION_SCENARIOS } from './phase-27-catalog.data.js';

describe('Phase 27: Incident Response Operational Pathways Tests', () => {
  // ── 1. Confidence Gating Test (§12) ────────────────────────────────
  test('Confidence Gate: High confidence allows auto-remediation, while Low confidence halts and escalates', async () => {
    const service = new LiveOperationsService();

    // High confidence stateless worker failure (Scenario B)
    const scenarioB = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-B-STATELESS-WORKER-FAILURE')!;
    const recB = await service.processProductionSignals({
      incidentId: scenarioB.scenarioId,
      projectId: scenarioB.projectId,
      service: scenarioB.service,
      currentSignals: scenarioB.signals,
      declaredExpectedVersion: scenarioB.declaredExpectedVersion,
    });
    assert.strictEqual(recB.confidence, 'HIGH');
    assert.strictEqual(recB.currentState, 'RESOLVED');
    assert.strictEqual(recB.isAutonomous, true);
    assert.ok(recB.actionsAttempted.includes('restart_stateless_worker'));

    // Low confidence ambiguous incident (Scenario D)
    const scenarioD = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-D-UNKNOWN-FAILURE-ESCALATION')!;
    const recD = await service.processProductionSignals({
      incidentId: scenarioD.scenarioId,
      projectId: scenarioD.projectId,
      service: scenarioD.service,
      currentSignals: scenarioD.signals,
      forcedConfidence: scenarioD.forcedConfidence,
    });
    assert.strictEqual(recD.confidence, 'LOW');
    assert.strictEqual(recD.currentState, 'WAITING_FOR_HUMAN_APPROVAL');
    assert.strictEqual(recD.isAutonomous, false);
    assert.strictEqual(recD.actionsAttempted.length, 0, 'No mutations attempted under low confidence');
    assert.ok(recD.escalationRecord, 'Escalation payload must be emitted');
  });

  // ── 2. Auto-Rollback Verification & Execution (§14) ─────────────────
  test('Auto-Rollback: Successfully rolls back post-deployment regression to verified baseline version', async () => {
    const service = new LiveOperationsService();
    const scenarioC = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-C-ELEVATED-ERROR-RATE-ROLLBACK')!;

    const recC = await service.processProductionSignals({
      incidentId: scenarioC.scenarioId,
      projectId: scenarioC.projectId,
      service: scenarioC.service,
      currentSignals: scenarioC.signals,
      declaredExpectedVersion: scenarioC.declaredExpectedVersion,
      knownRollbackTargetVersion: scenarioC.knownRollbackTargetVersion,
    });

    assert.strictEqual(recC.currentState, 'RESTORED');
    assert.strictEqual(recC.rollbackOccurred, true);
    assert.strictEqual(recC.restoredVersion, 'v2.4.0');
    assert.ok(recC.verificationResult?.verified);
    assert.strictEqual(recC.verificationResult.metricsHealthy, true);
  });

  // ── 3. Database Safety Technical Enforcement (§15) ─────────────────
  test('Database Safety: Destructive SQL modifications are technically blocked and audited', async () => {
    const service = new LiveOperationsService();
    const scenarioE = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-E-FORBIDDEN-ACTION-ATTEMPT')!;

    const recE = await service.processProductionSignals({
      incidentId: scenarioE.scenarioId,
      projectId: scenarioE.projectId,
      service: scenarioE.service,
      currentSignals: scenarioE.signals,
      requestedActionOverride: scenarioE.requestedActionOverride,
    });

    assert.strictEqual(recE.currentState, 'POLICY_DENIED');
    assert.strictEqual(recE.isAutonomous, false);
    assert.ok(recE.actionsRefused.includes('drop_table'));
    assert.strictEqual(recE.actionsAttempted.length, 0);

    const refusalAudit = recE.auditTrail.find((a) => a.eventType === 'ACTION_REFUSED');
    assert.ok(refusalAudit, 'Audit record of policy refusal must exist');
    assert.ok(refusalAudit.reason?.includes('Level 4'));
  });

  // ── 4. Verification Gate & Retry Threshold Loop Termination (§13) ───
  test('Verification Gate: Halts after max retries and escalates without infinite loops', async () => {
    const service = new LiveOperationsService({ maxRetries: 2 });
    const scenarioJ = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-J-VERIFICATION-RETRY-EXHAUSTION')!;

    const recJ = await service.processProductionSignals({
      incidentId: scenarioJ.scenarioId,
      projectId: scenarioJ.projectId,
      service: scenarioJ.service,
      currentSignals: scenarioJ.signals,
      injectedVerificationFailure: scenarioJ.injectedVerificationFailure,
    });

    assert.strictEqual(recJ.currentState, 'WAITING_FOR_HUMAN_APPROVAL');
    assert.strictEqual(recJ.retryCount, 2, 'Must stop retrying after reaching maxRetries (2)');
    assert.strictEqual(recJ.verificationResult?.verified, false);
    assert.ok(recJ.escalationRecord, 'Must emit escalation payload');
    assert.ok(recJ.escalationRecord.recommendedAction.includes('retry attempts'));
  });

  // ── 5. Production Drift & Backup Warning Detection (§20, §21) ──────
  test('Drift & Backup: Detects version drift and stale backup conditions with appropriate actions', async () => {
    const service = new LiveOperationsService();

    // Production Drift (Scenario F)
    const scenarioF = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-F-PRODUCTION-DRIFT')!;
    const recF = await service.processProductionSignals({
      incidentId: scenarioF.scenarioId,
      projectId: scenarioF.projectId,
      service: scenarioF.service,
      currentSignals: scenarioF.signals,
      declaredExpectedVersion: scenarioF.declaredExpectedVersion,
    });
    assert.strictEqual(recF.currentState, 'RESOLVED');
    assert.ok(recF.actionsAttempted.includes('reconcile_stateless_replica_drift'));

    // Stale Backup Alert (Scenario G)
    const scenarioG = PHASE_27_OPERATION_SCENARIOS.find((s) => s.scenarioId === 'SCENARIO-G-BACKUP-STALE-WARNING')!;
    const recG = await service.processProductionSignals({
      incidentId: scenarioG.scenarioId,
      projectId: scenarioG.projectId,
      service: scenarioG.service,
      currentSignals: scenarioG.signals,
    });
    assert.strictEqual(recG.currentState, 'RESOLVED');
    assert.ok(recG.actionsAttempted.includes('trigger_stale_backup_verification'));
  });
});
