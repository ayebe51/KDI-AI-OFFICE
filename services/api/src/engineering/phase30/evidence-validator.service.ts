// ==========================================================
// services/api/src/engineering/phase30/evidence-validator.service.ts
// Phase 30.4: Centralized Evidence Classification & Claim Validator (§3)
// ==========================================================

import type {
  EvidenceRecord,
  EvidenceTier,
  MaterialClaim,
  ClaimValidationResult,
  DeploymentEnvironment,
} from './phase30.types.js';

export class EvidenceTierEscalationError extends Error {
  constructor(claimedTier: EvidenceTier, actualTier: EvidenceTier) {
    super(
      `EVIDENCE_TIER_ESCALATION_BLOCKED: Claim requires tier '${claimedTier}' but evidence only provides '${actualTier}'. Tier upgrade forbidden.`
    );
    this.name = 'EvidenceTierEscalationError';
  }
}

export class StaleEvidenceError extends Error {
  constructor(evidenceId: string, ageMs: number, maxAgeMs: number) {
    super(
      `STALE_EVIDENCE_REJECTED: Evidence '${evidenceId}' observed age (${Math.round(
        ageMs / 1000
      )}s) exceeds max allowable freshness (${Math.round(maxAgeMs / 1000)}s).`
    );
    this.name = 'StaleEvidenceError';
  }
}

export class EvidenceValidatorService {
  private static readonly TIER_RANK: Record<EvidenceTier, number> = {
    SIMULATED: 0,
    LOCAL_TEST: 1,
    LOCAL_EXECUTION: 2,
    STAGING_LIVE: 3,
    PRODUCTION_LIVE: 4,
  };

  private readonly evidenceStore = new Map<string, EvidenceRecord>();
  private readonly defaultMaxAgeMs: number;

  constructor(options?: { defaultMaxAgeMs?: number }) {
    this.defaultMaxAgeMs = options?.defaultMaxAgeMs || 3600_000; // 1 hour default
  }

  /**
   * Register a verified evidence record (§3)
   */
  public recordEvidence(evidence: EvidenceRecord): void {
    if (!evidence.evidenceId) {
      throw new Error('EvidenceRecord must have a valid evidenceId');
    }
    if (!evidence.benchmarkId) {
      throw new Error('EvidenceRecord must have a valid benchmarkId');
    }
    if (!evidence.sourceSystem) {
      throw new Error('EvidenceRecord must have an explicit sourceSystem');
    }

    this.evidenceStore.set(evidence.evidenceId, evidence);
  }

  /**
   * Retrieve evidence by ID
   */
  public getEvidence(evidenceId: string): EvidenceRecord | undefined {
    return this.evidenceStore.get(evidenceId);
  }

  /**
   * List all evidence records matching benchmark ID
   */
  public getEvidenceByBenchmark(benchmarkId: string): EvidenceRecord[] {
    return Array.from(this.evidenceStore.values()).filter(
      (e) => e.benchmarkId === benchmarkId
    );
  }

  /**
   * List all stored evidence records
   */
  public getAllEvidence(): EvidenceRecord[] {
    return Array.from(this.evidenceStore.values());
  }

  /**
   * Validate a Material Claim against stored evidence (§3)
   * Strictly enforces:
   * 1. No evidence tier escalation (e.g. SIMULATED cannot satisfy PRODUCTION_LIVE)
   * 2. No environment mismatch
   * 3. No release identity / digest drift
   * 4. Freshness bounds (stale evidence rejected)
   * 5. Result requirement matching
   */
  public validateClaim(
    claim: MaterialClaim,
    options?: { maxAgeMs?: number; now?: number }
  ): ClaimValidationResult {
    const rejectionReasons: string[] = [];
    const now = options?.now || Date.now();
    const maxAgeMs = options?.maxAgeMs || this.defaultMaxAgeMs;

    // Filter evidence matching benchmark and claimType
    const matchingEvidence = Array.from(this.evidenceStore.values()).filter(
      (e) =>
        e.benchmarkId === claim.benchmarkId && e.claimType === claim.claimType
    );

    if (matchingEvidence.length === 0) {
      return {
        valid: false,
        claimId: claim.claimId,
        matchedEvidenceCount: 0,
        rejectionReasons: [
          `NO_EVIDENCE_FOUND: No evidence records found for benchmark '${claim.benchmarkId}' and claimType '${claim.claimType}'.`,
        ],
        validatedAt: new Date(now).toISOString(),
      };
    }

    const requiredRank = EvidenceValidatorService.TIER_RANK[claim.minimumEvidenceTier];
    let highestTierFound: EvidenceTier = 'SIMULATED';
    let validRecordsCount = 0;

    for (const ev of matchingEvidence) {
      const evRank = EvidenceValidatorService.TIER_RANK[ev.evidenceTier];
      if (
        EvidenceValidatorService.TIER_RANK[ev.evidenceTier] >
        EvidenceValidatorService.TIER_RANK[highestTierFound]
      ) {
        highestTierFound = ev.evidenceTier;
      }

      // 1. Evidence Tier Check (No silent tier upgrade!)
      if (evRank < requiredRank) {
        rejectionReasons.push(
          `TIER_INSUFFICIENT: Evidence '${ev.evidenceId}' has tier '${ev.evidenceTier}', which is lower than required minimum tier '${claim.minimumEvidenceTier}'.`
        );
        continue;
      }

      // 2. Environment Matching Check
      if (ev.environment !== claim.targetEnvironment) {
        rejectionReasons.push(
          `ENVIRONMENT_MISMATCH: Evidence '${ev.evidenceId}' is from environment '${ev.environment}', but claim targets '${claim.targetEnvironment}'.`
        );
        continue;
      }

      // 3. Release Identity & Artifact Digest Check
      if (claim.targetReleaseId && ev.releaseId !== claim.targetReleaseId) {
        rejectionReasons.push(
          `RELEASE_MISMATCH: Evidence '${ev.evidenceId}' release '${ev.releaseId}' does not match claim target release '${claim.targetReleaseId}'.`
        );
        continue;
      }

      if (
        claim.targetArtifactDigest &&
        ev.artifactDigest !== claim.targetArtifactDigest
      ) {
        rejectionReasons.push(
          `ARTIFACT_DIGEST_MISMATCH: Evidence '${ev.evidenceId}' artifact digest does not match claim target digest.`
        );
        continue;
      }

      // 4. Freshness Check
      const observedTime = new Date(ev.observedAt).getTime();
      const ageMs = now - observedTime;
      if (ageMs > maxAgeMs) {
        rejectionReasons.push(
          `EVIDENCE_STALE: Evidence '${ev.evidenceId}' observed at '${ev.observedAt}' (${Math.round(
            ageMs / 1000
          )}s old) exceeds allowable age (${Math.round(maxAgeMs / 1000)}s).`
        );
        continue;
      }

      // 5. Result Verification
      if (ev.result !== claim.requiredResult) {
        rejectionReasons.push(
          `RESULT_MISMATCH: Evidence '${ev.evidenceId}' result is '${ev.result}', but claim requires '${claim.requiredResult}'.`
        );
        continue;
      }

      // All criteria satisfied for this record
      validRecordsCount++;
    }

    const isValid = validRecordsCount > 0 && rejectionReasons.length === 0;

    return {
      valid: isValid,
      claimId: claim.claimId,
      matchedEvidenceCount: validRecordsCount,
      evaluatedTier: highestTierFound,
      rejectionReasons,
      validatedAt: new Date(now).toISOString(),
    };
  }

  /**
   * Helper to verify if an evidence tier is sufficient for a target environment (§3)
   */
  public static isTierSufficientForProduction(tier: EvidenceTier): boolean {
    return tier === 'PRODUCTION_LIVE';
  }

  /**
   * Clear all stored evidence (test isolation)
   */
  public clear(): void {
    this.evidenceStore.clear();
  }
}
