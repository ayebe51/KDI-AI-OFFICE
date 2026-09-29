// ==========================================================
// services/api/src/llm/registries/model.registry.ts
// Comprehensive Model Metadata Registry & Catalog
// ==========================================================

import type { ModelMetadata, LLMProviderType } from '@kdi/types';

export class ModelRegistry {
  private readonly models = new Map<string, ModelMetadata>();

  constructor() {
    this.registerBaselineCatalog();
  }

  private registerBaselineCatalog(): void {
    const catalog: ModelMetadata[] = [
      // 1. Google Gemini Models
      {
        provider: 'gemini',
        modelId: 'gemini-1.5-pro',
        displayName: 'Google Gemini 1.5 Pro',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'TOOL_CALLING', 'STRUCTURED_OUTPUT', 'VISION', 'LONG_CONTEXT'],
        contextLimit: 2_097_152,
        maxOutputTokens: 8192,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        reasoning: true,
        coding: true,
        vision: true,
        fast: false,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 1.25,
          outputCostPerMillion: 5.0,
          currency: 'USD',
          pricingSource: 'official_google_cloud_pricing',
          pricingVersion: '2025.01',
        },
        discoveryState: 'CONFIGURED',
      },
      {
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        displayName: 'Google Gemini 1.5 Flash',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'TOOL_CALLING', 'STRUCTURED_OUTPUT', 'VISION', 'LONG_CONTEXT', 'FAST'],
        contextLimit: 1_048_576,
        maxOutputTokens: 8192,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        reasoning: true,
        coding: true,
        vision: true,
        fast: true,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 0.075,
          outputCostPerMillion: 0.3,
          currency: 'USD',
          pricingSource: 'official_google_cloud_pricing',
          pricingVersion: '2025.01',
        },
        discoveryState: 'CONFIGURED',
      },
      {
        provider: 'gemini',
        modelId: 'gemini-2.0-flash',
        displayName: 'Google Gemini 2.0 Flash',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'TOOL_CALLING', 'STRUCTURED_OUTPUT', 'VISION', 'LONG_CONTEXT', 'FAST'],
        contextLimit: 1_048_576,
        maxOutputTokens: 8192,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        reasoning: true,
        coding: true,
        vision: true,
        fast: true,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 0.1,
          outputCostPerMillion: 0.4,
          currency: 'USD',
          pricingSource: 'official_google_cloud_pricing',
          pricingVersion: '2025.02',
        },
        discoveryState: 'CONFIGURED',
      },

      // 2. Groq LPU Models
      {
        provider: 'groq',
        modelId: 'llama-3.3-70b-versatile',
        displayName: 'Groq Llama 3.3 70B Versatile',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'TOOL_CALLING', 'STRUCTURED_OUTPUT', 'FAST'],
        contextLimit: 128_000,
        maxOutputTokens: 32_768,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        reasoning: true,
        coding: true,
        vision: false,
        fast: true,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 0.59,
          outputCostPerMillion: 0.79,
          currency: 'USD',
          pricingSource: 'official_groq_pricing',
          pricingVersion: '2025.01',
        },
        discoveryState: 'CONFIGURED',
      },
      {
        provider: 'groq',
        modelId: 'mixtral-8x7b-32768',
        displayName: 'Groq Mixtral 8x7B',
        enabled: true,
        capabilities: ['TEXT', 'FAST'],
        contextLimit: 32_768,
        maxOutputTokens: 4096,
        streaming: true,
        toolCalling: true,
        structuredOutput: false,
        reasoning: false,
        coding: false,
        vision: false,
        fast: true,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 0.24,
          outputCostPerMillion: 0.24,
          currency: 'USD',
          pricingSource: 'official_groq_pricing',
          pricingVersion: '2025.01',
        },
        discoveryState: 'CONFIGURED',
      },

      // 3. OpenRouter Models
      {
        provider: 'openrouter',
        modelId: 'anthropic/claude-3.5-sonnet',
        displayName: 'Claude 3.5 Sonnet (OpenRouter)',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'TOOL_CALLING', 'STRUCTURED_OUTPUT', 'VISION', 'LONG_CONTEXT'],
        contextLimit: 200_000,
        maxOutputTokens: 8192,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        reasoning: true,
        coding: true,
        vision: true,
        fast: false,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 3.0,
          outputCostPerMillion: 15.0,
          currency: 'USD',
          pricingSource: 'official_openrouter_pricing',
          pricingVersion: '2025.01',
        },
        discoveryState: 'CONFIGURED',
      },
      {
        provider: 'openrouter',
        modelId: 'deepseek/deepseek-r1',
        displayName: 'DeepSeek R1 (OpenRouter)',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING'],
        contextLimit: 64_000,
        maxOutputTokens: 8192,
        streaming: true,
        toolCalling: false,
        structuredOutput: false,
        reasoning: true,
        coding: true,
        vision: false,
        fast: false,
        local: false,
        private: false,
        billingMode: 'PAID',
        quotaMode: 'LIMITED',
        pricing: {
          inputCostPerMillion: 0.55,
          outputCostPerMillion: 2.19,
          currency: 'USD',
          pricingSource: 'official_openrouter_pricing',
          pricingVersion: '2025.01',
        },
        discoveryState: 'CONFIGURED',
      },

      // 4. Local Sovereign Ollama Models
      {
        provider: 'ollama',
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        displayName: 'Ollama Qwen2.5 Coder 7B',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'TOOL_CALLING', 'STRUCTURED_OUTPUT', 'LOCAL', 'PRIVATE'],
        contextLimit: 32_768,
        maxOutputTokens: 4096,
        streaming: true,
        toolCalling: true,
        structuredOutput: true,
        reasoning: true,
        coding: true,
        vision: false,
        fast: false,
        local: true,
        private: true,
        billingMode: 'FREE',
        quotaMode: 'UNLIMITED',
        pricing: {
          inputCostPerMillion: 0,
          outputCostPerMillion: 0,
          currency: 'USD',
          pricingSource: 'local_workstation_sovereign',
          pricingVersion: 'v1',
        },
        discoveryState: 'CONFIGURED',
      },
      {
        provider: 'ollama',
        modelId: 'llama3.2:3b-instruct-q4_K_M',
        displayName: 'Ollama Llama 3.2 3B Fast',
        enabled: true,
        capabilities: ['TEXT', 'FAST', 'LOCAL', 'PRIVATE'],
        contextLimit: 16_384,
        maxOutputTokens: 2048,
        streaming: true,
        toolCalling: false,
        structuredOutput: false,
        reasoning: false,
        coding: false,
        vision: false,
        fast: true,
        local: true,
        private: true,
        billingMode: 'FREE',
        quotaMode: 'UNLIMITED',
        pricing: {
          inputCostPerMillion: 0,
          outputCostPerMillion: 0,
          currency: 'USD',
          pricingSource: 'local_workstation_sovereign',
          pricingVersion: 'v1',
        },
        discoveryState: 'CONFIGURED',
      },
      {
        provider: 'ollama',
        modelId: 'deepseek-r1:7b',
        displayName: 'Ollama DeepSeek R1 7B',
        enabled: true,
        capabilities: ['TEXT', 'CODE', 'REASONING', 'LOCAL', 'PRIVATE'],
        contextLimit: 32_768,
        maxOutputTokens: 4096,
        streaming: true,
        toolCalling: false,
        structuredOutput: false,
        reasoning: true,
        coding: true,
        vision: false,
        fast: false,
        local: true,
        private: true,
        billingMode: 'FREE',
        quotaMode: 'UNLIMITED',
        pricing: {
          inputCostPerMillion: 0,
          outputCostPerMillion: 0,
          currency: 'USD',
          pricingSource: 'local_workstation_sovereign',
          pricingVersion: 'v1',
        },
        discoveryState: 'CONFIGURED',
      },
    ];

    for (const model of catalog) {
      this.registerModel(model);
    }
  }

  public registerModel(model: ModelMetadata): void {
    const key = `${model.provider}::${model.modelId}`;
    this.models.set(key, model);
  }

  public getModel(provider: LLMProviderType, modelId: string): ModelMetadata | undefined {
    return this.models.get(`${provider}::${modelId}`);
  }

  public getAllModels(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  public getEnabledModels(): ModelMetadata[] {
    return this.getAllModels().filter((m) => m.enabled);
  }

  public getModelsByProvider(provider: LLMProviderType): ModelMetadata[] {
    return this.getAllModels().filter((m) => m.provider === provider && m.enabled);
  }
}
