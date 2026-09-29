// ==========================================================
// services/api/src/runtime/state-machines/task.state-machine.ts
// Formal 15-State Task State Machine & Guard Transition Engine
// ==========================================================

import type { TaskState, CanonicalTask } from '@kdi/types';

export interface TransitionRule {
  from: TaskState;
  to: TaskState;
  trigger: string;
  guard?: (task: CanonicalTask, context?: any) => boolean;
  action?: (task: CanonicalTask, context?: any) => void;
  failureMessage?: string;
}

export class TaskStateMachine {
  // Allowed State Transitions Table (Formal Invariants)
  private static readonly ALLOWED_TRANSITIONS: Record<TaskState, TaskState[]> = {
    CREATED: ['QUEUED', 'PLANNING', 'WAITING_APPROVAL', 'CANCELLED', 'BLOCKED'],
    QUEUED: ['PLANNING', 'READY', 'ASSIGNED', 'PAUSED', 'WAITING_DEPENDENCY', 'CANCELLED', 'EXPIRED'],
    PLANNING: ['READY', 'ASSIGNED', 'BLOCKED', 'CANCELLED', 'FAILED'],
    READY: ['ASSIGNED', 'QUEUED', 'RUNNING', 'CANCELLED', 'EXPIRED'],
    ASSIGNED: ['RUNNING', 'READY', 'QUEUED', 'CANCELLED', 'BLOCKED'],
    RUNNING: ['PAUSED', 'WAITING_APPROVAL', 'RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
    PAUSED: ['QUEUED', 'READY', 'RUNNING', 'CANCELLED', 'FAILED'],
    WAITING_DEPENDENCY: ['QUEUED', 'READY', 'BLOCKED', 'CANCELLED', 'FAILED'],
    WAITING_APPROVAL: ['QUEUED', 'READY', 'ASSIGNED', 'RUNNING', 'FAILED', 'CANCELLED', 'BLOCKED'],
    RETRYING: ['QUEUED', 'READY', 'ASSIGNED', 'RUNNING', 'FAILED', 'CANCELLED'],
    COMPLETED: [], // Terminal State
    FAILED: ['RETRYING', 'QUEUED'], // Can transition to RETRYING or manual re-queue
    CANCELLED: [], // Terminal State
    EXPIRED: [], // Terminal State
    BLOCKED: ['QUEUED', 'PLANNING', 'CANCELLED', 'FAILED'],
  };

  /**
   * Verify if a transition from currentState to targetState is permitted
   */
  public static canTransition(
    task: CanonicalTask,
    targetState: TaskState,
    context?: any
  ): { allowed: boolean; reason?: string } {
    const currentState = task.status;

    // Self-transition is a no-op
    if (currentState === targetState) {
      return { allowed: true };
    }

    const allowedTargets = this.ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowedTargets.includes(targetState)) {
      return {
        allowed: false,
        reason: `Illegal state transition: Cannot transition task from ${currentState} to ${targetState}. Allowed transitions: [${allowedTargets.join(', ')}]`,
      };
    }

    // Specific Guard Rules
    if (targetState === 'RUNNING') {
      if (currentState === 'WAITING_APPROVAL' && task.approvalRequired && !context?.approved) {
        return {
          allowed: false,
          reason: 'Guard violation: Task is waiting for human approval and has not been approved.',
        };
      }
      if (currentState === 'WAITING_DEPENDENCY' && task.dependencies?.length > 0 && !context?.dependenciesSatisfied) {
        return {
          allowed: false,
          reason: 'Guard violation: Task dependencies have not been fully satisfied.',
        };
      }
    }

    if (targetState === 'RETRYING') {
      if (task.retryCount >= task.maxRetries) {
        return {
          allowed: false,
          reason: `Guard violation: Max retries (${task.maxRetries}) exhausted for task ${task.taskId}.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Execute state transition on task, updating timestamps and tracking
   */
  public static transition(
    task: CanonicalTask,
    targetState: TaskState,
    context?: any
  ): CanonicalTask {
    const check = this.canTransition(task, targetState, context);
    if (!check.allowed) {
      throw new Error(`[TaskStateMachine] ${check.reason}`);
    }

    const previousState = task.status;
    task.status = targetState;
    const now = new Date().toISOString();

    if (targetState === 'RUNNING' && !task.startedAt) {
      task.startedAt = now;
    } else if (targetState === 'COMPLETED') {
      task.completedAt = now;
    } else if (targetState === 'CANCELLED') {
      task.cancelledAt = now;
    } else if (targetState === 'RETRYING') {
      task.retryCount += 1;
    }

    return task;
  }

  /**
   * Determine if a state is terminal
   */
  public static isTerminal(state: TaskState): boolean {
    return ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(state);
  }
}
