// ==========================================================
// services/api/src/engineering/phase30/production-readiness.state-machine.ts
// Phase 30.4: Deterministic Production Readiness State Machine (§8)
// ==========================================================

import type {
  ReadinessState,
  PrerequisiteId,
  PrerequisiteCheckResult,
  ProductionReadinessReport,
} from './phase30.types.js';

export interface ReadinessEvaluationInput {
  prerequisites: Record<PrerequisiteId, PrerequisiteCheckResult>;
  safetyInvariantsPassed: boolean;
  productionMutationDisabled: boolean;
  killSwitchActive?: boolean;
  hasSecretLeakage?: boolean;
  benchmarkEnvelopeActive?: boolean;
  evidenceCount?: number;
}

export class ProductionReadinessStateMachine {
  /**
   * Deterministically calculate overall production readiness state (§8)
   */
  public evaluateReadiness(input: ReadinessEvaluationInput): ProductionReadinessReport {
    const timestamp = new Date().toISOString();
    const unresolvedBlockers: string[] = [];

    // 1. Safety Invariant Check (§2, §8):
    // NO_GO takes absolute precedence if any safety invariant fails or secrets are leaked
    if (!input.safetyInvariantsPassed) {
      unresolvedBlockers.push('CRITICAL_SAFETY_INVARIANT_VIOLATION: One or more safety invariants failed.');
      return {
        overallState: 'NO_GO',
        timestamp,
        prerequisites: input.prerequisites,
        safetyInvariantsPass: false,
        productionMutationDisabled: input.productionMutationDisabled,
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
        productionMutationDisabled: input.productionMutationDisabled,
        unresolvedBlockers,
        evaluatedEvidenceCount: input.evidenceCount || 0,
      };
    }

    // 2. Kill Switch Check
    if (input.killSwitchActive) {
      unresolvedBlockers.push('KILL_SWITCH_ACTIVE: Production release execution is halted by emergency kill switch.');
      return {
        overallState: 'BLOCKED',
        timestamp,
        prerequisites: input.prerequisites,
        safetyInvariantsPass: true,
        productionMutationDisabled: input.productionMutationDisabled,
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

    // 4. Determine state based on prerequisite evaluation
    let overallState: ReadinessState = 'NOT_CONFIGURED';

    const hasBlocked = states.some((s) => s === 'BLOCKED');
    const hasNotConfigured = states.some((s) => s === 'NOT_CONFIGURED');
    const hasConfiguredUnverified = states.some((s) => s === 'CONFIGURED_UNVERIFIED');
    const allVerifiedReadOnly = states.every(
      (s) => s === 'VERIFIED_READ_ONLY' || s === 'READY_FOR_STAGING_VALIDATION' || s === 'READY_FOR_PRODUCTION_PILOT'
    );

    if (hasBlocked) {
      overallState = 'BLOCKED';
    } else if (hasNotConfigured) {
      overallState = 'NOT_CONFIGURED';
    } else if (hasConfiguredUnverified) {
      overallState = 'CONFIGURED_UNVERIFIED';
    } else if (allVerifiedReadOnly) {
      // All prerequisites are verified read-only.
      // To reach READY_FOR_PRODUCTION_PILOT:
      // Must have active Benchmark Envelope and production mutation disabled guard (§8)
      if (input.benchmarkEnvelopeActive && input.productionMutationDisabled) {
        overallState = 'READY_FOR_PRODUCTION_PILOT';
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
      productionMutationDisabled: input.productionMutationDisabled,
      unresolvedBlockers,
      evaluatedEvidenceCount: input.evidenceCount || 0,
    };
  }

  /**
   * Helper to format machine-readable readiness result (§11.7)
   */
  public toCleanJsonReport(report: ProductionReadinessReport): Record<string, any> {
    return {
      phase: '30.4',
      verdict: report.overallState,
      timestamp: report.timestamp,
      productionMutationDisabled: report.productionMutationDisabled,
      safetyInvariantsPass: report.safetyInvariantsPass,
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
