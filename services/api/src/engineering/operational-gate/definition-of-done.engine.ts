// ==========================================================
// services/api/src/engineering/operational-gate/definition-of-done.engine.ts
// Phase 24: Definition of Done Verification Engine (§3 & §11)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { DefinitionOfDoneChecklist } from './phase-24.types.js';

export interface EvaluationInput {
  taskId: string;
  implementationCompleted: boolean;
  testResult: {
    run: number;
    passed: number;
    failed: number;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
  };
  typecheckBuildPassed: boolean;
  acceptanceCriteria: string[];
  verifiedCriteria: string[];
  worktreeClean: boolean;
  unresolvedBlockersCount: number;
}

@Injectable()
export class DefinitionOfDoneEngine {
  private readonly logger = new StructuredLogger('DefinitionOfDoneEngine');

  /**
   * Evaluate complete Definition of Done checklist (§3)
   * A task CANNOT be marked DONE or READY_FOR_DEPLOY unless all 6 conditions are met.
   */
  public evaluate(input: EvaluationInput): DefinitionOfDoneChecklist {
    const failureReasons: string[] = [];

    // 1. Implementation completed
    const implOk = input.implementationCompleted;
    if (!implOk) {
      failureReasons.push('Implementation was not completed or yielded zero code changes');
    }

    // 2. Required tests passed
    const testsOk =
      input.testResult.status === 'PASSED' &&
      input.testResult.run > 0 &&
      input.testResult.failed === 0 &&
      input.testResult.passed >= input.testResult.run;
    if (!testsOk) {
      failureReasons.push(
        `Tests not passing: status=${input.testResult.status}, failed=${input.testResult.failed}, passed=${input.testResult.passed}/${input.testResult.run}`
      );
    }

    // 3. Typecheck / build passed
    const buildOk = input.typecheckBuildPassed;
    if (!buildOk) {
      failureReasons.push('Typecheck / compilation build failed');
    }

    // 4. Acceptance criteria verified
    const missingCriteria = input.acceptanceCriteria.filter(
      (c) => !input.verifiedCriteria.includes(c)
    );
    const criteriaOk = input.acceptanceCriteria.length > 0 && missingCriteria.length === 0;
    if (!criteriaOk) {
      failureReasons.push(
        `Unverified acceptance criteria: ${missingCriteria.length > 0 ? missingCriteria.join('; ') : 'No criteria defined'}`
      );
    }

    // 5. Worktree state valid (clean git state, no leftover temp artifacts)
    const worktreeOk = input.worktreeClean;
    if (!worktreeOk) {
      failureReasons.push('Worktree state is dirty or contains unverified residues');
    }

    // 6. No unresolved blockers
    const blockersOk = input.unresolvedBlockersCount === 0;
    if (!blockersOk) {
      failureReasons.push(
        `Unresolved blockers detected: ${input.unresolvedBlockersCount} active blocker(s)`
      );
    }

    const isReadyForDeploy =
      implOk && testsOk && buildOk && criteriaOk && worktreeOk && blockersOk;

    if (isReadyForDeploy) {
      this.logger.info(
        'evaluate',
        `[${input.taskId}] Definition of Done PASSED. Eligible for READY_FOR_DEPLOY (§3).`
      );
    } else {
      this.logger.warn(
        'evaluate',
        `[${input.taskId}] Definition of Done FAILED (${failureReasons.length} issues). Cannot reach READY_FOR_DEPLOY: ${failureReasons.join(' | ')}`
      );
    }

    return {
      implementationCompleted: implOk,
      requiredTestsPassed: testsOk,
      typecheckBuildPassed: buildOk,
      acceptanceCriteriaVerified: criteriaOk,
      worktreeStateValid: worktreeOk,
      noUnresolvedBlockers: blockersOk,
      isReadyForDeploy,
      failureReasons: failureReasons.length > 0 ? failureReasons : undefined,
    };
  }
}
