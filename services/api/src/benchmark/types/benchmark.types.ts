// ==========================================================
// services/api/src/benchmark/types/benchmark.types.ts
// Domain Types & Contracts for Autonomous Software Delivery Benchmark
// ==========================================================

export type {
  BenchmarkRunStatus,
  BenchmarkMode,
  BenchmarkTaskLevel,
  BenchmarkTaskCategory,
  BenchmarkFailureCategory,
  HumanInterventionType,
  HumanIntervention,
  BenchmarkTask,
  BenchmarkStep,
  BenchmarkAttempt,
  BenchmarkArtifact,
  BenchmarkApproval,
  BenchmarkMetric,
  BenchmarkRun,
} from '@kdi/types';

export interface BenchmarkExecutionOptions {
  mode?: 'AUTONOMOUS' | 'SUPERVISED';
  repositoryPath?: string;
  branchPrefix?: string;
  maxRetries?: number;
  timeoutMs?: number;
  autoApproveSafeActions?: boolean;
}

export interface StepExecutionResult {
  stepId: string;
  name: string;
  actor: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'WAITING_APPROVAL';
  durationMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface RecoveryDecision {
  shouldRetry: boolean;
  attemptNumber: number;
  hypothesis: string;
  plannedAction: string;
  failureCategory: import('@kdi/types').BenchmarkFailureCategory;
  isUnrecoverable: boolean;
}

export interface BenchmarkEvidenceBundle {
  reportJson: string;
  reportMd: string;
  executionLog: string;
  gitDiff: string;
  testResults: string;
}
