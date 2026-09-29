// ==========================================================
// services/api/src/llm/router/llm.router.ts
// Dynamic AI Router with Multi-Dimensional Evaluation & Privacy Isolation
// ==========================================================

import type {
  LLMRequest,
  RoutingDecision,
  FallbackTarget,
  ModelMetadata,
  LLMProviderType,
} from '@kdi/types';
import { ModelRegistry } from '../registries/model.registry.js';
import { CapabilityRegistry } from '../registries/capability.registry.js';
import { QuotaManager } from '../governance/quota.manager.js';
import { CircuitBreaker } from '../governance/circuit-breaker.js';
import { CostEstimator } from '../governance/cost.estimator.js';
import { LLMException } from '../exceptions/llm.exception.js';
import { ContextBudgeter } from '../context/context-budgeter.js';

export class LLMRouter {
  constructor(
    private readonly modelRegistry: ModelRegistry,
    private readonly quotaManager: QuotaManager,
    private readonly circuitBreaker: CircuitBreaker
  ) {}

  public route(request: LLMRequest): RoutingDecision {
    const privacy = request.privacyClass || 'INTERNAL';
    const taskType = (request.taskType || 'CHAT').toUpperCase();
    const requiredCaps = request.requiredCapabilities || [];

    // 1. Strict Privacy Check: CONFIDENTIAL forbids all cloud providers
    if (privacy === 'CONFIDENTIAL') {
      const localModels = this.modelRegistry
        .getEnabledModels()
        .filter((m) => m.local && m.private);

      if (localModels.length === 0) {
        throw new LLMException({
          code: 'PROVIDER_UNAVAILABLE',
          provider: 'ollama',
          message: 'Privacy policy violation: Request is CONFIDENTIAL but no sovereign local models are available.',
          isRetryable: false,
        });
      }

      // Check required capabilities among local models
      const compliantLocal = CapabilityRegistry.filterCompliantModels(
        localModels,
        requiredCaps,
        privacy
      );

      const target = compliantLocal[0] || localModels[0];
      const fallbackList: FallbackTarget[] = localModels
        .filter((m) => m.modelId !== target.modelId)
        .map((m) => ({
          provider: m.provider,
          model: m.modelId,
          trigger: 'PRIMARY_LOCAL_UNAVAILABLE',
        }));

      const cost = CostEstimator.calculateCost(target, 500, 500);

      return {
        selectedProvider: target.provider,
        selectedModel: target.modelId,
        fallbackChain: fallbackList,
        routingReason: `Strict data sovereignty: Privacy class ${privacy} enforced local execution on ${target.displayName}.`,
        estimatedCostUsd: cost.totalCostUsd,
      };
    }

    // 2. Filter all compliant models based on capabilities and privacy
    const eligibleModels = CapabilityRegistry.filterCompliantModels(
      this.modelRegistry.getEnabledModels(),
      requiredCaps,
      privacy
    );

    if (eligibleModels.length === 0) {
      throw new LLMException({
        code: 'MODEL_NOT_FOUND',
        provider: 'ollama',
        message: `No available model satisfies capabilities [${requiredCaps.join(', ')}] under privacy class ${privacy}.`,
        isRetryable: false,
      });
    }

    // 3. User preferred override (if valid and eligible)
    if (request.preferredProvider && request.preferredModel) {
      const preferred = this.modelRegistry.getModel(request.preferredProvider, request.preferredModel);
      if (preferred && CapabilityRegistry.satisfiesPrivacy(preferred, privacy)) {
        return this.constructDecision(preferred, eligibleModels, 'User preference specified in request envelope.');
      }
    }

    // 4. Context Size Check: if estimated input > 100k tokens, route to Long Context model
    const inputEstimate = ContextBudgeter.estimateTokens(
      (request.systemInstruction || '') +
        request.messages.map((m) => m.content).join(' ') +
        (request.context || '')
    );

    if (inputEstimate > 100_000) {
      const longContextModel = eligibleModels.find(
        (m) => m.capabilities.includes('LONG_CONTEXT') && m.contextLimit >= inputEstimate + 4000
      );
      if (longContextModel) {
        return this.constructDecision(
          longContextModel,
          eligibleModels,
          `Massive context size (${inputEstimate} tokens) routed to high-capacity model.`
        );
      }
    }

    // 5. Task Domain & Performance Matching
    let primaryTarget: ModelMetadata | undefined;
    let rationale = '';

    if (taskType === 'ARCHITECTURE' || taskType === 'DECOMPOSITION') {
      primaryTarget =
        eligibleModels.find((m) => m.provider === 'gemini' && m.modelId.includes('pro')) ||
        eligibleModels.find((m) => m.provider === 'openrouter' && m.modelId.includes('claude')) ||
        eligibleModels.find((m) => m.reasoning);
      rationale = 'Deep structural reasoning and multi-step decomposition capability required.';
    } else if (taskType === 'CODING' || taskType === 'DEBUGGING') {
      primaryTarget =
        eligibleModels.find((m) => m.provider === 'openrouter' && m.modelId.includes('claude')) ||
        eligibleModels.find((m) => m.provider === 'gemini' && m.modelId.includes('pro')) ||
        eligibleModels.find((m) => m.coding);
      rationale = 'Precision syntax synthesis, Tree-sitter AST and surgical patch generation.';
    } else if (taskType === 'TESTING' || taskType === 'FAST_CLASSIFICATION') {
      primaryTarget =
        eligibleModels.find((m) => m.provider === 'groq' && m.fast) ||
        eligibleModels.find((m) => m.provider === 'gemini' && m.fast) ||
        eligibleModels.find((m) => m.fast);
      rationale = 'Ultra-low latency inference for rapid test execution and interactive feedback.';
    } else if (taskType === 'DOCS' || taskType === 'SUMMARY') {
      primaryTarget =
        eligibleModels.find((m) => m.provider === 'gemini' && m.fast) ||
        eligibleModels.find((m) => m.fast);
      rationale = 'High throughput, economical documentation generation.';
    }

    // Fallback to highest ranked compliant model if domain match didn't yield
    if (!primaryTarget) {
      primaryTarget = eligibleModels[0];
      rationale = 'Selected optimal enabled model satisfying all required capabilities.';
    }

    return this.constructDecision(primaryTarget, eligibleModels, rationale);
  }

  private constructDecision(
    primary: ModelMetadata,
    eligibleModels: ModelMetadata[],
    rationale: string
  ): RoutingDecision {
    // Construct robust, non-cyclic fallback chain
    const fallbackTargets: FallbackTarget[] = [];
    const usedProviders = new Set<LLMProviderType>([primary.provider]);

    for (const model of eligibleModels) {
      if (model.modelId === primary.modelId) continue;
      // Add distinct provider fallbacks to maximize resilience
      if (!usedProviders.has(model.provider) && fallbackTargets.length < 3) {
        fallbackTargets.push({
          provider: model.provider,
          model: model.modelId,
          trigger: 'PRIMARY_PROVIDER_FAILURE_OR_RATE_LIMIT',
        });
        usedProviders.add(model.provider);
      }
    }

    // Always append sovereign local Ollama as final fallback if not already present
    const localOllama = eligibleModels.find((m) => m.provider === 'ollama' && m.local);
    if (localOllama && !fallbackTargets.some((f) => f.provider === 'ollama') && primary.provider !== 'ollama') {
      fallbackTargets.push({
        provider: 'ollama',
        model: localOllama.modelId,
        trigger: 'ALL_CLOUD_PROVIDERS_UNAVAILABLE',
      });
    }

    const estimatedCost = CostEstimator.calculateCost(primary, 800, 400).totalCostUsd;

    return {
      selectedProvider: primary.provider,
      selectedModel: primary.modelId,
      fallbackChain: fallbackTargets,
      routingReason: rationale,
      estimatedCostUsd: estimatedCost,
    };
  }
}
