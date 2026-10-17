// ==========================================================
// services/api/src/engineering/phase30/phase30.types.ts
// Phase 30.2: Authorized Production Execution & Release Registry Types (§1–§24)
// ==========================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AutonomyLevel =
  | 'LEVEL_0' // Observe / Analyze
  | 'LEVEL_1' // Safe Development Mutation (worktree isolated)
  | 'LEVEL_2' // Verified Engineering Execution (READY_FOR_DEPLOY)
  | 'LEVEL_3' // Human Approval Required (production deploy, schema migration, secrets)
  | 'LEVEL_4'; // Forbidden (destructive SQL, policy self-modification, kill switch bypass)

export type DeploymentEnvironment = 'LOCAL_DRY_RUN' | 'STAGING' | 'PRODUCTION';

export type ReleaseStatus =
  | 'DRAFT'
  | 'STAGED'
  | 'CANARY'
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'ROLLED_BACK'
  | 'FAILED';

export type TelemetryStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';

export type ExecutorOperation =
  | 'EXECUTE_DRY_RUN'
  | 'EXECUTE_STAGING_DEPLOY'
  | 'EXECUTE_CANARY_DEPLOY'
  | 'EXECUTE_PROMOTION'
  | 'EXECUTE_ROLLBACK'
  | 'VERIFY_TARGET_HEALTH';

export interface DeploymentTarget {
  targetId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: DeploymentEnvironment;
  cluster: string;
  isProduction: boolean;
  requiresHumanApproval: boolean;
  healthEndpoint: string;
  allowedOperations: ExecutorOperation[];
}

export interface ReleaseRecord {
  releaseId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: DeploymentEnvironment;
  version: string;
  commitSha: string;
  artifactDigestSha256: string;
  rollbackTargetReleaseId?: string;
  status: ReleaseStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ApprovalRecord {
  approvalId: string;
  releaseId: string;
  approverIdentity: string;
  approvedAt: string;
  expiresAt: string;
  targetEnvironment: DeploymentEnvironment;
  approvalToken: string;
  blastRadiusAcknowledged: string;
  isUsed: boolean;
}

export interface BenchmarkEnvelope {
  benchmarkId: string;
  approvedProject: 'SIMMACI' | 'ILMORA' | 'KDI';
  approvedService: string;
  approvedEnvironment: DeploymentEnvironment;
  approvedReleaseOrTaskScope: string[];
  approvedTimeWindow: {
    start: string;
    end: string;
  };
  maximumCanaryScopePct: number;
  maximumDeploymentCount: number;
  maximumRollbackCount: number;
  allowedAutonomyMode: 'BOUNDED_LOW_RISK_ONLY' | 'HUMAN_SUPERVISED_ONLY';
  rollbackTarget: string;
  killSwitchOwner: string;
  humanSignatureOrAuthToken: string;
  authorizedBy: string;
  createdAt: string;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  blastRadius: 'ISOLATED' | 'SERVICE' | 'PLATFORM';
  isDatabaseMigrationRequired: boolean;
  isSchemaBreaking: boolean;
  requiresHumanApproval: boolean;
  reasons: string[];
}

export interface PolicyEvaluation {
  allowed: boolean;
  autonomyLevel: AutonomyLevel;
  requiresHumanApproval: boolean;
  rejectionReason?: string;
  circuitBreakerOpen: boolean;
  rateLimitExceeded: boolean;
  budgetExhausted: boolean;
  killSwitchActive: boolean;
  evalTimestamp: string;
}

export interface TelemetryReading {
  targetId: string;
  status: TelemetryStatus;
  errorRatePct: number;
  p95LatencyMs: number;
  availabilityPct: number;
  timestamp: string;
  source: 'REAL_METRIC' | 'TEST_ADAPTER' | 'DRY_RUN';
  rawSignals?: Record<string, any>;
}

export interface AuditEvent {
  eventId: string;
  previousHash: string;
  hash: string;
  timestamp: string;
  phase: string;
  action: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: DeploymentEnvironment;
  releaseId?: string;
  actor: string;
  details: string;
  sanitized: boolean;
}

export interface ExecutionRequest {
  requestId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: DeploymentEnvironment;
  targetId: string;
  version: string;
  commitSha: string;
  artifactDigestSha256: string;
  rollbackTargetReleaseId?: string;
  changedFiles: string[];
  isDryRun: boolean;
  approvalToken?: string;
  benchmarkId?: string;
  callerIdentity: string;
}

export interface ExecutionResult {
  success: boolean;
  requestId: string;
  releaseId: string;
  targetId: string;
  finalState: ReleaseStatus;
  riskAssessment: RiskAssessment;
  policyEvaluation: PolicyEvaluation;
  telemetryObservation: TelemetryReading;
  executedOperation: ExecutorOperation;
  rollbackExecuted: boolean;
  rollbackReleaseId?: string;
  auditTrailEvents: string[];
  durationMs: number;
  errorMessage?: string;
}

// ==========================================================
// Phase 30.4: Evidence Classification, External Prerequisites & Readiness State Machine (§1–§14)
// ==========================================================

export type EvidenceTier =
  | 'SIMULATED'
  | 'LOCAL_TEST'
  | 'LOCAL_EXECUTION'
  | 'STAGING_LIVE'
  | 'PRODUCTION_LIVE';

export type ClaimType =
  | 'BUILD_REPRODUCIBILITY'
  | 'REGISTRY_ACCESSIBILITY'
  | 'TELEMETRY_FRESHNESS'
  | 'SLO_VERIFICATION'
  | 'APPROVAL_DELIVERY'
  | 'TARGET_CONNECTIVITY'
  | 'CANARY_DEPLOYMENT'
  | 'SERVICE_HEALTH'
  | 'SERVICE_ROLLBACK'
  | 'POLICY_ENFORCEMENT';

export interface EvidenceRecord {
  evidenceId: string;
  benchmarkId: string;
  claimType: ClaimType;
  evidenceTier: EvidenceTier;
  sourceSystem: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: DeploymentEnvironment;
  releaseId?: string;
  commitSha?: string;
  artifactDigest?: string;
  observedAt: string;
  correlationId: string;
  result: 'PASS' | 'FAIL' | 'BLOCKED' | 'INCONCLUSIVE';
  limitations: string[];
  verifiedPayload?: Record<string, any>;
}

export interface MaterialClaim {
  claimId: string;
  benchmarkId: string;
  claimType: ClaimType;
  targetEnvironment: DeploymentEnvironment;
  minimumEvidenceTier: EvidenceTier;
  targetReleaseId?: string;
  targetArtifactDigest?: string;
  requiredResult: 'PASS' | 'FAIL' | 'BLOCKED' | 'INCONCLUSIVE';
}

export interface ClaimValidationResult {
  valid: boolean;
  claimId: string;
  matchedEvidenceCount: number;
  evaluatedTier?: EvidenceTier;
  rejectionReasons: string[];
  validatedAt: string;
}

export type ReadinessState =
  | 'NOT_CONFIGURED'
  | 'BLOCKED'
  | 'CONFIGURED_UNVERIFIED'
  | 'VERIFIED_READ_ONLY'
  | 'READY_FOR_STAGING_VALIDATION'
  | 'STAGING_VALIDATION_PASSED'
  | 'STAGING_PILOT_AUTHORIZATION_REQUIRED'
  | 'STAGING_PILOT_PASSED'
  | 'READY_FOR_PRODUCTION_PILOT'
  | 'NO_GO';

export type BuildEnvironmentState =
  | 'NOT_INSTALLED'
  | 'NOT_IN_PATH'
  | 'DAEMON_UNREACHABLE'
  | 'CONFIGURED_UNVERIFIED'
  | 'VERIFIED';

export type PrerequisiteId =
  | 'B1_BUILD'
  | 'B2_REGISTRY'
  | 'B3_TELEMETRY'
  | 'B4_SLO'
  | 'B5_APPROVAL'
  | 'B6_TARGET';

export interface PrerequisiteCheckResult {
  id: PrerequisiteId;
  name: string;
  status: ReadinessState;
  evidenceTier: EvidenceTier;
  details: string;
  blockers: string[];
  rawPayload?: Record<string, any>;
  checkedAt: string;
}

export interface SignedSloThresholds {
  p95LatencyMaxMs: number;
  errorRateMaxPct: number;
  availabilityMinPct: number;
}

export interface SignedSloDocument {
  version: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: DeploymentEnvironment;
  validFrom: string;
  validUntil: string;
  thresholds: SignedSloThresholds;
  keyId: string;
  signature: string;
}

export interface ProductionReadinessReport {
  overallState: ReadinessState;
  timestamp: string;
  prerequisites: Record<PrerequisiteId, PrerequisiteCheckResult>;
  safetyInvariantsPass: boolean;
  productionMutationDisabled: boolean;
  unresolvedBlockers: string[];
  evaluatedEvidenceCount: number;
}

// ==========================================================
// Phase 30.6: Staging Environment Integration & Controlled Pilot Types (§1–§10)
// ==========================================================

export interface StagingPilotSpecification {
  pilotId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  environment: 'STAGING';
  targetId: string;
  candidateReleaseId: string;
  commitSha: string;
  artifactDigestSha256: string;
  rollbackBaselineReleaseId: string;
  sloVersion: string;
  maxReplicaCount: number;
  quotaLimit: number;
  healthGateCriteria: {
    maxErrorRatePct: number;
    maxP95LatencyMs: number;
    minAvailabilityPct: number;
  };
  authorizedBy?: string;
  authorizationToken?: string;
  authorizationWindow?: {
    validFrom: string;
    validUntil: string;
  };
  callerIdentity: string;
}

export interface StagingPilotResult {
  success: boolean;
  pilotId: string;
  releaseId: string;
  targetId: string;
  state: ReadinessState;
  deployedArtifactDigest: string;
  telemetryReading: TelemetryReading;
  healthPassed: boolean;
  rollbackTriggered: boolean;
  rollbackReleaseId?: string;
  auditTrail: string[];
  durationMs: number;
  errorMessage?: string;
}

export interface StagingReadinessReport {
  overallState: ReadinessState;
  timestamp: string;
  prerequisites: Record<PrerequisiteId, PrerequisiteCheckResult>;
  safetyInvariantsPass: boolean;
  stagingMutationAuthorized: boolean;
  unresolvedBlockers: string[];
  evaluatedEvidenceCount: number;
}


