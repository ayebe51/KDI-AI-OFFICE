// ==========================================================
// services/api/src/engineering/operational-gate/phase-24.types.ts
// Phase 24: Real Work Reliability & Pre-Production Operational Gate Types (§1–§15)
// ==========================================================

export type RealTaskProject = 'SIMMACI' | 'ILMORA' | 'KDI';

export type RealTaskType =
  | 'BUG_FIX'
  | 'FEATURE'
  | 'REFACTOR'
  | 'SECURITY_HARDENING'
  | 'REGRESSION_FIX'
  | 'CODE_QUALITY';

export type RealTaskDomain =
  | 'BACKEND'
  | 'FRONTEND'
  | 'QA'
  | 'SECURITY'
  | 'DEVOPS'
  | 'FULLSTACK';

export interface RealEngineeringTask {
  taskId: string;
  project: RealTaskProject;
  repository: string;
  title: string;
  description: string;
  taskType: RealTaskType;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  domain: RealTaskDomain;
  targetBranch: string;
  assignedAgent: string;
  acceptanceCriteria: string[];
  expectedFiles: string[];
  testFiles: string[];
  justification: string;
}

export interface DefinitionOfDoneChecklist {
  implementationCompleted: boolean;
  requiredTestsPassed: boolean;
  typecheckBuildPassed: boolean;
  acceptanceCriteriaVerified: boolean;
  worktreeStateValid: boolean;
  noUnresolvedBlockers: boolean;
  isReadyForDeploy: boolean;
  failureReasons?: string[];
}

export type FailureInjectionType =
  | 'AGENT_PROCESS_FAILURE'
  | 'TEST_FAILURE'
  | 'TIMEOUT'
  | 'EXECUTION_STATE_FAILURE'
  | 'STALE_LOCK'
  | 'DUPLICATE_REQUEST'
  | 'NONE';

export interface TaskExecutionRecord {
  taskId: string;
  project: RealTaskProject;
  repository: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  assignedAgent: string;
  worktree: string;
  executionId: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  attemptCount: number;
  testResult: {
    run: number;
    passed: number;
    failed: number;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
  };
  verificationResult: {
    passed: boolean;
    verifiedCriteria: string[];
    details: string;
  };
  definitionOfDone: DefinitionOfDoneChecklist;
  finalStatus: 'READY_FOR_DEPLOY' | 'NOT_READY' | 'REPAIR' | 'FAILED';
  humanInterventionCount: number;
  humanInterventionReasons: string[];
  statusTransitions: Array<{
    from: string;
    to: string;
    timestamp: string;
  }>;
  auditTrail: {
    whatWasWorkedOn: string;
    whoWorkedOnIt: string;
    worktreeUsed: string;
    failuresEncountered: string[];
    failureReasons: string[];
    repairAttempts: number;
    recoveryActionsTaken: string[];
    whyReadyForDeploy: string;
  };
}

export interface FailureRecoveryRecord {
  failureType: FailureInjectionType;
  detected: boolean;
  detectionMechanism: string;
  recoveryAction: string;
  statePreserved: boolean;
  manualInterventionRequired: boolean;
  result: 'RECOVERED_TO_READY_FOR_DEPLOY' | 'FAILED';
}

export interface RestartValidationRecord {
  scenario: string;
  statePreserved: boolean;
  taskResumed: boolean;
  finalVerification: boolean;
  result: 'PASS' | 'FAIL';
}

export interface IdempotencyValidationRecord {
  operation: string;
  initialState: string;
  repeatedOperation: string;
  finalState: string;
  result: 'PASS' | 'FAIL';
}

export interface ConcurrencyValidationRecord {
  concurrentTasks: number;
  maxConcurrency: number;
  resourceBehavior: string;
  isolationResult: 'ISOLATED' | 'LEAKED';
  failures: number;
}

export interface Phase24MetricsScorecard {
  totalTasks: number;
  autonomousTasks: number;
  tasksRequiringIntervention: number;
  averageIntervention: number;
  repairSuccessRatePct: number;
  recoverySuccessRatePct: number;
  verificationSuccessRatePct: number;
  productionDeploymentPerformed: boolean;
  taskRecords: TaskExecutionRecord[];
  failureRecoveries: FailureRecoveryRecord[];
  restartValidations: RestartValidationRecord[];
  idempotencyValidations: IdempotencyValidationRecord[];
  concurrencyValidations: ConcurrencyValidationRecord[];
  performanceComparison: {
    phase23MachineCycleMs: number;
    phase24MachineCycleMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    regressionDetected: boolean;
  };
}
