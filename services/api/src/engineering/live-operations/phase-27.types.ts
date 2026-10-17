// ==========================================================
// services/api/src/engineering/live-operations/phase-27.types.ts
// Phase 27: Live Production Operations & Autonomous Incident Response Gate Types (§1–§28)
// ==========================================================

export type ActionRisk =
  | 'READ_ONLY'
  | 'LOW_RISK_AUTONOMOUS'
  | 'CONTROLLED_AUTONOMOUS'
  | 'HUMAN_APPROVAL_REQUIRED'
  | 'FORBIDDEN';

export type BlastRadiusClass =
  | 'SINGLE_PROCESS'
  | 'SINGLE_CONTAINER'
  | 'SINGLE_INSTANCE'
  | 'SINGLE_SERVICE'
  | 'SINGLE_PROJECT'
  | 'MULTI_SERVICE'
  | 'MULTI_PROJECT'
  | 'GLOBAL';

export type IncidentSeverity =
  | 'SEV-1' // Critical outage / severe operational impact
  | 'SEV-2' // Major degradation
  | 'SEV-3' // Degraded but functional
  | 'SEV-4'; // Minor / informational

export type DiagnosisConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNKNOWN';

export type IncidentState =
  | 'DETECTED'
  | 'CLASSIFYING'
  | 'DIAGNOSING'
  | 'POLICY_CHECKING'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RESOLVED'
  | 'RESTORED'
  | 'WAITING_FOR_HUMAN_APPROVAL'
  | 'POLICY_DENIED'
  | 'ESCALATED'
  | 'FAILED'
  | 'HEALTHY';

export interface ProductionActionRequest {
  incidentId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  environment: 'PRODUCTION';
  action: string;
  target: string;
  risk: ActionRisk;
  blastRadius: BlastRadiusClass;
  reversible: boolean;
  idempotent: boolean;
  rollbackAvailable: boolean;
  verificationPlan: string;
  requestedBy?: string;
  contextParams?: Record<string, any>;
}

export interface SafetyPolicyEvaluationResult {
  allowed: boolean;
  policyDecision: 'ALLOW_AUTONOMOUS' | 'REQUIRE_HUMAN_APPROVAL' | 'POLICY_DENIED';
  risk: ActionRisk;
  reasons: string[];
  preconditionsMet: boolean;
  unmetPreconditions: string[];
  blastRadiusAcceptable: boolean;
  killSwitchActive: boolean;
  evaluatedAt: string;
}

export interface BackupStatusSignal {
  lastSuccessfulBackupTimestamp: string;
  backupAgeHours: number;
  backupHealth: 'HEALTHY' | 'STALE' | 'FAILED';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
  restorePointAvailable: boolean;
}

export interface ProductionSignals {
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  serviceId: string;
  timestamp: string;
  availabilityPct: number;
  httpErrorRatePct: number;
  p95LatencyMs: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  diskUsagePct: number;
  processHealth: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  containerHealth: 'HEALTHY' | 'UNHEALTHY' | 'CRASH_LOOP';
  queueDepth: number;
  databaseConnectivity: 'CONNECTED' | 'DISCONNECTED' | 'POOL_EXHAUSTED';
  databaseErrorRatePct: number;
  deploymentStatus: 'SYNCED' | 'DRIFTED' | 'FAILED';
  activeVersion: string;
  certificateDaysRemaining: number;
  backupStatus: BackupStatusSignal;
}

export interface ProductionDriftReport {
  hasDrift: boolean;
  driftType?:
    | 'VERSION_MISMATCH'
    | 'CONFIGURATION_DRIFT'
    | 'UNEXPECTED_CONTAINER'
    | 'UNEXPECTED_PROCESS'
    | 'UNEXPECTED_ROUTE'
    | 'RESOURCE_CONFIG';
  expectedState: string;
  observedState: string;
  riskClass: ActionRisk;
  reconciliationPermitted: boolean;
  details: string;
}

export interface HumanEscalationPayload {
  escalationId: string;
  incidentId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  severity: IncidentSeverity;
  detectedSymptoms: string[];
  diagnosis: string;
  confidence: DiagnosisConfidence;
  actionsAlreadyAttempted: string[];
  actionsRemaining: string[];
  riskAssessment: string;
  blastRadius: BlastRadiusClass;
  recommendedAction: string;
  rollbackAvailability: boolean;
  relevantLogsAndMetrics: Record<string, any>;
  timestamp: string;
}

export interface IncidentAuditEntry {
  entryId: string;
  incidentId: string;
  timestamp: string;
  actor: string;
  eventType:
    | 'DETECT'
    | 'DIAGNOSE'
    | 'POLICY_EVALUATION'
    | 'ACTION_EXECUTED'
    | 'ACTION_REFUSED'
    | 'VERIFICATION'
    | 'ROLLBACK'
    | 'ESCALATION'
    | 'KILL_SWITCH_ENGAGED'
    | 'RESOLVED';
  details: string;
  whatWasDone?: string;
  whatWasRefused?: string;
  reason?: string;
}

export interface VerificationResult {
  verified: boolean;
  checksRun: string[];
  timestamp: string;
  metricsHealthy: boolean;
  details: string;
}

export interface IncidentRecord {
  incidentId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  detectedAt: string;
  resolvedAt?: string;
  severity: IncidentSeverity;
  symptoms: string[];
  signals: Partial<ProductionSignals>;
  diagnosis: string;
  confidence: DiagnosisConfidence;
  policyDecision?: SafetyPolicyEvaluationResult;
  actionsAttempted: string[];
  actionsRefused: string[];
  retryCount: number;
  maxRetries: number;
  currentState: IncidentState;
  isAutonomous: boolean;
  rollbackOccurred: boolean;
  restoredVersion?: string;
  escalationRecord?: HumanEscalationPayload;
  verificationResult?: VerificationResult;
  auditTrail: IncidentAuditEntry[];
}

export interface Phase27OperationsScorecard {
  incidentsObserved: number;
  incidentsAutoResolved: number;
  incidentsEscalated: number;
  unauthorizedActionsBlocked: number;
  forbiddenActionsBlocked: number;
  falseRemediations: number;
  unverifiedRemediations: number;
  rollbackSuccessRatePct: number;
  recoverySuccessRatePct: number;
  detectionAccuracyPct: number;
  diagnosisAccuracyPct: number;
  falsePositiveRatePct: number;
  falseNegativeRatePct: number;
  humanInterventionRatePct: number;
  mttdMs: number;
  mttrMs: number;
  secretLeaksDetected: boolean;
  killSwitchTestedAndPassed: boolean;
  incidents: IncidentRecord[];
}
