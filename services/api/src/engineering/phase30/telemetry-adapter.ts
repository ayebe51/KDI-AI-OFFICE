// ==========================================================
// services/api/src/engineering/phase30/telemetry-adapter.ts
// Phase 30.2: Telemetry Adapter with Explicit UNKNOWN Health Classification (§14)
// ==========================================================

import { Injectable } from '@nestjs/common';
import type { TelemetryReading, TelemetryStatus, DeploymentTarget } from './phase30.types.js';

export interface TelemetryCollectorOptions {
  mockSignalOverride?: {
    status?: TelemetryStatus;
    errorRatePct?: number;
    p95LatencyMs?: number;
    availabilityPct?: number;
    isUnreachable?: boolean;
  };
}

@Injectable()
export class TelemetryAdapter {
  private readonly defaultSloThresholds = {
    maxErrorRatePct: 1.0,
    maxP95LatencyMs: 100,
    minAvailabilityPct: 99.9,
  };

  /**
   * Observe telemetry signals for target.
   * CRITICAL RULE (§14): If signals are unavailable or missing, status MUST be UNKNOWN.
   * UNKNOWN cannot be treated as healthy.
   */
  public async observeTarget(
    target: DeploymentTarget,
    options?: TelemetryCollectorOptions
  ): Promise<TelemetryReading> {
    const timestamp = new Date().toISOString();

    // 1. Check for injected mock/test signals (e.g. during dry-run or fault injection)
    if (options?.mockSignalOverride) {
      const override = options.mockSignalOverride;
      if (override.isUnreachable) {
        return {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: -1,
          p95LatencyMs: -1,
          availabilityPct: -1,
          timestamp,
          source: 'TEST_ADAPTER',
          rawSignals: { reason: 'Telemetry provider connection unreachable' },
        };
      }
      return {
        targetId: target.targetId,
        status: override.status || 'HEALTHY',
        errorRatePct: override.errorRatePct ?? 0.05,
        p95LatencyMs: override.p95LatencyMs ?? 42,
        availabilityPct: override.availabilityPct ?? 99.95,
        timestamp,
        source: 'TEST_ADAPTER',
        rawSignals: override,
      };
    }

    // 2. Local dry run target default
    if (target.environment === 'LOCAL_DRY_RUN') {
      return {
        targetId: target.targetId,
        status: 'HEALTHY',
        errorRatePct: 0.0,
        p95LatencyMs: 15,
        availabilityPct: 100.0,
        timestamp,
        source: 'DRY_RUN',
        rawSignals: { localMode: true },
      };
    }

    // 3. Staging and Production: If real telemetry endpoint cannot be reached or is undefined
    // In current environment, real external Prometheus/Datadog cluster is not wired up
    // Therefore, in accordance with Section 14, unconfigured targets return UNKNOWN.
    return {
      targetId: target.targetId,
      status: 'UNKNOWN',
      errorRatePct: -1,
      p95LatencyMs: -1,
      availabilityPct: -1,
      timestamp,
      source: 'REAL_METRIC',
      rawSignals: {
        error: 'Authoritative telemetry provider unreachable or unconfigured on current workstation',
      },
    };
  }

  /**
   * Evaluate health promotion eligibility (§14).
   * UNKNOWN status strictly prevents promotion.
   */
  public isEligibleForPromotion(reading: TelemetryReading): { eligible: boolean; reason?: string } {
    if (reading.status === 'UNKNOWN') {
      return {
        eligible: false,
        reason: 'PROMOTION_BLOCKED: Telemetry health status is UNKNOWN. Promotion requires verified HEALTHY telemetry (§14).',
      };
    }
    if (reading.status === 'FAILED') {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Telemetry status is FAILED (Error rate: ${reading.errorRatePct}%, Latency: ${reading.p95LatencyMs}ms).`,
      };
    }
    if (reading.status === 'DEGRADED') {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Telemetry status is DEGRADED (Error rate: ${reading.errorRatePct}% exceeds threshold).`,
      };
    }
    return { eligible: true };
  }
}
