// ==========================================================
// services/api/src/runtime/engine/agent.runtime.ts
// Core Agent Runtime Engine: Lifecycle, Sessions, Retries & Auditing
// ==========================================================

import type {
  CanonicalTask,
  AgentDefinition,
  TaskResult,
  ExecutionRecord,
  AgentSession,
  TaskState,
  RuntimeStatusSummary,
} from '@kdi/types';
import { TaskQueue } from '../queue/task.queue.js';
import { DependencyManager } from '../dependencies/dependency.manager.js';
import { AgentAssignmentEngine } from '../assignment/assignment.engine.js';
import { ConcurrencyController } from '../concurrency/concurrency.controller.js';
import { AgentScheduler } from '../scheduler/agent.scheduler.js';
import { TaskWorker } from '../worker/task.worker.js';
import { AgentRegistry } from './agent.registry.js';
import { ExecutionProvider } from '../execution/execution-provider.interface.js';
import { RuntimeEventEmitter } from '../events/runtime-event.emitter.js';
import { TaskStateMachine } from '../state-machines/task.state-machine.js';
import { StructuredLogger } from '@kdi/shared';

export class AgentRuntime {
  private readonly logger = new StructuredLogger('AgentRuntime');
  private tasks = new Map<string, CanonicalTask>();
  private executions = new Map<string, ExecutionRecord[]>();
  private sessions = new Map<string, AgentSession>();
  private workers: TaskWorker[] = [];

  public readonly queue: TaskQueue;
  public readonly dependencyManager: DependencyManager;
  public readonly assignmentEngine: AgentAssignmentEngine;
  public readonly concurrencyController: ConcurrencyController;
  public readonly scheduler: AgentScheduler;
  public readonly agentRegistry: AgentRegistry;
  public readonly eventEmitter: RuntimeEventEmitter;

  constructor(
    executionProvider: ExecutionProvider,
    agentRegistry: AgentRegistry,
    eventEmitter: RuntimeEventEmitter,
    numWorkers = 2
  ) {
    this.queue = new TaskQueue();
    this.dependencyManager = new DependencyManager();
    this.assignmentEngine = new AgentAssignmentEngine();
    this.concurrencyController = new ConcurrencyController();
    this.agentRegistry = agentRegistry;
    this.eventEmitter = eventEmitter;

    this.scheduler = new AgentScheduler(
      this.queue,
      this.dependencyManager,
      this.assignmentEngine,
      this.concurrencyController,
      this.agentRegistry,
      (id) => this.tasks.get(id)
    );

    // Initialize worker pool
    for (let i = 1; i <= numWorkers; i++) {
      this.workers.push(
        new TaskWorker(`worker-${i}`, executionProvider, this.concurrencyController, this.eventEmitter)
      );
    }

    this.logger.info('constructor', `AgentRuntime initialized with ${this.workers.length} active workers`);
  }

  /**
   * Submit and persist a new canonical task
   */
  public submitTask(task: CanonicalTask): CanonicalTask {
    this.tasks.set(task.taskId, task);
    this.eventEmitter.emitTaskEvent('task.created', task);

    // If human approval is required initially, transition to WAITING_APPROVAL
    if (task.approvalRequired) {
      TaskStateMachine.transition(task, 'WAITING_APPROVAL');
      this.eventEmitter.emitTaskEvent('task.blocked', task, { reason: 'Initial human approval required' });
      return task;
    }

    // Check dependencies
    const depCheck = this.dependencyManager.evaluateDependencies(task, (id) => this.tasks.get(id));
    if (!depCheck.satisfied) {
      TaskStateMachine.transition(task, 'WAITING_DEPENDENCY');
      this.queue.enqueue(task);
      this.eventEmitter.emitTaskEvent('task.queued', task, { waitingOn: depCheck.pendingDependencies });
      return task;
    }

    TaskStateMachine.transition(task, 'QUEUED');
    this.queue.enqueue(task);
    this.eventEmitter.emitTaskEvent('task.queued', task);

    return task;
  }

  public async processQueue(): Promise<number> {
    let dispatched = 0;
    const batch: Promise<void>[] = [];

    for (const worker of this.workers) {
      if (worker.isBusy()) continue;

      const unit = this.scheduler.scheduleNext('IMMEDIATE');
      if (!unit) break;

      dispatched++;
      batch.push(this.executeOnWorker(worker, unit.task, unit.agent));
    }

    if (batch.length > 0) {
      await Promise.all(batch);
    }

    return dispatched;
  }

  /**
   * Execute task on worker with session and retry management
   */
  private async executeOnWorker(
    worker: TaskWorker,
    task: CanonicalTask,
    agent: AgentDefinition
  ): Promise<void> {
    const attempt = (task.retryCount || 0) + 1;
    const executionId = `exec_${task.taskId}_att${attempt}_${Date.now()}`;
    task.executionId = executionId;

    // Create Execution Record
    const execution: ExecutionRecord = {
      executionId,
      taskId: task.taskId,
      attempt,
      agentId: agent.agentId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    };

    const taskExecList = this.executions.get(task.taskId) || [];
    taskExecList.push(execution);
    this.executions.set(task.taskId, taskExecList);
    this.eventEmitter.emitExecutionEvent('execution.started', execution);

    // Create Agent Session
    const session: AgentSession = {
      sessionId: `sess_${Date.now()}_${agent.agentId}`,
      agentId: agent.agentId,
      taskId: task.taskId,
      projectId: task.projectId,
      startedAt: execution.startedAt,
      status: 'RUNNING',
      executionId,
    };
    this.sessions.set(session.sessionId, session);

    // Execute via TaskWorker
    const workerResult = await worker.executeTask(task, agent);

    // Finalize Execution Record
    execution.endedAt = new Date().toISOString();
    execution.result = workerResult.result;
    execution.usage = workerResult.result.usage;
    execution.costUsd = workerResult.result.costUsd;

    // Update session
    session.endedAt = execution.endedAt;
    session.tokenUsage = execution.usage;
    session.estimatedCostUsd = execution.costUsd;

    if (workerResult.result.status === 'SUCCESS') {
      execution.status = 'COMPLETED';
      session.status = 'COMPLETED';
      this.eventEmitter.emitExecutionEvent('execution.completed', execution);

      // Check if dependent tasks are now unlocked
      this.checkAndUnlockDependents(task.taskId);
    } else if (workerResult.result.status === 'CANCELLED') {
      execution.status = 'CANCELLED';
      session.status = 'CANCELLED';
      this.eventEmitter.emitExecutionEvent('execution.failed', execution);
    } else {
      // Failed execution: Evaluate Retry Policy
      execution.status = 'FAILED';
      session.status = 'FAILED';
      execution.error = workerResult.result.errors?.join('; ');
      this.eventEmitter.emitExecutionEvent('execution.failed', execution);

      this.handleExecutionFailure(task, workerResult.result);
    }
  }

  /**
   * Handle task failure with exponential backoff and DLQ escalation
   */
  private handleExecutionFailure(task: CanonicalTask, result: TaskResult): void {
    const errorMsg = result.errors?.join('; ') || 'Task failed';
    const isRetryable = !errorMsg.includes('AUTHENTICATION_FAILED') && !errorMsg.includes('INVALID_REQUEST');

    if (isRetryable && task.retryCount < task.maxRetries) {
      TaskStateMachine.transition(task, 'RETRYING');
      // Exponential backoff: 1s, 2s, 4s, etc. (capped at 30s)
      const delayMs = Math.min(1000 * Math.pow(2, task.retryCount - 1), 30_000);
      this.logger.info(
        'handleExecutionFailure',
        `Task ${task.taskId} scheduled for retry attempt ${task.retryCount + 1}/${task.maxRetries} after ${delayMs}ms`
      );

      this.queue.enqueue(task, delayMs);
      this.eventEmitter.emitTaskEvent('task.retrying', task, { delayMs, attempt: task.retryCount });
    } else {
      TaskStateMachine.transition(task, 'FAILED');
      task.failureReason = `Max retries (${task.maxRetries}) reached or non-retryable error: ${errorMsg}`;

      // Route to Dead Letter Queue
      this.queue.sendToDLQ(task, task.failureReason);
      this.eventEmitter.emitTaskEvent('task.failed', task, { failureReason: task.failureReason });
      this.eventEmitter.emitTaskEvent('task.escalated', task, { reason: 'Sent to DLQ for human escalation' });
    }
  }

  /**
   * Unblock tasks waiting on this completed dependency
   */
  private checkAndUnlockDependents(completedTaskId: string): void {
    for (const t of this.tasks.values()) {
      if (t.status === 'WAITING_DEPENDENCY') {
        const depCheck = this.dependencyManager.evaluateDependencies(t, (id) => this.tasks.get(id));
        if (depCheck.satisfied) {
          TaskStateMachine.transition(t, 'READY');
          this.queue.enqueue(t);
          this.eventEmitter.emitTaskEvent('task.queued', t, { reason: `Prerequisite ${completedTaskId} completed` });
        }
      }
    }
  }

  public pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // If currently running on a worker, abort current execution and set PAUSED
    const activeWorker = this.workers.find((w) => w.getActiveTask()?.taskId === taskId);
    if (activeWorker) {
      activeWorker.abortCurrent('TASK_PAUSED');
    }

    this.queue.remove(taskId);
    TaskStateMachine.transition(task, 'PAUSED');
    this.eventEmitter.emitTaskEvent('task.paused', task);
    return true;
  }

  public resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'PAUSED') return false;

    TaskStateMachine.transition(task, 'QUEUED');
    this.queue.enqueue(task);
    this.eventEmitter.emitTaskEvent('task.resumed', task);
    return true;
  }

  public cancelTask(taskId: string, reason = 'User requested cancellation'): boolean {
    const task = this.tasks.get(taskId);
    if (!task || TaskStateMachine.isTerminal(task.status)) return false;

    const activeWorker = this.workers.find((w) => w.getActiveTask()?.taskId === taskId);
    if (activeWorker) {
      activeWorker.abortCurrent('TASK_CANCELLED');
    }

    this.queue.remove(taskId);
    TaskStateMachine.transition(task, 'CANCELLED');
    task.failureReason = reason;
    this.eventEmitter.emitTaskEvent('task.cancelled', task, { reason });
    return true;
  }

  public retryTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'FAILED') return false;

    task.retryCount = 0;
    TaskStateMachine.transition(task, 'QUEUED');
    this.queue.enqueue(task);
    this.eventEmitter.emitTaskEvent('task.queued', task, { reason: 'Manual retry' });
    return true;
  }

  /**
   * Crash recovery check: scans workers for stale executions
   */
  public recoverStaleWorkers(thresholdMs = 30_000): number {
    let recovered = 0;
    const now = Date.now();

    for (const worker of this.workers) {
      const hb = worker.getHeartbeat();
      const lastSeen = new Date(hb.lastSeen).getTime();

      if (hb.status === 'STALE' && now - lastSeen > thresholdMs) {
        const staleTask = worker.getActiveTask();
        this.logger.warn(
          'recoverStaleWorkers',
          `Detected stale worker ${worker.workerId} running task ${staleTask?.taskId}. Recovering slot.`
        );

        worker.abortCurrent('STALE_WORKER_TIMEOUT');
        if (staleTask) {
          this.handleExecutionFailure(staleTask, {
            status: 'FAILED',
            summary: `Worker ${worker.workerId} heartbeat timed out`,
            executionId: staleTask.executionId || `stale_${now}`,
            errors: ['Worker heartbeat expired'],
          });
        }
        recovered++;
      }
    }

    return recovered;
  }

  public getTask(taskId: string): CanonicalTask | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): CanonicalTask[] {
    return Array.from(this.tasks.values());
  }

  public getExecutions(taskId: string): ExecutionRecord[] {
    return this.executions.get(taskId) || [];
  }

  public getSummary(): RuntimeStatusSummary {
    const resource = this.concurrencyController.sampleResourceState();
    const activeTasks = this.workers.filter((w) => w.isBusy()).length;
    const allAgents = this.agentRegistry.list();
    const availableAgents = allAgents.filter((a) => a.availability === 'AVAILABLE').length;

    return {
      activeWorkers: this.workers.length,
      activeTasks,
      queuedTasks: this.queue.size(),
      dlqTasks: this.queue.getDLQ().length,
      totalAgents: allAgents.length,
      availableAgents,
      systemResourcePressure: {
        cpuUsagePercent: resource.cpuUsagePercent,
        ramUsagePercent: resource.ramUsagePercent,
        isThrottled: resource.isThrottled,
      },
    };
  }

  public getWorkers(): TaskWorker[] {
    return this.workers;
  }
}
