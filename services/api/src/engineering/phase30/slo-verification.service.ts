// ==========================================================
// services/api/src/engineering/phase30/slo-verification.service.ts
// Phase 30.4: Ed25519 Cryptographic SLO Verification Engine (§4.B4)
// ==========================================================

import * as crypto from 'crypto';
import type {
  SignedSloDocument,
  SignedSloThresholds,
  DeploymentEnvironment,
} from './phase30.types.js';

export interface SloVerificationResult {
  valid: boolean;
  reason?: string;
  verifiedThresholds?: SignedSloThresholds;
  verifiedScope?: {
    project: string;
    service: string;
    environment: DeploymentEnvironment;
  };
}

export class SloVerificationService {
  /**
   * Produce a deterministic, canonical JSON representation of the SLO payload
   */
  public static canonicalize(payload: {
    version: string;
    project: string;
    service: string;
    environment: DeploymentEnvironment;
    validFrom: string;
    validUntil: string;
    thresholds: SignedSloThresholds;
    keyId: string;
  }): Buffer {
    const canonicalObject = {
      environment: payload.environment,
      keyId: payload.keyId,
      project: payload.project,
      service: payload.service,
      thresholds: {
        availabilityMinPct: payload.thresholds.availabilityMinPct,
        errorRateMaxPct: payload.thresholds.errorRateMaxPct,
        p95LatencyMaxMs: payload.thresholds.p95LatencyMaxMs,
      },
      validFrom: payload.validFrom,
      validUntil: payload.validUntil,
      version: payload.version,
    };

    return Buffer.from(JSON.stringify(canonicalObject), 'utf-8');
  }

  /**
   * Cryptographically verify a signed SLO document using an independently configured public key (§4.B4)
   */
  public verifySloDocument(
    doc: SignedSloDocument,
    publicKeyPem: string,
    options?: { now?: number }
  ): SloVerificationResult {
    // 1. Basic schema and field presence validation
    if (!doc || !doc.version || !doc.thresholds || !doc.signature || !doc.keyId) {
      return {
        valid: false,
        reason: 'SCHEMA_INVALID: Missing required fields in SignedSloDocument.',
      };
    }

    // 2. Version validation
    if (!doc.version.match(/^1\.\d+\.\d+$/)) {
      return {
        valid: false,
        reason: `UNSUPPORTED_VERSION: SLO configuration version '${doc.version}' is unsupported. Must be semver 1.x.`,
      };
    }

    // 3. Threshold bounds validation
    const { thresholds } = doc;
    if (
      typeof thresholds.p95LatencyMaxMs !== 'number' ||
      thresholds.p95LatencyMaxMs <= 0 ||
      thresholds.p95LatencyMaxMs > 30000
    ) {
      return {
        valid: false,
        reason: 'INVALID_THRESHOLDS: p95LatencyMaxMs must be a positive number <= 30000ms.',
      };
    }

    if (
      typeof thresholds.errorRateMaxPct !== 'number' ||
      thresholds.errorRateMaxPct < 0 ||
      thresholds.errorRateMaxPct > 100
    ) {
      return {
        valid: false,
        reason: 'INVALID_THRESHOLDS: errorRateMaxPct must be a number between 0 and 100.',
      };
    }

    if (
      typeof thresholds.availabilityMinPct !== 'number' ||
      thresholds.availabilityMinPct < 0 ||
      thresholds.availabilityMinPct > 100
    ) {
      return {
        valid: false,
        reason: 'INVALID_THRESHOLDS: availabilityMinPct must be a number between 0 and 100.',
      };
    }

    // 4. Validity time window check
    const now = options?.now || Date.now();
    const validFromTime = new Date(doc.validFrom).getTime();
    const validUntilTime = new Date(doc.validUntil).getTime();

    if (isNaN(validFromTime) || isNaN(validUntilTime)) {
      return {
        valid: false,
        reason: 'INVALID_TIMESTAMPS: validFrom or validUntil are not valid ISO 8601 timestamps.',
      };
    }

    if (now < validFromTime) {
      return {
        valid: false,
        reason: `SLO_NOT_YET_VALID: SLO configuration is not valid until '${doc.validFrom}'.`,
      };
    }

    if (now > validUntilTime) {
      return {
        valid: false,
        reason: `SLO_EXPIRED: SLO configuration expired at '${doc.validUntil}'.`,
      };
    }

    // 5. Cryptographic Ed25519 signature verification
    try {
      const canonicalBuffer = SloVerificationService.canonicalize({
        version: doc.version,
        project: doc.project,
        service: doc.service,
        environment: doc.environment,
        validFrom: doc.validFrom,
        validUntil: doc.validUntil,
        thresholds: doc.thresholds,
        keyId: doc.keyId,
      });

      const signatureBuffer = Buffer.from(doc.signature, 'hex');

      const isVerified = crypto.verify(
        null,
        canonicalBuffer,
        publicKeyPem,
        signatureBuffer
      );

      if (!isVerified) {
        return {
          valid: false,
          reason:
            'SIGNATURE_INVALID: Cryptographic signature verification failed. Document has been altered or signed with an unapproved key.',
        };
      }

      return {
        valid: true,
        verifiedThresholds: doc.thresholds,
        verifiedScope: {
          project: doc.project,
          service: doc.service,
          environment: doc.environment,
        },
      };
    } catch (err) {
      return {
        valid: false,
        reason: `VERIFICATION_ERROR: Exception during cryptographic signature check: ${(err as Error).message}`,
      };
    }
  }

  /**
   * Helper: Generate a new Ed25519 keypair for test/staging key provisioning
   */
  public static generateEd25519KeyPair(): {
    publicKeyPem: string;
    privateKeyPem: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return { publicKeyPem: publicKey, privateKeyPem: privateKey };
  }

  /**
   * Helper: Sign an SLO document payload using an Ed25519 private key
   */
  public static signSloDocument(
    payload: {
      version: string;
      project: 'SIMMACI' | 'ILMORA' | 'KDI';
      service: string;
      environment: DeploymentEnvironment;
      validFrom: string;
      validUntil: string;
      thresholds: SignedSloThresholds;
      keyId: string;
    },
    privateKeyPem: string
  ): SignedSloDocument {
    const canonicalBuffer = SloVerificationService.canonicalize(payload);
    const signature = crypto.sign(null, canonicalBuffer, privateKeyPem).toString('hex');

    return {
      ...payload,
      signature,
    };
  }
}
