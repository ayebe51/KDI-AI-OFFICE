// ==========================================================
// services/api/src/engineering/operations-hardening/phase-28.types.ts
// Phase 28: Production Operations Hardening & Bounded Autonomy Types (§1–§27)
// ==========================================================

import type {
  ActionRisk,
  BlastRadiusClass,
  IncidentSeverity,
  DiagnosisConfidence,
  IncidentState,
  ProductionSignals,
  ProductionActionRequest,
  SafetyPolicyEvaluationResult,
  HumanEscalationPayload,
  IncidentAuditEntry,
  VerificationResult,
} from '../live-operations/phase-27.types.js';

export type {
  ActionRisk,
  BlastRadiusClass,
  IncidentSeverity,
  DiagnosisConfidence,
  IncidentState,
  ProductionSignals,
  ProductionActionRequest,
  SafetyPolicyEvaluationResult,
  HumanEscalationPayload,
  IncidentAuditEntry,
  VerificationResult,
};

// ── SLI / SLO Types (§4) ─────────────────────────────────────────────
export type SloStatus = 'MET' | 'AT_RISK' | 'BREACHED';

export interface ProductionServiceSli {
  sliId: string;
  serviceId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  indicatorName: string;
  targetThreshold: number;
  comparisonOperator: 'GTE' | 'LTE';
  measurementWindow: string; // e.g. "72h_rolling"
  currentValue: number;
  unit: '%' | 'ms' | 'count';
  sloStatus: SloStatus;
  errorBudgetRemainingPct: number;
}

export interface ProductionServiceSlo {
  serviceId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  indicators: ProductionServiceSli[];
  overallStatus: SloStatus;
}

// ── Circuit Breaker Types (§10) ──────────────────────────────────────
export type CircuitBreakerScope =
  | 'SINGLE_ACTION'
  | 'SINGLE_SERVICE'
  | 'SINGLE_PROJECT'
  | 'GLOBAL';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerRecord {
  scope: CircuitBreakerScope;
  target: string;
  state: CircuitBreakerState;
  failureCount: number;
  failureThreshold: number;
  openedAt?: string;
  cooldownExpiresAt?: string;
  reason?: string;
}

// ── Rate Limiting & Cooldown Types (§8, §9) ──────────────────────────
export interface RateLimitPolicy {
  maxRestartsPerServiceWindow: number; // e.g. 3 per 24h
  maxRollbacksPerProjectWindow: number; // e.g. 2 per 24h
  maxAutonomousActionsPerIncident: number; // e.g. 2
  maxTotalAutonomousMutationsPerHour: number; // e.g. 5
  cooldownPeriodMs: number; // e.g. 2000ms
}

export interface RateLimitStatus {
  actionAllowed: boolean;
  reason?: string;
  currentRestartsInWindow: number;
  currentRollbacksInWindow: number;
  currentHourlyMutations: number;
  inCooldown: boolean;
  cooldownRemainingMs: number;
}

// ── Autonomy Budget Types (§17) ──────────────────────────────────────
export interface AutonomyBudgetStatus {
  totalBudget: number;
  consumedBudget: number;
  remainingBudget: number;
  budgetExhausted: boolean;
  recentCostEntries: Array<{
    action: string;
    target: string;
    cost: number;
    timestamp: string;
  }>;
}

// ── Policy Governance Types (§16) ────────────────────────────────────
export interface PolicyVersionRecord {
  policyVersion: string;
  effectiveAt: string;
  approvedBy: string;
  changeReason: string;
  previousVersion: string;
  isHumanApproved: boolean;
  negativeTestSuitePassed: boolean;
}

// ── Post-Incident Learning Types (§20) ───────────────────────────────
export type IncidentPatternClass =
  | 'KNOWN_PATTERN'
  | 'NEW_PATTERN'
  | 'POLICY_GAP'
  | 'MONITORING_GAP'
  | 'DIAGNOSIS_GAP'
  | 'REMEDIATION_GAP';

export interface IncidentLearningRecord {
  incidentId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  patternClass: IncidentPatternClass;
  signalsObserved: Partial<ProductionSignals>;
  diagnosis: string;
  actionTaken: string;
  result: string;
  rootCauseKnown: string;
  durationMs: number;
  policyDecision: string;
  recommendedPolicyAction?: string;
  promotedToAutonomous: boolean; // Must remain false without human approval (§20)
  createdAt: string;
}

// ── Backup & Restore Verification Types (§12) ────────────────────────
export interface BackupRestoreValidationResult {
  backupFreshnessHours: number;
  backupCompletenessVerified: boolean;
  backupIntegrityChecksumValid: boolean;
  restorePointAvailable: boolean;
  lastVerifiedRestorePoint: string;
  rpoObservedMinutes: number;
  rtoObservedMinutes: number;
  sandboxRestoreSuccessful: boolean;
  verificationEnvironment: 'ISOLATED_RECOVERY_SANDBOX';
  testedAt: string;
}

// ── Hardened Operational Incident Record (§5, §6, §7) ────────────────
export interface HardenedOperationalIncident {
  incidentId: string;
  alertFingerprint: string;
  correlatedAlertIds: string[];
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  incidentOnsetTimestamp: string;
  observedTimestamp: string;
  acknowledgedTimestamp: string;
  actionStartedTimestamp?: string;
  restoredTimestamp?: string;
  resolvedAt?: string;

  // Real operational timings (§5)
  realMttdMs: number;
  realMttaMs: number;
  realMttrMs: number;
  policyEvaluationLatencyMs: number;
  policyRemediationLatencyMs: number;

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
  circuitBreakerTripped?: boolean;
  rateLimitExceeded?: boolean;
  budgetExhausted?: boolean;
  escalationRecord?: HumanEscalationPayload;
  verificationResult?: VerificationResult;
  learningRecord?: IncidentLearningRecord;
  auditTrail: IncidentAuditEntry[];
}

// ── Change Failure Rate Types (§18) ──────────────────────────────────
export interface ChangeFailureRateMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  rollbackDeployments: number;
  incidentCausingDeployments: number;
  changeFailureRatePct: number;
  causalityAttribution: {
    kdiCaused: number;
    externalCaused: number;
    unknownCausality: number;
  };
}

// ── Phase 28 Hardened Operations Scorecard (§26, §27) ────────────────
export interface Phase28HardenedScorecard {
  observationWindow: {
    start: string;
    end: string;
    durationHours: number;
  };
  totalIncidentsObserved: number;
  correlatedIncidents: number;
  duplicateAlertsSuppressed: number;
  incidentsAutoResolved: number;
  incidentsEscalated: number;
  forbiddenActionsBlocked: number;
  unauthorizedActionsBlocked: number;
  adversarialAttacksBlocked: number;
  agentPolicyModificationsBlocked: number;
  infiniteRetriesPrevented: number;
  circuitBreakerActivations: number;
  rateLimitEnforcements: number;
  budgetDepletionsEnforced: number;
  rollbackSuccessRatePct: number;
  recoverySuccessRatePct: number;
  detectionAccuracyPct: number;
  diagnosisAccuracyPct: number;
  falsePositiveRatePct: number;
  falseNegativeRatePct: number;
  humanInterventionRatePct: number;

  // Operational Timings (§5)
  realAvgMttdMs: number;
  realAvgMttaMs: number;
  realAvgMttrMs: number;
  avgPolicyEvaluationLatencyMs: number;
  avgPolicyRemediationLatencyMs: number;

  secretLeaksDetected: boolean;
  killSwitchSurvivesRestart: boolean;
  killSwitchAgentBypassBlocked: boolean;
  changeFailureMetrics: ChangeFailureRateMetrics;
  slos: ProductionServiceSlo[];
  backupValidation: BackupRestoreValidationResult;
  policyGovernance: {
    currentVersion: string;
    agentSelfModificationBlocked: boolean;
    humanApprovalEnforced: boolean;
  };
  incidents: HardenedOperationalIncident[];
}
