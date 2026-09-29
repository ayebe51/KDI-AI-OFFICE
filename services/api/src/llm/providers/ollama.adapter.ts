// ==========================================================
// services/api/src/llm/providers/ollama.adapter.ts
// Local Sovereign Ollama Provider Adapter (CPU-Friendly)
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

export class OllamaAdapter extends BaseProvider {
  public readonly provider: LLMProviderType = 'ollama';
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(
    baseUrl = 'http://127.0.0.1:11434',
    defaultModel = 'qwen2.5-coder:7b-instruct-q4_K_M',
    modelRegistry: any,
    quotaManager: any,
    usageTracker: any,
    circuitBreaker: any
  ) {
    super(modelRegistry, quotaManager, usageTracker, circuitBreaker);
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultModel = defaultModel;
  }

  public getProviderInfo(): ProviderInfo {
    return {
      provider: 'ollama',
      name: 'Local Ollama Daemon (Sovereign)',
      isLocal: true,
      defaultModel: this.defaultModel,
    };
  }

  public async listModels(): Promise<ModelMetadata[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) {
        return this.modelRegistry.getModelsByProvider('ollama');
      }
      const data = (await res.json()) as { models?: Array<{ name: string; size: number }> };
      if (!data.models) return this.modelRegistry.getModelsByProvider('ollama');

      // Register dynamically discovered models
      for (const m of data.models) {
        if (!this.modelRegistry.getModel('ollama', m.name)) {
          this.modelRegistry.registerModel({
            provider: 'ollama',
            modelId: m.name,
            displayName: `Ollama ${m.name}`,
            enabled: true,
            capabilities: ['TEXT', 'LOCAL', 'PRIVATE'],
            contextLimit: 32_768,
            maxOutputTokens: 4096,
            streaming: true,
            toolCalling: false,
            structuredOutput: false,
            reasoning: false,
            coding: m.name.includes('code'),
            vision: false,
            fast: m.name.includes('3b') || m.name.includes('1.5b'),
            local: true,
            private: true,
            billingMode: 'FREE',
            quotaMode: 'UNLIMITED',
            pricing: {
              inputCostPerMillion: 0,
              outputCostPerMillion: 0,
              currency: 'USD',
              pricingSource: 'local_ollama_discovered',
              pricingVersion: 'v1',
            },
            discoveryState: 'DISCOVERED',
          });
        }
      }
      return this.modelRegistry.getModelsByProvider('ollama');
    } catch {
      return this.modelRegistry.getModelsByProvider('ollama');
    }
  }

  public async generate(request: LLMRequest, selectedModel?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelToUse = selectedModel || request.preferredModel || this.defaultModel;

    // Assess context budget
    const modelMeta = this.modelRegistry.getModel('ollama', modelToUse);
    const messages = modelMeta
      ? ContextBudgeter.assessRequest(request, modelMeta).truncatedMessages
      : request.messages;

    const payloadMessages = [...messages];
    if (request.systemInstruction && !payloadMessages.some((m) => m.role === 'system')) {
      payloadMessages.unshift({ role: 'system', content: request.systemInstruction });
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messages: payloadMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxOutputTokens ?? 2048,
          },
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text();
        this.recordFailedExecution(modelToUse, errorText, latencyMs);
        throw LLMException.fromHttpStatus('ollama', res.status, errorText);
      }

      const data = (await res.json()) as {
        message?: { content: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const content = data.message?.content || '';
      const inputTokens = data.prompt_eval_count || ContextBudgeter.estimateTokens(JSON.stringify(payloadMessages));
      const outputTokens = data.eval_count || ContextBudgeter.estimateTokens(content);
      const totalTokens = inputTokens + outputTokens;

      const estimatedCostUsd = this.recordSuccessfulExecution({
        model: modelToUse,
        inputTokens,
        outputTokens,
        latencyMs,
      });

      return {
        requestId: request.requestId,
        provider: 'ollama',
        model: modelToUse,
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd,
        },
        latencyMs,
        finishReason: 'stop',
        fallbackUsed: false,
        visitedProviders: ['ollama'],
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.message || 'Unknown network error connecting to Ollama daemon';
      this.recordFailedExecution(modelToUse, errorMsg, latencyMs);

      if (err instanceof LLMException) throw err;
      throw new LLMException({
        code: 'PROVIDER_UNAVAILABLE',
        provider: 'ollama',
        message: `Failed to connect to local Ollama daemon at ${this.baseUrl}: ${errorMsg}`,
        rawError: err,
      });
    }
  }

  public async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          provider: 'ollama',
          state: 'AVAILABLE',
          latencyMs,
          consecutiveFailures: 0,
          circuitBreakerOpen: this.circuitBreaker.isOpen('ollama'),
          quota: {
            source: 'configuration',
            requestsRemaining: 999999,
          },
        };
      }
      return {
        provider: 'ollama',
        state: 'UNAVAILABLE',
        latencyMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('ollama'),
      };
    } catch (err: any) {
      return {
        provider: 'ollama',
        state: 'UNAVAILABLE',
        latencyMs: Date.now() - startTime,
        message: err.message || 'Connection refused (Daemon offline)',
        consecutiveFailures: 1,
        circuitBreakerOpen: this.circuitBreaker.isOpen('ollama'),
      };
    }
  }
}
