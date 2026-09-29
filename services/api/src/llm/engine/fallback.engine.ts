// ==========================================================
// services/api/src/llm/engine/fallback.engine.ts
// Resilient LLM Fallback Engine with Loop Protection & Telemetry
// ==========================================================

import type {
  LLMRequest,
  LLMResponse,
  RoutingDecision,
  LLMProviderType,
} from '@kdi/types';
import { LLMProvider } from '../interfaces/llm-provider.interface.js';
import { CircuitBreaker } from '../governance/circuit-breaker.js';
import { QuotaManager } from '../governance/quota.manager.js';
import { ModelRegistry } from '../registries/model.registry.js';
import { CapabilityRegistry } from '../registries/capability.registry.js';
import { LLMException } from '../exceptions/llm.exception.js';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import type { EventsGateway } from '../../websocket/events.gateway.js';

interface FallbackCandidate {
  provider: LLMProviderType;
  model: string;
  trigger?: string;
}

export class FallbackEngine {
  private readonly logger = new StructuredLogger('FallbackEngine');

  constructor(
    private readonly providers: Map<LLMProviderType, LLMProvider>,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly quotaManager: QuotaManager,
    private readonly modelRegistry: ModelRegistry,
    private readonly eventsGateway?: EventsGateway
  ) {}

  public async executeWithFallback(
    request: LLMRequest,
    routingDecision: RoutingDecision
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const maxAttempts = Math.min(request.fallbackPolicy?.maxAttempts ?? 3, 5);
    const deadlineMs = request.fallbackPolicy?.deadlineMs ?? 45_000;
    const deadline = startTime + deadlineMs;

    const visitedProviders = new Set<LLMProviderType>();
    const executionErrors: Array<{ provider: string; model: string; error: string }> = [];

    // Assemble ordered execution candidate queue
    const queue: FallbackCandidate[] = [
      {
        provider: routingDecision.selectedProvider,
        model: routingDecision.selectedModel,
        trigger: 'PRIMARY',
      },
      ...routingDecision.fallbackChain.map((f) => ({
        provider: f.provider,
        model: f.model,
        trigger: f.trigger,
      })),
    ];

    let attempt = 0;

    for (const candidate of queue) {
      // 1. Deadline check
      if (Date.now() >= deadline) {
        this.logger.warn('executeWithFallback', `Request ${request.requestId} deadline exceeded (${deadlineMs}ms)`);
        break;
      }

      // 2. Max attempts check
      if (attempt >= maxAttempts) {
        this.logger.warn('executeWithFallback', `Request ${request.requestId} reached max attempts (${maxAttempts})`);
        break;
      }

      // 3. Fallback Loop Protection: Never revisit an already tried provider
      if (visitedProviders.has(candidate.provider)) {
        this.logger.debug('executeWithFallback', `Loop prevention: Skipping already visited provider ${candidate.provider}`);
        continue;
      }

      // 4. Capability & Privacy Preservation Check
      const targetModel = this.modelRegistry.getModel(candidate.provider, candidate.model);
      if (!targetModel || !targetModel.enabled) {
        this.logger.warn('executeWithFallback', `Model ${candidate.model} on ${candidate.provider} is disabled or unlisted`);
        continue;
      }

      const satisfiesPrivacy = CapabilityRegistry.satisfiesPrivacy(
        targetModel,
        request.privacyClass || 'INTERNAL'
      );
      if (!satisfiesPrivacy) {
        this.logger.warn(
          'executeWithFallback',
          `Privacy boundary: Model ${candidate.model} does not satisfy privacy class ${request.privacyClass}. Skipping.`
        );
        continue;
      }

      const satisfiesCaps = CapabilityRegistry.satisfiesCapabilities(
        targetModel,
        request.requiredCapabilities || []
      );
      if (!satisfiesCaps) {
        this.logger.warn(
          'executeWithFallback',
          `Capability mismatch: Fallback model ${candidate.model} lacks required capabilities. Skipping.`
        );
        continue;
      }

      // 5. Circuit Breaker Check
      if (this.circuitBreaker.isOpen(candidate.provider)) {
        this.logger.warn(
          'executeWithFallback',
          `Circuit breaker OPEN for provider ${candidate.provider}. Skipping candidate.`
        );
        continue;
      }

      // 6. Quota / Cooldown Check
      const quotaStatus = this.quotaManager.canExecute(candidate.provider, 1500);
      if (!quotaStatus.allowed) {
        this.logger.warn(
          'executeWithFallback',
          `Quota/Cooldown active for provider ${candidate.provider}: ${quotaStatus.reason}. Skipping candidate.`
        );
        continue;
      }

      // 7. Adapter Availability Check
      const providerAdapter = this.providers.get(candidate.provider);
      if (!providerAdapter) {
        this.logger.warn(
          'executeWithFallback',
          `Provider adapter ${candidate.provider} not initialized. Skipping.`
        );
        continue;
      }

      // Record visit
      visitedProviders.add(candidate.provider);
      attempt++;

      const isFallback = attempt > 1;
      if (isFallback) {
        this.logger.info(
          'executeWithFallback',
          `Cascading to fallback [Attempt ${attempt}/${maxAttempts}]: Provider=${candidate.provider}, Model=${candidate.model}`
        );

        if (this.eventsGateway) {
          try {
            this.eventsGateway.broadcastEvent(
              createWSEventEnvelope('llm.fallback.triggered', 'office:events', {
                requestId: request.requestId,
                attempt,
                provider: candidate.provider,
                model: candidate.model,
                trigger: candidate.trigger,
              })
            );
          } catch {
            // Ignore broadcast failure
          }
        }
      }

      // 8. Execute inference
      try {
        const response = await providerAdapter.generate(request, candidate.model);

        // Enrich response with fallback telemetry
        response.fallbackUsed = isFallback;
        response.visitedProviders = Array.from(visitedProviders);
        response.routingReason = routingDecision.routingReason;

        this.logger.info(
          'executeWithFallback',
          `Request ${request.requestId} completed successfully via ${candidate.provider}/${candidate.model} (Latency: ${response.latencyMs}ms, Fallback: ${isFallback})`
        );

        return response;
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          'executeWithFallback',
          `Execution error on provider ${candidate.provider}/${candidate.model}: ${errorMsg}`
        );

        executionErrors.push({
          provider: candidate.provider,
          model: candidate.model,
          error: errorMsg,
        });

        // If rate limited with retry-after, apply cooldown to quota manager
        if (err instanceof LLMException && err.code === 'RATE_LIMITED' && err.retryAfterMs) {
          this.quotaManager.setCooldown(candidate.provider, err.retryAfterMs);
        }

        // Brief backoff before next candidate attempt (e.g. 200ms)
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // All execution attempts exhausted
    const summary = executionErrors
      .map((e) => `[${e.provider}/${e.model}: ${e.error}]`)
      .join(', ');

    throw new LLMException({
      code: 'PROVIDER_UNAVAILABLE',
      provider: routingDecision.selectedProvider,
      message: `All fallback paths exhausted for request ${request.requestId} (Attempts: ${attempt}). Failures: ${summary || 'No eligible providers available'}`,
      isRetryable: false,
    });
  }
}
