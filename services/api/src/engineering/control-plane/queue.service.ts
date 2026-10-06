// ==========================================================
// services/api/src/engineering/control-plane/queue.service.ts
// Phase 15.5: Engineering Execution Queue, Priority Scheduler & Concurrency Control (§9, §10, §11, §19, §20)
// ==========================================================

import { StructuredLogger } from '@kdi/shared';
import type {
  EngineeringTaskContext,
  EngineeringExecutionResult,
} from '../execution/engineering-execution.types.js';
import type {
  EngineeringConcurrencyPolicy,
  EngineeringTaskRecord,
} from './engineering-control-plane.types.js';

export interface QueuedJob {
  context: EngineeringTaskContext;
  priorityScore: number;
  enqueuedAt: number;
  resolve: (result: EngineeringExecutionResult) => void;
  reject: (err: any) => void;
}

export class EngineeringQueueService {
  private readonly logger = new StructuredLogger('EngineeringQueueService');

  private queueStatus: 'QUEUE_RUNNING' | 'QUEUE_PAUSED' = 'QUEUE_RUNNING';
  private readonly queue: QueuedJob[] = [];
  private readonly activeTasks = new Map<string, EngineeringTaskContext>();
  private readonly disabledExecutors = new Set<string>();

  private concurrencyPolicy: EngineeringConcurrencyPolicy = {
    maxConcurrentEngineeringTasks: 2,
    maxConcurrentAntigravityJobs: 1,
    maxTasksPerHost: 2,
  };

  constructor(policy?: Partial<EngineeringConcurrencyPolicy>) {
    if (policy) {
      this.concurrencyPolicy = { ...this.concurrencyPolicy, ...policy };
    }
  }

  public getPolicy(): EngineeringConcurrencyPolicy {
    return { ...this.concurrencyPolicy };
  }

  public setPolicy(updates: Partial<EngineeringConcurrencyPolicy>): void {
    this.concurrencyPolicy = { ...this.concurrencyPolicy, ...updates };
    this.logger.info('setPolicy', `Updated concurrency policy: ${JSON.stringify(this.concurrencyPolicy)}`);
  }

  public getQueueStatus(): 'QUEUE_RUNNING' | 'QUEUE_PAUSED' {
    return this.queueStatus;
  }

  public pauseQueue(): void {
    this.queueStatus = 'QUEUE_PAUSED';
    this.logger.warn('pauseQueue', 'Engineering execution queue PAUSED. In-flight jobs continue, new jobs will wait.');
  }

  public resumeQueue(): void {
    this.queueStatus = 'QUEUE_RUNNING';
    this.logger.info('resumeQueue', 'Engineering execution queue RESUMED.');
  }

  public disableExecutor(executorId: string): void {
    this.disabledExecutors.add(executorId.toUpperCase());
    this.logger.warn('disableExecutor', `Executor ${executorId} disabled by kill switch.`);
  }

  public enableExecutor(executorId: string): void {
    this.disabledExecutors.delete(executorId.toUpperCase());
    this.logger.info('enableExecutor', `Executor ${executorId} re-enabled.`);
  }

  public isExecutorEnabled(executorId: string): boolean {
    return !this.disabledExecutors.has(executorId.toUpperCase());
  }

  public getQueuedCount(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeTasks.size;
  }

  public listActiveTasks(): EngineeringTaskContext[] {
    return Array.from(this.activeTasks.values());
  }

  public getActiveTask(taskId: string): EngineeringTaskContext | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Check if a task has repository or branch concurrency conflicts (§11)
   */
  public hasConflict(context: EngineeringTaskContext): { conflict: boolean; reason?: string } {
    for (const [activeTaskId, activeTask] of this.activeTasks.entries()) {
      if (activeTaskId === context.taskId) continue;

      // 1. Same branch conflict
      if (activeTask.branch === context.branch) {
        return {
          conflict: true,
          reason: `Branch conflict: branch "${context.branch}" is currently being used by active task ${activeTaskId}`,
        };
      }

      // 2. Same repository target files conflict (§11)
      if (
        activeTask.repository === context.repository &&
        activeTask.targetedFiles &&
        context.targetedFiles
      ) {
        const overlap = context.targetedFiles.filter((f) => activeTask.targetedFiles!.includes(f));
        if (overlap.length > 0) {
          return {
            conflict: true,
            reason: `Scope conflict: task ${activeTaskId} is actively modifying overlapping file(s): [${overlap.join(
              ', '
            )}] in repository ${context.repository}`,
          };
        }
      }
    }

    return { conflict: false };
  }

  /**
   * Check if capacity permits executing next job according to concurrency policy (§10)
   */
  public canExecute(context: EngineeringTaskContext): { canRun: boolean; reason?: string; isConflict?: boolean } {
    if (this.queueStatus === 'QUEUE_PAUSED') {
      return { canRun: false, reason: 'Queue is currently paused' };
    }

    const executor = (context.executor || 'ANTIGRAVITY').toUpperCase();
    if (this.disabledExecutors.has(executor)) {
      return { canRun: false, reason: `Executor "${executor}" is currently disabled via kill switch` };
    }

    if (this.activeTasks.size >= this.concurrencyPolicy.maxConcurrentEngineeringTasks) {
      return {
        canRun: false,
        reason: `Max concurrent engineering tasks limit reached (${this.activeTasks.size}/${this.concurrencyPolicy.maxConcurrentEngineeringTasks})`,
      };
    }

    if (executor === 'ANTIGRAVITY') {
      let activeAntigravityCount = 0;
      for (const t of this.activeTasks.values()) {
        if ((t.executor || 'ANTIGRAVITY').toUpperCase() === 'ANTIGRAVITY') {
          activeAntigravityCount++;
        }
      }
      if (activeAntigravityCount >= this.concurrencyPolicy.maxConcurrentAntigravityJobs) {
        return {
          canRun: false,
          reason: `Max concurrent Antigravity jobs reached (${activeAntigravityCount}/${this.concurrencyPolicy.maxConcurrentAntigravityJobs})`,
        };
      }
    }

    const conflictCheck = this.hasConflict(context);
    if (conflictCheck.conflict) {
      return { canRun: false, reason: conflictCheck.reason, isConflict: true };
    }

    return { canRun: true };
  }

  /**
   * Enqueue a job with priority ordering (§9 & §10)
   * Priority: CRITICAL (40) > HIGH (30) > MEDIUM (20) > LOW (10)
   */
  public enqueue(
    context: EngineeringTaskContext,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<EngineeringExecutionResult> {
    const priorityWeight: Record<string, number> = {
      CRITICAL: 40,
      HIGH: 30,
      MEDIUM: 20,
      LOW: 10,
    };
    const score = priorityWeight[priority] || 20;

    return new Promise<EngineeringExecutionResult>((resolve, reject) => {
      const job: QueuedJob = {
        context,
        priorityScore: score,
        enqueuedAt: Date.now(),
        resolve,
        reject,
      };

      // Priority sort insertion (higher score first; if equal score, earlier arrival FIFO)
      let inserted = false;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].priorityScore < score) {
          this.queue.splice(i, 0, job);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.queue.push(job);
      }

      this.logger.info(
        'enqueue',
        `Enqueued task ${context.taskId} (Priority: ${priority}, Queue Size: ${this.queue.length})`
      );
    });
  }

  /**
   * Dequeue the highest-priority runnable job that doesn't conflict with current active tasks
   */
  public dequeueRunnable(): QueuedJob | undefined {
    if (this.queueStatus === 'QUEUE_PAUSED') {
      return undefined;
    }

    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      const check = this.canExecute(candidate.context);
      if (check.canRun) {
        this.queue.splice(i, 1);
        this.activeTasks.set(candidate.context.taskId, candidate.context);
        this.logger.info(
          'dequeueRunnable',
          `Dequeued runnable task ${candidate.context.taskId} for execution`
        );
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * Mark a task as active directly (used when bypassing queue for direct execution)
   */
  public registerActive(context: EngineeringTaskContext): void {
    this.activeTasks.set(context.taskId, context);
  }

  /**
   * Release a completed or cancelled task from active tracking
   */
  public releaseActive(taskId: string): void {
    this.activeTasks.delete(taskId);
    this.logger.info('releaseActive', `Released task ${taskId} from active execution tracking`);
  }

  /**
   * Remove a job from queue if cancelled while waiting
   */
  public removeQueued(taskId: string): boolean {
    const idx = this.queue.findIndex((j) => j.context.taskId === taskId);
    if (idx >= 0) {
      const [removed] = this.queue.splice(idx, 1);
      removed.reject(new Error(`Task ${taskId} was cancelled while queued`));
      this.logger.info('removeQueued', `Removed task ${taskId} from queue`);
      return true;
    }
    return false;
  }
}
