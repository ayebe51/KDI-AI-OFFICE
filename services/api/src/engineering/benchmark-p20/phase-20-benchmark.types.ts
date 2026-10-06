// ==========================================================
// services/api/src/engineering/benchmark-p20/phase-20-benchmark.types.ts
// Phase 20: Real-World AI Engineering Live Operations Benchmark Types (§8, §9, §11)
// ==========================================================

import type { TaskDifficulty, EngineeringRole, BenchmarkTaskCategory } from '../manager/benchmark.types.js';

export type BenchmarkTimelineState =
  | 'RECEIVED'
  | 'QUEUED'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'REVIEWING'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'COMMITTED'
  | 'FAILED';

export interface BenchmarkTimelineEntry {
  state: BenchmarkTimelineState;
  timestamp: string;
  durationMs?: number;
  note?: string;
}

export interface Phase20TaskDefinition {
  taskId: string;
  title: string;
  projectSlug: 'simmaci' | 'ilmora' | 'kdi';
  repository: string;
  role: EngineeringRole;
  category: BenchmarkTaskCategory;
  difficulty: TaskDifficulty;
  difficultyRationale: string;
  description: string;
  acceptanceCriteria: string[];
  constraints: string[];
  expectedArtifacts: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  baselineHumanMinutes: number;
  baselineSource: 'HISTORICAL_DATA' | 'PRIOR_TASK' | 'HUMAN_ESTIMATE' | 'NOT_MEASURED';
}

export interface Phase20TaskExecutionRecord {
  taskId: string;
  project: string;
  role: string;
  difficulty: TaskDifficulty;
  title: string;
  
  // Timing metrics (§8)
  queueTime: number;
  executionTime: number;
  totalCycleTime: number;
  startedAt: string;
  completedAt: string;

  // Attempt & Repair metrics (§8)
  attemptCount: number;
  repairAttempts: number;

  // Human intervention tracking (§7, §8)
  humanIntervention: boolean;
  humanInterventionMinutes: number;
  interventionType?: string;
  interventionReason?: string;
  interventionDetails?: string;

  // Verification & Testing (§15)
  testPass: boolean;
  testFail: boolean;
  testOutputSummary?: string;

  // AI Review (§1)
  reviewScore: number;
  reviewApproved: boolean;

  // Approval Gate & Commit (§16, §22)
  approvalRequired: boolean;
  approvalGranted: boolean;
  commitSuccess: boolean;
  commitSha?: string;

  // Reliability & Failure data (§10)
  status: 'COMPLETED' | 'FAILED';
  falseSuccess: boolean;
  recoverySuccess: boolean;
  failureReason?: string;
  failureStage?: BenchmarkTimelineState;

  // Observability timeline (§11)
  timeline: BenchmarkTimelineEntry[];

  // Artifacts & Host evidence (§16)
  hostId: string;
  executor: string;
  worktreePath?: string;
  changedFiles: string[];
  diffSummary?: string;
}

export interface Phase20AggregatedMetrics {
  benchmarkWindow: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
  totalTasks: number;
  eligibleTasks: number;
  completedTasks: number;
  failedTasks: number;

  // Primary operational rates (§9)
  autonomyRate: number; // percentage
  successRate: number; // percentage
  humanInterventionRate: number; // percentage
  recoveryRate: number; // percentage
  falseSuccessRate: number; // percentage (must be 0%)
  
  // Averages (§9)
  avgCycleTimeMs: number;
  avgCycleTimeMinutes: number;
  avgInterventionMinutes: number;
  avgRepairAttempts: number;

  // Categorical breakdowns (§19)
  byProject: Record<string, { total: number; completed: number; autonomyRate: number; avgCycleTimeMinutes: number }>;
  byRole: Record<string, { total: number; completed: number; autonomyRate: number }>;
  byDifficulty: Record<string, { total: number; completed: number; autonomyRate: number; avgCycleTimeMinutes: number }>;
  byFailureStage: Record<string, number>;
}
