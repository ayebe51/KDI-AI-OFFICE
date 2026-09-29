// ==========================================================
// services/api/src/llm/interfaces/llm-provider.interface.ts
// Canonical LLM Provider Interface
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

export interface ProviderInfo {
  provider: LLMProviderType;
  name: string;
  isLocal: boolean;
  defaultModel: string;
}

export interface LLMProvider {
  readonly provider: LLMProviderType;

  getProviderInfo(): ProviderInfo;

  listModels(): Promise<ModelMetadata[]>;

  generate(request: LLMRequest, selectedModel?: string): Promise<LLMResponse>;

  healthCheck(): Promise<ProviderHealthStatus>;

  getCapabilities(modelId: string): ModelCapability[];

  getUsage(): ProviderUsageStats;
}
