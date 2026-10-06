// ==========================================================
// services/api/src/engineering/control-plane/engineering-control-plane.types.ts
// Phase 15.5: Engineering Control Plane Hardening & Recovery Types
// ==========================================================

import type {
  EngineeringExecutionStatus,
  EngineeringTaskContext,
  ExecutionAttempt,
  EngineeringReviewResult,
  EngineeringExecutionResult,
} from '../execution/engineering-execution.types.js';

export type EngineeringLifecycleStatus = EngineeringExecutionStatus;

export interface EngineeringTaskRecord {
  id: string; // taskId
  externalId?: string; // request fingerprint / idempotency key
  project: string;
  repository: string;
  taskType: string;
  domain?: string;
  agent: string;
  executor: string;
  status: EngineeringLifecycleStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  branch: string;
  worktree?: string;
  acceptanceCriteria: string[];
  constraints: string[];
  diffHash?: string;
  commitHash?: string;
  approvalId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failureReason?: string;
  lastHeartbeat?: string;
  executorPid?: number;
  metadata?: Record<string, any>;
}

export interface EngineeringExecutionAttemptRecord {
  id: string;
  taskId: string;
  attemptNumber: number;
  executor: string;
  status: EngineeringLifecycleStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  changedFiles: string[];
  diffSummary: string;
  diffHash?: string;
  testResult: {
    run: number;
    passed: number;
    failed: number;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
    details?: string;
  };
  buildResult?: {
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
    details?: string;
  };
  reviewResult?: EngineeringReviewResult;
  error?: string;
  diagnostics?: Record<string, any>;
  rawLogs: string[];
  commandsExecuted?: string[];
}

export interface WorktreeLeaseRecord {
  leaseId: string;
  taskId: string;
  path: string;
  branch: string;
  status: 'CREATED' | 'ACTIVE' | 'RELEASE_PENDING' | 'CLEANED' | 'ORPHANED';
  createdAt: string;
  lastHeartbeat: string;
  cleanedAt?: string;
}

export interface EngineeringControlPlaneEvent {
  id: string;
  taskId: string;
  attemptId?: string;
  type: string;
  actor: string;
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  metadata?: Record<string, any>;
}

export interface EngineeringConcurrencyPolicy {
  maxConcurrentEngineeringTasks: number;
  maxConcurrentAntigravityJobs: number;
  maxTasksPerHost: number;
}

export type TaskRecoveryAction =
  | 'RETRY'
  | 'RESUME'
  | 'CANCEL'
  | 'MARK_FAILED'
  | 'RECREATE_WORKTREE';

export interface RecoveryAssessment {
  taskId: string;
  currentStatus: EngineeringLifecycleStatus;
  actualProcessAlive: boolean;
  worktreeExists: boolean;
  gitStatusClean: boolean;
  diffPresent: boolean;
  recommendedAction: TaskRecoveryAction;
  reason: string;
}

export interface EngineeringControlPlaneSummary {
  running: number;
  queued: number;
  awaitingApproval: number;
  failed: number;
  recoverable: number;
  blocked: number;
  queueStatus: 'QUEUE_RUNNING' | 'QUEUE_PAUSED';
  activeExecutors: string[];
  activeHosts: number;
}

export interface IdempotencyRecord {
  key: string;
  taskId: string;
  createdAt: string;
  status: EngineeringLifecycleStatus;
  result?: any;
}
