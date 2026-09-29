// ==========================================================
// services/api/src/runtime/worker/task.worker.ts
// Autonomous Task Worker with Atomic Claim, Heartbeat & Stale Recovery
// ==========================================================

import type { CanonicalTask, AgentDefinition, TaskResult, WorkerHeartbeat } from '@kdi/types';
import { ExecutionProvider } from '../execution/execution-provider.interface.js';
import { ConcurrencyController } from '../concurrency/concurrency.controller.js';
import { TaskStateMachine } from '../state-machines/task.state-machine.js';
import { AgentStateMachine } from '../state-machines/agent.state-machine.js';
import { RuntimeEventEmitter } from '../events/runtime-event.emitter.js';
import { StructuredLogger } from '@kdi/shared';

export interface WorkerExecutionResult {
  task: CanonicalTask;
  result: TaskResult;
  latencyMs: number;
}

export class TaskWorker {
  public readonly workerId: string;
  private readonly logger: StructuredLogger;
  private isRunning = false;
  private currentTask?: CanonicalTask;
  private currentAgent?: AgentDefinition;
  private lastHeartbeat: number = Date.now();
  private abortController?: AbortController;

  constructor(
    workerId: string,
    private readonly executionProvider: ExecutionProvider,
    private readonly concurrencyController: ConcurrencyController,
    private readonly eventEmitter: RuntimeEventEmitter
  ) {
    this.workerId = workerId;
    this.logger = new StructuredLogger(`Worker:${workerId}`);
  }

  /**
   * Execute an assigned task atomically with timeout supervision
   */
  public async executeTask(
    task: CanonicalTask,
    agent: AgentDefinition
  ): Promise<WorkerExecutionResult> {
    this.isRunning = true;
    this.currentTask = task;
    this.currentAgent = agent;
    this.lastHeartbeat = Date.now();
    this.abortController = new AbortController();

    const previousAgentState = agent.status;
    const startTime = Date.now();

    // 1. Atomic Claim & Transition to ASSIGNED then RUNNING
    TaskStateMachine.transition(task, 'ASSIGNED');
    task.assignedAgent = agent.agentId;
    this.eventEmitter.emitTaskEvent('task.assigned', task, { agentId: agent.agentId });

    TaskStateMachine.transition(task, 'RUNNING');
    AgentStateMachine.transition(agent, 'WORKING');
    agent.currentTaskId = task.taskId;
    agent.currentActivity = `Executing ${task.taskType}: ${task.title}`;

    this.concurrencyController.registerTaskStart(agent);
    this.eventEmitter.emitTaskEvent('task.started', task);
    this.eventEmitter.emitAgentStatusChanged(agent, previousAgentState as any, task.taskType);

    // 2. Setup Timeout Guard
    const timeoutMs = task.timeoutMs || 60_000;
    const timeoutTimer = setTimeout(() => {
      this.logger.warn('executeTask', `Task ${task.taskId} reached timeout limit of ${timeoutMs}ms. Aborting.`);
      this.abortController?.abort('TASK_TIMEOUT');
    }, timeoutMs);

    try {
      this.logger.info(
        'executeTask',
        `Worker ${this.workerId} executing task ${task.taskId} via agent ${agent.name} (Timeout: ${timeoutMs}ms)`
      );

      const result = await this.executionProvider.execute(
        task,
        agent,
        this.abortController.signal
      );

      clearTimeout(timeoutTimer);
      const latencyMs = Date.now() - startTime;

      if (result.status === 'SUCCESS') {
        TaskStateMachine.transition(task, 'COMPLETED');
        task.result = result;
        this.eventEmitter.emitTaskEvent('task.completed', task, { latencyMs });
      } else if (result.status === 'CANCELLED') {
        TaskStateMachine.transition(task, 'CANCELLED');
        task.result = result;
        this.eventEmitter.emitTaskEvent('task.cancelled', task);
      } else {
        task.failureReason = result.errors?.join('; ') || 'Task execution failed';
        // Note: Task state transition to FAILED / RETRYING will be finalized by AgentRuntime
      }

      return { task, result, latencyMs };
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      this.logger.error('executeTask', `Worker execution failed: ${errorMsg}`);

      return {
        task,
        result: {
          status: 'FAILED',
          summary: errorMsg,
          executionId: task.executionId || `exec_${Date.now()}`,
          errors: [errorMsg],
        },
        latencyMs,
      };
    } finally {
      // 3. Teardown Worker Context
      this.concurrencyController.registerTaskEnd(agent);
      agent.currentTaskId = undefined;
      AgentStateMachine.transition(agent, 'AVAILABLE');
      this.eventEmitter.emitAgentStatusChanged(agent, 'WORKING' as any);

      this.isRunning = false;
      this.currentTask = undefined;
      this.currentAgent = undefined;
      this.abortController = undefined;
      this.lastHeartbeat = Date.now();
    }
  }

  /**
   * Request abort / cancellation of active task execution
   */
  public abortCurrent(reason = 'MANUAL_CANCELLATION'): boolean {
    if (this.isRunning && this.abortController) {
      this.logger.warn('abortCurrent', `Aborting task ${this.currentTask?.taskId}: ${reason}`);
      this.abortController.abort(reason);
      return true;
    }
    return false;
  }

  public getHeartbeat(): WorkerHeartbeat {
    const isStale = Date.now() - this.lastHeartbeat > 30_000;
    return {
      workerId: this.workerId,
      agentId: this.currentAgent?.agentId,
      currentTaskId: this.currentTask?.taskId,
      lastSeen: new Date(this.lastHeartbeat).toISOString(),
      status: this.isRunning ? (isStale ? 'STALE' : 'ACTIVE') : 'IDLE',
    };
  }

  public pulse(): void {
    this.lastHeartbeat = Date.now();
  }

  public isBusy(): boolean {
    return this.isRunning;
  }

  public getActiveTask(): CanonicalTask | undefined {
    return this.currentTask;
  }
}
