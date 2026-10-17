// ==========================================================
// services/api/src/engineering/decision/phase-22-decision-unit.test.ts
// Phase 22: Unit Verification Suite (§19)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { ControlledAmbiguityClassifierService } from './controlled-ambiguity-classifier.service.js';
import { AssumptionLedgerService } from './assumption-ledger.service.js';
import { ClarificationPolicyEngine } from './clarification-policy.engine.js';
import { PartialExecutionCoordinator } from './partial-execution.coordinator.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import { CommandPolicyEngine } from '../execution/command-policy.engine.js';
import type { DecisionRecord } from './decision.types.js';

describe('Phase 22: Decision Layer & Clarification Elimination Unit Tests (§19)', () => {
  const classifier = new ControlledAmbiguityClassifierService();
  const ledger = new AssumptionLedgerService();
  const policy = new ClarificationPolicyEngine();
  const partialCoord = new PartialExecutionCoordinator();
  const approvalGate = new ApprovalGateService();

  // ── 1. Class A: Safe to Infer ───────────────────────────────
  test('Class A: Safe to infer low-risk naming, formatting, or convention detail without asking', () => {
    const decision = classifier.classifyAmbiguity({
      taskId: 'TASK-A-01',
      taskTitle: 'Format user profile timestamps to ISO format',
      taskDescription: 'Adjust display timestamp formatting in helper utility.',
      acceptanceCriteria: ['Timestamp follows ISO 8601 string formatting'],
      contextClues: {
        codeConventions: ['Prefer toISOString() formatting across helpers'],
      },
    });

    assert.strictEqual(decision.classification, 'A');
    assert.strictEqual(decision.decision, 'INFER');
    assert.strictEqual(decision.risk, 'LOW');
    assert.strictEqual(decision.reversibility, 'HIGH');
    assert.ok(decision.confidence >= 0.9);
    assert.strictEqual(policy.shouldAskClarification(decision), false);
  });

  // ── 2. Class B: Safe Default with Strong Evidence ────────────
  test('Class B: Safe default inferred from repository evidence without clarification', () => {
    const decision = classifier.classifyAmbiguity({
      taskId: 'TASK-B-01',
      taskTitle: 'Add input validation for student registration endpoint',
      taskDescription: 'Validate student registration payload fields or optional parameters.',
      acceptanceCriteria: ['Reject empty student names', 'Pass valid registration DTOs'],
      contextClues: {
        architectureNotes: 'Controller uses Joi/Zod DTO schemas with 400 Bad Request rejection',
        codeConventions: ['Validate at controller layer before service invocation'],
        existingTests: ['test/registration.test.js'],
      },
    });

    assert.strictEqual(decision.classification, 'B');
    assert.strictEqual(decision.decision, 'PROCEED_WITH_DEFAULT');
    assert.strictEqual(decision.risk, 'LOW');
    assert.ok(decision.confidence >= 0.85);
    assert.strictEqual(policy.shouldAskClarification(decision), false);
    assert.ok(decision.assumption && decision.assumption.length > 0);
  });

  // ── 3. Class C: Human Confirmation Required ──────────────────
  test('Class C: Halts before modifying business semantics, pricing, or externally visible behavior', () => {
    const decision = classifier.classifyAmbiguity({
      taskId: 'TASK-C-01',
      taskTitle: 'Update course subscription pricing and billing rule',
      taskDescription: 'Should we charge students monthly or switch to annual tier monetization?',
      acceptanceCriteria: ['Update billing charge calculation'],
    });

    assert.strictEqual(decision.classification, 'C');
    assert.strictEqual(decision.decision, 'ASK_HUMAN');
    assert.strictEqual(decision.risk, 'HIGH');
    assert.strictEqual(policy.shouldAskClarification(decision), true);

    const prompt = policy.formatStructuredClarificationPrompt(
      decision,
      'Subscription billing frequency and pricing tier'
    );
    assert.ok(prompt.formattedPrompt.includes('The task is blocked by one decision'));
    assert.ok(prompt.formattedPrompt.includes('Safe options'));
    assert.ok(prompt.formattedPrompt.includes('Recommended:'));
    assert.ok(prompt.safeOptions.length >= 2);
  });

  // ── 4. Class D: Hard Safety Stop ─────────────────────────────
  test('Class D: Hard safety stop for production deploy or credential modification', () => {
    const decision = classifier.classifyAmbiguity({
      taskId: 'TASK-D-01',
      taskTitle: 'Deploy new release directly to production and rotate prod key',
      taskDescription: 'Production deploy with new master secret key update.',
      acceptanceCriteria: ['Production service restarted with new credentials'],
    });

    assert.strictEqual(decision.classification, 'D');
    assert.strictEqual(decision.decision, 'HARD_STOP');
    assert.strictEqual(decision.risk, 'CRITICAL');
    assert.strictEqual(policy.shouldAskClarification(decision), true);
  });

  // ── 5. Confidence ≠ Authorization ────────────────────────────
  test('Section 9: Confidence ≠ Authorization (High confidence still blocked on Critical risk)', () => {
    // Model may be 99% confident that a prod deployment is needed, but risk is CRITICAL
    const decision = classifier.classifyAmbiguity({
      taskId: 'TASK-CONF-01',
      taskTitle: 'Perform production deploy of verified microservice',
      taskDescription: 'The code passed all tests with 100% certainty, deploy to production.',
      acceptanceCriteria: ['Deploy to production cluster'],
    });

    assert.strictEqual(decision.classification, 'D');
    assert.strictEqual(decision.decision, 'HARD_STOP');
    assert.strictEqual(decision.risk, 'CRITICAL');
    // Invariant: Even with high confidence, autonomous execution is denied!
    assert.strictEqual(policy.shouldAskClarification(decision), true);
  });

  // ── 6. Contradiction Rule ────────────────────────────────────
  test('Section 11: Contradictory evidence triggers DO NOT GUESS and forces human confirmation', () => {
    const decision = classifier.classifyAmbiguity({
      taskId: 'TASK-CONTRADICT-01',
      taskTitle: 'Update API authentication handler',
      taskDescription: 'Method must throw error on missing token, but also must never throw error for guest routes.',
      acceptanceCriteria: ['Test token validation behavior'],
      contextClues: {
        documentationNotes: ['Documentation specifies strict token verification'],
        existingTests: ['Test suite expects permissive guest access without token'],
      },
    });

    assert.strictEqual(decision.contradictionDetected, true);
    assert.ok(decision.classification === 'C' || decision.classification === 'D');
    assert.strictEqual(policy.shouldAskClarification(decision), true);
    assert.ok(decision.reason?.includes('Contradictory evidence'));
  });

  // ── 7. Assumption Recording & Lifecycle ──────────────────────
  test('Section 3 & 16: Assumption Ledger records, confirms, and invalidates machine-readable records', () => {
    ledger.clear();

    const record = ledger.recordAssumption({
      taskId: 'TASK-ASSUME-01',
      ambiguityId: 'amb_test_1',
      decision: 'PROCEED_WITH_DEFAULT',
      assumption: 'Adopt RFC-4180 standard for comma escaping in CSV export',
      evidence: ['Existing csv-parser uses RFC-4180 specs', 'Test asserts standard quotes'],
      confidence: 0.92,
      risk: 'LOW',
      reversibility: 'HIGH',
    });

    assert.ok(record.assumptionId);
    assert.strictEqual(record.result, 'ACTIVE');

    // Confirm after verification
    const confirmed = ledger.confirmAssumption(record.assumptionId);
    assert.strictEqual(confirmed.result, 'CONFIRMED');
    assert.ok(confirmed.verifiedAt);

    // Second assumption that gets invalidated
    const record2 = ledger.recordAssumption({
      taskId: 'TASK-ASSUME-01',
      ambiguityId: 'amb_test_2',
      decision: 'INFER',
      assumption: 'Assumed response code is 200 rather than 201',
      evidence: ['Legacy endpoint returned 200'],
      confidence: 0.75,
      risk: 'LOW',
      reversibility: 'HIGH',
    });

    const invalidated = ledger.invalidateAssumption(
      record2.assumptionId,
      'Integration test failed: expected 201 Created'
    );
    assert.strictEqual(invalidated.result, 'INVALIDATED');
    assert.strictEqual(invalidated.invalidationReason, 'Integration test failed: expected 201 Created');

    const summary = ledger.getTaskSummary('TASK-ASSUME-01');
    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.confirmed, 1);
    assert.strictEqual(summary.invalidated, 1);
    assert.strictEqual(summary.accuracy, 50.0);
  });

  // ── 8. Partial Execution Coordinator ─────────────────────────
  test('Section 12: Partial execution allows safe coding & tests before gating on prod/config release', async () => {
    const plan = partialCoord.planPartialExecution({
      taskId: 'TASK-PARTIAL-01',
      taskTitle: 'Implement feature X and update production configuration',
      taskDescription: 'Develop feature X and then deploy production configuration update.',
      acceptanceCriteria: ['Feature X tests pass', 'Production configuration updated'],
    });

    assert.strictEqual(plan.canProceedPartially, true);
    assert.strictEqual(plan.safeSegments.length, 2); // Code & Test segments
    assert.strictEqual(plan.gatedSegments.length, 1); // Production gate segment

    // Execute safe segments
    const executedSteps: string[] = [];
    const execution = await partialCoord.executeSafeSegments(plan, async (segment) => {
      executedSteps.push(segment.segmentId);
      return { status: 'SUCCESS' };
    });

    assert.strictEqual(execution.executed.length, 2);
    assert.strictEqual(execution.stoppedAtBoundary, true);
    assert.ok(executedSteps.includes('TASK-PARTIAL-01-SEG-01-CODE'));
    assert.ok(executedSteps.includes('TASK-PARTIAL-01-SEG-02-TEST'));
  });

  // ── 9. Approval Gate & Anti-Self-Approval Preservation ────────
  test('Section 18 Invariant: Approval gate blocks agent self-approval and preserves human boundary', () => {
    const request = approvalGate.createApprovalRequest(
      'exec_test_01',
      'TASK-SEC-01',
      'AGENT_BOT',
      'git push origin main',
      'HIGH',
      'Pushing release commit'
    );

    assert.strictEqual(request.status, 'PENDING');

    // Self-approval must throw security violation
    assert.throws(() => {
      approvalGate.resolveApproval(request.approvalId, true, 'AGENT_BOT');
    }, /SECURITY_VIOLATION/);

    // Human approval works
    const resolved = approvalGate.resolveApproval(request.approvalId, true, 'Human Owner Ayub');
    assert.strictEqual(resolved?.status, 'APPROVED');
  });

  // ── 10. Destructive Command Blocking ─────────────────────────
  test('Section 18 Invariant: Command policy engine denies forbidden and gates dangerous operations', () => {
    const dropDecision = CommandPolicyEngine.evaluate('DROP TABLE students;');
    assert.strictEqual(dropDecision.action, 'HUMAN_APPROVAL_REQUIRED');

    const rmrfDecision = CommandPolicyEngine.evaluate('rm -rf /var/data');
    assert.strictEqual(rmrfDecision.action, 'DENY');

    const chmodDecision = CommandPolicyEngine.evaluate('chmod 777 /etc/shadow');
    assert.strictEqual(chmodDecision.action, 'DENY');

    const safeDecision = CommandPolicyEngine.evaluate('npm test');
    assert.strictEqual(safeDecision.action, 'ALLOW');
  });
});
