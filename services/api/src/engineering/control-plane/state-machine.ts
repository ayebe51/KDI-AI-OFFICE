// ==========================================================
// services/api/src/engineering/control-plane/state-machine.ts
// Phase 15.5: Engineering State Machine & Transition Guards (§6 & §7)
// ==========================================================

import type { EngineeringLifecycleStatus } from './engineering-control-plane.types.js';

export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly fromStatus: EngineeringLifecycleStatus,
    public readonly toStatus: EngineeringLifecycleStatus,
    public readonly taskId?: string,
    message?: string
  ) {
    super(
      message ||
        `Illegal engineering state transition from "${fromStatus}" to "${toStatus}"${
          taskId ? ` for task ${taskId}` : ''
        }`
    );
    this.name = 'IllegalStateTransitionError';
  }
}

export class EngineeringStateMachine {
  /**
   * Explicit adjacency list of legal transitions (§6 & §7)
   */
  private static readonly LEGAL_TRANSITIONS: Record<EngineeringLifecycleStatus, EngineeringLifecycleStatus[]> = {
    TASK_CREATED: [
      'TASK_ASSIGNED',
      'QUEUED',
      'BLOCKED',
      'CANCEL_REQUESTED',
      'CANCELLED',
    ],
    TASK_ASSIGNED: [
      'QUEUED',
      'WORKSPACE_PREPARING',
      'WORKSPACE_PREPARED',
      'BLOCKED',
      'WAITING_FOR_RESOURCES',
      'CANCEL_REQUESTED',
      'CANCELLED',
    ],
    QUEUED: [
      'WORKSPACE_PREPARING',
      'WORKSPACE_PREPARED',
      'WAITING_FOR_RESOURCES',
      'BLOCKED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'STALE',
    ],
    WAITING_FOR_RESOURCES: [
      'QUEUED',
      'WORKSPACE_PREPARING',
      'WORKSPACE_PREPARED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'TIMEOUT',
    ],
    WORKSPACE_PREPARING: [
      'WORKSPACE_PREPARED',
      'WORKSPACE_ERROR',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
    ],
    WORKSPACE_PREPARED: [
      'REPOSITORY_INSPECTED',
      'EXECUTOR_STARTING',
      'WORKSPACE_ERROR',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
    ],
    REPOSITORY_INSPECTED: [
      'EXECUTOR_STARTING',
      'EXECUTING',
      'IMPLEMENTING',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
    ],
    EXECUTOR_STARTING: [
      'EXECUTOR_STARTED',
      'EXECUTING',
      'IMPLEMENTING',
      'ANTIGRAVITY_RUNNING',
      'EXECUTOR_UNAVAILABLE',
      'AUTH_REQUIRED',
      'PERMISSION_BLOCKED',
      'ANTIGRAVITY_AUTH_REQUIRED',
      'ANTIGRAVITY_PERMISSION_BLOCKED',
      'ANTIGRAVITY_UNAVAILABLE',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
      'TIMEOUT',
    ],
    EXECUTOR_STARTED: [
      'EXECUTING',
      'IMPLEMENTING',
      'ANTIGRAVITY_RUNNING',
      'TESTING',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
      'TIMEOUT',
    ],
    EXECUTING: [
      'TESTING',
      'REPAIRING',
      'EXECUTION_FAILED',
      'COMMAND_FAILED',
      'ANTIGRAVITY_COMPLETED',
      'ANTIGRAVITY_FAILED',
      'ANTIGRAVITY_TIMEOUT',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'TIMEOUT',
      'EXECUTION_TIMEOUT',
      'RECOVERY_REQUIRED',
      'STALE',
    ],
    IMPLEMENTING: [
      'TESTING',
      'REPAIRING',
      'EXECUTION_FAILED',
      'COMMAND_FAILED',
      'ANTIGRAVITY_COMPLETED',
      'ANTIGRAVITY_FAILED',
      'ANTIGRAVITY_TIMEOUT',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'TIMEOUT',
      'EXECUTION_TIMEOUT',
      'RECOVERY_REQUIRED',
      'STALE',
    ],
    ANTIGRAVITY_RUNNING: [
      'TESTING',
      'ANTIGRAVITY_COMPLETED',
      'ANTIGRAVITY_FAILED',
      'ANTIGRAVITY_TIMEOUT',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
      'STALE',
    ],
    TESTING: [
      'REPAIRING',
      'TEST_FAILED',
      'DIFF_COLLECTED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'TIMEOUT',
      'EXECUTION_TIMEOUT',
      'RECOVERY_REQUIRED',
      'STALE',
    ],
    REPAIRING: [
      'EXECUTOR_STARTING',
      'EXECUTING',
      'IMPLEMENTING',
      'TESTING',
      'TEST_FAILED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'TIMEOUT',
      'RECOVERY_REQUIRED',
    ],
    DIFF_COLLECTED: [
      'REVIEWING',
      'ENGINEERING_REVIEW',
      'REVIEW_FAILED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'RECOVERY_REQUIRED',
    ],
    REVIEWING: [
      'READY_FOR_APPROVAL',
      'REVIEW_FAILED',
      'REPAIRING',
      'CANCEL_REQUESTED',
      'CANCELLED',
    ],
    ENGINEERING_REVIEW: [
      'READY_FOR_APPROVAL',
      'REVIEW_FAILED',
      'REPAIRING',
      'CANCEL_REQUESTED',
      'CANCELLED',
    ],
    READY_FOR_APPROVAL: [
      'APPROVED',
      'APPROVAL_REJECTED',
      'APPROVAL_INVALIDATED',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'REVIEWING', // if requested to re-review
    ],
    APPROVED: [
      'COMMITTED',
      'MERGED',
      'APPROVAL_INVALIDATED', // if diff altered before commit
      'MERGE_FAILED',
      'CANCEL_REQUESTED',
      'CANCELLED',
    ],
    APPROVAL_INVALIDATED: [
      'REVIEWING',
      'ENGINEERING_REVIEW',
      'READY_FOR_APPROVAL',
      'CANCEL_REQUESTED',
      'CANCELLED',
    ],
    COMMITTED: [
      'READY_FOR_DEPLOY',
      'MERGED',
      'DEPLOY_FAILED',
    ],
    MERGED: [
      'READY_FOR_DEPLOY',
      'COMMITTED',
      'DEPLOY_FAILED',
      'CANCELLED',
    ],
    READY_FOR_DEPLOY: [], // Hard stop (§31) - Terminal
    // Terminal / Failure states
    BLOCKED: ['TASK_CREATED', 'TASK_ASSIGNED', 'CANCELLED'],
    EXECUTOR_UNAVAILABLE: ['RECOVERY_REQUIRED', 'CANCELLED', 'QUEUED'],
    AUTH_REQUIRED: ['RECOVERY_REQUIRED', 'CANCELLED'],
    PERMISSION_BLOCKED: ['RECOVERY_REQUIRED', 'CANCELLED'],
    ANTIGRAVITY_AUTH_REQUIRED: ['RECOVERY_REQUIRED', 'CANCELLED'],
    ANTIGRAVITY_PERMISSION_BLOCKED: ['RECOVERY_REQUIRED', 'CANCELLED'],
    ANTIGRAVITY_UNAVAILABLE: ['RECOVERY_REQUIRED', 'CANCELLED', 'QUEUED'],
    ANTIGRAVITY_COMPLETED: ['TESTING', 'DIFF_COLLECTED'],
    ANTIGRAVITY_FAILED: ['RECOVERY_REQUIRED', 'CANCELLED', 'REPAIRING'],
    ANTIGRAVITY_TIMEOUT: ['RECOVERY_REQUIRED', 'CANCELLED'],
    EXECUTION_FAILED: ['RECOVERY_REQUIRED', 'CANCELLED', 'REPAIRING'],
    COMMAND_FAILED: ['RECOVERY_REQUIRED', 'CANCELLED', 'REPAIRING'],
    TIMEOUT: ['RECOVERY_REQUIRED', 'CANCELLED'],
    EXECUTION_TIMEOUT: ['RECOVERY_REQUIRED', 'CANCELLED'],
    TEST_FAILED: ['REPAIRING', 'RECOVERY_REQUIRED', 'CANCELLED'],
    REVIEW_FAILED: ['REPAIRING', 'RECOVERY_REQUIRED', 'CANCELLED'],
    APPROVAL_REJECTED: ['REPAIRING', 'CANCELLED'],
    CANCEL_REQUESTED: ['CANCELLED', 'CANCEL_TIMEOUT'],
    CANCELLED: [], // Terminal
    CANCEL_TIMEOUT: ['CANCELLED'],
    RECOVERY_REQUIRED: [
      'QUEUED',
      'TASK_ASSIGNED',
      'EXECUTOR_STARTING',
      'EXECUTING',
      'CANCELLED',
      'EXECUTION_FAILED',
    ],
    STALE: ['RECOVERY_REQUIRED', 'CANCELLED'],
    WORKSPACE_ERROR: ['RECOVERY_REQUIRED', 'CANCELLED'],
    MERGE_FAILED: ['RECOVERY_REQUIRED', 'CANCELLED'],
    DEPLOY_FAILED: ['COMMITTED', 'CANCELLED'],
  };

  /**
   * Terminal statuses where execution is finalized
   */
  public static readonly TERMINAL_STATES = new Set<EngineeringLifecycleStatus>([
    'READY_FOR_DEPLOY',
    'CANCELLED',
  ]);

  /**
   * Check if transition is valid according to state machine
   */
  public static canTransition(
    from: EngineeringLifecycleStatus,
    to: EngineeringLifecycleStatus
  ): boolean {
    if (from === to) return true; // idempotent self-transition
    const legalTargets = this.LEGAL_TRANSITIONS[from];
    if (!legalTargets) return false;
    return legalTargets.includes(to);
  }

  /**
   * Guard transition: throws IllegalStateTransitionError if invalid
   */
  public static assertTransition(
    from: EngineeringLifecycleStatus,
    to: EngineeringLifecycleStatus,
    taskId?: string
  ): void {
    if (!this.canTransition(from, to)) {
      throw new IllegalStateTransitionError(from, to, taskId);
    }
  }

  /**
   * Check if a state is considered in-flight / active
   */
  public static isInFlight(status: EngineeringLifecycleStatus): boolean {
    return (
      status === 'WORKSPACE_PREPARING' ||
      status === 'WORKSPACE_PREPARED' ||
      status === 'REPOSITORY_INSPECTED' ||
      status === 'EXECUTOR_STARTING' ||
      status === 'EXECUTOR_STARTED' ||
      status === 'EXECUTING' ||
      status === 'IMPLEMENTING' ||
      status === 'ANTIGRAVITY_RUNNING' ||
      status === 'TESTING' ||
      status === 'REPAIRING' ||
      status === 'DIFF_COLLECTED' ||
      status === 'REVIEWING' ||
      status === 'ENGINEERING_REVIEW'
    );
  }
}
