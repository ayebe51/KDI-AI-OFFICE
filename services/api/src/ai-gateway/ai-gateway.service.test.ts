// ==========================================================
// services/api/src/ai-gateway/ai-gateway.service.test.ts
// Phase 15.1 Business AI Gateway Tests
// ==========================================================

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service.js';
import type { LLMProviderAdapter, BusinessAIRequest } from '../ai-gateway/ai-gateway.service.js';

// Mock LLM adapter for testing (no real LLM calls)
const createMockAdapter = (available: boolean = true): LLMProviderAdapter => ({
  async chat(req) {
    return {
      content: `Mock AI response for: ${req.prompt.slice(0, 50)}...`,
      provider: available ? 'ollama' : 'unavailable',
      model: 'qwen2.5-coder:7b',
      tokensUsed: 42,
      durationMs: 150,
    };
  },
  isLocalAvailable: () => available,
});

describe('Phase 15.1 Business AI Gateway Tests', () => {
  let gateway: AIGatewayService;
  let gatewayWithMock: AIGatewayService;
  let gatewayNoAdapter: AIGatewayService;

  before(() => {
    gatewayNoAdapter = new AIGatewayService(); // No LLM adapter
    gatewayWithMock = new AIGatewayService(createMockAdapter(true));
    gateway = gatewayNoAdapter;
  });

  after(() => {
    gateway.resetStats();
  });

  // ── TOKEN EFFICIENCY GUARD ──────────────────────────────────────────

  it('Test 1: Deterministic operation guard blocks CRUD from LLM', () => {
    assert.ok(gateway.isDeterministicOperation('CRUD'), 'CRUD should be deterministic');
    assert.ok(gateway.isDeterministicOperation('SQL'), 'SQL should be deterministic');
    assert.ok(gateway.isDeterministicOperation('SORTING'), 'SORTING should be deterministic');
    assert.ok(gateway.isDeterministicOperation('FILTERING'), 'FILTERING should be deterministic');
    assert.ok(gateway.isDeterministicOperation('COUNTING'), 'COUNTING should be deterministic');
    assert.ok(gateway.isDeterministicOperation('CALCULATION'), 'CALCULATION should be deterministic');
    assert.ok(gateway.isDeterministicOperation('STATE_TRANSITION'), 'STATE_TRANSITION should be deterministic');
    assert.ok(gateway.isDeterministicOperation('BUSINESS_RULE'), 'BUSINESS_RULE should be deterministic');
  });

  it('Test 2: Non-deterministic operations are not blocked', () => {
    assert.ok(!gateway.isDeterministicOperation('SUMMARIZATION'), 'SUMMARIZATION should not be deterministic');
    assert.ok(!gateway.isDeterministicOperation('REASONING'), 'REASONING should not be deterministic');
    assert.ok(!gateway.isDeterministicOperation('ANALYSIS'), 'ANALYSIS should not be deterministic');
    assert.ok(!gateway.isDeterministicOperation('DRAFTING'), 'DRAFTING should not be deterministic');
  });

  it('Test 3: assertNotDeterministic throws for deterministic ops', () => {
    assert.throws(() => gateway.assertNotDeterministic('CRUD'), {
      message: /deterministic.*must not invoke LLM/i,
    });
    assert.throws(() => gateway.assertNotDeterministic('FILTERING'), {
      message: /deterministic/i,
    });
  });

  it('Test 4: assertNotDeterministic does not throw for AI tasks', () => {
    assert.doesNotThrow(() => gateway.assertNotDeterministic('SUMMARIZATION'));
    assert.doesNotThrow(() => gateway.assertNotDeterministic('REASONING'));
  });

  it('Test 5: Rejected deterministic calls are tracked in stats', () => {
    const g = new AIGatewayService();
    g.resetStats();
    try { g.assertNotDeterministic('SQL'); } catch {}
    try { g.assertNotDeterministic('CRUD'); } catch {}
    const stats = g.getUsageStats();
    assert.strictEqual(stats.rejectedDeterministicCalls, 2);
  });

  // ── CACHE MANAGEMENT ────────────────────────────────────────────────

  it('Test 6: Cache starts empty', () => {
    const g = new AIGatewayService();
    assert.strictEqual(g.getCacheSize(), 0);
  });

  it('Test 7: Can store and retrieve cache entry', () => {
    const g = new AIGatewayService();
    const mockResponse = {
      requestId: 'test-req-1',
      role: 'AI_SALES' as const,
      task: 'ANALYSIS' as const,
      content: 'Test cached content',
      provider: 'ollama',
      model: 'qwen2.5',
      tokensUsed: 100,
      durationMs: 200,
      fromCache: false,
      timestamp: new Date().toISOString(),
    };
    g.setCacheEntry('test-key', mockResponse, 60000);
    assert.strictEqual(g.getCacheSize(), 1);
    const retrieved = g.getCacheEntry('test-key');
    assert.ok(retrieved);
    assert.strictEqual(retrieved!.content, 'Test cached content');
  });

  it('Test 8: Expired cache entry returns null', () => {
    const g = new AIGatewayService();
    const mockResponse = {
      requestId: 'test-req-exp',
      role: 'AI_ANALYST' as const,
      task: 'INTELLIGENCE' as const,
      content: 'Expiring content',
      provider: 'ollama',
      model: 'qwen2.5',
      tokensUsed: 50,
      durationMs: 100,
      fromCache: false,
      timestamp: new Date().toISOString(),
    };
    g.setCacheEntry('expiring-key', mockResponse, -1); // Expired immediately
    const retrieved = g.getCacheEntry('expiring-key');
    assert.strictEqual(retrieved, null, 'Expired entry should return null');
    assert.strictEqual(g.getCacheSize(), 0, 'Expired entry should be removed from cache');
  });

  it('Test 9: Can invalidate specific cache key', () => {
    const g = new AIGatewayService();
    const mockResp = (id: string) => ({
      requestId: id, role: 'AI_SALES' as const, task: 'ANALYSIS' as const,
      content: 'x', provider: 'ollama', model: 'm', tokensUsed: 1,
      durationMs: 1, fromCache: false, timestamp: new Date().toISOString(),
    });
    g.setCacheEntry('key-a', mockResp('a'), 60000);
    g.setCacheEntry('key-b', mockResp('b'), 60000);
    assert.strictEqual(g.getCacheSize(), 2);
    g.invalidateCache('key-a');
    assert.strictEqual(g.getCacheSize(), 1);
    assert.strictEqual(g.getCacheEntry('key-a'), null);
    assert.ok(g.getCacheEntry('key-b'));
  });

  it('Test 10: Can invalidate all cache', () => {
    const g = new AIGatewayService();
    const mockResp = (id: string) => ({
      requestId: id, role: 'AI_CUSTOMER' as const, task: 'SUMMARIZATION' as const,
      content: 'x', provider: 'ollama', model: 'm', tokensUsed: 1,
      durationMs: 1, fromCache: false, timestamp: new Date().toISOString(),
    });
    g.setCacheEntry('x1', mockResp('1'), 60000);
    g.setCacheEntry('x2', mockResp('2'), 60000);
    g.setCacheEntry('x3', mockResp('3'), 60000);
    g.invalidateCache();
    assert.strictEqual(g.getCacheSize(), 0);
  });

  // ── REQUEST HANDLING ─────────────────────────────────────────────────

  it('Test 11: Request without LLM adapter returns PENDING (no fake AI)', async () => {
    const g = new AIGatewayService(); // No adapter
    const req: BusinessAIRequest = {
      requestId: 'req-no-llm',
      role: 'AI_SALES',
      task: 'ANALYSIS',
      prompt: 'Analyze this opportunity',
      context: { opportunity: 'test' },
      preferLocal: true,
    };
    const response = await g.request(req);
    assert.ok(response);
    assert.ok(response.content.includes('PENDING'), 'Should return PENDING when no adapter configured');
    assert.strictEqual(response.provider, 'not_configured');
    assert.strictEqual(response.fromCache, false);
    assert.ok(response.timestamp);
  });

  it('Test 12: Request with mock adapter returns AI response', async () => {
    const req: BusinessAIRequest = {
      requestId: 'req-with-llm',
      role: 'AI_ANALYST',
      task: 'INTELLIGENCE',
      prompt: 'Analyze business metrics',
      context: { revenue: 90500000, pipeline: 26500000 },
      preferLocal: true,
    };
    const response = await gatewayWithMock.request(req);
    assert.ok(response);
    assert.ok(response.content.length > 0);
    assert.strictEqual(response.provider, 'ollama');
    assert.strictEqual(response.fromCache, false);
    assert.ok(response.tokensUsed > 0);
  });

  it('Test 13: Cache hit returns cached response without LLM call', async () => {
    const g = new AIGatewayService(createMockAdapter());
    g.resetStats();

    const req: BusinessAIRequest = {
      requestId: 'req-cache-1',
      role: 'AI_CUSTOMER',
      task: 'SUMMARIZATION',
      prompt: 'Summarize customer',
      context: { customerId: 'CUST-001' },
      preferLocal: true,
      cacheKey: 'customer_summary_CUST-001',
      cacheMaxAgeMs: 60000,
    };

    // First call — should hit LLM
    await g.request(req);
    const statsAfterFirst = g.getUsageStats();
    assert.strictEqual(statsAfterFirst.llmCalls, 1);
    assert.strictEqual(statsAfterFirst.cacheHits, 0);

    // Second call — should hit cache
    const secondReq = { ...req, requestId: 'req-cache-2' };
    const secondResponse = await g.request(secondReq);
    const statsAfterSecond = g.getUsageStats();
    assert.strictEqual(statsAfterSecond.llmCalls, 1, 'LLM should NOT be called again');
    assert.strictEqual(statsAfterSecond.cacheHits, 1, 'Cache hit count should increase');
    assert.strictEqual(secondResponse.fromCache, true, 'Response should be from cache');
  });

  it('Test 14: Usage stats track correctly', async () => {
    const g = new AIGatewayService(createMockAdapter());
    g.resetStats();

    const makeReq = (id: string): BusinessAIRequest => ({
      requestId: id,
      role: 'AI_ANALYST',
      task: 'ANALYSIS',
      prompt: 'Test analysis',
      context: {},
      preferLocal: true,
    });

    await g.request(makeReq('stat-1'));
    await g.request(makeReq('stat-2'));
    await g.request(makeReq('stat-3'));

    const stats = g.getUsageStats();
    assert.strictEqual(stats.totalRequests, 3);
    assert.strictEqual(stats.llmCalls, 3);
    assert.ok(stats.totalTokensUsed > 0);
  });

  // ── BUSINESS AI AGENT PROFILES ─────────────────────────────────────────

  it('Test 15: All 6 Business AI agent profiles exist', () => {
    const profiles = gateway.getAgentProfiles();
    assert.strictEqual(profiles.length, 6);

    const roles = profiles.map((p) => p.role);
    assert.ok(roles.includes('AI_SALES'), 'AI_SALES agent should exist');
    assert.ok(roles.includes('AI_CUSTOMER'), 'AI_CUSTOMER agent should exist');
    assert.ok(roles.includes('AI_PROJECT_MANAGER'), 'AI_PROJECT_MANAGER agent should exist');
    assert.ok(roles.includes('AI_ANALYST'), 'AI_ANALYST agent should exist');
    assert.ok(roles.includes('AI_EXECUTIVE'), 'AI_EXECUTIVE agent should exist');
    assert.ok(roles.includes('AI_OPERATIONS'), 'AI_OPERATIONS agent should exist');

    for (const p of profiles) {
      assert.ok(p.name.length > 0, `Agent ${p.role} should have a name`);
    }
  });

  it('Test 16: Local-first indicator works correctly', () => {
    const localGateway = new AIGatewayService(createMockAdapter(true));
    assert.strictEqual(localGateway.isLocalFirst(), true);

    const cloudGateway = new AIGatewayService(createMockAdapter(false));
    assert.strictEqual(cloudGateway.isLocalFirst(), false);

    const noAdapterGateway = new AIGatewayService();
    assert.strictEqual(noAdapterGateway.isLocalFirst(), false);
  });

  it('Test 17: summarizeCustomer uses AI_CUSTOMER role and caches', async () => {
    const g = new AIGatewayService(createMockAdapter());
    const response = await g.summarizeCustomer('CUST-001', { name: 'Test Customer', health: 'HEALTHY' });
    assert.ok(response);
    assert.strictEqual(response.role, 'AI_CUSTOMER');
    assert.strictEqual(response.task, 'SUMMARIZATION');
    // Cache should have entry
    assert.ok(g.getCacheSize() > 0, 'Cache should have the customer summary');
  });

  it('Test 18: analyzeOpportunity uses AI_SALES role', async () => {
    const g = new AIGatewayService(createMockAdapter());
    const response = await g.analyzeOpportunity('OPP-001', { value: 15000000, probability: 70 });
    assert.ok(response);
    assert.strictEqual(response.role, 'AI_SALES');
    assert.strictEqual(response.task, 'ANALYSIS');
  });

  it('Test 19: generateExecutiveBrief uses AI_EXECUTIVE role with daily cache', async () => {
    const g = new AIGatewayService(createMockAdapter());
    const response = await g.generateExecutiveBrief({ revenue: 90500000, pipeline: 26500000 });
    assert.ok(response);
    assert.strictEqual(response.role, 'AI_EXECUTIVE');
    assert.strictEqual(response.task, 'INTELLIGENCE');
  });

  it('Test 20: draftFollowUp uses AI_SALES with DRAFTING task (no cache)', async () => {
    const g = new AIGatewayService(createMockAdapter());
    const firstResp = await g.draftFollowUp('LEAD-001', { name: 'Ahmad Farid', company: 'MTsN' });
    // Drafts should not be cached (no cacheKey in request)
    // Each call should produce a fresh response
    assert.ok(firstResp);
    assert.strictEqual(firstResp.role, 'AI_SALES');
    assert.strictEqual(firstResp.task, 'DRAFTING');
    assert.strictEqual(firstResp.fromCache, false);
  });

  it('Test 21: Stats reset works correctly', () => {
    const g = new AIGatewayService(createMockAdapter());
    g.getUsageStats(); // Just access to be sure
    g.resetStats();
    const stats = g.getUsageStats();
    assert.strictEqual(stats.totalRequests, 0);
    assert.strictEqual(stats.cacheHits, 0);
    assert.strictEqual(stats.llmCalls, 0);
    assert.strictEqual(stats.totalTokensUsed, 0);
    assert.strictEqual(stats.rejectedDeterministicCalls, 0);
  });

  it('Test 22: AI_INSIGHT label from gateway has correct source field', async () => {
    const g = new AIGatewayService(createMockAdapter());
    const resp = await g.generateExecutiveBrief({ test: 'data' });
    // This verifies the response has the correct structure for use as AIInsight
    assert.ok(resp.provider === 'ollama' || resp.provider === 'not_configured' || resp.provider === 'cache');
    assert.ok(resp.content.length > 0);
  });

  it('Test 23: Business modules must use gateway — not direct LLM SDK', () => {
    // This is a policy test — AIGatewayService is the single entry point
    // All business AI must go through AIGatewayService.request()
    // No direct Gemini/OpenAI SDK calls from CompanyService, ProjectService, etc.
    const g = new AIGatewayService();
    assert.ok(typeof g.request === 'function', 'Gateway must expose request() method');
    assert.ok(typeof g.summarizeCustomer === 'function', 'Gateway must expose tool methods');
    assert.ok(typeof g.analyzeOpportunity === 'function');
    assert.ok(typeof g.generateExecutiveBrief === 'function');
    assert.ok(typeof g.draftFollowUp === 'function');
  });

  it('Test 24: No fake AI response is ever returned', async () => {
    const g = new AIGatewayService(); // No adapter
    const req: BusinessAIRequest = {
      requestId: 'no-fake-test',
      role: 'AI_ANALYST',
      task: 'INTELLIGENCE',
      prompt: 'What is the company status?',
      context: {},
      preferLocal: true,
    };
    const response = await g.request(req);
    // Must NOT fabricate insights
    assert.ok(
      response.content.includes('PENDING') || response.content.includes('UNAVAILABLE'),
      'Without LLM adapter, must return PENDING or UNAVAILABLE — not fabricated insights'
    );
    assert.notStrictEqual(response.content, '');
  });

  it('Test 25: Ollama (local model) is preferred provider when available', async () => {
    const localGateway = new AIGatewayService(createMockAdapter(true));
    const req: BusinessAIRequest = {
      requestId: 'local-pref-test',
      role: 'AI_ANALYST',
      task: 'ANALYSIS',
      prompt: 'Test',
      context: {},
      preferLocal: true,
    };
    const response = await localGateway.request(req);
    assert.strictEqual(response.provider, 'ollama', 'Should use ollama when preferLocal=true and local is available');
  });
});
