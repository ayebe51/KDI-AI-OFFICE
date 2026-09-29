// ==========================================================
// services/api/src/llm/providers/gemini.adapter.ts
// Official Google Gemini API Provider Adapter
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

export class GeminiAdapter extends BaseProvider {
  public readonly provider: LLMProviderType = 'gemini';
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(
    apiKey: string | undefined,
    defaultModel = 'gemini-1.5-flash',
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
      provider: 'gemini',
      name: 'Google Gemini Cloud API',
      isLocal: false,
      defaultModel: this.defaultModel,
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    return this.modelRegistry.getModelsByProvider('gemini');
  }

  public async generate(request: LLMRequest, selectedModel?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelToUse = selectedModel || request.preferredModel || this.defaultModel;

    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      throw new LLMException({
        code: 'AUTHENTICATION_FAILED',
        provider: 'gemini',
        message: 'Google Gemini API key is missing or set to placeholder.',
        isRetryable: false,
      });
    }

    // Check quota manager
    const quotaCheck = this.quotaManager.canExecute('gemini', 1500);
    if (!quotaCheck.allowed) {
      throw new LLMException({
        code: 'RATE_LIMITED',
        provider: 'gemini',
        message: quotaCheck.reason || 'Gemini quota or cooldown limit reached',
        retryAfterMs: quotaCheck.waitMs,
        isRetryable: true,
      });
    }

    const modelMeta = this.modelRegistry.getModel('gemini', modelToUse);
    const messages = modelMeta
      ? ContextBudgeter.assessRequest(request, modelMeta).truncatedMessages
      : request.messages;

    // Build Gemini contents array
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handled in systemInstruction
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Ensure at least one user prompt exists
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Ping' }] });
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxOutputTokens ?? 2048,
      },
    };

    if (request.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: request.systemInstruction }],
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text();
        this.recordFailedExecution(modelToUse, errorText, latencyMs);

        if (res.status === 429) {
          this.quotaManager.setCooldown('gemini', 60_000);
        }

        throw LLMException.fromHttpStatus('gemini', res.status, errorText);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';

      const inputTokens = data.usageMetadata?.promptTokenCount || 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = data.usageMetadata?.totalTokenCount || inputTokens + outputTokens;

      const estimatedCostUsd = this.recordSuccessfulExecution({
        model: modelToUse,
        inputTokens,
        outputTokens,
        latencyMs,
      });

      return {
        requestId: request.requestId,
        provider: 'gemini',
        model: modelToUse,
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd,
        },
        latencyMs,
        finishReason: (candidate?.finishReason?.toLowerCase() as any) || 'stop',
        fallbackUsed: false,
        visitedProviders: ['gemini'],
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.message || 'Gemini API network error';
      this.recordFailedExecution(modelToUse, errorMsg, latencyMs);

      if (err instanceof LLMException) throw err;
      throw new LLMException({
        code: 'PROVIDER_ERROR',
        provider: 'gemini',
        message: `Gemini execution failure: ${errorMsg}`,
        rawError: err,
      });
    }
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      return {
        provider: 'gemini',
        state: 'AUTH_ERROR',
        latencyMs: 0,
        message: 'Gemini API key is not configured.',
        consecutiveFailures: 0,
        circuitBreakerOpen: false,
      };
    }

    const startTime = Date.now();
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(endpoint, { method: 'GET' });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          provider: 'gemini',
          state: 'AVAILABLE',
          latencyMs,
          consecutiveFailures: 0,
          circuitBreakerOpen: this.circuitBreaker.isOpen('gemini'),
          quota: {
            source: 'provider',
            requestsRemaining: 360,
          },
        };
      }

      if (res.status === 429) {
        return {
          provider: 'gemini',
          state: 'RATE_LIMITED',
          latencyMs,
          message: 'Rate limit / Quota exceeded',
          consecutiveFailures: 1,
          circuitBreakerOpen: this.circuitBreaker.isOpen('gemini'),
        };
      }

      return {
        provider: 'gemini',
        state: 'UNAVAILABLE',
        latencyMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('gemini'),
      };
    } catch (err: any) {
      return {
        provider: 'gemini',
        state: 'UNAVAILABLE',
        latencyMs: Date.now() - startTime,
        message: err.message || 'Failed to reach Gemini endpoints',
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('gemini'),
      };
    }
  }
}
