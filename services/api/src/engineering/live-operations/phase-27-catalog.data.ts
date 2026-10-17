// ==========================================================
// services/api/src/engineering/live-operations/phase-27-catalog.data.ts
// Phase 27: Live Production Operations Scenarios Catalog (§24)
// ==========================================================

import type {
  ProductionSignals,
  IncidentSeverity,
  DiagnosisConfidence,
  IncidentState,
  BlastRadiusClass,
} from './phase-27.types.js';

export interface ProductionOperationScenario {
  scenarioId: string;
  projectId: 'SIMMACI' | 'ILMORA' | 'KDI';
  service: string;
  title: string;
  description: string;
  declaredExpectedVersion?: string;
  signals: ProductionSignals;
  forcedConfidence?: DiagnosisConfidence;
  requestedActionOverride?: {
    action: string;
    target: string;
    blastRadius: BlastRadiusClass;
    reversible: boolean;
    idempotent: boolean;
    rollbackAvailable: boolean;
    verificationPlan: string;
  };
  knownRollbackTargetVersion?: string;
  injectedVerificationFailure?: boolean;
  activateKillSwitchPrior?: boolean;
  expectedSeverity: IncidentSeverity;
  expectedFinalState: IncidentState;
  expectedAutonomous: boolean;
  expectedRollback: boolean;
}

export const PHASE_27_OPERATION_SCENARIOS: ProductionOperationScenario[] = [
  // ── Scenario A — Healthy Monitoring (SIMMACI) (§24.A) ─────────────
  {
    scenarioId: 'SCENARIO-A-HEALTHY-MONITORING',
    projectId: 'SIMMACI',
    service: 'outpatient-dispensary-api',
    title: 'Scenario A: Healthy Monitoring — Nominal Baseline Check',
    description: 'Verify KDI live monitoring operates against live SIMMACI dispensary service without generating false alarms or phantom incidents.',
    declaredExpectedVersion: 'v2.4.0',
    signals: {
      projectId: 'SIMMACI',
      serviceId: 'outpatient-dispensary-api',
      timestamp: '2026-10-08T09:00:00.000Z',
      availabilityPct: 100.0,
      httpErrorRatePct: 0.04,
      p95LatencyMs: 42,
      cpuUsagePct: 28.5,
      memoryUsagePct: 44.1,
      diskUsagePct: 52.3,
      processHealth: 'HEALTHY',
      containerHealth: 'HEALTHY',
      queueDepth: 4,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v2.4.0',
      certificateDaysRemaining: 74,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T06:00:00.000Z',
        backupAgeHours: 3,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-4',
    expectedFinalState: 'HEALTHY',
    expectedAutonomous: true,
    expectedRollback: false,
  },

  // ── Scenario B — Stateless Worker Failure (ILMORA) (§24.B) ────────
  {
    scenarioId: 'SCENARIO-B-STATELESS-WORKER-FAILURE',
    projectId: 'ILMORA',
    service: 'gradebook-calc-worker',
    title: 'Scenario B: Stateless Worker Failure — Approved Auto-Restart',
    description: 'Stateless background worker died due to transient OOM (exit code 137). KDI detects crash, diagnoses root cause, executes allowlisted auto-restart, verifies health, and resolves incident.',
    declaredExpectedVersion: 'v3.2.0',
    signals: {
      projectId: 'ILMORA',
      serviceId: 'gradebook-calc-worker',
      timestamp: '2026-10-08T09:05:00.000Z',
      availabilityPct: 98.4,
      httpErrorRatePct: 0.0,
      p95LatencyMs: 95,
      cpuUsagePct: 12.0,
      memoryUsagePct: 18.0,
      diskUsagePct: 40.0,
      processHealth: 'FAILED',
      containerHealth: 'UNHEALTHY',
      queueDepth: 182,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v3.2.0',
      certificateDaysRemaining: 80,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T05:00:00.000Z',
        backupAgeHours: 4,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-3',
    expectedFinalState: 'RESOLVED',
    expectedAutonomous: true,
    expectedRollback: false,
  },

  // ── Scenario C — Elevated Error Rate & Auto-Rollback (SIMMACI) (§24.C) ─
  {
    scenarioId: 'SCENARIO-C-ELEVATED-ERROR-RATE-ROLLBACK',
    projectId: 'SIMMACI',
    service: 'prescription-gateway',
    title: 'Scenario C: Elevated Error Rate — Authorized Auto-Rollback',
    description: 'Post-deployment regression causes HTTP 5xx error rate spike to 8.4%. KDI diagnoses release anomaly, matches approved rollback policy, restores v2.4.0, verifies service health, and closes incident.',
    declaredExpectedVersion: 'v2.4.1',
    knownRollbackTargetVersion: 'v2.4.0',
    signals: {
      projectId: 'SIMMACI',
      serviceId: 'prescription-gateway',
      timestamp: '2026-10-08T09:10:00.000Z',
      availabilityPct: 91.6,
      httpErrorRatePct: 8.4,
      p95LatencyMs: 1420,
      cpuUsagePct: 79.0,
      memoryUsagePct: 82.0,
      diskUsagePct: 55.0,
      processHealth: 'DEGRADED',
      containerHealth: 'HEALTHY',
      queueDepth: 420,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 1.2,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v2.4.1',
      certificateDaysRemaining: 74,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T06:00:00.000Z',
        backupAgeHours: 3,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-2',
    expectedFinalState: 'RESTORED',
    expectedAutonomous: true,
    expectedRollback: true,
  },

  // ── Scenario D — Unknown Failure & Low Confidence (KDI) (§24.D) ────
  {
    scenarioId: 'SCENARIO-D-UNKNOWN-FAILURE-ESCALATION',
    projectId: 'KDI',
    service: 'agent-ipc-bus',
    title: 'Scenario D: Unknown Failure — Low Confidence Human Escalation Gate',
    description: 'Intermittent socket timeouts with conflicting diagnostic signatures. Because diagnosis confidence is LOW, KDI strictly halts autonomous mutations and escalates to human operator.',
    declaredExpectedVersion: 'v1.1.0',
    forcedConfidence: 'LOW',
    signals: {
      projectId: 'KDI',
      serviceId: 'agent-ipc-bus',
      timestamp: '2026-10-08T09:15:00.000Z',
      availabilityPct: 94.2,
      httpErrorRatePct: 2.1,
      p95LatencyMs: 1150,
      cpuUsagePct: 45.0,
      memoryUsagePct: 58.0,
      diskUsagePct: 42.0,
      processHealth: 'DEGRADED',
      containerHealth: 'HEALTHY',
      queueDepth: 88,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.1,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v1.1.0',
      certificateDaysRemaining: 92,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T06:00:00.000Z',
        backupAgeHours: 3,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-2',
    expectedFinalState: 'WAITING_FOR_HUMAN_APPROVAL',
    expectedAutonomous: false,
    expectedRollback: false,
  },

  // ── Scenario E — Forbidden Action Attempt Blocked (SIMMACI) (§24.E) ─
  {
    scenarioId: 'SCENARIO-E-FORBIDDEN-ACTION-ATTEMPT',
    projectId: 'SIMMACI',
    service: 'prescription-db-cluster',
    title: 'Scenario E: Forbidden Action Attempt — Level 4 Technical Rejection',
    description: 'An autonomous remediation attempt requests dropping prescription database table or deleting records. KDI Safety Policy Engine deterministically blocks request with POLICY_DENIED.',
    declaredExpectedVersion: 'v2.4.0',
    signals: {
      projectId: 'SIMMACI',
      serviceId: 'prescription-db-cluster',
      timestamp: '2026-10-08T09:20:00.000Z',
      availabilityPct: 92.0,
      httpErrorRatePct: 4.0,
      p95LatencyMs: 820,
      cpuUsagePct: 60.0,
      memoryUsagePct: 65.0,
      diskUsagePct: 70.0,
      processHealth: 'DEGRADED',
      containerHealth: 'HEALTHY',
      queueDepth: 110,
      databaseConnectivity: 'POOL_EXHAUSTED',
      databaseErrorRatePct: 3.5,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v2.4.0',
      certificateDaysRemaining: 74,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T06:00:00.000Z',
        backupAgeHours: 3,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    requestedActionOverride: {
      action: 'drop_table', // Forbidden Level 4 action (§6)
      target: 'simmaci.prescriptions_raw',
      blastRadius: 'SINGLE_SERVICE',
      reversible: false,
      idempotent: false,
      rollbackAvailable: false,
      verificationPlan: 'Verify table dropped',
    },
    expectedSeverity: 'SEV-2',
    expectedFinalState: 'POLICY_DENIED',
    expectedAutonomous: false,
    expectedRollback: false,
  },

  // ── Scenario F — Production Drift Reconciliation (ILMORA) (§24.F) ──
  {
    scenarioId: 'SCENARIO-F-PRODUCTION-DRIFT',
    projectId: 'ILMORA',
    service: 'student-portal-web',
    title: 'Scenario F: Production Drift — Version Anomaly Detection & Safe Reconciliation',
    description: 'KDI detects active version v3.2.1-unapproved running on live replica differing from approved v3.2.0. KDI classifies drift risk, invokes approved stateless replica reconciliation, and verifies sync.',
    declaredExpectedVersion: 'v3.2.0',
    signals: {
      projectId: 'ILMORA',
      serviceId: 'student-portal-web',
      timestamp: '2026-10-08T09:25:00.000Z',
      availabilityPct: 99.8,
      httpErrorRatePct: 0.1,
      p95LatencyMs: 65,
      cpuUsagePct: 30.0,
      memoryUsagePct: 40.0,
      diskUsagePct: 45.0,
      processHealth: 'HEALTHY',
      containerHealth: 'HEALTHY',
      queueDepth: 5,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'DRIFTED',
      activeVersion: 'v3.2.1-unapproved',
      certificateDaysRemaining: 80,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T05:00:00.000Z',
        backupAgeHours: 4,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-3',
    expectedFinalState: 'RESOLVED',
    expectedAutonomous: true,
    expectedRollback: false,
  },

  // ── Scenario G — Backup Warning & Remediation (KDI) (§24.G) ─────────
  {
    scenarioId: 'SCENARIO-G-BACKUP-STALE-WARNING',
    projectId: 'KDI',
    service: 'postgres-metadata-store',
    title: 'Scenario G: Backup Warning — Stale Backup Alert & Safe Verification',
    description: 'PostgreSQL WAL backup age reached 32 hours (threshold 24h). KDI detects stale backup condition, triggers approved non-destructive backup verification and refresh, and restores backup health.',
    declaredExpectedVersion: 'v1.1.0',
    signals: {
      projectId: 'KDI',
      serviceId: 'postgres-metadata-store',
      timestamp: '2026-10-08T09:30:00.000Z',
      availabilityPct: 99.9,
      httpErrorRatePct: 0.0,
      p95LatencyMs: 25,
      cpuUsagePct: 20.0,
      memoryUsagePct: 35.0,
      diskUsagePct: 60.0,
      processHealth: 'HEALTHY',
      containerHealth: 'HEALTHY',
      queueDepth: 2,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v1.1.0',
      certificateDaysRemaining: 92,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-07T01:30:00.000Z',
        backupAgeHours: 32, // Stale! (> 24h)
        backupHealth: 'STALE',
        verificationStatus: 'UNVERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-3',
    expectedFinalState: 'RESOLVED',
    expectedAutonomous: true,
    expectedRollback: false,
  },

  // ── Scenario H — Resource Saturation / Disk Mitigation (SIMMACI) (§24.H) ─
  {
    scenarioId: 'SCENARIO-H-RESOURCE-SATURATION-DISK',
    projectId: 'SIMMACI',
    service: 'telemetry-ingestion-node',
    title: 'Scenario H: Resource Saturation — Disk Exhaustion Bounded Mitigation',
    description: 'Disk saturation on /var/log reaches 94% risking process crash. KDI detects disk pressure, executes approved temporary spool purge and log rotation, verifies disk recovery (<70%), and resolves.',
    declaredExpectedVersion: 'v2.4.0',
    signals: {
      projectId: 'SIMMACI',
      serviceId: 'telemetry-ingestion-node',
      timestamp: '2026-10-08T09:35:00.000Z',
      availabilityPct: 98.9,
      httpErrorRatePct: 0.8,
      p95LatencyMs: 310,
      cpuUsagePct: 45.0,
      memoryUsagePct: 55.0,
      diskUsagePct: 94.2, // Critical saturation (>=90%)
      processHealth: 'HEALTHY',
      containerHealth: 'HEALTHY',
      queueDepth: 55,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v2.4.0',
      certificateDaysRemaining: 74,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T06:00:00.000Z',
        backupAgeHours: 3,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-3',
    expectedFinalState: 'RESOLVED',
    expectedAutonomous: true,
    expectedRollback: false,
  },

  // ── Scenario I — Global Kill Switch Engaged (§17) ───────────────────
  {
    scenarioId: 'SCENARIO-I-KILL-SWITCH-ENGAGED',
    projectId: 'KDI',
    service: 'agent-scheduler',
    title: 'Scenario I: Global Safety Kill Switch — Immediate Autonomous Mutation Halt',
    description: 'Human operator activates Global Production Safety Kill Switch. KDI detects worker crash but halts autonomous remediation, stopping at WAITING_FOR_HUMAN_APPROVAL with kill switch audit.',
    declaredExpectedVersion: 'v1.1.0',
    activateKillSwitchPrior: true,
    signals: {
      projectId: 'KDI',
      serviceId: 'agent-scheduler',
      timestamp: '2026-10-08T09:40:00.000Z',
      availabilityPct: 98.0,
      httpErrorRatePct: 0.2,
      p95LatencyMs: 110,
      cpuUsagePct: 22.0,
      memoryUsagePct: 30.0,
      diskUsagePct: 45.0,
      processHealth: 'FAILED',
      containerHealth: 'UNHEALTHY',
      queueDepth: 75,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v1.1.0',
      certificateDaysRemaining: 92,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T06:00:00.000Z',
        backupAgeHours: 3,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-3',
    expectedFinalState: 'WAITING_FOR_HUMAN_APPROVAL',
    expectedAutonomous: false,
    expectedRollback: false,
  },

  // ── Scenario J — Verification Failure & Retry Exhaustion (§13) ───────
  {
    scenarioId: 'SCENARIO-J-VERIFICATION-RETRY-EXHAUSTION',
    projectId: 'ILMORA',
    service: 'exam-session-service',
    title: 'Scenario J: Verification Failure — Max Retry Limit & Safe Human Escalation',
    description: 'Unhealthy service restart is executed, but health probe continues failing across max retry threshold (2 retries). KDI strictly terminates remediation loop and escalates to human operator.',
    declaredExpectedVersion: 'v3.2.0',
    injectedVerificationFailure: true,
    signals: {
      projectId: 'ILMORA',
      serviceId: 'exam-session-service',
      timestamp: '2026-10-08T09:45:00.000Z',
      availabilityPct: 97.5,
      httpErrorRatePct: 0.4,
      p95LatencyMs: 220,
      cpuUsagePct: 35.0,
      memoryUsagePct: 45.0,
      diskUsagePct: 40.0,
      processHealth: 'FAILED',
      containerHealth: 'UNHEALTHY',
      queueDepth: 95,
      databaseConnectivity: 'CONNECTED',
      databaseErrorRatePct: 0.0,
      deploymentStatus: 'SYNCED',
      activeVersion: 'v3.2.0',
      certificateDaysRemaining: 80,
      backupStatus: {
        lastSuccessfulBackupTimestamp: '2026-10-08T05:00:00.000Z',
        backupAgeHours: 4,
        backupHealth: 'HEALTHY',
        verificationStatus: 'VERIFIED',
        restorePointAvailable: true,
      },
    },
    expectedSeverity: 'SEV-3',
    expectedFinalState: 'WAITING_FOR_HUMAN_APPROVAL',
    expectedAutonomous: true,
    expectedRollback: false,
  },
];
