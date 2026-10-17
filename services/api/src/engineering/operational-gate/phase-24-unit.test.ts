// ==========================================================
// services/api/src/engineering/operational-gate/phase-24-unit.test.ts
// Phase 24: Definition of Done & Operational Gate Unit Verification Suite (§3, §11, §14)
// ==========================================================

import { describe, test, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { DefinitionOfDoneEngine } from './definition-of-done.engine.js';
import { EngineeringStateMachine, IllegalStateTransitionError } from '../control-plane/state-machine.js';
import { PHASE_24_REAL_TASKS } from './phase-24-catalog.data.js';

describe('Phase 24: Definition of Done & Operational Gate Unit Tests (§3, §11)', () => {
  let dodEngine: DefinitionOfDoneEngine;

  beforeEach(() => {
    dodEngine = new DefinitionOfDoneEngine();
  });

  // ── 1. Definition of Done: All 6 Criteria Pass ───────────────────
  test('DoD 1: Passes when all 6 conditions are completely satisfied', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-PASS',
      implementationCompleted: true,
      testResult: { run: 10, passed: 10, failed: 0, status: 'PASSED' },
      typecheckBuildPassed: true,
      acceptanceCriteria: ['Feature A functions', 'Error B handled'],
      verifiedCriteria: ['Feature A functions', 'Error B handled'],
      worktreeClean: true,
      unresolvedBlockersCount: 0,
    });

    assert.strictEqual(result.isReadyForDeploy, true);
    assert.strictEqual(result.implementationCompleted, true);
    assert.strictEqual(result.requiredTestsPassed, true);
    assert.strictEqual(result.typecheckBuildPassed, true);
    assert.strictEqual(result.acceptanceCriteriaVerified, true);
    assert.strictEqual(result.worktreeStateValid, true);
    assert.strictEqual(result.noUnresolvedBlockers, true);
    assert.strictEqual(result.failureReasons, undefined);
  });

  // ── 2. Definition of Done: Incomplete Implementation ──────────────
  test('DoD 2: Blocks READY_FOR_DEPLOY if implementation was not completed', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-NO-IMPL',
      implementationCompleted: false,
      testResult: { run: 10, passed: 10, failed: 0, status: 'PASSED' },
      typecheckBuildPassed: true,
      acceptanceCriteria: ['Feature A'],
      verifiedCriteria: ['Feature A'],
      worktreeClean: true,
      unresolvedBlockersCount: 0,
    });

    assert.strictEqual(result.isReadyForDeploy, false);
    assert.strictEqual(result.implementationCompleted, false);
    assert.ok(result.failureReasons?.some((r) => r.includes('Implementation was not completed')));
  });

  // ── 3. Definition of Done: Test Suite Failure ─────────────────────
  test('DoD 3: Blocks READY_FOR_DEPLOY if required tests failed', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-TEST-FAIL',
      implementationCompleted: true,
      testResult: { run: 10, passed: 9, failed: 1, status: 'FAILED' },
      typecheckBuildPassed: true,
      acceptanceCriteria: ['Feature A'],
      verifiedCriteria: ['Feature A'],
      worktreeClean: true,
      unresolvedBlockersCount: 0,
    });

    assert.strictEqual(result.isReadyForDeploy, false);
    assert.strictEqual(result.requiredTestsPassed, false);
    assert.ok(result.failureReasons?.some((r) => r.includes('Tests not passing')));
  });

  // ── 4. Definition of Done: Typecheck / Build Failure ──────────────
  test('DoD 4: Blocks READY_FOR_DEPLOY if typecheck or build fails', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-BUILD-FAIL',
      implementationCompleted: true,
      testResult: { run: 10, passed: 10, failed: 0, status: 'PASSED' },
      typecheckBuildPassed: false,
      acceptanceCriteria: ['Feature A'],
      verifiedCriteria: ['Feature A'],
      worktreeClean: true,
      unresolvedBlockersCount: 0,
    });

    assert.strictEqual(result.isReadyForDeploy, false);
    assert.strictEqual(result.typecheckBuildPassed, false);
    assert.ok(result.failureReasons?.some((r) => r.includes('build failed')));
  });

  // ── 5. Definition of Done: Unverified Acceptance Criteria ─────────
  test('DoD 5: Blocks READY_FOR_DEPLOY if any acceptance criteria are missing verification', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-CRITERIA-FAIL',
      implementationCompleted: true,
      testResult: { run: 10, passed: 10, failed: 0, status: 'PASSED' },
      typecheckBuildPassed: true,
      acceptanceCriteria: ['Feature A', 'Feature B required'],
      verifiedCriteria: ['Feature A'], // Feature B is missing
      worktreeClean: true,
      unresolvedBlockersCount: 0,
    });

    assert.strictEqual(result.isReadyForDeploy, false);
    assert.strictEqual(result.acceptanceCriteriaVerified, false);
    assert.ok(result.failureReasons?.some((r) => r.includes('Unverified acceptance criteria')));
  });

  // ── 6. Definition of Done: Dirty Worktree State ───────────────────
  test('DoD 6: Blocks READY_FOR_DEPLOY if worktree state is dirty or contains unverified residues', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-DIRTY-WT',
      implementationCompleted: true,
      testResult: { run: 10, passed: 10, failed: 0, status: 'PASSED' },
      typecheckBuildPassed: true,
      acceptanceCriteria: ['Feature A'],
      verifiedCriteria: ['Feature A'],
      worktreeClean: false,
      unresolvedBlockersCount: 0,
    });

    assert.strictEqual(result.isReadyForDeploy, false);
    assert.strictEqual(result.worktreeStateValid, false);
    assert.ok(result.failureReasons?.some((r) => r.includes('Worktree state is dirty')));
  });

  // ── 7. Definition of Done: Active Unresolved Blockers ─────────────
  test('DoD 7: Blocks READY_FOR_DEPLOY if unresolved blockers exist', () => {
    const result = dodEngine.evaluate({
      taskId: 'TASK-DOD-BLOCKERS',
      implementationCompleted: true,
      testResult: { run: 10, passed: 10, failed: 0, status: 'PASSED' },
      typecheckBuildPassed: true,
      acceptanceCriteria: ['Feature A'],
      verifiedCriteria: ['Feature A'],
      worktreeClean: true,
      unresolvedBlockersCount: 2,
    });

    assert.strictEqual(result.isReadyForDeploy, false);
    assert.strictEqual(result.noUnresolvedBlockers, false);
    assert.ok(result.failureReasons?.some((r) => r.includes('Unresolved blockers detected')));
  });

  // ── 8. Real Work Catalog Invariants (§1) ──────────────────────────
  test('Catalog: 9 real engineering tasks are distributed across SIMMACI, ILMORA, and KDI', () => {
    assert.strictEqual(PHASE_24_REAL_TASKS.length, 9);

    const simmaciTasks = PHASE_24_REAL_TASKS.filter((t) => t.project === 'SIMMACI');
    const ilmoraTasks = PHASE_24_REAL_TASKS.filter((t) => t.project === 'ILMORA');
    const kdiTasks = PHASE_24_REAL_TASKS.filter((t) => t.project === 'KDI');

    assert.strictEqual(simmaciTasks.length, 3);
    assert.strictEqual(ilmoraTasks.length, 3);
    assert.strictEqual(kdiTasks.length, 3);

    for (const t of PHASE_24_REAL_TASKS) {
      assert.ok(t.taskId.length > 0);
      assert.ok(t.title.length > 0);
      assert.ok(t.description.length > 0);
      assert.ok(t.acceptanceCriteria.length >= 2);
      assert.ok(t.expectedFiles.length >= 1);
      assert.ok(t.testFiles.length >= 1);
      assert.ok(t.justification.length > 0);
    }
  });

  // ── 9. State Machine: READY_FOR_DEPLOY Terminal Gate (§11) ────────
  test('State Machine: Transitions to READY_FOR_DEPLOY are legal, but outgoing transitions are strictly blocked', () => {
    // Legal entry into READY_FOR_DEPLOY
    assert.doesNotThrow(() => {
      EngineeringStateMachine.assertTransition('ENGINEERING_REVIEW', 'READY_FOR_DEPLOY', 'TASK-LEGAL-1');
    });
    assert.doesNotThrow(() => {
      EngineeringStateMachine.assertTransition('READY_FOR_APPROVAL', 'READY_FOR_DEPLOY', 'TASK-LEGAL-2');
    });
    assert.doesNotThrow(() => {
      EngineeringStateMachine.assertTransition('COMMITTED', 'READY_FOR_DEPLOY', 'TASK-LEGAL-3');
    });

    // Autonomous outgoing transition from READY_FOR_DEPLOY to anywhere is strictly prohibited (§11)
    assert.throws(
      () => {
        EngineeringStateMachine.assertTransition('READY_FOR_DEPLOY', 'EXECUTING', 'TASK-ILLEGAL-DEPLOY');
      },
      IllegalStateTransitionError
    );
  });
});
