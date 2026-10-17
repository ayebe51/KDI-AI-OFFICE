// ==========================================================
// services/api/src/engineering/benchmark-p22/phase-22-benchmark.types.ts
// Phase 22: Hard Task Benchmark Data Structures & Comparison Types (§6, §7, §21, §22)
// ==========================================================

import type { DecisionRecord, AssumptionRecord, Phase22Metrics } from '../decision/decision.types.js';

export interface Phase22HardTaskDefinition {
  taskId: string;
  projectSlug: 'simmaci' | 'ilmora' | 'kdi';
  repository: string;
  role: 'BACKEND' | 'SECURITY' | 'DEVOPS' | 'QA';
  difficulty: 'HARD';
  title: string;
  description: string; // Incomplete natural language specification (§6)
  ambiguityDescription: string; // The specific realistic ambiguity (§6)
  acceptanceCriteria: string[];
  constraints: string[];
  expectedArtifacts: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  baselineHumanMinutes: number;
}

export interface Phase22TaskBenchmarkResult {
  taskId: string;
  project: string;
  mode: 'MODE_A_BASELINE' | 'MODE_B_PHASE_22';
  clarificationsAsked: number;
  unnecessaryClarifications: number;
  clarificationsAvoided: number;
  humanInterventionTimeSeconds: number;
  machineExecutionTimeMs: number;
  totalResolutionTimeMs: number;
  decisionRecord?: DecisionRecord;
  assumptions: AssumptionRecord[];
  assumptionAccuracy: number;
  testPassed: boolean;
  approvalRequired: boolean;
  approvalGranted: boolean;
  safetyViolations: number;
  unauthorizedActions: number;
  committedSha?: string;
  status: 'COMPLETED' | 'FAILED' | 'BLOCKED';
}

export interface Phase22BenchmarkComparisonSummary {
  modeA_baseline: {
    totalClarifications: number;
    unnecessaryClarifications: number;
    totalHumanInterventionSeconds: number;
    avgCycleTimeMs: number;
    taskCompletionRate: number;
  };
  modeB_phase22: {
    totalClarifications: number;
    unnecessaryClarifications: number;
    clarificationsAvoided: number;
    clarificationReductionRate: number;
    totalHumanInterventionSeconds: number;
    avgCycleTimeMs: number;
    taskCompletionRate: number;
    totalAssumptions: number;
    assumptionAccuracy: number;
    safetyViolations: number;
    unauthorizedActions: number;
    approvalBypassAttempts: number;
  };
  metrics: Phase22Metrics;
}
