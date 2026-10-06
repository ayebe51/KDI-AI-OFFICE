// ==========================================================
// services/api/src/engineering/reliability/reliability.types.ts
// Phase 19: AI Engineering Reliability Optimization Types
// ==========================================================

import type { EngineeringRole, TaskDifficulty } from '../manager/benchmark.types.js';

// ── 1. Test Reliability Types (§6–§11) ──────────────────────
export interface FlakeDetectionResult {
  isFlaky: boolean;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  inconsistentAssertions: string[];
  diagnostics: string;
}

export interface TargetedTestPlan {
  testFramework: 'node:test' | 'jest' | 'vitest' | 'mocha' | 'custom';
  testCommand: string;
  matchedTestFiles: string[];
  targetSymbols: string[];
  isolatedEnv: Record<string, string>;
  expectedAssertionsCount: number;
}

export interface TestAssertionAudit {
  file: string;
  totalAssertions: number;
  hardenedAssertions: number;
  weakAssertions: number; // e.g. toBeDefined(), truthy
  weakAssertionDetails: string[];
  isHardened: boolean;
}

// ── 2. Antigravity Execution & Inspection Types (§12–§16) ───
export interface InspectionBudget {
  maxFilesScanned: number;
  maxDirectoryDepth: number;
  maxDurationMs: number;
  maxOutputBytes: number;
}

export interface ProgressiveInspectionResult {
  levelReached: 1 | 2 | 3 | 4 | 5;
  filesScanned: number;
  filesMatched: number;
  ignoredPathsCount: number;
  durationMs: number;
  budgetExceeded: boolean;
  budgetStatus: 'WITHIN_BUDGET' | 'INSPECTION_LIMIT_REACHED';
  relevantFiles: string[];
  summary: string;
}

export interface StageDurationMetrics {
  discoveryMs: number;
  startupMs: number;
  inspectionMs: number;
  codingMs: number;
  testMs: number;
  reviewMs: number;
  totalMs: number;
}

// ── 3. Ambiguity Types (§17–§21) ────────────────────────────
export type AmbiguityCategory =
  | 'TECHNICAL'
  | 'REQUIREMENT'
  | 'BUSINESS'
  | 'SECURITY'
  | 'UI_UX'
  | 'ENVIRONMENT';

export interface AmbiguityClassificationResult {
  category: AmbiguityCategory;
  isAmbiguous: boolean;
  canAutoInfer: boolean;
  inferredInterpretation?: string;
  inferenceEvidence?: string;
  clarificationPrompt?: string; // Formatted A/B actionable question
  options?: Array<{ label: string; description: string; impact: string }>;
}

// ── 4. DevOps Pre-Flight Types (§22–§26) ─────────────────────
export interface RuntimeCapabilityCheck {
  tool: string;
  available: boolean;
  version?: string;
  requiredForProject: boolean;
}

export interface DevOpsPreflightResult {
  ready: boolean;
  status: 'READY' | 'BLOCKED' | 'ENVIRONMENT_FAILURE';
  checkedRuntimes: RuntimeCapabilityCheck[];
  missingPrerequisites: string[];
  dryRunSupported: boolean;
  diagnostics: string;
}

export interface DevOpsPlanResult {
  plannedActions: string[];
  affectedResources: string[];
  isDestructive: boolean;
  requiresApproval: boolean;
  dryRunOutput: string;
  status: 'PLAN_VERIFIED' | 'PLAN_REJECTED';
}

// ── 5. Self-Repair & Scope Discipline Types (§27–§31) ────────
export interface FailureMemoryRecord {
  taskId: string;
  attemptNumber: number;
  failedHypothesis: string;
  rejectedApproach: string;
  errorSnippet: string;
  failingTests: string[];
}

export interface EnrichedRepairPayload {
  attemptNumber: number;
  failureSummary: string;
  testDiff: string;
  relevantLogSnippet: string;
  changedFiles: string[];
  previousHypothesis?: string;
  avoidApproaches: string[];
  stopConditionTriggered?: boolean;
  stopReason?: string;
}

export interface ScopeDisciplineAudit {
  plannedFiles: string[];
  actualFilesChanged: string[];
  unexpectedFiles: string[];
  scopeDriftDetected: boolean;
  scopeExpansionRatio: number; // actual / planned
  requiresReview: boolean;
}

// ── 6. Phase 19 Benchmark & Comparison Types (§35, §51, §52) ─
export interface Phase19ComparisonReport {
  baselinePhase18: {
    eligibleTasks: number;
    completed: number;
    failed: number;
    autonomyRate: number;
    successRate: number;
    humanInterventionRate: number;
    falseSuccessRate: number;
    recoverySuccessRate: number;
    averageAttempts: number;
    averageExecutionMinutes: number;
    estimatedTimeSavedMinutes: number;
  };
  resultPhase19: {
    eligibleTasks: number;
    completed: number;
    failed: number;
    autonomyRate: number;
    successRate: number;
    humanInterventionRate: number;
    falseSuccessRate: number;
    recoverySuccessRate: number;
    averageAttempts: number;
    averageExecutionMinutes: number;
    estimatedTimeSavedMinutes: number;
  };
  deltas: {
    autonomyDelta: number; // e.g. +10%
    successDelta: number;  // e.g. +5%
    interventionDelta: number; // e.g. -5%
    falseSuccessDelta: number;
    timeSavedDelta: number;
  };
  bottlenecksResolved: {
    testReliability: string;
    antigravityTimeout: string;
    ambiguityHandling: string;
    devopsReliability: string;
  };
  roleImprovements: Record<EngineeringRole, { phase18Autonomy: number; phase19Autonomy: number; improved: boolean }>;
  difficultyImprovements: Record<TaskDifficulty, { phase18Autonomy: number; phase19Autonomy: number; improved: boolean }>;
  finalStatus: 'PASSED' | 'PARTIAL' | 'FAILED';
}
