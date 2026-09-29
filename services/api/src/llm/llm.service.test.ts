// ==========================================================
// services/api/src/llm/llm.service.test.ts
// Unit Tests for AI Intelligence Layer (Router, Privacy, Fallback)
// ==========================================================

import test from 'node:test';
import assert from 'node:assert';
import { ModelRegistry } from './registries/model.registry.js';
import { CapabilityRegistry } from './registries/capability.registry.js';
import { QuotaManager } from './governance/quota.manager.js';
import { CircuitBreaker } from './governance/circuit-breaker.js';
import { CostEstimator } from './governance/cost.estimator.js';
import { LLMRouter } from './router/llm.router.js';
import { FallbackEngine } from './engine/fallback.engine.js';
import { LLMException } from './exceptions/llm.exception.js';
import type { LLMRequest, LLMResponse, LLMProviderType } from '@kdi/types';
import type { LLMProvider } from './interfaces/llm-provider.interface.js';

test('CapabilityRegistry & Privacy Isolation', async (t) => {
  const registry = new ModelRegistry();

  await t.test('enforces strict privacy isolation for CONFIDENTIAL requests', () => {
    const cloudModel = registry.getModel('gemini', 'gemini-1.5-pro')!;
    const localModel = registry.getModel('ollama', 'qwen2.5-coder:7b-instruct-q4_K_M')!;

    assert.strictEqual(CapabilityRegistry.satisfiesPrivacy(cloudModel, 'CONFIDENTIAL'), false);
    assert.strictEqual(CapabilityRegistry.satisfiesPrivacy(localModel, 'CONFIDENTIAL'), true);
  });

  await t.test('filters compliant models preserving capabilities', () => {
    const models = registry.getEnabledModels();
    const codingModels = CapabilityRegistry.filterCompliantModels(models, ['CODE'], 'INTERNAL');
    assert.ok(codingModels.length > 0);
    assert.ok(codingModels.every((m) => m.capabilities.includes('CODE')));
  });
});

test('CostEstimator: Exact calculations with verification', async (t) => {
  const registry = new ModelRegistry();

  await t.test('computes zero cost for local sovereign models', () => {
    const local = registry.getModel('ollama', 'qwen2.5-coder:7b-instruct-q4_K_M')!;
    const cost = CostEstimator.calculateCost(local, 1000, 500);
    assert.strictEqual(cost.totalCostUsd, 0);
    assert.strictEqual(cost.pricingSource, 'local_workstation_sovereign');
  });

  await t.test('computes exact pricing for paid cloud models', () => {
    const groq = registry.getModel('groq', 'llama-3.3-70b-versatile')!;
    // input: 0.59 / M, output: 0.79 / M
    // 1,000,000 input + 1,000,000 output = 0.59 + 0.79 = 1.38
    const cost = CostEstimator.calculateCost(groq, 1_000_000, 1_000_000);
    assert.strictEqual(cost.totalCostUsd, 1.38);
  });
});

test('CircuitBreaker & QuotaManager resilience', async (t) => {
  await t.test('circuit breaker trips after consecutive failures', () => {
    const cb = new CircuitBreaker(2, 5000);
    assert.strictEqual(cb.isOpen('gemini'), false);

    cb.recordFailure('gemini', '503 Service Unavailable');
    assert.strictEqual(cb.isOpen('gemini'), false);

    cb.recordFailure('gemini', '503 Service Unavailable');
    assert.strictEqual(cb.isOpen('gemini'), true);
    assert.strictEqual(cb.getStatus('gemini').state, 'OPEN');

    cb.recordSuccess('gemini');
    assert.strictEqual(cb.isOpen('gemini'), false);
  });

  await t.test('quota manager respects cooldowns and rate limits', () => {
    const qm = new QuotaManager();
    assert.strictEqual(qm.canExecute('groq').allowed, true);

    qm.setCooldown('groq', 10_000, '429 Rate limited');
    const blocked = qm.canExecute('groq');
    assert.strictEqual(blocked.allowed, false);
    assert.ok(blocked.waitMs && blocked.waitMs > 0);
  });
});

test('LLMRouter: Dynamic policy evaluation', async (t) => {
  const modelRegistry = new ModelRegistry();
  const quotaManager = new QuotaManager();
  const circuitBreaker = new CircuitBreaker();
  const router = new LLMRouter(modelRegistry, quotaManager, circuitBreaker);

  await t.test('routes CONFIDENTIAL request exclusively to sovereign local Ollama', () => {
    const req: LLMRequest = {
      requestId: 'test_confidential',
      taskType: 'CODING',
      messages: [{ role: 'user', content: 'Secret internal API keys and logic' }],
      privacyClass: 'CONFIDENTIAL',
    };

    const decision = router.route(req);
    assert.strictEqual(decision.selectedProvider, 'ollama');
    assert.strictEqual(decision.fallbackChain.every((f) => f.provider === 'ollama'), true);
  });

  await t.test('routes FAST_CLASSIFICATION to low-latency provider (Groq or Flash)', () => {
    const req: LLMRequest = {
      requestId: 'test_fast',
      taskType: 'FAST_CLASSIFICATION',
      messages: [{ role: 'user', content: 'Classify intent' }],
      privacyClass: 'INTERNAL',
    };

    const decision = router.route(req);
    assert.ok(decision.selectedProvider === 'groq' || decision.selectedProvider === 'gemini');
    assert.ok(decision.fallbackChain.length > 0);
  });

  await t.test('routes ARCHITECTURE to deep reasoning frontier model', () => {
    const req: LLMRequest = {
      requestId: 'test_arch',
      taskType: 'ARCHITECTURE',
      messages: [{ role: 'user', content: 'Design distributed transaction coordinator' }],
      privacyClass: 'INTERNAL',
    };

    const decision = router.route(req);
    assert.ok(decision.selectedProvider === 'gemini' || decision.selectedProvider === 'openrouter');
  });
});

test('FallbackEngine: Cascading & Loop Protection', async (t) => {
  const modelRegistry = new ModelRegistry();
  const quotaManager = new QuotaManager();
  const circuitBreaker = new CircuitBreaker();

  // Mock Providers
  const mockGemini: LLMProvider = {
    provider: 'gemini',
    getProviderInfo: () => ({ provider: 'gemini', name: 'Gemini', isLocal: false, defaultModel: 'gemini-1.5-pro' }),
    listModels: async () => [],
    generate: async () => {
      throw new LLMException({
        code: 'RATE_LIMITED',
        provider: 'gemini',
        message: 'Google Gemini 429 quota exhausted',
        isRetryable: true,
      });
    },
    healthCheck: async () => ({
      provider: 'gemini',
      state: 'AVAILABLE',
      latencyMs: 10,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
    }),
    getCapabilities: () => ['TEXT', 'REASONING'],
    getUsage: () => ({} as any),
  };

  const mockGroq: LLMProvider = {
    provider: 'groq',
    getProviderInfo: () => ({ provider: 'groq', name: 'Groq', isLocal: false, defaultModel: 'llama-3.3-70b-versatile' }),
    listModels: async () => [],
    generate: async (req, model) => ({
      requestId: req.requestId,
      provider: 'groq',
      model: model || 'llama-3.3-70b-versatile',
      content: 'Successfully executed via Groq fallback.',
      usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70, estimatedCostUsd: 0.00004 },
      latencyMs: 120,
      finishReason: 'stop',
      fallbackUsed: true,
      visitedProviders: ['gemini', 'groq'],
    }),
    healthCheck: async () => ({
      provider: 'groq',
      state: 'AVAILABLE',
      latencyMs: 15,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
    }),
    getCapabilities: () => ['TEXT', 'FAST', 'CODE'],
    getUsage: () => ({} as any),
  };

  const providers = new Map<LLMProviderType, LLMProvider>([
    ['gemini', mockGemini],
    ['groq', mockGroq],
  ]);

  const engine = new FallbackEngine(providers, circuitBreaker, quotaManager, modelRegistry);

  await t.test('successfully cascades to fallback when primary fails with rate limit', async () => {
    const request: LLMRequest = {
      requestId: 'req_fallback_test',
      taskType: 'CODING',
      messages: [{ role: 'user', content: 'Generate function' }],
      privacyClass: 'INTERNAL',
    };

    const routingDecision = {
      selectedProvider: 'gemini' as LLMProviderType,
      selectedModel: 'gemini-1.5-pro',
      fallbackChain: [
        { provider: 'groq' as LLMProviderType, model: 'llama-3.3-70b-versatile', trigger: 'RATE_LIMIT' },
      ],
      routingReason: 'Initial Gemini selection',
      estimatedCostUsd: 0.001,
    };

    const response = await engine.executeWithFallback(request, routingDecision);
    assert.strictEqual(response.fallbackUsed, true);
    assert.strictEqual(response.provider, 'groq');
    assert.strictEqual(response.visitedProviders.includes('gemini'), true);
    assert.strictEqual(response.visitedProviders.includes('groq'), true);
  });
});
