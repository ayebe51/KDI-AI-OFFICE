// ==========================================================
// services/api/src/runtime/scheduler/agent.scheduler.ts
// Deterministic, Resource-Aware Task & Agent Scheduler
// ==========================================================

import type { CanonicalTask, AgentDefinition, SchedulerMode } from '@kdi/types';
import { TaskQueue } from '../queue/task.queue.js';
import { DependencyManager } from '../dependencies/dependency.manager.js';
import { AgentAssignmentEngine } from '../assignment/assignment.engine.js';
import { ConcurrencyController } from '../concurrency/concurrency.controller.js';
import { AgentRegistry } from '../engine/agent.registry.js';
import { StructuredLogger } from '@kdi/shared';

export interface ScheduledTaskUnit {
  task: CanonicalTask;
  agent: AgentDefinition;
  assignmentReason: string;
}

export class AgentScheduler {
  private readonly logger = new StructuredLogger('AgentScheduler');

  constructor(
    private readonly queue: TaskQueue,
    private readonly dependencyManager: DependencyManager,
    private readonly assignmentEngine: AgentAssignmentEngine,
    private readonly concurrencyController: ConcurrencyController,
    private readonly agentRegistry: AgentRegistry,
    private readonly getTaskFn: (taskId: string) => CanonicalTask | undefined
  ) {}

  /**
   * Evaluate the queue and return the next immediately executable task and its matched agent
   */
  public scheduleNext(mode: SchedulerMode = 'IMMEDIATE'): ScheduledTaskUnit | undefined {
    // 1. Check Global Concurrency and Host Resource Throttling
    const globalCheck = this.concurrencyController.canScheduleTask();
    if (!globalCheck.allowed) {
      this.logger.debug('scheduleNext', `Scheduling paused: ${globalCheck.reason}`);
      return undefined;
    }

    const queuedTasks = this.queue.getQueuedTasks();
    if (queuedTasks.length === 0) {
      return undefined;
    }

    // Iterate through tasks in priority order
    for (const task of queuedTasks) {
      // 2. Check Dependencies
      const depCheck = this.dependencyManager.evaluateDependencies(task, this.getTaskFn);
      if (!depCheck.satisfied) {
        if (depCheck.failedDependencies.length > 0) {
          const resolution = this.dependencyManager.resolveFailureAction(depCheck.failedDependencies);
          this.logger.warn('scheduleNext', `Task ${task.taskId} dependency failure action: ${resolution.targetState}`);
          task.status = resolution.targetState;
          task.failureReason = resolution.reason;
          if (resolution.targetState === 'BLOCKED') {
            this.queue.remove(task.taskId);
          }
        } else {
          // Prerequisites are still executing
          task.status = 'WAITING_DEPENDENCY';
        }
        continue;
      }

      // If dependencies were satisfied, ensure task is marked READY
      if (task.status === 'WAITING_DEPENDENCY') {
        task.status = 'READY';
      }

      // 3. Assign Candidate Agent
      const activeAgents = this.agentRegistry.listActive();
      const assignment = this.assignmentEngine.assign(task, activeAgents);

      if (!assignment.selectedAgent) {
        this.logger.debug(
          'scheduleNext',
          `Task ${task.taskId} could not be assigned: ${assignment.assignmentReason}`
        );
        continue;
      }

      // 4. Verify selected agent concurrency slot
      if (!this.concurrencyController.canAgentAcceptTask(assignment.selectedAgent)) {
        continue;
      }

      // Dequeue the selected task
      const dequeued = this.queue.remove(task.taskId);
      if (!dequeued) continue;

      this.logger.info(
        'scheduleNext',
        `Scheduled task ${dequeued.taskId} to ${assignment.selectedAgent.name} [Priority: ${dequeued.priority}]`
      );

      return {
        task: dequeued,
        agent: assignment.selectedAgent,
        assignmentReason: assignment.assignmentReason,
      };
    }

    return undefined;
  }
}
