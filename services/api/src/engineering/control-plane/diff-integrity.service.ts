// ==========================================================
// services/api/src/engineering/control-plane/diff-integrity.service.ts
// Phase 15.5: Diff Hash & Approval Integrity Verification Engine (§32 & §33)
// ==========================================================

import * as crypto from 'crypto';
import { StructuredLogger } from '@kdi/shared';

export interface DiffVerificationResult {
  valid: boolean;
  expectedHash?: string;
  actualHash: string;
  reason?: string;
}

export class DiffIntegrityService {
  private readonly logger = new StructuredLogger('DiffIntegrityService');

  /**
   * Compute a normalized SHA-256 hash of a git diff string (§33)
   */
  public computeDiffHash(diffContent: string): string {
    const normalized = diffContent
      .replace(/\r\n/g, '\n')
      .trim();
    return `sha256:${crypto.createHash('sha256').update(normalized).digest('hex')}`;
  }

  /**
   * Verify whether the current diff still matches the diff captured when approval was requested (§33)
   */
  public verifyDiffIntegrity(
    approvedDiffHash: string | undefined,
    currentDiffContent: string
  ): DiffVerificationResult {
    const actualHash = this.computeDiffHash(currentDiffContent);

    if (!approvedDiffHash) {
      this.logger.warn('verifyDiffIntegrity', 'No approved diff hash recorded for verification');
      return {
        valid: false,
        actualHash,
        reason: 'No approval diff hash snapshot exists for this task',
      };
    }

    if (approvedDiffHash !== actualHash) {
      this.logger.warn(
        'verifyDiffIntegrity',
        `APPROVAL_INVALIDATED: Diff has changed since approval was requested (Expected: ${approvedDiffHash.slice(
          0,
          8
        )}, Actual: ${actualHash.slice(0, 8)})`
      );
      return {
        valid: false,
        expectedHash: approvedDiffHash,
        actualHash,
        reason: `Code changes were modified after approval was granted. Expected diff hash ${approvedDiffHash.slice(
          0,
          8
        )} but observed ${actualHash.slice(0, 8)}.`,
      };
    }

    return {
      valid: true,
      expectedHash: approvedDiffHash,
      actualHash,
    };
  }
}
