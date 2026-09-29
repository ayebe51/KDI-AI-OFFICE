// ==========================================================
// services/api/src/llm/providers/openrouter.adapter.ts
// Official OpenRouter Multi-Model Provider Adapter
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

export class OpenRouterAdapter extends BaseProvider {
  public readonly provider: LLMProviderType = 'openrouter';
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(
    apiKey: string | undefined,
    defaultModel = 'anthropic/claude-3.5-sonnet',
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
      provider: 'openrouter',
      name: 'OpenRouter Unified Frontier API',
      isLocal: false,
      defaultModel: this.defaultModel,
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return this.modelRegistry.getModelsByProvider('openrouter');
  }

  public async generate(request: LLMRequest, selectedModel?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelToUse = selectedModel || request.preferredModel || this.defaultModel;

    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      throw new LLMException({
        code: 'AUTHENTICATION_FAILED',
        provider: 'openrouter',
        message: 'OpenRouter API key is missing or set to placeholder.',
        isRetryable: false,
      });
    }

    const quotaCheck = this.quotaManager.canExecute('openrouter', 1500);
    if (!quotaCheck.allowed) {
      throw new LLMException({
        code: 'RATE_LIMITED',
        provider: 'openrouter',
        message: quotaCheck.reason || 'OpenRouter rate limit or cooldown reached',
        retryAfterMs: quotaCheck.waitMs,
        isRetryable: true,
      });
    }

    const modelMeta = this.modelRegistry.getModel('openrouter', modelToUse);
    const messages = modelMeta
      ? ContextBudgeter.assessRequest(request, modelMeta).truncatedMessages
      : request.messages;

    const payloadMessages = [...messages];
    if (request.systemInstruction && !payloadMessages.some((m) => m.role === 'system')) {
      payloadMessages.unshift({ role: 'system', content: request.systemInstruction });
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://kdi-ai-office.local',
          'X-Title': 'KDI AI Office Living Virtual Digital Twin',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: payloadMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxOutputTokens ?? 2048,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text();
        this.recordFailedExecution(modelToUse, errorText, latencyMs);

        if (res.status === 429) {
          this.quotaManager.setCooldown('openrouter', 60_000);
        }

        throw LLMException.fromHttpStatus('openrouter', res.status, errorText);
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
        provider: 'openrouter',
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
        visitedProviders: ['openrouter'],
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.message || 'OpenRouter API network error';
      this.recordFailedExecution(modelToUse, errorMsg, latencyMs);

      if (err instanceof LLMException) throw err;
      throw new LLMException({
        code: 'PROVIDER_ERROR',
        provider: 'openrouter',
        message: `OpenRouter execution failure: ${errorMsg}`,
        rawError: err,
      });
    }
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      return {
        provider: 'openrouter',
        state: 'AUTH_ERROR',
        latencyMs: 0,
        message: 'OpenRouter API key is not configured.',
        consecutiveFailures: 0,
        circuitBreakerOpen: false,
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          provider: 'openrouter',
          state: 'AVAILABLE',
          latencyMs,
          consecutiveFailures: 0,
          circuitBreakerOpen: this.circuitBreaker.isOpen('openrouter'),
          quota: {
            source: 'provider',
            requestsRemaining: 200,
          },
        };
      }

      if (res.status === 429) {
        return {
          provider: 'openrouter',
          state: 'RATE_LIMITED',
          latencyMs,
          message: 'OpenRouter rate limit or credit limit reached',
          consecutiveFailures: 1,
          circuitBreakerOpen: this.circuitBreaker.isOpen('openrouter'),
        };
      }

      return {
        provider: 'openrouter',
        state: 'UNAVAILABLE',
        latencyMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('openrouter'),
      };
    } catch (err: any) {
      return {
        provider: 'openrouter',
        state: 'UNAVAILABLE',
        latencyMs: Date.now() - startTime,
        message: err.message || 'Failed to reach OpenRouter endpoints',
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('openrouter'),
      };
    }
  }
}
