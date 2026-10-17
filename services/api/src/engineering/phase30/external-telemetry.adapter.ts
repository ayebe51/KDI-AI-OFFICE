// ==========================================================
// services/api/src/engineering/phase30/external-telemetry.adapter.ts
// Phase 30.4: Authoritative External Telemetry Provider Adapter (§4.B3)
// ==========================================================

import type {
  DeploymentTarget,
  TelemetryReading,
  TelemetryStatus,
  SignedSloThresholds,
} from './phase30.types.js';

export interface ExternalTelemetryOptions {
  providerType?: 'PROMETHEUS' | 'DATADOG' | 'HTTP_GATEWAY' | 'SIMULATED';
  endpointUrl?: string;
  authToken?: string;
  timeoutMs?: number;
  maxFreshnessMs?: number;
  mockPayload?: {
    status?: TelemetryStatus;
    p95LatencyMs?: number;
    errorRatePct?: number;
    availabilityPct?: number;
    timestamp?: string;
  };
}

export class ExternalTelemetryAdapter {
  private static readonly DEFAULT_TIMEOUT_MS = 3000;
  private static readonly DEFAULT_MAX_FRESHNESS_MS = 180_000; // 3 minutes

  public static readonly DEFAULT_SLOS: SignedSloThresholds = {
    p95LatencyMaxMs: 250,
    errorRateMaxPct: 1.0,
    availabilityMinPct: 99.5,
  };

  /**
   * Observe telemetry from external provider with strict validation (§4.B3)
   */
  public async observeTarget(
    target: DeploymentTarget,
    options?: ExternalTelemetryOptions
  ): Promise<TelemetryReading> {
    const timeoutMs = options?.timeoutMs || ExternalTelemetryAdapter.DEFAULT_TIMEOUT_MS;
    const maxFreshnessMs =
      options?.maxFreshnessMs || ExternalTelemetryAdapter.DEFAULT_MAX_FRESHNESS_MS;
    const now = Date.now();

    // 1. Check if mock/simulated payload is provided (for deterministic tests)
    if (options?.mockPayload) {
      const mock = options.mockPayload;
      const metricTimestamp = mock.timestamp
        ? new Date(mock.timestamp).getTime()
        : now;
      const ageMs = now - metricTimestamp;

      // Freshness check (§4.B3)
      if (ageMs > maxFreshnessMs) {
        return {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: mock.errorRatePct ?? -1,
          p95LatencyMs: mock.p95LatencyMs ?? -1,
          availabilityPct: mock.availabilityPct ?? -1,
          timestamp: new Date(metricTimestamp).toISOString(),
          source: 'TEST_ADAPTER',
          rawSignals: {
            error: `STALE_METRIC: Metric age (${Math.round(
              ageMs / 1000
            )}s) exceeds max allowable freshness (${Math.round(
              maxFreshnessMs / 1000
            )}s).`,
          },
        };
      }

      return {
        targetId: target.targetId,
        status: mock.status || 'UNKNOWN',
        errorRatePct: mock.errorRatePct ?? (mock.status === 'HEALTHY' ? 0.05 : 6.5),
        p95LatencyMs: mock.p95LatencyMs ?? (mock.status === 'HEALTHY' ? 120 : 850),
        availabilityPct:
          mock.availabilityPct ?? (mock.status === 'HEALTHY' ? 99.98 : 94.2),
        timestamp: new Date(metricTimestamp).toISOString(),
        source: 'TEST_ADAPTER',
        rawSignals: { simulated: true },
      };
    }

    // 2. If no external endpoint is configured, return fail-closed UNKNOWN (§4.B3)
    const isStaging = target.environment === 'STAGING';
    const hasEndpoint =
      options?.endpointUrl ||
      (isStaging
        ? process.env.PROMETHEUS_STAGING_ENDPOINT ||
          process.env.PROMETHEUS_ENDPOINT ||
          process.env.DATADOG_STAGING_API_KEY ||
          process.env.DATADOG_API_KEY
        : process.env.PROMETHEUS_ENDPOINT || process.env.DATADOG_API_KEY);

    if (!hasEndpoint) {
      return {
        targetId: target.targetId,
        status: 'UNKNOWN',
        errorRatePct: -1,
        p95LatencyMs: -1,
        availabilityPct: -1,
        timestamp: new Date(now).toISOString(),
        source: 'TEST_ADAPTER',
        rawSignals: {
          error: isStaging
            ? 'NO_PROVIDER_CONFIGURED: Neither PROMETHEUS_STAGING_ENDPOINT nor DATADOG_STAGING_API_KEY configured.'
            : 'NO_PROVIDER_CONFIGURED: Neither PROMETHEUS_ENDPOINT nor DATADOG_API_KEY configured.',
        },
      };
    }

    // 3. Query external provider with bounded timeout
    const endpoint =
      options?.endpointUrl ||
      (isStaging
        ? process.env.PROMETHEUS_STAGING_ENDPOINT || process.env.PROMETHEUS_ENDPOINT!
        : process.env.PROMETHEUS_ENDPOINT!);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(options?.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: -1,
          p95LatencyMs: -1,
          availabilityPct: -1,
          timestamp: new Date().toISOString(),
          source: 'REAL_METRIC',
          rawSignals: { httpStatus: response.status, statusText: response.statusText },
        };
      }

      const body = (await response.json()) as any;

      // Schema validation
      if (
        typeof body?.errorRatePct !== 'number' ||
        typeof body?.p95LatencyMs !== 'number' ||
        typeof body?.availabilityPct !== 'number'
      ) {
        return {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: -1,
          p95LatencyMs: -1,
          availabilityPct: -1,
          timestamp: new Date().toISOString(),
          source: 'REAL_METRIC',
          rawSignals: { error: 'INVALID_SCHEMA: Response missing numeric metrics.' },
        };
      }

      // Environment tag validation (§4.B3)
      if (body.environment && body.environment !== target.environment) {
        return {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: body.errorRatePct,
          p95LatencyMs: body.p95LatencyMs,
          availabilityPct: body.availabilityPct,
          timestamp: new Date().toISOString(),
          source: 'REAL_METRIC',
          rawSignals: {
            error: `ENVIRONMENT_MISMATCH: Metric is tagged for '${body.environment}' but target environment is '${target.environment}'.`,
          },
        };
      }

      // Metric freshness validation
      const metricTime = body.timestamp ? new Date(body.timestamp).getTime() : now;
      if (now - metricTime > maxFreshnessMs) {
        return {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: body.errorRatePct,
          p95LatencyMs: body.p95LatencyMs,
          availabilityPct: body.availabilityPct,
          timestamp: new Date(metricTime).toISOString(),
          source: 'REAL_METRIC',
          rawSignals: { error: 'STALE_METRICS: Telemetry is older than max allowed age.' },
        };
      }

      // Determine status from thresholds
      const status: TelemetryStatus =
        body.errorRatePct < ExternalTelemetryAdapter.DEFAULT_SLOS.errorRateMaxPct &&
        body.p95LatencyMs < ExternalTelemetryAdapter.DEFAULT_SLOS.p95LatencyMaxMs &&
        body.availabilityPct >= ExternalTelemetryAdapter.DEFAULT_SLOS.availabilityMinPct
          ? 'HEALTHY'
          : body.errorRatePct > 5.0 || body.availabilityPct < 95.0
          ? 'FAILED'
          : 'DEGRADED';

      return {
        targetId: target.targetId,
        status,
        errorRatePct: body.errorRatePct,
        p95LatencyMs: body.p95LatencyMs,
        availabilityPct: body.availabilityPct,
        timestamp: new Date(metricTime).toISOString(),
        source: 'REAL_METRIC',
        rawSignals: body,
      };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = (err as any)?.name === 'AbortError';
      return {
        targetId: target.targetId,
        status: 'UNKNOWN',
        errorRatePct: -1,
        p95LatencyMs: -1,
        availabilityPct: -1,
        timestamp: new Date().toISOString(),
        source: 'REAL_METRIC',
        rawSignals: {
          error: isAbort
            ? `TIMEOUT: Provider failed to respond within ${timeoutMs}ms.`
            : `NETWORK_ERROR: ${(err as Error).message}`,
        },
      };
    }
  }

  /**
   * Health gate evaluation with fail-closed UNKNOWN handling (§4.B3, §9)
   * Invariant: UNKNOWN ≠ HEALTHY
   */
  public isEligibleForPromotion(
    reading: TelemetryReading,
    slos?: SignedSloThresholds
  ): { eligible: boolean; reason?: string } {
    const activeSlos = slos || ExternalTelemetryAdapter.DEFAULT_SLOS;

    // Invariant: UNKNOWN is strictly ineligible
    if (reading.status === 'UNKNOWN') {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Telemetry status is UNKNOWN (UNKNOWN ≠ HEALTHY). Details: ${JSON.stringify(
          reading.rawSignals || {}
        )}`,
      };
    }

    if (reading.status === 'FAILED') {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Telemetry indicates service failure (Status: FAILED, Error Rate: ${reading.errorRatePct}%, Availability: ${reading.availabilityPct}%).`,
      };
    }

    if (reading.status === 'DEGRADED') {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Telemetry indicates degraded performance (Status: DEGRADED, P95: ${reading.p95LatencyMs}ms, Error Rate: ${reading.errorRatePct}%).`,
      };
    }

    // Verify against SLO thresholds
    if (reading.errorRatePct > activeSlos.errorRateMaxPct) {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Error rate ${reading.errorRatePct}% exceeds threshold ${activeSlos.errorRateMaxPct}%.`,
      };
    }

    if (reading.p95LatencyMs > activeSlos.p95LatencyMaxMs) {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: P95 latency ${reading.p95LatencyMs}ms exceeds threshold ${activeSlos.p95LatencyMaxMs}ms.`,
      };
    }

    if (reading.availabilityPct < activeSlos.availabilityMinPct) {
      return {
        eligible: false,
        reason: `PROMOTION_BLOCKED: Availability ${reading.availabilityPct}% below required ${activeSlos.availabilityMinPct}%.`,
      };
    }

    return { eligible: true };
  }
}
