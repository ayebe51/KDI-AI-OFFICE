// ==========================================================
// services/api/src/engineering/execution/engineering-agent.service.ts
// Phase 15.3: AI Engineering Employee — Supervisor & Reviewer
// ==========================================================

import * as path from 'path';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { AcceptanceCriteriaEngine } from './acceptance-criteria.engine.js';
import type {
  EngineeringTaskContext,
  EngineeringReviewResult,
} from './engineering-execution.types.js';
import type {
  EngineeringExecutor,
  TestRunResult,
  DiffResult,
} from './executor.interface.js';

@Injectable()
export class EngineeringAgentService {
  private readonly logger = new StructuredLogger('EngineeringAgentService');
  private readonly acceptanceEngine: AcceptanceCriteriaEngine;

  constructor(@Optional() acceptanceEngine?: AcceptanceCriteriaEngine) {
    this.acceptanceEngine = acceptanceEngine || new AcceptanceCriteriaEngine();
  }

  /**
   * Perform comprehensive engineering review (AI employee supervisor reasoning loop §12 & §13)
   */
  public async reviewExecution(
    context: EngineeringTaskContext,
    executor: EngineeringExecutor,
    worktreePath: string,
    testResult: TestRunResult,
    diffResult: DiffResult,
    changedFiles: string[],
    implChangesMade?: boolean
  ): Promise<EngineeringReviewResult> {
    const reviewer = context.agentName || `${context.agent} (AI Engineer)`;
    const satisfiedCriteria: string[] = [];
    const pendingCriteria: string[] = [];
    const potentialRegressions: string[] = [];
    const securityConcerns: string[] = [];

    this.logger.info(
      'reviewExecution',
      `AI Employee ${reviewer} starting review for task ${context.taskId}`
    );

    // 1. Verify tests passed
    if (testResult.status !== 'PASSED') {
      pendingCriteria.push('Tests must pass with zero failures');
      potentialRegressions.push(`Test suite failed: ${testResult.failed} failed tests`);
    } else {
      satisfiedCriteria.push(`All ${testResult.passed} test(s) passed cleanly`);
    }

    // 2. Check for changes made
    if (changedFiles.length === 0 && !implChangesMade) {
      pendingCriteria.push('Evidence of code implementation in repository');
    } else {
      satisfiedCriteria.push(`${changedFiles.length || 1} file(s) modified within isolated workspace`);
    }

    // 3. Check for unrelated or forbidden changes (§14)
    const forbiddenFiles = ['.env', 'id_rsa', 'id_dsa', 'credentials.json'];
    for (const file of changedFiles) {
      const base = path.basename(file).toLowerCase();
      if (base === '.env' || (base.startsWith('.env.') && !base.endsWith('.example'))) {
        securityConcerns.push(`CRITICAL: Prohibited environment file modification detected: "${file}"`);
        pendingCriteria.push('No modification of credential or environment configuration');
      }
      for (const forbidden of forbiddenFiles) {
        if (base === forbidden || base.endsWith('.pem') || base.endsWith('.key')) {
          securityConcerns.push(`CRITICAL: Prohibited credential file modification detected: "${file}"`);
          pendingCriteria.push('No modification of credential or environment configuration');
        }
      }
    }

    // 4. Check scope violations (§15)
    const scopeIssues: string[] = [];
    const doNotChangeList = [
      ...(context.doNotChange || []),
      ...(context.constraints?.filter((c) => c.toLowerCase().includes('do not change')) || []),
    ];
    for (const file of changedFiles) {
      for (const rule of doNotChangeList) {
        const cleanRule = rule.replace(/^do not change[:\s-]*/i, '').trim().toLowerCase();
        if (cleanRule && file.toLowerCase().includes(cleanRule)) {
          scopeIssues.push(`Modified file "${file}" violates DO NOT CHANGE constraint: "${rule}"`);
          pendingCriteria.push(`Scope violation: "${rule}"`);
        }
      }
    }

    // 5. Machine-Readable Acceptance Criteria Engine Evaluation (§13)
    const evalSummary = this.acceptanceEngine.evaluate(
      context,
      testResult,
      diffResult,
      changedFiles,
      implChangesMade ?? false
    );

    for (const item of evalSummary.evaluations) {
      if (item.status === 'PASS') {
        if (!satisfiedCriteria.includes(item.criterion)) {
          satisfiedCriteria.push(item.criterion);
        }
      } else {
        if (!pendingCriteria.includes(item.criterion)) {
          pendingCriteria.push(item.criterion);
        }
      }
    }

    // 6. Final decision: ready for approval only if zero pending criteria, zero security concerns, and all acceptance criteria passed
    const passed =
      pendingCriteria.length === 0 &&
      securityConcerns.length === 0 &&
      scopeIssues.length === 0 &&
      evalSummary.allSatisfied;

    let feedback = '';
    if (passed) {
      feedback =
        `Review PASSED by ${reviewer}. All ${evalSummary.passedCount} acceptance criteria verified with evidence. ` +
        `Tests: ${testResult.passed} passed. Diff inspected: ${changedFiles.length} files changed safely.`;
    } else {
      const blockers = Array.from(new Set([...pendingCriteria, ...securityConcerns, ...scopeIssues, ...evalSummary.blockers]));
      feedback = `Review REJECTED by ${reviewer}. Blocker(s): ${blockers.join('; ')}`;
    }

    const changedFileAssessment =
      changedFiles.length > 0
        ? `Modified ${changedFiles.length} file(s): ${changedFiles.join(', ')} (Diff size: ${diffResult.diff.length} bytes)`
        : 'Zero files modified.';

    const securityAssessment =
      securityConcerns.length === 0
        ? 'PASSED: Zero credentials, private keys, or environment files detected in changed files.'
        : `FAILED: Security violations detected: ${securityConcerns.join('; ')}`;

    const scopeAssessment =
      scopeIssues.length === 0
        ? 'PASSED: All modifications remain within declared task scope.'
        : `FAILED: Out-of-scope files touched: ${scopeIssues.join('; ')}`;

    return {
      passed,
      reviewer,
      feedback,
      satisfiedCriteria,
      pendingCriteria,
      potentialRegressions,
      securityConcerns,
      reviewedAt: new Date().toISOString(),
      acceptanceCriteriaResults: evalSummary.evaluations,
      changedFileAssessment,
      securityAssessment,
      scopeAssessment,
    };
  }

  /**
   * QA Handoff: Run dedicated QA regression verification (§17)
   */
  public async runQARegression(
    context: EngineeringTaskContext,
    executor: EngineeringExecutor,
    worktreePath: string
  ): Promise<{ passed: boolean; testRun: TestRunResult; report: string }> {
    this.logger.info(
      'runQARegression',
      `QA Handoff: QA Engineer verifying regression suite for ${context.taskId}`
    );

    const testRun = await executor.runTests(worktreePath, context);
    const passed = testRun.status === 'PASSED';

    const report =
      `QA Regression Report by Siti Rahayu (QA Engineer):\n` +
      `- Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}\n` +
      `- Total Tests Run: ${testRun.run}\n` +
      `- Passed: ${testRun.passed}\n` +
      `- Failed: ${testRun.failed}\n` +
      (passed ? `- Regression check clean: no regressions detected.` : `- Regression failure detected!`);

    return {
      passed,
      testRun,
      report,
    };
  }
}
