// ==========================================================
// services/api/src/engineering/production-delivery/phase-26.types.ts
// Phase 26: Controlled Production Delivery & Rollback Gate Types (§1–§21)
// ==========================================================

export type DeliveryEnvironment = 'STAGING' | 'PRODUCTION';

export type DeliveryState =
  | 'READY_FOR_DEPLOY'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'PRECHECKING'
  | 'STAGING_DEPLOYING'
  | 'STAGING_VERIFYING'
  | 'STAGING_VERIFIED'
  | 'PRODUCTION_CANARY'
  | 'CANARY_VERIFYING'
  | 'ROLLING_OUT'
  | 'PRODUCTION_VERIFIED'
  | 'ROLLING_BACK'
  | 'ROLLBACK_VERIFYING'
  | 'RESTORED'
  | 'DEPLOYMENT_BLOCKED'
  | 'DEPLOYMENT_FAILED'
  | 'ROLLBACK_FAILED'
  | 'REQUIRES_HUMAN_REVIEW';

export type MigrationReversibility =
  | 'REVERSIBLE'
  | 'FORWARD_COMPATIBLE'
  | 'IRREVERSIBLE_WITH_RECOVERY_STRATEGY';

export interface ImmutableArtifactMetadata {
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  repository: string;
  commitSha: string;
  branch: string;
  buildIdentifier: string;
  artifactDigestSha256: string;
  artifactPath: string;
  buildTimestamp: string;
  sizeBytes: number;
}

export interface HumanApprovalRecord {
  approvalId: string;
  approverIdentity: string;
  approvedAt: string;
  targetEnvironment: DeliveryEnvironment;
  artifactDigestSha256: string;
  deploymentPlanSummary: string;
  rollbackTargetSha: string;
  approvalToken: string;
}

export interface PreDeployValidationResult {
  isValid: boolean;
  sourceCommitVerified: boolean;
  artifactDigestVerified: boolean;
  buildCompleted: boolean;
  requiredTestsPassed: boolean;
  typecheckBuildPassed: boolean;
  securityChecksPassed: boolean;
  environmentTargetValid: boolean;
  deploymentConfigValid: boolean;
  requiredSecretsPresent: boolean;
  databaseMigrationSafe: boolean;
  rollbackTargetExists: boolean;
  migrationType?: MigrationReversibility;
  blockReasons: string[];
}

export interface StagingVerificationResult {
  passed: boolean;
  serviceReachable: boolean;
  healthCheckPassed: boolean;
  smokeTestsPassed: number;
  smokeTestsTotal: number;
  regressionTestsPassed: number;
  details: string[];
}

export interface ProductionCanaryMetrics {
  canaryPercentage: number;
  canaryDurationMs: number;
  trafficScope: string;
  errorRatePct: number;
  p95LatencyMs: number;
  smokeTestsPassed: boolean;
  isHealthy: boolean;
  failureTrigger?: string;
}

export interface PostDeployVerificationResult {
  serviceReachable: boolean;
  healthCheckPassed: boolean;
  criticalEndpointSmokeTestsPassed: boolean;
  errorSignalAcceptable: boolean;
  databaseConnectionHealthy: boolean;
  databaseMigrationStateExpected: boolean;
  allChecksPassed: boolean;
  verificationDetails: string[];
}

export interface RollbackExecutionRecord {
  rollbackExecutionId: string;
  rollbackTargetCommit: string;
  rollbackTargetDigest: string;
  rollbackReason: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  postRollbackVerificationPassed: boolean;
  restoredVersion: string;
  finalState: 'RESTORED' | 'ROLLBACK_FAILED';
}

export interface ControlledDeliveryRecord {
  deploymentId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  environment: DeliveryEnvironment;
  artifact: ImmutableArtifactMetadata;
  approval?: HumanApprovalRecord;
  preDeployValidation: PreDeployValidationResult;
  stagingVerification?: StagingVerificationResult;
  canaryMetrics?: ProductionCanaryMetrics;
  postDeployVerification?: PostDeployVerificationResult;
  rollbackRecord?: RollbackExecutionRecord;
  currentActiveVersion: string;
  currentState: DeliveryState;
  startTime: string;
  endTime: string;
  durationMs: number;
  interruptedAndRecovered: boolean;
  statusTransitions: Array<{
    from: DeliveryState;
    to: DeliveryState;
    timestamp: string;
    reason?: string;
  }>;
  auditTrail: {
    whatWasDeployed: string;
    commitSha: string;
    artifactDigest: string;
    whoApproved: string;
    whereDeployed: string;
    healthChecksSummary: string;
    didRollbackOccur: boolean;
    activeVersionCurrently: string;
  };
}

export interface Phase26DeliveryScorecard {
  deliveries: ControlledDeliveryRecord[];
  totalDeliveries: number;
  successfulProductionDeliveries: number;
  verifiedStagingDeliveries: number;
  controlledRollbacks: number;
  blockedDeliveries: number;
  unauthorizedAttemptsBlocked: number;
  interruptedRecoveries: number;
  secretLeakageDetected: boolean;
  artifactImmutabilityVerified: boolean;
  humanProductionApprovalEnforced: boolean;
  performance: {
    avgPrecheckDurationMs: number;
    avgStagingDurationMs: number;
    avgStagingVerificationMs: number;
    avgApprovalToProdDurationMs: number;
    avgCanaryVerificationMs: number;
    avgRollbackDurationMs: number;
    avgPostRollbackVerificationMs: number;
  };
}
