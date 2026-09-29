// ==========================================================
// services/api/src/runtime/queue/task.queue.ts
// Priority Task Queue with Delayed Retries, DLQ & Cancellation
// ==========================================================

import type { CanonicalTask, TaskPriority } from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export interface QueuedItem {
  task: CanonicalTask;
  enqueuedAt: number;
  availableAt: number; // For delayed retries or scheduled execution
  priorityScore: number;
}

export interface DLQItem {
  task: CanonicalTask;
  failedAt: string;
  reason: string;
  attempts: number;
  escalationStatus: 'PENDING_HUMAN' | 'RESOLVED' | 'DROPPED';
}

export class TaskQueue {
  private readonly logger = new StructuredLogger('TaskQueue');
  private queue: QueuedItem[] = [];
  private dlq: Map<string, DLQItem> = new Map();
  private paused = false;

  private static readonly PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
    URGENT: 4000,
    HIGH: 3000,
    NORMAL: 2000,
    LOW: 1000,
  };

  /**
   * Enqueue a task with priority weighting and optional delay
   */
  public enqueue(task: CanonicalTask, delayMs = 0): void {
    const now = Date.now();
    const availableAt = now + delayMs;
    const baseWeight = TaskQueue.PRIORITY_WEIGHTS[task.priority] || 2000;
    // Boost priority score slightly by arrival timestamp to preserve FIFO within same priority
    const priorityScore = baseWeight - (now % 100000) / 100000;

    const item: QueuedItem = {
      task,
      enqueuedAt: now,
      availableAt,
      priorityScore,
    };

    // Remove any existing entry for this taskId
    this.queue = this.queue.filter((q) => q.task.taskId !== task.taskId);
    this.queue.push(item);
    this.sortQueue();

    this.logger.debug(
      'enqueue',
      `Task ${task.taskId} enqueued (Priority: ${task.priority}, Delay: ${delayMs}ms, Queue Size: ${this.queue.length})`
    );
  }

  /**
   * Dequeue the highest priority task that is currently available (availableAt <= now)
   */
  public dequeue(): CanonicalTask | undefined {
    if (this.paused || this.queue.length === 0) {
      return undefined;
    }

    const now = Date.now();
    const index = this.queue.findIndex((item) => item.availableAt <= now);
    if (index === -1) {
      return undefined;
    }

    const [selected] = this.queue.splice(index, 1);
    return selected.task;
  }

  /**
   * Peek next available task without dequeuing
   */
  public peek(): CanonicalTask | undefined {
    if (this.paused || this.queue.length === 0) {
      return undefined;
    }
    const now = Date.now();
    const item = this.queue.find((i) => i.availableAt <= now);
    return item?.task;
  }

  /**
   * Remove a task from queue (e.g. on cancellation)
   */
  public remove(taskId: string): CanonicalTask | undefined {
    const index = this.queue.findIndex((item) => item.task.taskId === taskId);
    if (index !== -1) {
      const [removed] = this.queue.splice(index, 1);
      return removed.task;
    }
    return undefined;
  }

  /**
   * Send a task to the Dead Letter Queue
   */
  public sendToDLQ(task: CanonicalTask, reason: string): void {
    this.remove(task.taskId);
    this.dlq.set(task.taskId, {
      task,
      failedAt: new Date().toISOString(),
      reason,
      attempts: task.retryCount,
      escalationStatus: 'PENDING_HUMAN',
    });
    this.logger.warn(
      'sendToDLQ',
      `Task ${task.taskId} moved to Dead Letter Queue (Reason: ${reason}, Attempts: ${task.retryCount})`
    );
  }

  public getDLQ(): DLQItem[] {
    return Array.from(this.dlq.values());
  }

  public resolveDLQItem(taskId: string, action: 'RESOLVED' | 'DROPPED'): boolean {
    const item = this.dlq.get(taskId);
    if (item) {
      item.escalationStatus = action;
      return true;
    }
    return false;
  }

  public pause(): void {
    this.paused = true;
    this.logger.info('pause', 'Task queue paused');
  }

  public resume(): void {
    this.paused = false;
    this.logger.info('resume', 'Task queue resumed');
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public size(): number {
    return this.queue.length;
  }

  public getQueuedTasks(): CanonicalTask[] {
    return this.queue.map((q) => q.task);
  }

  public clear(): void {
    this.queue = [];
    this.dlq.clear();
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
