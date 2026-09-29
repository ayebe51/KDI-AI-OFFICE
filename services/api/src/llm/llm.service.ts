// ==========================================================
// services/api/src/llm/llm.service.ts
// AI Intelligence Layer Core Service
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  LLMRequest,
  LLMResponse,
  RoutingDecision,
  ModelMetadata,
  ProviderHealthStatus,
  ProviderUsageStats,
  LLMProviderType,
} from '@kdi/types';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';
import { ModelRegistry } from './registries/model.registry.js';
import { QuotaManager } from './governance/quota.manager.js';
import { UsageTracker } from './governance/usage.tracker.js';
import { CircuitBreaker } from './governance/circuit-breaker.js';
import { LLMProvider } from './interfaces/llm-provider.interface.js';
import { OllamaAdapter } from './providers/ollama.adapter.js';
import { GeminiAdapter } from './providers/gemini.adapter.js';
import { GroqAdapter } from './providers/groq.adapter.js';
import { OpenRouterAdapter } from './providers/openrouter.adapter.js';
import { LLMRouter } from './router/llm.router.js';
import { FallbackEngine } from './engine/fallback.engine.js';
import { EventsGateway } from '../websocket/events.gateway.js';

@Injectable()
export class LLMService {
  private readonly logger = new StructuredLogger('LLMService');
  private readonly modelRegistry: ModelRegistry;
  private readonly quotaManager: QuotaManager;
  private readonly usageTracker: UsageTracker;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly providers = new Map<LLMProviderType, LLMProvider>();
  private readonly router: LLMRouter;
  private readonly fallbackEngine: FallbackEngine;

  constructor(@Optional() private readonly eventsGateway?: EventsGateway) {
    const config = loadAppConfig();

    this.modelRegistry = new ModelRegistry();
    this.quotaManager = new QuotaManager();
    this.usageTracker = new UsageTracker();
    this.circuitBreaker = new CircuitBreaker();

    // Initialize canonical provider adapters
    const ollama = new OllamaAdapter(
      config.llm.ollamaBaseUrl,
      'qwen2.5-coder:7b-instruct-q4_K_M',
      this.modelRegistry,
      this.quotaManager,
      this.usageTracker,
      this.circuitBreaker
    );

    const gemini = new GeminiAdapter(
      config.llm.geminiApiKey,
      'gemini-1.5-flash',
      this.modelRegistry,
      this.quotaManager,
      this.usageTracker,
      this.circuitBreaker
    );

    const groq = new GroqAdapter(
      config.llm.groqApiKey,
      'llama-3.3-70b-versatile',
      this.modelRegistry,
      this.quotaManager,
      this.usageTracker,
      this.circuitBreaker
    );

    const openrouter = new OpenRouterAdapter(
      config.llm.openRouterApiKey,
      'anthropic/claude-3.5-sonnet',
      this.modelRegistry,
      this.quotaManager,
      this.usageTracker,
      this.circuitBreaker
    );

    this.providers.set('ollama', ollama);
    this.providers.set('gemini', gemini);
    this.providers.set('groq', groq);
    this.providers.set('openrouter', openrouter);

    this.router = new LLMRouter(
      this.modelRegistry,
      this.quotaManager,
      this.circuitBreaker
    );

    this.fallbackEngine = new FallbackEngine(
      this.providers,
      this.circuitBreaker,
      this.quotaManager,
      this.modelRegistry,
      this.eventsGateway
    );

    this.logger.info('constructor', 'LLM Intelligence Layer initialized with 4 provider adapters (Ollama, Gemini, Groq, OpenRouter).');

    // Asynchronously discover local Ollama models on boot
    ollama.listModels().catch((err) => {
      this.logger.debug('constructor', 'Initial Ollama discovery skipped (daemon offline or unreachable).');
    });
  }

  public route(request: LLMRequest): RoutingDecision {
    return this.router.route(request);
  }

  public async chat(request: LLMRequest): Promise<LLMResponse> {
    const decision = this.router.route(request);
    this.logger.info(
      'chat',
      `Routing decision for ${request.requestId}: Selected=${decision.selectedProvider}/${decision.selectedModel}, Fallbacks=${decision.fallbackChain.length}`
    );
    return this.fallbackEngine.executeWithFallback(request, decision);
  }

  public async listModels(): Promise<ModelMetadata[]> {
    // Attempt local discovery update
    const ollama = this.providers.get('ollama');
    if (ollama) {
      try {
        await ollama.listModels();
      } catch {
        // Fallback silently to registry
      }
    }
    return this.modelRegistry.getAllModels();
  }

  public async getProvidersHealth(): Promise<ProviderHealthStatus[]> {
    const checks = Array.from(this.providers.values()).map((p) => p.healthCheck());
    return Promise.all(checks);
  }

  public getUsage(): ProviderUsageStats[] {
    return this.usageTracker.getAllProviderStats();
  }

  public getModelRegistry(): ModelRegistry {
    return this.modelRegistry;
  }

  public getQuotaManager(): QuotaManager {
    return this.quotaManager;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }
}
