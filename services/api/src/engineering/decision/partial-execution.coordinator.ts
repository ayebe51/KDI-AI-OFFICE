// ==========================================================
// services/api/src/engineering/decision/partial-execution.coordinator.ts
// Phase 22: Partial Execution Before Human Intervention Coordinator (§12)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  AmbiguityClass,
  DecisionAction,
  PartialExecutionPlan,
  TaskSegment,
} from './decision.types.js';

export interface TaskDecompositionRequest {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  acceptanceCriteria: string[];
}

@Injectable()
export class PartialExecutionCoordinator {
  private readonly logger = new StructuredLogger('PartialExecutionCoordinator');

  /**
   * Decompose task into safe preparatory segments and gated/risky segments (§12)
   */
  public planPartialExecution(req: TaskDecompositionRequest): PartialExecutionPlan {
    const safeSegments: TaskSegment[] = [];
    const gatedSegments: TaskSegment[] = [];

    const fullDesc = `${req.taskTitle} ${req.taskDescription}`.toLowerCase();

    // Check if task involves both safe work and production/security config changes
    const hasProdOrConfigGate =
      fullDesc.includes('production') ||
      fullDesc.includes('deploy') ||
      fullDesc.includes('secret') ||
      fullDesc.includes('credential') ||
      fullDesc.includes('permission');

    // 1. Core Implementation segment (always safe in worktree)
    safeSegments.push({
      segmentId: `${req.taskId}-SEG-01-CODE`,
      description: `Implement core feature/bug-fix logic in isolated git worktree`,
      isSafe: true,
      classification: 'A',
      canExecuteBeforeClarification: true,
      requiresHumanApproval: false,
      action: 'INFER',
    });

    // 2. Unit & Regression Testing segment (always safe in worktree)
    safeSegments.push({
      segmentId: `${req.taskId}-SEG-02-TEST`,
      description: `Execute localized unit and regression test suite`,
      isSafe: true,
      classification: 'A',
      canExecuteBeforeClarification: true,
      requiresHumanApproval: false,
      action: 'INFER',
    });

    // 3. Evaluation of high-risk / configuration segment
    if (hasProdOrConfigGate) {
      gatedSegments.push({
        segmentId: `${req.taskId}-SEG-03-GATE`,
        description: `Apply sensitive configuration / prepare production release gate`,
        isSafe: false,
        classification: 'D',
        canExecuteBeforeClarification: false,
        requiresHumanApproval: true,
        action: 'HARD_STOP',
      });
    }

    const canProceedPartially = safeSegments.length > 0;

    this.logger.info(
      'planPartialExecution',
      `[${req.taskId}] Partial execution plan: ${safeSegments.length} safe segments, ${gatedSegments.length} gated segments (canProceedPartially=${canProceedPartially})`
    );

    return {
      taskId: req.taskId,
      safeSegments,
      gatedSegments,
      canProceedPartially,
      haltReason:
        gatedSegments.length > 0
          ? `Task contains ${gatedSegments.length} gated segments requiring explicit human approval after safe execution.`
          : undefined,
    };
  }

  /**
   * Execute safe segments up to the boundary, then stop strictly before risky actions (§12)
   */
  public async executeSafeSegments<T>(
    plan: PartialExecutionPlan,
    executor: (segment: TaskSegment) => Promise<T>
  ): Promise<{ executed: TaskSegment[]; results: T[]; stoppedAtBoundary: boolean }> {
    const executed: TaskSegment[] = [];
    const results: T[] = [];

    for (const segment of plan.safeSegments) {
      this.logger.info('executeSafeSegments', `Executing safe segment: ${segment.segmentId}`);
      const res = await executor(segment);
      executed.push(segment);
      results.push(res);
    }

    const stoppedAtBoundary = plan.gatedSegments.length > 0;
    if (stoppedAtBoundary) {
      this.logger.warn(
        'executeSafeSegments',
        `[${plan.taskId}] HALTING at boundary before risky segments: ${plan.gatedSegments.map((s) => s.segmentId).join(', ')}`
      );
    }

    return {
      executed,
      results,
      stoppedAtBoundary,
    };
  }
}
