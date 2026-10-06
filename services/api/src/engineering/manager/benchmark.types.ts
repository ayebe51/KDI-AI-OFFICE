// ==========================================================
// services/api/src/engineering/manager/benchmark.types.ts
// Phase 18: Real-World AI Engineering Operations Benchmark Types
// ==========================================================

export type TaskDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type BenchmarkTaskCategory =
  | 'BUG_FIX'
  | 'FEATURE'
  | 'REFACTOR'
  | 'TEST'
  | 'DEBUGGING'
  | 'SECURITY'
  | 'BUILD_CI'
  | 'MAINTENANCE'
  | 'DOCUMENTATION';

export type AutonomyLevel =
  | 'A0' // Human does the work
  | 'A1' // AI suggests
  | 'A2' // AI executes, human must assist
  | 'A3' // AI executes and verifies without assistance
  | 'A4' // AI executes with only required approval
  | 'A5'; // Fully autonomous

export type TaskEligibility = 'ELIGIBLE' | 'NON_ELIGIBLE';

export type IneligibilityReason =
  | 'AMBIGUOUS_STRATEGIC_TASK'
  | 'UNAVAILABLE_CREDENTIALS'
  | 'HUMAN_DOMAIN_DECISION'
  | 'MANUAL_PRODUCTION_INTERVENTION'
  | 'UNSUPPORTED_EXTERNAL_SYSTEM';

export type EngineeringRole = 'BACKEND' | 'FRONTEND' | 'QA' | 'SECURITY' | 'DEVOPS';

export type HumanInterventionType =
  | 'MANUAL_CLARIFICATION'
  | 'MANUAL_DEBUGGING'
  | 'MANUAL_CODE_EDIT'
  | 'MANUAL_COMMAND'
  | 'ENV_REPAIR'
  | 'REASSIGNMENT'
  | 'CONFLICT_RESOLUTION'
  | 'TEST_REPAIR'
  | 'AGENT_RESCUE';

export type InterventionReason =
  | 'AMBIGUOUS_REQUIREMENT'
  | 'MISSING_CONTEXT'
  | 'TECHNICAL_BLOCKER'
  | 'ENVIRONMENT'
  | 'SECURITY'
  | 'APPROVAL'
  | 'QUALITY'
  | 'AGENT_FAILURE';

export type FailureCategory =
  | 'AGENT_REASONING_FAILURE'
  | 'EXECUTOR_FAILURE'
  | 'ANTIGRAVITY_FAILURE'
  | 'TEST_FAILURE'
  | 'ENVIRONMENT_FAILURE'
  | 'DEPENDENCY_FAILURE'
  | 'AMBIGUITY'
  | 'SECURITY_BLOCK'
  | 'RESOURCE_LIMIT'
  | 'HUMAN_INTERVENTION';

export type ObservationEventType =
  | 'TASK_RECEIVED'
  | 'TASK_ASSIGNED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_FINISHED'
  | 'INTERVENTION_REQUESTED'
  | 'INTERVENTION_PROVIDED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'RECOVERY_TRIGGERED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED';

export interface ObservationLogEntry {
  timestamp: string;
  event: ObservationEventType;
  details?: string;
}

export interface BenchmarkTimeBreakdown {
  queueWaitMs: number;
  executionMs: number;
  repairMs: number;
  reviewMs: number;
  approvalWaitMs: number;
  totalCycleMs: number;
}

export interface HumanInterventionRecord {
  type: HumanInterventionType;
  reason: InterventionReason;
  durationMs: number;
  notes: string;
  startedAt: string;
  endedAt: string;
}

export interface ActiveInterventionTimer {
  taskId: string;
  startedAt: number;
  type: HumanInterventionType;
  reason: InterventionReason;
}

export interface BenchmarkTaskDefinition {
  taskId: string;
  title: string;
  projectSlug: 'simmaci' | 'ilmora' | 'kdi';
  role: EngineeringRole;
  category: BenchmarkTaskCategory;
  difficulty: TaskDifficulty;
  difficultyRationale: string;
  eligibility: TaskEligibility;
  ineligibilityReason?: IneligibilityReason;
  isBenchmarkLabel: boolean; // true if labeled BENCHMARK_TASK
  baselineHumanMinutes: number;
  baselineSource: 'HISTORICAL_DATA' | 'PRIOR_TASK' | 'HUMAN_ESTIMATE';
  acceptanceCriteria: string[];
  expectedArtifacts?: string[];
}

export interface Phase18BenchmarkTaskRecord extends BenchmarkTaskDefinition {
  status: 'COMPLETED' | 'COMMITTED' | 'READY_FOR_DEPLOY' | 'FAILED' | 'CANCELLED';
  autonomyLevel: AutonomyLevel;
  falseSuccess: boolean;
  falseSuccessReason?: string;
  testsPassed: boolean;
  acceptanceCriteriaPassed: boolean;
  scopeValid: boolean;
  reviewPassed: boolean;
  attemptsCount: number;
  timeBreakdown: BenchmarkTimeBreakdown;
  humanInterventions: HumanInterventionRecord[];
  totalInterventionDurationMs: number;
  requiredPolicyApproval: boolean;
  approvalDurationMs: number;
  failureCategory?: FailureCategory;
  failureRootCause?: string;
  recoveryAttempted?: boolean;
  recoverySucceeded?: boolean;
  assignedAgentId: string;
  firstAssignmentSuccessful: boolean;
  antigravityExecution: {
    executed: boolean;
    success: boolean;
    timedOut: boolean;
    repairAttempts: number;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    requests: number;
    totalCostUsd: number;
  };
  observationLogs: ObservationLogEntry[];
  startedAt: string;
  completedAt: string;
}

export interface ProjectBenchmarkBreakdown {
  projectSlug: string;
  totalTasks: number;
  eligibleTasks: number;
  completed: number;
  failed: number;
  autonomyRate: number; // percentage (0 - 100)
  successRate: number;  // percentage (0 - 100)
  averageDurationMinutes: number;
  averageInterventionMinutes: number;
}

export interface RoleBenchmarkBreakdown {
  role: EngineeringRole;
  totalTasks: number;
  eligibleTasks: number;
  completed: number;
  failed: number;
  autonomyRate: number; // percentage (0 - 100)
  successRate: number;  // percentage (0 - 100)
  averageDurationMinutes: number;
}

export interface DifficultyBenchmarkBreakdown {
  difficulty: TaskDifficulty;
  totalTasks: number;
  eligibleTasks: number;
  completed: number;
  failed: number;
  autonomyRate: number; // percentage (0 - 100)
  successRate: number;  // percentage (0 - 100)
  averageDurationMinutes: number;
}

export interface FailureAnalysisBreakdown {
  category: FailureCategory;
  count: number;
  percentage: number; // percentage of total failures
  exampleTasks: string[];
  primaryRootCause: string;
}

export interface InterventionReasonBreakdown {
  reason: InterventionReason;
  count: number;
  percentage: number; // percentage of total interventions
  totalMinutes: number;
}

export interface OperationsBenchmarkMetrics {
  queueWaitAverageMs: number;
  priorityAccuracyRate: number; // % tasks executed according to priority rank
  firstAssignmentSuccessRate: number; // % assigned to right role first time
  antigravityTasksSent: number;
  antigravitySuccessRate: number;
  antigravityTimeoutRate: number;
  antigravityRepairSuccessRate: number;
  recoverySuccessRate: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
}

export interface BenchmarkSummaryReport {
  benchmarkWindow: {
    startedAt: string;
    endedAt: string;
    windowDays: number;
  };
  overview: {
    totalTasksRecorded: number;
    eligibleTasks: number;
    nonEligibleTasks: number;
    completedEligibleTasks: number;
    failedEligibleTasks: number;
    autonomousTasksCount: number; // Completed with A3 or A4
    autonomyRate: number;         // (A3 + A4) / Eligible Tasks %
    successRate: number;          // Completed / Eligible Tasks %
    failureRate: number;          // Failed / Eligible Tasks %
    humanInterventionRate: number;// Tasks requiring manual intervention / Eligible %
    falseSuccessCount: number;
    falseSuccessRate: number;
    averageHumanInterventionMinutes: number;
    averageExecutionMinutes: number;
    averageAttemptsPerTask: number;
    recoverySuccessRate: number;
    topFailureCategory: FailureCategory | 'NONE';
    topInterventionReason: InterventionReason | 'NONE';
    topBottleneck: string;
    estimatedHumanTimeSavedMinutes: number;
    humanCoordinationLoadMinutes: number;
    recommendedNextImprovement: string;
  };
  projectBreakdown: ProjectBenchmarkBreakdown[];
  roleBreakdown: RoleBenchmarkBreakdown[];
  difficultyBreakdown: DifficultyBenchmarkBreakdown[];
  failureBreakdown: FailureAnalysisBreakdown[];
  interventionBreakdown: InterventionReasonBreakdown[];
  operationsMetrics: OperationsBenchmarkMetrics;
  evidenceTasks: Array<{
    taskId: string;
    project: string;
    role: string;
    difficulty: string;
    autonomyLevel: AutonomyLevel;
    status: string;
    durationMs: number;
    humanInterventionMinutes: number;
    baselineMinutes: number;
    falseSuccess: boolean;
    failureCategory?: string;
  }>;
}
