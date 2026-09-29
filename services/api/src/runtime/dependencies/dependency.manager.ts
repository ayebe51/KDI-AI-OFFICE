// ==========================================================
// services/api/src/runtime/dependencies/dependency.manager.ts
// DAG Task Dependency Evaluation & Failure Propagation Engine
// ==========================================================

import type { CanonicalTask, TaskState, DependencyFailurePolicy } from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export interface DependencyCheckResult {
  satisfied: boolean;
  pendingDependencies: string[];
  failedDependencies: Array<{ taskId: string; policy: DependencyFailurePolicy; status: TaskState }>;
}

export class DependencyManager {
  private readonly logger = new StructuredLogger('DependencyManager');

  /**
   * Evaluate whether all required dependencies of a task have completed successfully
   */
  public evaluateDependencies(
    task: CanonicalTask,
    getTaskFn: (taskId: string) => CanonicalTask | undefined
  ): DependencyCheckResult {
    if (!task.dependencies || task.dependencies.length === 0) {
      return { satisfied: true, pendingDependencies: [], failedDependencies: [] };
    }

    const pending: string[] = [];
    const failed: Array<{ taskId: string; policy: DependencyFailurePolicy; status: TaskState }> = [];

    for (const dep of task.dependencies) {
      const prerequisite = getTaskFn(dep.dependsOnTaskId);

      if (!prerequisite) {
        if (dep.required) {
          failed.push({
            taskId: dep.dependsOnTaskId,
            policy: dep.failurePolicy,
            status: 'FAILED',
          });
        }
        continue;
      }

      if (prerequisite.status === 'COMPLETED') {
        continue;
      }

      if (['FAILED', 'CANCELLED', 'EXPIRED', 'BLOCKED'].includes(prerequisite.status)) {
        if (dep.required) {
          failed.push({
            taskId: prerequisite.taskId,
            policy: dep.failurePolicy,
            status: prerequisite.status,
          });
        }
      } else {
        // Still pending/running/queued
        pending.push(prerequisite.taskId);
      }
    }

    const satisfied = pending.length === 0 && failed.length === 0;

    return {
      satisfied,
      pendingDependencies: pending,
      failedDependencies: failed,
    };
  }

  /**
   * Determine the appropriate action when a required dependency fails
   */
  public resolveFailureAction(
    failedDeps: Array<{ taskId: string; policy: DependencyFailurePolicy; status: TaskState }>
  ): { targetState: TaskState; reason: string; shouldRetryPrerequisite: boolean } {
    if (failedDeps.length === 0) {
      return { targetState: 'READY', reason: 'No failures', shouldRetryPrerequisite: false };
    }

    // If any policy is ESCALATE
    if (failedDeps.some((f) => f.policy === 'ESCALATE')) {
      return {
        targetState: 'WAITING_APPROVAL',
        reason: `Dependency failure escalated: Prerequisite(s) [${failedDeps.map((f) => f.taskId).join(', ')}] failed.`,
        shouldRetryPrerequisite: false,
      };
    }

    // If policy is RETRY_DEPENDENCY
    if (failedDeps.some((f) => f.policy === 'RETRY_DEPENDENCY')) {
      return {
        targetState: 'WAITING_DEPENDENCY',
        reason: `Awaiting retry of prerequisite task [${failedDeps.map((f) => f.taskId).join(', ')}].`,
        shouldRetryPrerequisite: true,
      };
    }

    // If policy is SKIP
    if (failedDeps.every((f) => f.policy === 'SKIP')) {
      return {
        targetState: 'CANCELLED',
        reason: `Task skipped: Optional prerequisite [${failedDeps.map((f) => f.taskId).join(', ')}] failed.`,
        shouldRetryPrerequisite: false,
      };
    }

    // Default policy is BLOCK
    return {
      targetState: 'BLOCKED',
      reason: `Task blocked: Required prerequisite [${failedDeps.map((f) => f.taskId).join(', ')}] entered state ${failedDeps[0].status}.`,
      shouldRetryPrerequisite: false,
    };
  }
}
