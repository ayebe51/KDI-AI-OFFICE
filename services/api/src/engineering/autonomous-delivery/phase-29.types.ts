// ==========================================================
// services/api/src/engineering/autonomous-delivery/phase-29.types.ts
// Phase 29: Real Autonomous Software Delivery Benchmark Types (§1–§37)
// ==========================================================

export type AutonomyLevel =
  | 'LEVEL_0' // Observe / Analyze
  | 'LEVEL_1' // Safe Development Mutation (worktree isolated)
  | 'LEVEL_2' // Verified Engineering Execution (READY_FOR_DEPLOY)
  | 'LEVEL_3' // Human Approval Required (production deploy, schema migration, secrets)
  | 'LEVEL_4'; // Forbidden (destructive SQL, policy self-modification, kill switch bypass)

export type EngineeringRole =
  | 'BACKEND_ENGINEER'
  | 'FRONTEND_ENGINEER'
  | 'QA_ENGINEER'
  | 'SECURITY_ENGINEER'
  | 'DEVOPS_ENGINEER'
  | 'ORCHESTRATOR';

export type DeliveryWorkflowState =
  | 'INTAKE'
  | 'CLASSIFIED'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'WORKSPACE_PREPARING'
  | 'WORKSPACE_PREPARED'
  | 'IMPLEMENTING'
  | 'TESTING'
  | 'REPAIRING'
  | 'RE_TESTING'
  | 'VALIDATING'
  | 'READY_FOR_DEPLOY'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'DEPLOYING'
  | 'VERIFYING_PRODUCTION'
  | 'COMPLETED'
  | 'ROLLING_BACK'
  | 'RESTORED'
  | 'ESCALATED'
  | 'BLOCKED'
  | 'FAILED';

export type TaskOutcome =
  | 'AUTONOMOUSLY_COMPLETED'
  | 'COMPLETED_WITH_HUMAN_APPROVAL'
  | 'ESCALATED'
  | 'BLOCKED'
  | 'FAILED'
  | 'ROLLED_BACK';

export type HumanInterventionType =
  | 'REQUIRED_BY_POLICY'
  | 'UNEXPECTED'
  | 'CLARIFICATION'
  | 'RECOVERY'
  | 'APPROVAL'
  | 'OUT_OF_SCOPE';

export type TaskRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskType =
  | 'BUG_FIX'
  | 'SECURITY_HARDENING'
  | 'PERFORMANCE_OPTIMIZATION'
  | 'FEATURE_ENHANCEMENT'
  | 'REFACTORING'
  | 'REGRESSION_FIX';

export type DeploymentRequirement = 'NONE' | 'STAGING_ONLY' | 'LIVE_PRODUCTION';

export interface RealEngineeringTask {
  taskId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  source: string;
  problem_statement: string;
  acceptance_conditions: string[];
  risk_level: TaskRiskLevel;
  task_type: TaskType;
  expected_change_scope: string[];
  validation_method: string[];
  deployment_requirement: DeploymentRequirement;
  targetBranch: string;
  assignedRole: EngineeringRole;
  agentName: string;
  testFiles: string[];
  expectedFiles: string[];
  fileImplementations?: Record<string, string>;
  testImplementations?: Record<string, string>;
  simulatedFaultOnFirstTest?: {
    failureReason: string;
    rootCause: string;
    repairPatchDescription: string;
  };
  simulatedProductionFailure?: {
    metric: string;
    threshold: string;
    observedValue: string;
    failureReason: string;
  };
  isNegativeSafetyTest?: boolean;
  forbiddenActionType?:
    | 'DESTRUCTIVE_SQL'
    | 'POLICY_MODIFICATION'
    | 'SECRET_EXFILTRATION'
    | 'APPROVAL_BYPASS'
    | 'CROSS_PROJECT_MUTATION'
    | 'EXCESSIVE_RETRY'
    | 'FORBIDDEN_PROD_MUTATION';
  hostilePayload?: string;
}

export interface TaskIntakeRecord {
  taskId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  receivedAt: string;
  problemSummary: string;
  riskClassification: TaskRiskLevel;
  affectedComponents: string[];
}

export interface TaskClassificationRecord {
  taskType: TaskType;
  riskLevel: TaskRiskLevel;
  autonomyLevel: AutonomyLevel;
  blastRadius: 'ISOLATED' | 'SERVICE' | 'PLATFORM';
  deploymentRequired: boolean;
}

export interface WorkPlanRecord {
  strategy: string;
  filesLikelyAffected: string[];
  testsRequired: string[];
  risks: string[];
  rollbackStrategy: string;
  deploymentImplications: string;
}

export interface WorktreeAllocationRecord {
  worktreeId: string;
  worktreePath: string;
  baseCommit: string;
  targetBranch: string;
  allocatedAt: string;
  cleanVerified: boolean;
}

export interface RepairAttemptRecord {
  attemptNumber: number;
  failureCategory: string;
  rootCause: string;
  repairAction: string;
  retestPassed: boolean;
  durationMs: number;
}

export interface ValidationGateResult {
  unitTests: { passed: boolean; runCount: number; passedCount: number };
  integrationTests: { passed: boolean; runCount: number; passedCount: number };
  regressionTests: { passed: boolean; runCount: number; passedCount: number };
  typecheckPassed: boolean;
  lintPassed: boolean;
  securityChecksPassed: boolean;
  secretsScannedClean: boolean;
  policyChecksPassed: boolean;
  allGatesPassed: boolean;
}

export interface HumanInterventionRecord {
  interventionId: string;
  type: HumanInterventionType;
  reason: string;
  timestamp: string;
  approverIdentity?: string;
  decisionContext?: string;
}

export interface HumanApprovalRecord {
  approvalId: string;
  approverIdentity: string;
  approvedAt: string;
  targetEnvironment: 'PRODUCTION' | 'STAGING';
  artifactDigestSha256: string;
  approvalToken: string;
  deploymentPlanSummary: string;
  rollbackTargetSha: string;
  blastRadiusAcknowledged: string;
}

export interface PostDeployVerificationRecord {
  serviceReachable: boolean;
  healthCheckPassed: boolean;
  smokeTestsPassed: boolean;
  errorRatePct: number;
  p95LatencyMs: number;
  databaseConnected: boolean;
  verifiedAt: string;
  isHealthy: boolean;
  failureReason?: string;
}

export interface RollbackRecord {
  triggeredAt: string;
  triggerReason: string;
  targetVersion: string;
  restoredAt: string;
  postRollbackHealthVerified: boolean;
  success: boolean;
  durationMs: number;
}

export interface TaskExecutionRecord {
  executionId: string;
  taskId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  agent: string;
  assignedRole: EngineeringRole;
  autonomyLevel: AutonomyLevel;
  startTime: string;
  endTime: string;
  durationMs: number;
  worktree: WorktreeAllocationRecord;
  intake: TaskIntakeRecord;
  classification: TaskClassificationRecord;
  plan: WorkPlanRecord;
  finalCommit: string;
  statusTransitions: Array<{ from: DeliveryWorkflowState; to: DeliveryWorkflowState; timestamp: string }>;
  repairAttempts: number;
  repairHistory: RepairAttemptRecord[];
  validation: ValidationGateResult;
  readyForDeployReached: boolean;
  readyForDeployTimestamp?: string;
  humanInterventions: HumanInterventionRecord[];
  humanApprovalRecord?: HumanApprovalRecord;
  deploymentRecord?: {
    targetEnvironment: 'PRODUCTION' | 'STAGING';
    artifactDigestSha256: string;
    deploymentStrategy: 'CANARY' | 'ROLLING';
    deployedAt: string;
    activeVersion: string;
    rollbackTargetVersion: string;
  };
  postDeployVerification?: PostDeployVerificationRecord;
  rollbackRecord?: RollbackRecord;
  finalStatus: TaskOutcome;
  auditTrail: Array<{
    step: string;
    message: string;
    timestamp: string;
  }>;
  evidence: {
    worktreeVerified: boolean;
    testEvidence: string;
    securityEvidence: string;
    policyEvidence: string;
    approvalEvidence: string;
    deploymentEvidence: string;
    postDeployEvidence: string;
  };
}

export interface Phase29Scorecard {
  benchmarkWindow: {
    start: string;
    end: string;
    durationMs: number;
  };
  totalTasks: number;
  completedTasks: number;
  autonomousCompletions: number;
  humanApprovedCompletions: number;
  escalatedTasks: number;
  blockedTasks: number;
  failedTasks: number;
  rolledBackTasks: number;
  autonomousCompletionRatePct: number;
  humanInterventionRatePct: number;
  unexpectedInterventionRatePct: number;
  firstPassSuccessRatePct: number;
  meanTimeToCompleteMs: number;
  meanRepairAttempts: number;
  testPassRatePct: number;
  regressionRatePct: number;
  securityViolationCount: number;
  policyViolationCount: number;
  policyDenialRatePct: number;
  readyForDeployAccuracyPct: number;
  deploymentSuccessRatePct: number;
  postDeployFailureRatePct: number;
  rollbackRatePct: number;
  productionIncidentRatePct: number;
  safetyBaseline: {
    policyBypassCount: number;
    forbiddenActionCount: number;
    unauthorizedMutationCount: number;
    secretLeakCount: number;
    promptInjectionEscapeCount: number;
    privilegeEscalationCount: number;
    killSwitchBypassCount: number;
    infiniteRetryCount: number;
    circuitBreakerFailureCount: number;
    crossProjectContaminationCount: number;
  };
  productionMetrics: {
    productionDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    rollbacksExecuted: number;
    deploymentCausedIncidents: number;
    productionIncidents: number;
  };
  taskBreakdown: {
    simmaciCount: number;
    ilmoraCount: number;
    kdiCount: number;
  };
  taskRecords: TaskExecutionRecord[];
}
