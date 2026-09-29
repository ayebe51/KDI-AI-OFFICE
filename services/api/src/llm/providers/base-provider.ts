// ==========================================================
// services/api/src/llm/providers/base-provider.ts
// Base Provider Abstraction with Metrics & Health Probing
// ==========================================================

import type {
  LLMProviderType,
  ModelMetadata,
  LLMRequest,
  LLMResponse,
  ProviderHealthStatus,
  ModelCapability,
  ProviderUsageStats,
} from '@kdi/types';
import type { LLMProvider, ProviderInfo } from '../interfaces/llm-provider.interface.js';
import { ModelRegistry } from '../registries/model.registry.js';
import { QuotaManager } from '../governance/quota.manager.js';
import { UsageTracker } from '../governance/usage.tracker.js';
import { CircuitBreaker } from '../governance/circuit-breaker.js';
import { CostEstimator } from '../governance/cost.estimator.js';

export abstract class BaseProvider implements LLMProvider {
  public abstract readonly provider: LLMProviderType;

  constructor(
    protected readonly modelRegistry: ModelRegistry,
    protected readonly quotaManager: QuotaManager,
    protected readonly usageTracker: UsageTracker,
    protected readonly circuitBreaker: CircuitBreaker
  ) {}

  public abstract getProviderInfo(): ProviderInfo;

  public abstract listModels(): Promise<ModelMetadata[]>;

  public abstract generate(request: LLMRequest, selectedModel?: string): Promise<LLMResponse>;

  public abstract healthCheck(): Promise<ProviderHealthStatus>;

  public getCapabilities(modelId: string): ModelCapability[] {
    const meta = this.modelRegistry.getModel(this.provider, modelId);
    return meta ? meta.capabilities : ['TEXT'];
  }

  public getUsage(): ProviderUsageStats {
    return this.usageTracker.getProviderStats(this.provider);
  }

  protected recordSuccessfulExecution(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  }): number {
    const modelMeta = this.modelRegistry.getModel(this.provider, params.model);
    let costUsd = 0;
    if (modelMeta) {
      costUsd = CostEstimator.calculateCost(modelMeta, params.inputTokens, params.outputTokens).totalCostUsd;
    }

    this.usageTracker.recordSuccess({
      provider: this.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
      latencyMs: params.latencyMs,
    });

    this.quotaManager.recordRequest(this.provider, params.inputTokens + params.outputTokens);
    this.circuitBreaker.recordSuccess(this.provider);

    return costUsd;
  }

  protected recordFailedExecution(model: string | undefined, error: string, latencyMs: number): void {
    this.usageTracker.recordFailure({
      provider: this.provider,
      model,
      error,
      latencyMs,
    });
    this.circuitBreaker.recordFailure(this.provider, error);
  }
}
