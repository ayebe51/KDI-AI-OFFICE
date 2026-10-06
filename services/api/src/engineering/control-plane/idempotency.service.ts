// ==========================================================
// services/api/src/engineering/control-plane/idempotency.service.ts
// Phase 15.5: Idempotency & Command Deduplication Engine (§8)
// ==========================================================

import * as crypto from 'crypto';
import { StructuredLogger } from '@kdi/shared';
import type {
  EngineeringTaskRecord,
  IdempotencyRecord,
} from './engineering-control-plane.types.js';

export class IdempotencyService {
  private readonly logger = new StructuredLogger('IdempotencyService');
  private readonly records = new Map<string, IdempotencyRecord>();

  /**
   * Compute a deterministic fingerprint for an engineering task request (§8)
   */
  public computeTaskFingerprint(params: {
    project: string;
    branch: string;
    title: string;
    description?: string;
    externalId?: string;
  }): string {
    if (params.externalId) {
      return `ext_${params.externalId.trim()}`;
    }
    const raw = `${params.project}::${params.branch}::${params.title.trim().toLowerCase()}`;
    return `fp_${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)}`;
  }

  /**
   * Register a task request with its fingerprint
   */
  public registerTask(fingerprint: string, taskId: string): void {
    this.records.set(fingerprint, {
      key: fingerprint,
      taskId,
      createdAt: new Date().toISOString(),
      status: 'TASK_CREATED',
    });
  }

  /**
   * Check if a request fingerprint already has an active, in-flight, or pending task
   */
  public findActiveTaskByFingerprint(
    fingerprint: string,
    existingTasks: EngineeringTaskRecord[]
  ): EngineeringTaskRecord | undefined {
    const record = this.records.get(fingerprint);
    if (!record) {
      // Also check if any existing task has this externalId
      return existingTasks.find(
        (t) =>
          t.externalId === fingerprint &&
          t.status !== 'CANCELLED' &&
          t.status !== 'READY_FOR_DEPLOY' &&
          t.status !== 'EXECUTION_FAILED' &&
          t.status !== 'BLOCKED'
      );
    }

    const task = existingTasks.find((t) => t.id === record.taskId);
    if (!task) return undefined;

    // If task is completed or cancelled, a new request is allowed
    const isTerminal =
      task.status === 'READY_FOR_DEPLOY' ||
      task.status === 'CANCELLED' ||
      task.status === 'EXECUTION_FAILED';

    if (isTerminal) {
      return undefined;
    }

    return task;
  }

  /**
   * Check if an approval resolution is idempotent
   */
  public isApprovalAlreadyResolved(task: EngineeringTaskRecord): boolean {
    return (
      task.status === 'APPROVED' ||
      task.status === 'COMMITTED' ||
      task.status === 'READY_FOR_DEPLOY' ||
      task.status === 'APPROVAL_REJECTED'
    );
  }

  /**
   * Check if a cancellation is idempotent
   */
  public isCancellationAlreadyResolved(task: EngineeringTaskRecord): boolean {
    return task.status === 'CANCELLED' || task.status === 'CANCEL_REQUESTED';
  }

  /**
   * Check if a fingerprint is registered as an active duplicate
   */
  public isDuplicate(fingerprint: string): boolean {
    return this.records.has(fingerprint);
  }

  /**
   * Get existing task ID for a registered fingerprint
   */
  public getExistingTaskId(fingerprint: string): string | undefined {
    return this.records.get(fingerprint)?.taskId;
  }
}
