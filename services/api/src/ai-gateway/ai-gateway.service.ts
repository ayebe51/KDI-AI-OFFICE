// ==========================================================
// services/api/src/ai-gateway/ai-gateway.service.ts
// KDI Business AI Gateway — Local-First, Cache-First, Token-Efficient
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';

// ── Business AI Request Types ─────────────────────────────────────────────

export type BusinessAIRole =
  | 'AI_SALES'
  | 'AI_CUSTOMER'
  | 'AI_PROJECT_MANAGER'
  | 'AI_ANALYST'
  | 'AI_EXECUTIVE'
  | 'AI_OPERATIONS';

export type BusinessAITask =
  | 'SUMMARIZATION'
  | 'REASONING'
  | 'ANALYSIS'
  | 'DRAFTING'
  | 'CLASSIFICATION'
  | 'INTELLIGENCE'
  | 'TOOL_CALLING';

// DETERMINISTIC operations that must NEVER call LLM
const DETERMINISTIC_OPERATIONS = new Set([
  'CRUD',
  'SQL',
  'SORTING',
  'FILTERING',
  'COUNTING',
  'CALCULATION',
  'STATE_TRANSITION',
  'BUSINESS_RULE',
]);

export interface BusinessAIRequest {
  requestId: string;
  role: BusinessAIRole;
  task: BusinessAITask;
  prompt: string;
  context: Record<string, unknown>;
  preferLocal: boolean;      // Default: true (Ollama first)
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;         // If provided, check cache before calling LLM
  cacheMaxAgeMs?: number;    // How long cached response is valid
}

export interface BusinessAIResponse {
  requestId: string;
  role: BusinessAIRole;
  task: BusinessAITask;
  content: string;
  provider: string;          // 'ollama' | 'gemini' | 'groq' | 'openrouter' | 'cache'
  model: string;
  tokensUsed: number;
  durationMs: number;
  fromCache: boolean;
  cachedAt?: string;
  timestamp: string;
}

export interface BusinessAIUsageStats {
  totalRequests: number;
  cacheHits: number;
  llmCalls: number;
  totalTokensUsed: number;
  avgDurationMs: number;
  providerBreakdown: Record<string, number>;
  rejectedDeterministicCalls: number;
}

interface CacheEntry {
  response: BusinessAIResponse;
  cachedAt: number;
  expiresAt: number;
}

// ── LLM Provider Interface (minimal, for DI without direct dependency) ──

export interface LLMProviderAdapter {
  chat(request: {
    requestId: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    preferredProvider?: string;
  }): Promise<{ content: string; provider: string; model: string; tokensUsed: number; durationMs: number }>;
  isLocalAvailable(): boolean;
}

// ── AI Gateway Service ─────────────────────────────────────────────────────

@Injectable()
export class AIGatewayService {
  private readonly logger = new StructuredLogger('AIGatewayService');

  // Response cache: cacheKey -> CacheEntry
  private readonly cache: Map<string, CacheEntry> = new Map();

  // Usage tracking
  private stats: BusinessAIUsageStats = {
    totalRequests: 0,
    cacheHits: 0,
    llmCalls: 0,
    totalTokensUsed: 0,
    avgDurationMs: 0,
    providerBreakdown: {},
    rejectedDeterministicCalls: 0,
  };

  private totalDurationMs = 0;

  // Business AI agent profiles
  private readonly businessAIAgents: Record<BusinessAIRole, { name: string; systemPrompt: string }> = {
    AI_SALES: {
      name: 'AI Sales Agent',
      systemPrompt: `You are the KDI AI Sales Agent. You assist with:
- Analyzing leads and opportunities
- Drafting follow-up messages and proposals
- Summarizing sales pipeline status
- Classifying lead quality

You receive structured data (facts) and provide reasoning and drafts.
NEVER invent numbers or claim facts not in the provided context.
Return structured, concise responses suitable for business use.`,
    },
    AI_CUSTOMER: {
      name: 'AI Customer Success Agent',
      systemPrompt: `You are the KDI AI Customer Success Agent. You analyze customer health,
satisfaction, and engagement data to provide actionable insights.
NEVER fabricate customer data. Base all analysis on provided facts only.`,
    },
    AI_PROJECT_MANAGER: {
      name: 'AI Project Manager',
      systemPrompt: `You are the KDI AI Project Manager. You analyze project status,
milestones, risks, and delivery timelines. You suggest re-sequencing and
resource adjustments. You do not execute changes — only suggest.`,
    },
    AI_ANALYST: {
      name: 'AI Business Analyst',
      systemPrompt: `You are the KDI AI Business Analyst. You interpret business data,
identify patterns, and generate cross-domain insights. All facts come from
the database. You interpret — you do not invent facts.`,
    },
    AI_EXECUTIVE: {
      name: 'AI Executive Intelligence',
      systemPrompt: `You are the KDI AI Executive Intelligence. You synthesize operational
data into executive-level briefings. Be concise, strategic, and actionable.
Clearly separate observations, impact, and recommendations.`,
    },
    AI_OPERATIONS: {
      name: 'AI Operations Agent',
      systemPrompt: `You are the KDI AI Operations Agent. You monitor operational metrics,
detect anomalies, and suggest optimizations. You surface issues proactively.`,
    },
  };

  constructor(@Optional() private readonly llmAdapter?: LLMProviderAdapter) {
    this.logger.info('constructor', 'Business AI Gateway initialized (local-first, cache-first)');
  }

  // ── TOKEN EFFICIENCY GUARD ─────────────────────────────────────────────

  /**
   * Guard: Reject LLM call if the operation is deterministic.
   * Deterministic operations (CRUD, filtering, counting) must never use LLM.
   */
  public isDeterministicOperation(operationType: string): boolean {
    return DETERMINISTIC_OPERATIONS.has(operationType.toUpperCase());
  }

  public assertNotDeterministic(operationType: string): void {
    if (this.isDeterministicOperation(operationType)) {
      this.stats.rejectedDeterministicCalls++;
      throw new Error(
        `AI Gateway Policy Violation: Operation "${operationType}" is deterministic and must not invoke LLM. ` +
        `Use database/rule-engine instead.`
      );
    }
  }

  // ── CACHE MANAGEMENT ──────────────────────────────────────────────────

  public getCacheEntry(cacheKey: string): BusinessAIResponse | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    return entry.response;
  }

  public setCacheEntry(cacheKey: string, response: BusinessAIResponse, maxAgeMs: number): void {
    this.cache.set(cacheKey, {
      response,
      cachedAt: Date.now(),
      expiresAt: Date.now() + maxAgeMs,
    });
  }

  public invalidateCache(cacheKey?: string): void {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
    this.logger.info('invalidateCache', `Cache invalidated: ${cacheKey ?? 'ALL'}`);
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  // ── MAIN GATEWAY ENTRY POINT ──────────────────────────────────────────

  /**
   * Business AI Gateway — single entry point for all business AI calls.
   * Enforces: local-first, cache-first, token-efficient, no deterministic ops.
   */
  public async request(req: BusinessAIRequest): Promise<BusinessAIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // 1. Check cache first
    if (req.cacheKey) {
      const cached = this.getCacheEntry(req.cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        this.logger.info('request', `Cache HIT for key=${req.cacheKey}, role=${req.role}`);
        return { ...cached, fromCache: true };
      }
    }

    // 2. Build prompt with agent context
    const agent = this.businessAIAgents[req.role];
    const fullPrompt = `${agent.systemPrompt}\n\n---\nCONTEXT:\n${JSON.stringify(req.context, null, 2)}\n\nTASK:\n${req.prompt}`;

    // 3. Execute via LLM adapter (if available)
    let response: BusinessAIResponse;

    if (this.llmAdapter) {
      try {
        const llmResult = await this.llmAdapter.chat({
          requestId: req.requestId,
          prompt: fullPrompt,
          maxTokens: req.maxTokens || 1024,
          temperature: req.temperature || 0.3,
          preferredProvider: req.preferLocal ? 'ollama' : undefined,
        });

        const durationMs = Date.now() - startTime;
        this.stats.llmCalls++;
        this.stats.totalTokensUsed += llmResult.tokensUsed;
        this.totalDurationMs += durationMs;
        this.stats.avgDurationMs = Math.round(this.totalDurationMs / this.stats.llmCalls);
        this.stats.providerBreakdown[llmResult.provider] = (this.stats.providerBreakdown[llmResult.provider] || 0) + 1;

        response = {
          requestId: req.requestId,
          role: req.role,
          task: req.task,
          content: llmResult.content,
          provider: llmResult.provider,
          model: llmResult.model,
          tokensUsed: llmResult.tokensUsed,
          durationMs,
          fromCache: false,
          timestamp: new Date().toISOString(),
        };

        this.logger.info('request', `LLM response: role=${req.role}, provider=${llmResult.provider}, tokens=${llmResult.tokensUsed}`);
      } catch (err) {
        // Return UNAVAILABLE marker — never fake an AI response
        const durationMs = Date.now() - startTime;
        response = {
          requestId: req.requestId,
          role: req.role,
          task: req.task,
          content: 'UNAVAILABLE: AI provider not reachable. Please retry or check system health.',
          provider: 'unavailable',
          model: 'none',
          tokensUsed: 0,
          durationMs,
          fromCache: false,
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      // No adapter configured — return honest PENDING state (no fake AI)
      const durationMs = Date.now() - startTime;
      response = {
        requestId: req.requestId,
        role: req.role,
        task: req.task,
        content: 'PENDING: AI Gateway not connected to LLM provider. Local model not configured.',
        provider: 'not_configured',
        model: 'none',
        tokensUsed: 0,
        durationMs,
        fromCache: false,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Store in cache if cacheKey provided
    if (req.cacheKey && response.provider !== 'unavailable' && response.provider !== 'not_configured') {
      const maxAgeMs = req.cacheMaxAgeMs || 30 * 60 * 1000; // Default 30 minutes
      this.setCacheEntry(req.cacheKey, response, maxAgeMs);
    }

    return response;
  }

  // ── BUSINESS AI TOOLS ────────────────────────────────────────────────────

  /**
   * Summarize customer data. Tool call pattern — receive minimal context, return insight.
   */
  public async summarizeCustomer(customerId: string, customerData: Record<string, unknown>): Promise<BusinessAIResponse> {
    return this.request({
      requestId: `ai_cust_${customerId}_${Date.now()}`,
      role: 'AI_CUSTOMER',
      task: 'SUMMARIZATION',
      prompt: `Summarize the customer health, key metrics, and any risk signals for: ${customerId}`,
      context: customerData,
      preferLocal: true,
      cacheKey: `customer_summary_${customerId}`,
      cacheMaxAgeMs: 60 * 60 * 1000, // 1 hour
    });
  }

  /**
   * Analyze opportunity quality. Tool call pattern.
   */
  public async analyzeOpportunity(opportunityId: string, oppData: Record<string, unknown>): Promise<BusinessAIResponse> {
    return this.request({
      requestId: `ai_opp_${opportunityId}_${Date.now()}`,
      role: 'AI_SALES',
      task: 'ANALYSIS',
      prompt: `Analyze this sales opportunity. Assess probability, key risks, and suggest next steps.`,
      context: oppData,
      preferLocal: true,
      cacheKey: `opp_analysis_${opportunityId}`,
      cacheMaxAgeMs: 30 * 60 * 1000, // 30 minutes
    });
  }

  /**
   * Generate executive briefing from structured business data.
   */
  public async generateExecutiveBrief(businessData: Record<string, unknown>): Promise<BusinessAIResponse> {
    return this.request({
      requestId: `ai_exec_brief_${Date.now()}`,
      role: 'AI_EXECUTIVE',
      task: 'INTELLIGENCE',
      prompt: `Generate a concise executive briefing. Structure: OBSERVATION, IMPACT, RECOMMENDATION.
Do not repeat raw numbers — interpret them. Keep to 3-5 key points.`,
      context: businessData,
      preferLocal: true,
      cacheKey: `executive_brief_${new Date().toISOString().split('T')[0]}`, // Daily cache
      cacheMaxAgeMs: 4 * 60 * 60 * 1000, // 4 hours
    });
  }

  /**
   * Draft sales follow-up message.
   */
  public async draftFollowUp(leadId: string, leadData: Record<string, unknown>): Promise<BusinessAIResponse> {
    return this.request({
      requestId: `ai_followup_${leadId}_${Date.now()}`,
      role: 'AI_SALES',
      task: 'DRAFTING',
      prompt: `Draft a professional follow-up email for this lead. Be concise, relevant, and action-oriented.`,
      context: leadData,
      preferLocal: true,
      // No caching for drafts — each draft should be fresh
    });
  }

  // ── STATS & HEALTH ─────────────────────────────────────────────────────

  public getUsageStats(): BusinessAIUsageStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      llmCalls: 0,
      totalTokensUsed: 0,
      avgDurationMs: 0,
      providerBreakdown: {},
      rejectedDeterministicCalls: 0,
    };
    this.totalDurationMs = 0;
  }

  public isLocalFirst(): boolean {
    return this.llmAdapter ? this.llmAdapter.isLocalAvailable() : false;
  }

  public getAgentProfiles(): Array<{ role: BusinessAIRole; name: string }> {
    return Object.entries(this.businessAIAgents).map(([role, agent]) => ({
      role: role as BusinessAIRole,
      name: agent.name,
    }));
  }
}
