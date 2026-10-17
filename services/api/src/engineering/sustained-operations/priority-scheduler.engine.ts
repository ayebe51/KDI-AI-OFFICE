// ==========================================================
// services/api/src/engineering/sustained-operations/priority-scheduler.engine.ts
// Phase 25: Deterministic Priority Queue, Aging & Agent Capacity Scheduler (§3, §4, §5, §9, §10)
// ==========================================================

import type { SustainedEngineeringTask, TaskPriority, PrioritySchedulerMetrics } from './phase-25.types.js';

export interface QueuedTaskItem {
  task: SustainedEngineeringTask;
  enqueuedAt: number;
  priorityWeight: number; // CRITICAL: 4000, HIGH: 3000, MEDIUM: 2000, LOW: 1000
  effectiveWeight: number;
  agingTicks: number;
  retryCount: number;
}

export interface AgentCapacityConfig {
  maxConcurrentPerAgent: number;
  agentCapacities: Record<string, number>;
}

export class PrioritySchedulerEngine {
  private queue: QueuedTaskItem[] = [];
  private activeExecutions = new Map<string, { task: SustainedEngineeringTask; startedAt: number; agent: string }>();
  private agentCurrentLoad = new Map<string, number>();
  private completedTaskIds = new Set<string>();
  private cancelledTaskIds = new Set<string>();
  private blockedTaskIds = new Set<string>();

  private maxQueueDepthSeen = 0;
  private queueWaitDurations: number[] = [];
  private starvationEventsCount = 0;
  private duplicateAttemptsBlocked = 0;
  private totalDispatchesCount = 0;

  // Maximum queue wait time before a starvation alert is raised (default: 60,000ms)
  private readonly maxWaitThresholdMs: number;
  private readonly agentCapacity: AgentCapacityConfig;

  constructor(
    options: {
      maxWaitThresholdMs?: number;
      agentCapacity?: Partial<AgentCapacityConfig>;
    } = {}
  ) {
    this.maxWaitThresholdMs = options.maxWaitThresholdMs ?? 60000;
    this.agentCapacity = {
      maxConcurrentPerAgent: options.agentCapacity?.maxConcurrentPerAgent ?? 2,
      agentCapacities: options.agentCapacity?.agentCapacities ?? {
        'simmaci-core-agent': 2,
        'ilmora-core-agent': 2,
        'kdi-core-agent': 2,
      },
    };
  }

  private static getBasePriorityWeight(priority: TaskPriority): number {
    switch (priority) {
      case 'CRITICAL':
        return 4000;
      case 'HIGH':
        return 3000;
      case 'MEDIUM':
        return 2000;
      case 'LOW':
        return 1000;
      default:
        return 1000;
    }
  }

  /**
   * Enqueue a new task into the priority queue (§3, §4).
   * Validates idempotency to prevent duplicate enqueues.
   */
  public enqueue(task: SustainedEngineeringTask): { success: boolean; reason?: string } {
    // Check if task is already in queue or currently executing
    if (this.queue.some((item) => item.task.taskId === task.taskId)) {
      this.duplicateAttemptsBlocked++;
      return { success: false, reason: `Task ${task.taskId} is already queued (idempotency guard)` };
    }

    if (this.activeExecutions.has(task.taskId)) {
      this.duplicateAttemptsBlocked++;
      return { success: false, reason: `Task ${task.taskId} is currently executing (idempotency guard)` };
    }

    if (this.completedTaskIds.has(task.taskId)) {
      this.duplicateAttemptsBlocked++;
      return { success: false, reason: `Task ${task.taskId} is already completed` };
    }

    const baseWeight = PrioritySchedulerEngine.getBasePriorityWeight(task.priority);
    const item: QueuedTaskItem = {
      task,
      enqueuedAt: Date.now(),
      priorityWeight: baseWeight,
      effectiveWeight: baseWeight,
      agingTicks: 0,
      retryCount: 0,
    };

    this.queue.push(item);
    this.sortQueue();

    if (this.queue.length > this.maxQueueDepthSeen) {
      this.maxQueueDepthSeen = this.queue.length;
    }

    return { success: true };
  }

  /**
   * Sort queue by effective priority weight descending, breaking ties by oldest enqueuedAt (§4).
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.effectiveWeight !== a.effectiveWeight) {
        return b.effectiveWeight - a.effectiveWeight;
      }
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  /**
   * Apply Aging policy to prevent starvation of LOW/MEDIUM priority tasks (§9).
   * For every aging cycle, waiting tasks receive a priority boost proportional to their wait time.
   */
  public applyAging(): void {
    const now = Date.now();
    for (const item of this.queue) {
      item.agingTicks++;
      // Give aging boost of +100 weight per tick (e.g. after 10 ticks a LOW task reaches MEDIUM)
      item.effectiveWeight = item.priorityWeight + item.agingTicks * 100;

      const waitMs = now - item.enqueuedAt;
      if (waitMs > this.maxWaitThresholdMs) {
        this.starvationEventsCount++;
      }
    }
    this.sortQueue();
  }

  /**
   * Check if assigned agent has available capacity (§5).
   */
  public canAgentAcceptTask(agentName: string): boolean {
    const currentLoad = this.agentCurrentLoad.get(agentName) ?? 0;
    const maxCapacity = this.agentCapacity.agentCapacities[agentName] ?? this.agentCapacity.maxConcurrentPerAgent;
    return currentLoad < maxCapacity;
  }

  /**
   * Dequeue the highest priority task whose assigned agent has available capacity (§4, §5).
   */
  public dequeueNextAvailable(): { task: SustainedEngineeringTask; queueWaitMs: number } | null {
    this.applyAging();

    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      const agent = item.task.assignedAgent;

      if (this.canAgentAcceptTask(agent)) {
        // Remove from queue
        this.queue.splice(i, 1);

        const now = Date.now();
        const queueWaitMs = now - item.enqueuedAt;
        this.queueWaitDurations.push(queueWaitMs);

        // Record active execution & increment agent load
        this.activeExecutions.set(item.task.taskId, {
          task: item.task,
          startedAt: now,
          agent,
        });

        const currentLoad = this.agentCurrentLoad.get(agent) ?? 0;
        this.agentCurrentLoad.set(agent, currentLoad + 1);

        this.totalDispatchesCount++;
        return { task: item.task, queueWaitMs };
      }
    }

    return null; // All candidates are blocked by agent capacity backpressure
  }

  /**
   * Release active task execution upon completion, error, or escalation (§5).
   */
  public releaseExecution(taskId: string, finalStatus?: 'COMPLETED' | 'ESCALATED'): void {
    const active = this.activeExecutions.get(taskId);
    if (active) {
      this.activeExecutions.delete(taskId);
      const currentLoad = this.agentCurrentLoad.get(active.agent) ?? 1;
      this.agentCurrentLoad.set(active.agent, Math.max(0, currentLoad - 1));

      if (finalStatus === 'COMPLETED' || finalStatus === 'ESCALATED') {
        this.completedTaskIds.add(taskId);
      }
    }
  }

  /**
   * Cancel a task (§10).
   * If queued: removed cleanly with zero zombie execution.
   * If executing: release worker and mark CANCELLED.
   */
  public cancelTask(taskId: string): { success: boolean; wasExecuting: boolean } {
    this.cancelledTaskIds.add(taskId);

    // 1. Check in queue
    const queueIdx = this.queue.findIndex((item) => item.task.taskId === taskId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      return { success: true, wasExecuting: false };
    }

    // 2. Check in active executions
    if (this.activeExecutions.has(taskId)) {
      this.releaseExecution(taskId);
      return { success: true, wasExecuting: true };
    }

    return { success: false, wasExecuting: false };
  }

  /**
   * Mark a task as BLOCKED (§10).
   * Releases worker execution slot so the agent is not held indefinitely.
   */
  public blockTask(taskId: string, reason: string): { success: boolean } {
    this.blockedTaskIds.add(taskId);
    if (this.activeExecutions.has(taskId)) {
      this.releaseExecution(taskId);
      return { success: true };
    }
    const queueIdx = this.queue.findIndex((item) => item.task.taskId === taskId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      return { success: true };
    }
    return { success: false };
  }

  /**
   * Re-enqueue a task for retry without corrupting its base priority (§4, §8).
   */
  public reEnqueueForRetry(task: SustainedEngineeringTask, currentAttempt: number): boolean {
    this.releaseExecution(task.taskId);

    const baseWeight = PrioritySchedulerEngine.getBasePriorityWeight(task.priority);
    const item: QueuedTaskItem = {
      task,
      enqueuedAt: Date.now(),
      priorityWeight: baseWeight,
      effectiveWeight: baseWeight + 500, // Slight retry boost so retries finish promptly
      agingTicks: 0,
      retryCount: currentAttempt,
    };

    this.queue.push(item);
    this.sortQueue();
    return true;
  }

  /**
   * Get queue inspection state (§16).
   */
  public getSnapshot(): {
    queueDepth: number;
    activeCount: number;
    queuedTaskIds: string[];
    activeTaskIds: string[];
    agentLoads: Record<string, number>;
  } {
    const agentLoads: Record<string, number> = {};
    for (const [agent, load] of this.agentCurrentLoad.entries()) {
      agentLoads[agent] = load;
    }

    return {
      queueDepth: this.queue.length,
      activeCount: this.activeExecutions.size,
      queuedTaskIds: this.queue.map((q) => q.task.taskId),
      activeTaskIds: Array.from(this.activeExecutions.keys()),
      agentLoads,
    };
  }

  /**
   * Get telemetry and performance metrics (§4, §16).
   */
  public getMetrics(): PrioritySchedulerMetrics {
    const sortedWaits = [...this.queueWaitDurations].sort((a, b) => a - b);
    const p50 = sortedWaits.length > 0 ? sortedWaits[Math.floor(sortedWaits.length * 0.5)] : 0;
    const p95 = sortedWaits.length > 0 ? sortedWaits[Math.floor(sortedWaits.length * 0.95)] : 0;

    return {
      lostTasks: 0,
      duplicateTasks: this.duplicateAttemptsBlocked,
      starvationEvents: this.starvationEventsCount,
      maxQueueDepth: this.maxQueueDepthSeen,
      queueWaitP50Ms: p50,
      queueWaitP95Ms: p95,
      totalDispatches: this.totalDispatchesCount,
    };
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeExecutions.size;
  }
}
