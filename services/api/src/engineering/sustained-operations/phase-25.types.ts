// ==========================================================
// services/api/src/engineering/sustained-operations/phase-25.types.ts
// Phase 25: Sustained Autonomous Engineering Operations Types (§1–§21)
// ==========================================================

import type { RealTaskProject, RealTaskType, RealTaskDomain } from '../operational-gate/phase-24.types.js';

export type SustainedTaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskPriority = SustainedTaskPriority;

export type TaskComplexity = 'LOW' | 'MEDIUM' | 'HIGH' | 'COMPLEX';

export type SustainedTaskFinalStatus =
  | 'READY_FOR_DEPLOY'
  | 'ESCALATED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'NOT_READY';

export type SustainedFailurePattern =
  | 'NONE'
  | 'TEST_FAILURE_REPAIR'
  | 'TIMEOUT_RETRY'
  | 'AGENT_CRASH_RECOVERY'
  | 'REPEATED_FAILURE_ESCALATION';

export interface SustainedEngineeringTask {
  taskId: string;
  project: RealTaskProject;
  repository: string;
  title: string;
  description: string;
  taskType: RealTaskType;
  priority: TaskPriority;
  domain: RealTaskDomain;
  targetBranch: string;
  assignedAgent: string;
  estimatedComplexity: TaskComplexity;
  acceptanceCriteria: string[];
  expectedFiles: string[];
  testFiles: string[];
  justification: string;
  injectedFailurePattern?: SustainedFailurePattern;
}

export interface SustainedTaskExecutionRecord {
  taskId: string;
  project: RealTaskProject;
  description: string;
  acceptanceCriteria: string[];
  priority: TaskPriority;
  estimatedComplexity: TaskComplexity;
  assignedAgent: string;
  worktree: string;
  executionId: string;
  createdAt: string;
  startedAt: string;
  completedAt: string;
  queueWaitMs: number;
  executionMs: number;
  totalTaskMs: number;
  attemptCount: number;
  repairCount: number;
  finalStatus: SustainedTaskFinalStatus;
  humanInterventionCount: number;
  escalationReason?: string;
  blockReason?: string;
  statusTransitions: Array<{
    from: string;
    to: string;
    timestamp: string;
  }>;
}

export interface ResourceSnapshot {
  phase: 'START' | 'MID' | 'END';
  timestamp: string;
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  activeWorktrees: number;
  quarantinedWorktrees: number;
  availableWorktrees: number;
  activeLeases: number;
  queueDepth: number;
  activeProcesses: number;
}

export interface WaveExecutionMetrics {
  waveIndex: number;
  waveName: string;
  tasksCount: number;
  completedCount: number;
  readyForDeployCount: number;
  failedCount: number;
  escalatedCount: number;
  cancelledCount: number;
  blockedCount: number;
  retryCount: number;
  repairCount: number;
  queueWaitP50Ms: number;
  queueWaitP95Ms: number;
  executionP50Ms: number;
  executionP95Ms: number;
  executionP99Ms: number;
  totalLifecycleP50Ms: number;
  resourceState: ResourceSnapshot;
  invariantsVerified: boolean;
}

export interface PrioritySchedulerMetrics {
  lostTasks: number;
  duplicateTasks: number;
  starvationEvents: number;
  maxQueueDepth: number;
  queueWaitP50Ms: number;
  queueWaitP95Ms: number;
  totalDispatches: number;
}

export interface WorktreeHealthMetrics {
  worktreesCreated: number;
  reusedCount: number;
  quarantinedCount: number;
  exhaustionEvents: number;
  staleLeasesDetected: number;
  duplicateWorktreesDetected: number;
  totalRecycles: number;
  failedRecycles: number;
}

export interface AgentHealthMetrics {
  agentExecutions: number;
  agentFailures: number;
  recoveries: number;
  escalations: number;
  infiniteRetryIncidents: number;
  capacityRejections: number;
}

export interface StateConsistencyReport {
  timestamp: string;
  allInvariantsSatisfied: boolean;
  violations: string[];
}

export interface Phase25SustainedScorecard {
  totalTasks: number;
  completedTasks: number;
  readyForDeployTasks: number;
  escalatedTasks: number;
  cancelledTasks: number;
  blockedTasks: number;
  autonomousTasks: number;
  humanInterventionCount: number;
  averageInterventionPerTask: number;
  productionDeploymentPerformed: boolean;
  waves: WaveExecutionMetrics[];
  queueReliability: PrioritySchedulerMetrics;
  worktreeHealth: WorktreeHealthMetrics;
  agentHealth: AgentHealthMetrics;
  resourceEndurance: {
    start: ResourceSnapshot;
    mid: ResourceSnapshot;
    end: ResourceSnapshot;
    memoryLeakDetected: boolean;
    worktreeLeakDetected: boolean;
  };
  reliability: {
    taskSuccessRatePct: number;
    recoverySuccessRatePct: number;
    retrySuccessRatePct: number;
    verificationSuccessRatePct: number;
    stateIntegrityPct: number;
    crossProjectContaminationCount: number;
  };
  performance: {
    phase23CoreCycleMs: number;
    phase24MachineCycleMs: number;
    phase25CoreCycleMs: number;
    queueLatencyP50Ms: number;
    taskLifecycleP50Ms: number;
    taskLifecycleP95Ms: number;
    taskLifecycleP99Ms: number;
    recoveryLatencyMs: number;
    progressiveDegradationDetected: boolean;
  };
}
