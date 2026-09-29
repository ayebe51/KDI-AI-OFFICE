// ==========================================================
// services/api/src/llm/governance/usage.tracker.ts
// Provider & Model Usage Tracking, Latency Averages & Error Logs
// ==========================================================

import type { LLMProviderType, ProviderUsageStats } from '@kdi/types';

export class UsageTracker {
  private readonly statsByProvider = new Map<LLMProviderType, ProviderUsageStats>();
  private readonly statsByModel = new Map<string, ProviderUsageStats>();

  public recordSuccess(params: {
    provider: LLMProviderType;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    latencyMs: number;
  }): void {
    const now = new Date().toISOString();

    // 1. Update Provider Stats
    const pStat = this.getOrCreate(this.statsByProvider, params.provider, params.provider);
    pStat.requestCount += 1;
    pStat.successfulRequests += 1;
    pStat.inputTokens += params.inputTokens;
    pStat.outputTokens += params.outputTokens;
    pStat.totalTokens += params.inputTokens + params.outputTokens;
    pStat.totalCostUsd = Number((pStat.totalCostUsd + params.costUsd).toFixed(6));
    pStat.averageLatencyMs = Math.round(
      (pStat.averageLatencyMs * (pStat.successfulRequests - 1) + params.latencyMs) /
        pStat.successfulRequests
    );
    pStat.lastUsedAt = now;

    // 2. Update Model Stats
    const modelKey = `${params.provider}::${params.model}`;
    const mStat = this.getOrCreate(this.statsByModel, modelKey, params.provider, params.model);
    mStat.requestCount += 1;
    mStat.successfulRequests += 1;
    mStat.inputTokens += params.inputTokens;
    mStat.outputTokens += params.outputTokens;
    mStat.totalTokens += params.inputTokens + params.outputTokens;
    mStat.totalCostUsd = Number((mStat.totalCostUsd + params.costUsd).toFixed(6));
    mStat.averageLatencyMs = Math.round(
      (mStat.averageLatencyMs * (mStat.successfulRequests - 1) + params.latencyMs) /
        mStat.successfulRequests
    );
    mStat.lastUsedAt = now;
  }

  public recordFailure(params: {
    provider: LLMProviderType;
    model?: string;
    error: string;
    latencyMs: number;
  }): void {
    const now = new Date().toISOString();

    const pStat = this.getOrCreate(this.statsByProvider, params.provider, params.provider);
    pStat.requestCount += 1;
    pStat.failedRequests += 1;
    pStat.lastError = params.error;
    pStat.lastUsedAt = now;

    if (params.model) {
      const modelKey = `${params.provider}::${params.model}`;
      const mStat = this.getOrCreate(this.statsByModel, modelKey, params.provider, params.model);
      mStat.requestCount += 1;
      mStat.failedRequests += 1;
      mStat.lastError = params.error;
      mStat.lastUsedAt = now;
    }
  }

  public getProviderStats(provider: LLMProviderType): ProviderUsageStats {
    return this.getOrCreate(this.statsByProvider, provider, provider);
  }

  public getAllProviderStats(): ProviderUsageStats[] {
    return Array.from(this.statsByProvider.values());
  }

  public getAllModelStats(): ProviderUsageStats[] {
    return Array.from(this.statsByModel.values());
  }

  private getOrCreate(
    map: Map<any, ProviderUsageStats>,
    key: any,
    provider: LLMProviderType,
    model?: string
  ): ProviderUsageStats {
    let stat = map.get(key);
    if (!stat) {
      stat = {
        provider,
        model,
        requestCount: 0,
        successfulRequests: 0,
        failedRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        averageLatencyMs: 0,
      };
      map.set(key, stat);
    }
    return stat;
  }
}
