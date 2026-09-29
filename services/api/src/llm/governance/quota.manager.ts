// ==========================================================
// services/api/src/llm/governance/quota.manager.ts
// Real-time Quota Tracking, Rate Limit Windows & Provider Cooldown
// ==========================================================

import type { LLMProviderType, ProviderQuotaStatus } from '@kdi/types';

interface RollingWindow {
  timestamp: number;
  tokens: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  waitMs?: number;
}

export class QuotaManager {
  private readonly providerQuotas = new Map<LLMProviderType, ProviderQuotaStatus>();
  private readonly requestWindows = new Map<LLMProviderType, RollingWindow[]>();
  private readonly cooldowns = new Map<LLMProviderType, number>();

  /**
   * Check if request can proceed under current rate-limits & quotas
   */
  public canExecute(provider: LLMProviderType, estimatedTokens = 1000): QuotaCheckResult {
    const now = Date.now();

    // 1. Check active cooldown
    const cooldownUntil = this.cooldowns.get(provider);
    if (cooldownUntil && now < cooldownUntil) {
      const waitMs = cooldownUntil - now;
      return {
        allowed: false,
        reason: `Provider ${provider} is in cooldown for another ${Math.ceil(waitMs / 1000)}s`,
        waitMs,
      };
    }

    // 2. Check remaining requests if known from response headers
    const quota = this.providerQuotas.get(provider);
    if (quota && quota.requestsRemaining !== undefined && quota.requestsRemaining <= 0) {
      let waitMs = 5000;
      if (quota.resetAt) {
        const resetTime = new Date(quota.resetAt).getTime();
        if (!isNaN(resetTime) && resetTime > now) {
          waitMs = resetTime - now;
        }
      }
      return {
        allowed: false,
        reason: `Provider ${provider} quota exhausted (0 remaining requests)`,
        waitMs,
      };
    }

    // 3. Check rolling 60-second window
    const windows = this.getCleanWindow(provider, now);
    const rpmLimit = quota?.requestsPerMinuteLimit;
    if (rpmLimit && windows.length >= rpmLimit) {
      const oldest = windows[0];
      const waitMs = 60_000 - (now - oldest.timestamp);
      return {
        allowed: false,
        reason: `Provider ${provider} hit local RPM limit (${rpmLimit} req/min)`,
        waitMs: Math.max(waitMs, 500),
      };
    }

    // 4. Check rolling TPM limit
    const tpmLimit = quota?.tokensPerMinuteLimit;
    if (tpmLimit) {
      const currentTokens = windows.reduce((sum, w) => sum + w.tokens, 0);
      if (currentTokens + estimatedTokens > tpmLimit) {
        return {
          allowed: false,
          reason: `Provider ${provider} hit local TPM limit (${tpmLimit} tokens/min)`,
          waitMs: 5000,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a dispatched request
   */
  public recordRequest(provider: LLMProviderType, tokens = 0): void {
    const now = Date.now();
    const windows = this.getCleanWindow(provider, now);
    windows.push({ timestamp: now, tokens });
    this.requestWindows.set(provider, windows);
  }

  /**
   * Update quota metrics reported by provider headers or discovery
   */
  public updateFromHeaders(
    provider: LLMProviderType,
    params: {
      requestsRemaining?: number;
      tokensRemaining?: number;
      requestsLimit?: number;
      tokensLimit?: number;
      resetAt?: string;
      source?: ProviderQuotaStatus['source'];
    }
  ): void {
    const existing = this.providerQuotas.get(provider) || {
      source: params.source || 'response_header',
    };

    if (params.requestsRemaining !== undefined) existing.requestsRemaining = params.requestsRemaining;
    if (params.tokensRemaining !== undefined) existing.tokensRemaining = params.tokensRemaining;
    if (params.requestsLimit !== undefined) existing.requestsPerMinuteLimit = params.requestsLimit;
    if (params.tokensLimit !== undefined) existing.tokensPerMinuteLimit = params.tokensLimit;
    if (params.resetAt !== undefined) existing.resetAt = params.resetAt;
    if (params.source !== undefined) existing.source = params.source;

    this.providerQuotas.set(provider, existing);
  }

  public setCooldown(provider: LLMProviderType, durationMs: number, reason?: string): void {
    this.cooldowns.set(provider, Date.now() + durationMs);
  }

  public clearCooldown(provider: LLMProviderType): void {
    this.cooldowns.delete(provider);
  }

  public getQuota(provider: LLMProviderType): ProviderQuotaStatus {
    return (
      this.providerQuotas.get(provider) || {
        source: 'unknown',
      }
    );
  }

  private getCleanWindow(provider: LLMProviderType, now: number): RollingWindow[] {
    const list = this.requestWindows.get(provider) || [];
    // Retain only events from the last 60 seconds
    const clean = list.filter((w) => now - w.timestamp < 60_000);
    this.requestWindows.set(provider, clean);
    return clean;
  }
}
