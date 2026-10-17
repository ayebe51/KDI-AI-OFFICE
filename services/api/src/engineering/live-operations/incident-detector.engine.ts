// ==========================================================
// services/api/src/engineering/live-operations/incident-detector.engine.ts
// Phase 27: Production Incident Detection & Telemetry Analysis Engine (§10–§12, §20–§22)
// ==========================================================

import type {
  ProductionSignals,
  IncidentSeverity,
  DiagnosisConfidence,
  ProductionDriftReport,
  ActionRisk,
} from './phase-27.types.js';

export interface DetectionResult {
  hasIncident: boolean;
  incidentType: string;
  severity: IncidentSeverity;
  symptoms: string[];
  diagnosis: string;
  confidence: DiagnosisConfidence;
  candidateRemediation?: string;
  driftReport?: ProductionDriftReport;
  recommendedActionRisk: ActionRisk;
}

export class IncidentDetectorEngine {
  /**
   * Observe telemetry signals and classify production state (§10, §11, §12)
   */
  public analyzeSignals(signals: ProductionSignals, declaredExpectedVersion?: string): DetectionResult {
    const symptoms: string[] = [];

    // ── 1. Availability & Error Rates Check (§10) ────────────────────
    if (signals.availabilityPct < 90.0) {
      symptoms.push(`Severe availability degradation: ${signals.availabilityPct}% (< 90.0% threshold)`);
    } else if (signals.availabilityPct < 99.0) {
      symptoms.push(`Availability degradation: ${signals.availabilityPct}% (< 99.0% threshold)`);
    }

    if (signals.httpErrorRatePct >= 5.0) {
      symptoms.push(`Critical HTTP 5xx error rate spike: ${signals.httpErrorRatePct}% (>= 5.0% threshold)`);
    } else if (signals.httpErrorRatePct > 1.0) {
      symptoms.push(`Elevated HTTP 5xx error rate: ${signals.httpErrorRatePct}% (> 1.0% threshold)`);
    }

    if (signals.p95LatencyMs > 1000) {
      symptoms.push(`High P95 latency: ${signals.p95LatencyMs}ms (> 1000ms threshold)`);
    }

    // ── 2. Process & Container Health Check (§10) ────────────────────
    if (signals.processHealth === 'FAILED') {
      symptoms.push(`Application process state is FAILED (worker crash)`);
    } else if (signals.processHealth === 'DEGRADED') {
      symptoms.push(`Application process state is DEGRADED`);
    }

    if (signals.containerHealth === 'CRASH_LOOP') {
      symptoms.push(`Container enters CRASH_LOOP state`);
    } else if (signals.containerHealth === 'UNHEALTHY') {
      symptoms.push(`Container health check returned UNHEALTHY`);
    }

    // ── 3. Database Connectivity & Saturation Check (§10, §15) ────────
    if (signals.databaseConnectivity === 'DISCONNECTED') {
      symptoms.push(`Database connection lost: DISCONNECTED`);
    } else if (signals.databaseConnectivity === 'POOL_EXHAUSTED') {
      symptoms.push(`Database connection pool exhausted: POOL_EXHAUSTED`);
    }

    if (signals.databaseErrorRatePct > 2.0) {
      symptoms.push(`Database error rate spike: ${signals.databaseErrorRatePct}% (> 2.0% threshold)`);
    }

    // ── 4. Resource Saturation Check (§22) ───────────────────────────
    if (signals.diskUsagePct >= 90.0) {
      symptoms.push(`Critical disk space saturation: ${signals.diskUsagePct}% (>= 90% threshold)`);
    } else if (signals.diskUsagePct >= 80.0) {
      symptoms.push(`Elevated disk usage: ${signals.diskUsagePct}% (>= 80% threshold)`);
    }

    if (signals.memoryUsagePct >= 90.0) {
      symptoms.push(`Memory saturation: ${signals.memoryUsagePct}% (>= 90% threshold)`);
    }

    if (signals.cpuUsagePct >= 90.0) {
      symptoms.push(`CPU saturation: ${signals.cpuUsagePct}% (>= 90% threshold)`);
    }

    // ── 5. Backup & Restore Observability Check (§21) ────────────────
    if (signals.backupStatus.backupHealth === 'FAILED') {
      symptoms.push(`Production backup failure detected: status FAILED`);
    } else if (signals.backupStatus.backupHealth === 'STALE' || signals.backupStatus.backupAgeHours > 24) {
      symptoms.push(
        `Production backup is stale: age ${signals.backupStatus.backupAgeHours}h (> 24h threshold) or status STALE`
      );
    }

    if (signals.backupStatus.verificationStatus === 'FAILED') {
      symptoms.push(`Backup restore-point verification failed`);
    }

    // ── 6. Certificate Expiry Check (§22) ────────────────────────────
    if (signals.certificateDaysRemaining <= 7) {
      symptoms.push(`Critical TLS certificate expiry warning: ${signals.certificateDaysRemaining} days remaining`);
    } else if (signals.certificateDaysRemaining <= 14) {
      symptoms.push(`TLS certificate expiry approaching: ${signals.certificateDaysRemaining} days remaining`);
    }

    // ── 7. Production Drift Detection (§20) ───────────────────────────
    let driftReport: ProductionDriftReport | undefined;
    if (declaredExpectedVersion && signals.activeVersion !== declaredExpectedVersion) {
      symptoms.push(
        `Production version drift detected: active='${signals.activeVersion}' vs declared='${declaredExpectedVersion}'`
      );
      driftReport = {
        hasDrift: true,
        driftType: 'VERSION_MISMATCH',
        expectedState: declaredExpectedVersion,
        observedState: signals.activeVersion,
        riskClass: 'CONTROLLED_AUTONOMOUS',
        reconciliationPermitted: true,
        details: `Active instance version '${signals.activeVersion}' differs from approved release '${declaredExpectedVersion}'.`,
      };
    } else if (signals.deploymentStatus === 'DRIFTED') {
      symptoms.push(`Production deployment state reported as DRIFTED`);
      driftReport = {
        hasDrift: true,
        driftType: 'CONFIGURATION_DRIFT',
        expectedState: 'SYNCED',
        observedState: 'DRIFTED',
        riskClass: 'CONTROLLED_AUTONOMOUS',
        reconciliationPermitted: true,
        details: 'Stateless configuration drift detected across worker pool.',
      };
    }

    // ── 8. No Incident Case (Scenario A §24) ─────────────────────────
    if (symptoms.length === 0) {
      return {
        hasIncident: false,
        incidentType: 'HEALTHY',
        severity: 'SEV-4',
        symptoms: [],
        diagnosis: 'All production metrics, process health, database status, and backup verifications are within nominal parameters.',
        confidence: 'HIGH',
        recommendedActionRisk: 'READ_ONLY',
      };
    }

    // ── 9. Severity & Diagnosis Classification (§11, §12) ────────────
    return this.classifyIncident(signals, symptoms, driftReport);
  }

  private classifyIncident(
    signals: ProductionSignals,
    symptoms: string[],
    driftReport?: ProductionDriftReport
  ): DetectionResult {
    // SEV-1: Critical Outage / Complete Disconnection
    if (signals.availabilityPct < 90.0 || signals.databaseConnectivity === 'DISCONNECTED') {
      return {
        hasIncident: true,
        incidentType: 'CRITICAL_OUTAGE',
        severity: 'SEV-1',
        symptoms,
        diagnosis: signals.databaseConnectivity === 'DISCONNECTED'
          ? 'Primary database connection dropped completely. Unrecoverable without infrastructure failover.'
          : 'Service availability fell below 90% SLA threshold across production endpoints.',
        confidence: 'HIGH',
        candidateRemediation: undefined, // Mandates human escalation (§11)
        driftReport,
        recommendedActionRisk: 'HUMAN_APPROVAL_REQUIRED',
      };
    }

    // SEV-2: Post-Deployment 5xx Spike (Scenario C §24)
    if (signals.httpErrorRatePct >= 5.0) {
      return {
        hasIncident: true,
        incidentType: 'ELEVATED_HTTP_5XX_ERROR_RATE',
        severity: 'SEV-2',
        symptoms,
        diagnosis: `Post-deployment regression detected: HTTP 5xx error rate spiked to ${signals.httpErrorRatePct}%. Correlates with recent release artifact.`,
        confidence: 'HIGH',
        candidateRemediation: 'invoke_approved_rollback',
        driftReport,
        recommendedActionRisk: 'CONTROLLED_AUTONOMOUS',
      };
    }

    // SEV-2: Database Connection Pool Exhaustion (Scenario E)
    if (signals.databaseConnectivity === 'POOL_EXHAUSTED') {
      return {
        hasIncident: true,
        incidentType: 'DATABASE_POOL_EXHAUSTION',
        severity: 'SEV-2',
        symptoms,
        diagnosis: 'Database connection pool exhausted. Active connections saturated on replica pool.',
        confidence: 'HIGH',
        candidateRemediation: 'recover_db_connection_pool',
        driftReport,
        recommendedActionRisk: 'CONTROLLED_AUTONOMOUS',
      };
    }

    // SEV-3: Stateless Worker Process/Container Crash (Scenario B §24)
    if (signals.processHealth === 'FAILED' || signals.containerHealth === 'UNHEALTHY') {
      return {
        hasIncident: true,
        incidentType: 'STATELESS_WORKER_FAILURE',
        severity: 'SEV-3',
        symptoms,
        diagnosis: `Stateless background worker terminated unexpectedly (exit 137 / SIGKILL / process down). Target is an isolated stateless consumer.`,
        confidence: 'HIGH',
        candidateRemediation: 'restart_stateless_worker',
        driftReport,
        recommendedActionRisk: 'LOW_RISK_AUTONOMOUS',
      };
    }

    // SEV-3: Resource Saturation - Disk Pressure (Scenario H §24)
    if (signals.diskUsagePct >= 90.0) {
      return {
        hasIncident: true,
        incidentType: 'RESOURCE_SATURATION_DISK',
        severity: 'SEV-3',
        symptoms,
        diagnosis: `Disk usage at ${signals.diskUsagePct}% exceeds safe operational watermark (>=90%). Root cause: accumulation in temporary spool and unrotated logs.`,
        confidence: 'HIGH',
        candidateRemediation: 'purge_temporary_disk_spool',
        driftReport,
        recommendedActionRisk: 'CONTROLLED_AUTONOMOUS',
      };
    }

    // SEV-3: Backup Stale / Warning (Scenario G §24)
    if (signals.backupStatus.backupHealth !== 'HEALTHY' || signals.backupStatus.backupAgeHours > 24) {
      return {
        hasIncident: true,
        incidentType: 'BACKUP_STALE_WARNING',
        severity: 'SEV-3',
        symptoms,
        diagnosis: `Scheduled database backup is stale (age ${signals.backupStatus.backupAgeHours}h). Verification status: ${signals.backupStatus.verificationStatus}.`,
        confidence: 'HIGH',
        candidateRemediation: 'trigger_stale_backup_verification',
        driftReport,
        recommendedActionRisk: 'CONTROLLED_AUTONOMOUS',
      };
    }

    // SEV-3: Production Drift (Scenario F §24)
    if (driftReport && driftReport.hasDrift) {
      return {
        hasIncident: true,
        incidentType: 'PRODUCTION_DRIFT',
        severity: 'SEV-3',
        symptoms,
        diagnosis: driftReport.details,
        confidence: 'HIGH',
        candidateRemediation: 'reconcile_stateless_replica_drift',
        driftReport,
        recommendedActionRisk: 'CONTROLLED_AUTONOMOUS',
      };
    }

    // SEV-4: Approaching Certificate Expiry (§22)
    if (signals.certificateDaysRemaining <= 14) {
      return {
        hasIncident: true,
        incidentType: 'CERTIFICATE_EXPIRY_WARNING',
        severity: 'SEV-4',
        symptoms,
        diagnosis: `TLS certificate has ${signals.certificateDaysRemaining} days remaining before expiration. Requires planned rotation.`,
        confidence: 'HIGH',
        candidateRemediation: undefined, // Replacing cert requires human review (§22)
        driftReport,
        recommendedActionRisk: 'HUMAN_APPROVAL_REQUIRED',
      };
    }

    // Fallback: Degraded with Moderate / Unknown Confidence (Scenario D §24)
    return {
      hasIncident: true,
      incidentType: 'ANOMALOUS_DEGRADATION',
      severity: 'SEV-2',
      symptoms,
      diagnosis: 'Sporadic degradation across multiple subsystems without clear deterministic signature.',
      confidence: 'LOW',
      candidateRemediation: undefined,
      driftReport,
      recommendedActionRisk: 'HUMAN_APPROVAL_REQUIRED',
    };
  }
}
