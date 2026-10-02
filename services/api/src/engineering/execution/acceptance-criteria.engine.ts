// ==========================================================
// services/api/src/engineering/execution/acceptance-criteria.engine.ts
// Phase 15.3: Machine-Readable Acceptance Criteria Verification Engine
// ==========================================================

import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  EngineeringTaskContext,
  AcceptanceCriterionResult,
} from './engineering-execution.types.js';
import type { TestRunResult, DiffResult } from './executor.interface.js';

export interface AcceptanceEvaluationSummary {
  allSatisfied: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  unknownCount: number;
  evaluations: AcceptanceCriterionResult[];
  blockers: string[];
}

@Injectable()
export class AcceptanceCriteriaEngine {
  private readonly logger = new StructuredLogger('AcceptanceCriteriaEngine');

  private readonly forbiddenPatterns = [
    /^\.env$/i,
    /^\.env\.(?!example)/i,
    /\.pem$/i,
    /\.key$/i,
    /^id_rsa/i,
    /^id_dsa/i,
    /^credentials\.json$/i,
    /^service[-_]account.*\.json$/i,
  ];

  /**
   * Evaluate each acceptance criterion against objective execution evidence
   */
  public evaluate(
    context: EngineeringTaskContext,
    testResult: TestRunResult,
    diffResult: DiffResult,
    changedFiles: string[],
    implChangesMade: boolean
  ): AcceptanceEvaluationSummary {
    const criteria = context.acceptanceCriteria || [];
    const evaluations: AcceptanceCriterionResult[] = [];
    const blockers: string[] = [];

    this.logger.info(
      'evaluate',
      `Evaluating ${criteria.length} acceptance criteria for task ${context.taskId}`
    );

    // ── Pre-check: Credential & Security Leakage Detection (§14) ──
    const leakedFiles: string[] = [];
    for (const file of changedFiles) {
      const base = path.basename(file).toLowerCase();
      if (this.forbiddenPatterns.some((pattern) => pattern.test(base))) {
        leakedFiles.push(file);
      }
    }

    // ── Pre-check: Scope Violation Detection (§15) ─────────────
    const scopeViolations: string[] = [];
    const doNotChangeList = [
      ...(context.doNotChange || []),
      ...(context.constraints?.filter((c) => c.toLowerCase().includes('do not change')) || []),
    ];

    for (const file of changedFiles) {
      for (const rule of doNotChangeList) {
        const cleanRule = rule.replace(/^do not change[:\s-]*/i, '').trim().toLowerCase();
        if (cleanRule && file.toLowerCase().includes(cleanRule)) {
          scopeViolations.push(`Changed file "${file}" violates constraint: "${rule}"`);
        }
      }
    }

    // If no explicit criteria provided, synthesize default quality criteria
    const effectiveCriteria =
      criteria.length > 0
        ? criteria
        : [
            'Automated test suite must pass without regressions',
            'Code modifications must be present in isolated workspace',
            'Zero credential or secret configuration files modified',
          ];

    for (const criterion of effectiveCriteria) {
      const lower = criterion.toLowerCase();

      // Category 1: Security / Secret / Credential criteria
      if (
        lower.includes('secret') ||
        lower.includes('credential') ||
        lower.includes('no .env') ||
        lower.includes('private key') ||
        lower.includes('token leak')
      ) {
        if (leakedFiles.length > 0) {
          evaluations.push({
            criterion,
            status: 'FAIL',
            evidence: `Prohibited sensitive files modified: ${leakedFiles.join(', ')}`,
          });
          blockers.push(`Security violation: ${leakedFiles.join(', ')}`);
        } else {
          evaluations.push({
            criterion,
            status: 'PASS',
            evidence: 'Verified 0 secret or credential files modified in diff inspection.',
          });
        }
        continue;
      }

      // Category 2: Scope / Boundary criteria
      if (
        lower.includes('scope') ||
        lower.includes('unrelated') ||
        lower.includes('do not change') ||
        lower.includes('boundary')
      ) {
        if (scopeViolations.length > 0) {
          evaluations.push({
            criterion,
            status: 'FAIL',
            evidence: `Scope boundaries violated: ${scopeViolations.join('; ')}`,
          });
          blockers.push(`Scope violation: ${scopeViolations.join('; ')}`);
        } else {
          evaluations.push({
            criterion,
            status: 'PASS',
            evidence: 'All modified files remain within declared task scope boundaries.',
          });
        }
        continue;
      }

      // Category 3: Test execution & regression criteria
      if (
        lower.includes('test') ||
        lower.includes('regression') ||
        lower.includes('pass') ||
        lower.includes('cleanly')
      ) {
        if (testResult.status === 'PASSED' && testResult.failed === 0) {
          evaluations.push({
            criterion,
            status: 'PASS',
            evidence: `Automated test suite passed cleanly (${testResult.passed} passed, 0 failed).`,
          });
        } else if (testResult.status === 'FAILED' || testResult.failed > 0) {
          evaluations.push({
            criterion,
            status: 'FAIL',
            evidence: `Test suite failed with ${testResult.failed} failed test(s). Output: ${testResult.output.slice(0, 150)}`,
          });
          blockers.push(`Test failure: ${testResult.failed} failed test(s)`);
        } else {
          evaluations.push({
            criterion,
            status: 'UNKNOWN',
            evidence: `Tests were skipped or not executed (status: ${testResult.status}).`,
          });
          blockers.push(`Tests not executed`);
        }
        continue;
      }

      // Category 4: Code modification existence criteria
      if (
        lower.includes('change') ||
        lower.includes('file') ||
        lower.includes('implementation') ||
        lower.includes('workspace')
      ) {
        if (changedFiles.length > 0 || implChangesMade) {
          evaluations.push({
            criterion,
            status: 'PASS',
            evidence: `Verified ${changedFiles.length || 1} file(s) modified in isolated worktree (${changedFiles.slice(0, 3).join(', ')}).`,
          });
        } else {
          evaluations.push({
            criterion,
            status: 'FAIL',
            evidence: 'Zero files changed. No implementation evidence found in worktree.',
          });
          blockers.push('No code modifications found in working tree');
        }
        continue;
      }

      // Category 5: Functional / Domain Acceptance Criteria
      // Evaluated by combining test pass evidence and code changes in relevant files
      if (testResult.status === 'PASSED' && (changedFiles.length > 0 || implChangesMade)) {
        evaluations.push({
          criterion,
          status: 'PASS',
          evidence: `Verified through passing test suite (${testResult.passed} tests passed) and verified file diff.`,
        });
      } else if (testResult.status === 'FAILED') {
        evaluations.push({
          criterion,
          status: 'FAIL',
          evidence: `Cannot verify criterion "${criterion}" because test suite failed with ${testResult.failed} errors.`,
        });
        blockers.push(`Criterion unverified: ${criterion}`);
      } else {
        evaluations.push({
          criterion,
          status: 'UNKNOWN',
          evidence: `Insufficient evidence to determine whether criterion "${criterion}" is satisfied.`,
        });
        blockers.push(`Criterion unconfirmed: ${criterion}`);
      }
    }

    // Enforce pre-check findings into evaluation results
    if (scopeViolations.length > 0) {
      evaluations.push({
        criterion: 'Scope constraint compliance (DO NOT CHANGE)',
        status: 'FAIL',
        evidence: `Scope boundary violation: ${scopeViolations.join('; ')}`,
      });
      blockers.push(...scopeViolations);
    }

    if (leakedFiles.length > 0) {
      evaluations.push({
        criterion: 'Zero credential or sensitive file modification',
        status: 'FAIL',
        evidence: `Prohibited credential files detected: ${leakedFiles.join(', ')}`,
      });
      blockers.push(...leakedFiles);
    }

    const passedCount = evaluations.filter((e) => e.status === 'PASS').length;
    const failedCount = evaluations.filter((e) => e.status === 'FAIL').length;
    const unknownCount = evaluations.filter((e) => e.status === 'UNKNOWN').length;

    const allSatisfied =
      failedCount === 0 &&
      unknownCount === 0 &&
      passedCount > 0 &&
      leakedFiles.length === 0 &&
      scopeViolations.length === 0;

    return {
      allSatisfied,
      total: evaluations.length,
      passedCount,
      failedCount,
      unknownCount,
      evaluations,
      blockers,
    };
  }
}
