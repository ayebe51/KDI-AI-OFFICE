// ==========================================================
// services/api/src/engineering/phase30/staging-readiness.state-machine.ts
// Phase 30.6: Deterministic Staging Readiness State Machine (§5)
// ==========================================================

import type {
  ReadinessState,
  PrerequisiteId,
  PrerequisiteCheckResult,
  StagingReadinessReport,
} from './phase30.types.js';

export interface StagingReadinessEvaluationInput {
  prerequisites: Record<PrerequisiteId, PrerequisiteCheckResult>;
  safetyInvariantsPassed: boolean;
  stagingMutationAuthorized?: boolean;
  killSwitchActive?: boolean;
  hasSecretLeakage?: boolean;
  validationPlanActive?: boolean;
  validationContractPassed?: boolean;
  candidateProposed?: boolean;
  pilotExecutedSuccessfully?: boolean;
  evidenceCount?: number;
}

export class StagingReadinessStateMachine {
  /**
   * Deterministically evaluate Staging Readiness state (§5)
   */
  public evaluateReadiness(input: StagingReadinessEvaluationInput): StagingReadinessReport {
    const timestamp = new Date().toISOString();
    const unresolvedBlockers: string[] = [];

    // 1. Mandatory Safety Invariant & Secret Checks (Absolute Precedence) (§2, §5)
    if (!input.safetyInvariantsPassed) {
      unresolvedBlockers.push('CRITICAL_SAFETY_INVARIANT_VIOLATION: One or more safety invariants failed.');
      return {
        overallState: 'NO_GO',
        timestamp,
        prerequisites: input.prerequisites,
        safetyInvariantsPass: false,
        stagingMutationAuthorized: !!input.stagingMutationAuthorized,
        unresolvedBlockers,
        evaluatedEvidenceCount: input.evidenceCount || 0,
      };
    }

    if (input.hasSecretLeakage) {
      unresolvedBlockers.push('SECRET_LEAKAGE_DETECTED: Unredacted credentials found in application records.');
      return {
        overallState: 'NO_GO',
        timestamp,
        prerequisites: input.prerequisites,
        safetyInvariantsPass: false,
        stagingMutationAuthorized: !!input.stagingMutationAuthorized,
        unresolvedBlockers,
        evaluatedEvidenceCount: input.evidenceCount || 0,
      };
    }

    // 2. Kill Switch Check (§2, §5)
    if (input.killSwitchActive) {
      unresolvedBlockers.push('KILL_SWITCH_ACTIVE: Global safety kill switch is engaged. All staging operations blocked.');
      return {
        overallState: 'BLOCKED',
        timestamp,
        prerequisites: input.prerequisites,
        safetyInvariantsPass: true,
        stagingMutationAuthorized: false,
        unresolvedBlockers,
        evaluatedEvidenceCount: input.evidenceCount || 0,
      };
    }

    // 3. Collect blockers and prerequisite states
    const states = Object.values(input.prerequisites).map((p) => p.status);
    for (const prereq of Object.values(input.prerequisites)) {
      if (prereq.blockers.length > 0) {
        unresolvedBlockers.push(...prereq.blockers.map((b) => `[${prereq.id}] ${b}`));
      }
    }

    // 4. Evaluate prerequisite states
    const hasBlocked = states.some((s) => s === 'BLOCKED');
    const hasNotConfigured = states.some((s) => s === 'NOT_CONFIGURED');
    const hasConfiguredUnverified = states.some((s) => s === 'CONFIGURED_UNVERIFIED');
    const allVerifiedReadOnly = states.every(
      (s) =>
        s === 'VERIFIED_READ_ONLY' ||
        s === 'READY_FOR_STAGING_VALIDATION' ||
        s === 'STAGING_VALIDATION_PASSED'
    );

    let overallState: ReadinessState = 'NOT_CONFIGURED';

    if (hasBlocked) {
      overallState = 'BLOCKED';
    } else if (hasNotConfigured) {
      overallState = 'NOT_CONFIGURED';
    } else if (hasConfiguredUnverified) {
      overallState = 'CONFIGURED_UNVERIFIED';
    } else if (allVerifiedReadOnly) {
      // All 6 prerequisites are verified read-only.
      // Progressive staging state transitions (§5):
      if (input.pilotExecutedSuccessfully && input.stagingMutationAuthorized) {
        overallState = 'STAGING_PILOT_PASSED';
      } else if (input.candidateProposed && !input.stagingMutationAuthorized) {
        // A release candidate is ready to deploy, but physical mutation requires explicit human authorization
        overallState = 'STAGING_PILOT_AUTHORIZATION_REQUIRED';
        unresolvedBlockers.push(
          'STAGING_PILOT_AUTHORIZATION_REQUIRED: Explicit, phase-specific human authorization required for physical staging mutation.'
        );
      } else if (input.validationContractPassed) {
        overallState = 'STAGING_VALIDATION_PASSED';
      } else if (input.validationPlanActive) {
        overallState = 'READY_FOR_STAGING_VALIDATION';
      } else {
        overallState = 'VERIFIED_READ_ONLY';
      }
    } else {
      overallState = 'CONFIGURED_UNVERIFIED';
    }

    return {
      overallState,
      timestamp,
      prerequisites: input.prerequisites,
      safetyInvariantsPass: true,
      stagingMutationAuthorized: !!input.stagingMutationAuthorized,
      unresolvedBlockers,
      evaluatedEvidenceCount: input.evidenceCount || 0,
    };
  }

  /**
   * Format machine-readable JSON report (§5, §10)
   */
  public toCleanJsonReport(report: StagingReadinessReport): Record<string, any> {
    return {
      phase: '30.6',
      environment: 'STAGING',
      verdict: report.overallState,
      timestamp: report.timestamp,
      safetyInvariantsPass: report.safetyInvariantsPass,
      stagingMutationAuthorized: report.stagingMutationAuthorized,
      prerequisites: Object.fromEntries(
        Object.entries(report.prerequisites).map(([id, p]) => [
          id,
          {
            name: p.name,
            status: p.status,
            evidenceTier: p.evidenceTier,
            details: p.details,
            blockers: p.blockers,
          },
        ])
      ),
      unresolvedBlockers: report.unresolvedBlockers,
      evaluatedEvidenceCount: report.evaluatedEvidenceCount,
    };
  }
}
