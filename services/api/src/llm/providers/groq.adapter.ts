// ==========================================================
// services/api/src/llm/providers/groq.adapter.ts
// Official Groq LPU Provider Adapter with Rate-Limit Header Ingestion
// ==========================================================

import type {
  LLMProviderType,
  ModelMetadata,
  LLMRequest,
  LLMResponse,
  ProviderHealthStatus,
  ProviderInfo,
} from '@kdi/types';
import { BaseProvider } from './base-provider.js';
import { LLMException } from '../exceptions/llm.exception.js';
import { ContextBudgeter } from '../context/context-budgeter.js';

export class GroqAdapter extends BaseProvider {
  public readonly provider: LLMProviderType = 'groq';
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(
    apiKey: string | undefined,
    defaultModel = 'llama-3.3-70b-versatile',
    modelRegistry: any,
    quotaManager: any,
    usageTracker: any,
    circuitBreaker: any
  ) {
    super(modelRegistry, quotaManager, usageTracker, circuitBreaker);
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  public getProviderInfo(): ProviderInfo {
    return {
      provider: 'groq',
      name: 'Groq LPU Ultra-Low Latency Cloud',
      isLocal: false,
      defaultModel: this.defaultModel,
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return this.modelRegistry.getModelsByProvider('groq');
  }

  public async generate(request: LLMRequest, selectedModel?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelToUse = selectedModel || request.preferredModel || this.defaultModel;

    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      throw new LLMException({
        code: 'AUTHENTICATION_FAILED',
        provider: 'groq',
        message: 'Groq API key is missing or set to placeholder.',
        isRetryable: false,
      });
    }

    // Check quota manager
    const quotaCheck = this.quotaManager.canExecute('groq', 1000);
    if (!quotaCheck.allowed) {
      throw new LLMException({
        code: 'RATE_LIMITED',
        provider: 'groq',
        message: quotaCheck.reason || 'Groq rate-limit window or cooldown reached',
        retryAfterMs: quotaCheck.waitMs,
        isRetryable: true,
      });
    }

    const modelMeta = this.modelRegistry.getModel('groq', modelToUse);
    const messages = modelMeta
      ? ContextBudgeter.assessRequest(request, modelMeta).truncatedMessages
      : request.messages;

    const payloadMessages = [...messages];
    if (request.systemInstruction && !payloadMessages.some((m) => m.role === 'system')) {
      payloadMessages.unshift({ role: 'system', content: request.systemInstruction });
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: payloadMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxOutputTokens ?? 2048,
          stream: false,
        }),
      });

      const latencyMs = Date.now() - startTime;

      // Extract real-time rate limit headers reported by Groq
      this.extractRateLimitHeaders(res.headers);

      if (!res.ok) {
        const errorText = await res.text();
        this.recordFailedExecution(modelToUse, errorText, latencyMs);

        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

        if (res.status === 429) {
          this.quotaManager.setCooldown('groq', (retryAfterSec || 60) * 1000);
        }

        throw LLMException.fromHttpStatus('groq', res.status, errorText, retryAfterSec);
      }

      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const choice = data.choices?.[0];
      const content = choice?.message?.content || '';

      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || inputTokens + outputTokens;

      const estimatedCostUsd = this.recordSuccessfulExecution({
        model: modelToUse,
        inputTokens,
        outputTokens,
        latencyMs,
      });

      return {
        requestId: request.requestId,
        provider: 'groq',
        model: modelToUse,
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd,
        },
        latencyMs,
        finishReason: (choice?.finish_reason as any) || 'stop',
        fallbackUsed: false,
        visitedProviders: ['groq'],
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.message || 'Groq API network error';
      this.recordFailedExecution(modelToUse, errorMsg, latencyMs);

      if (err instanceof LLMException) throw err;
      throw new LLMException({
        code: 'PROVIDER_ERROR',
        provider: 'groq',
        message: `Groq execution failure: ${errorMsg}`,
        rawError: err,
      });
    }
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      return {
        provider: 'groq',
        state: 'AUTH_ERROR',
        latencyMs: 0,
        message: 'Groq API key is not configured.',
        consecutiveFailures: 0,
        circuitBreakerOpen: false,
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const latencyMs = Date.now() - startTime;
      this.extractRateLimitHeaders(res.headers);

      if (res.ok) {
        return {
          provider: 'groq',
          state: 'AVAILABLE',
          latencyMs,
          consecutiveFailures: 0,
          circuitBreakerOpen: this.circuitBreaker.isOpen('groq'),
          quota: this.quotaManager.getQuota('groq'),
        };
      }

      if (res.status === 429) {
        return {
          provider: 'groq',
          state: 'RATE_LIMITED',
          latencyMs,
          message: 'Groq rate limit exceeded',
          consecutiveFailures: 1,
          circuitBreakerOpen: this.circuitBreaker.isOpen('groq'),
        };
      }

      return {
        provider: 'groq',
        state: 'UNAVAILABLE',
        latencyMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('groq'),
      };
    } catch (err: any) {
      return {
        provider: 'groq',
        state: 'UNAVAILABLE',
        latencyMs: Date.now() - startTime,
        message: err.message || 'Failed to reach Groq endpoints',
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('groq'),
      };
    }
  }

  private extractRateLimitHeaders(headers: Headers): void {
    const remainingReq = headers.get('x-ratelimit-remaining-requests');
    const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
    const limitReq = headers.get('x-ratelimit-limit-requests');
    const limitTokens = headers.get('x-ratelimit-limit-tokens');
    const resetReq = headers.get('x-ratelimit-reset-requests');

    if (remainingReq !== null || remainingTokens !== null) {
      this.quotaManager.updateFromHeaders('groq', {
        requestsRemaining: remainingReq !== null ? parseInt(remainingReq, 10) : undefined,
        tokensRemaining: remainingTokens !== null ? parseInt(remainingTokens, 10) : undefined,
        requestsLimit: limitReq !== null ? parseInt(limitReq, 10) : undefined,
        tokensLimit: limitTokens !== null ? parseInt(limitTokens, 10) : undefined,
        resetAt: resetReq || undefined,
        source: 'response_header',
      });
    }
  }
}
