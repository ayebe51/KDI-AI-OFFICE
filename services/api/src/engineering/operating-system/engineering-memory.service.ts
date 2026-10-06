// ==========================================================
// services/api/src/engineering/operating-system/engineering-memory.service.ts
// Phase 16: Engineering Memory, Context Efficiency & Token Observability
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  EngineeringMemoryEntry,
  TokenUsageMetric,
} from './engineering-os.types.js';

@Injectable()
export class EngineeringMemoryService {
  private readonly logger = new StructuredLogger('EngineeringMemoryService');
  private readonly storageDir: string;
  private readonly memoryCache = new Map<string, EngineeringMemoryEntry>();
  private readonly tokenMetrics: TokenUsageMetric[] = [];
  private readonly promptResponseCache = new Map<string, { response: string; timestamp: number }>();
  private readonly PROMPT_CACHE_TTL_MS = 300000; // 5 minutes cache

  constructor(@Optional() customStorageDir?: string) {
    this.storageDir =
      customStorageDir ||
      path.resolve(process.cwd(), '.worktrees', 'control-plane', 'memory');
    this.ensureStorageDir();
    this.loadPersistedMemory();
    this.seedCanonicalMemory();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private loadPersistedMemory(): void {
    try {
      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storageDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const entry: EngineeringMemoryEntry = JSON.parse(raw);
          this.memoryCache.set(entry.entryId, entry);
        }
      }
      this.logger.info(
        'loadPersistedMemory',
        `Loaded ${this.memoryCache.size} memory entries from ${this.storageDir}`
      );
    } catch (err: any) {
      this.logger.warn('loadPersistedMemory', `Error loading memory: ${err.message}`);
    }
  }

  private seedCanonicalMemory(): void {
    if (this.memoryCache.size > 0) return;

    this.recordMemory({
      entryId: 'mem_simmaci_login_fix',
      project: 'simmaci',
      topic: 'BUG_PATTERN',
      title: 'SIMMACI Token Refresh Regression Fix',
      content:
        'When login or session refresh fails with 500 error or null session, AuthService refreshToken() was missing session persistence. Fix by setting new session key in sessions Map and returning { success: true, token, user } object.',
      tags: ['login', 'auth', 'token', 'refreshToken', '500'],
      createdAt: new Date().toISOString(),
    });

    this.recordMemory({
      entryId: 'mem_calc_div_zero',
      project: 'demo-calc-repo',
      topic: 'GOTCHA',
      title: 'Calculator Safe Division Rule',
      content:
        'Division by zero must throw Error("DIVISION_BY_ZERO: Cannot divide by zero") instead of returning Infinity.',
      tags: ['calculator', 'divide', 'zero', 'math'],
      createdAt: new Date().toISOString(),
    });

    this.recordMemory({
      entryId: 'mem_calc_percentage',
      project: 'demo-calc-repo',
      topic: 'BUG_PATTERN',
      title: 'Calculator Percentage Calculation Scaling',
      content:
        'Percentage method must multiply ratio by 100: (part / total) * 100, and return 0 when total is 0.',
      tags: ['calculator', 'percentage', 'math'],
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Save an engineering memory entry to memory & durable storage (§25)
   */
  public recordMemory(entry: EngineeringMemoryEntry): void {
    this.memoryCache.set(entry.entryId, entry);
    try {
      this.ensureStorageDir();
      const filePath = path.join(this.storageDir, `${entry.entryId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      this.logger.info('recordMemory', `Saved memory "${entry.title}" for ${entry.project}`);
    } catch (err: any) {
      this.logger.warn('recordMemory', `Failed to persist memory entry: ${err.message}`);
    }
  }

  /**
   * Relevant memory retrieval: retrieves only context-specific memory entries (§25 & §27)
   */
  public findRelevantContext(project: string, query: string, limit = 3): EngineeringMemoryEntry[] {
    const pSlug = project.toLowerCase();
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored: Array<{ entry: EngineeringMemoryEntry; score: number }> = [];

    for (const entry of this.memoryCache.values()) {
      let score = 0;
      if (entry.project.toLowerCase() === pSlug) {
        score += 3;
      }
      for (const token of queryTokens) {
        if (entry.title.toLowerCase().includes(token)) score += 2;
        if (entry.tags.some((t) => t.toLowerCase() === token)) score += 3;
        if (entry.content.toLowerCase().includes(token)) score += 1;
      }
      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.entry);
  }

  /**
   * Prompt cache check (§28)
   */
  public getCachedResponse(cacheKey: string): string | null {
    const cached = this.promptResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.PROMPT_CACHE_TTL_MS) {
      return cached.response;
    }
    return null;
  }

  /**
   * Cache prompt response (§28)
   */
  public setCachedResponse(cacheKey: string, response: string): void {
    this.promptResponseCache.set(cacheKey, { response, timestamp: Date.now() });
  }

  /**
   * Track token usage & costs (§29)
   */
  public recordTokenUsage(metric: TokenUsageMetric): void {
    this.tokenMetrics.push(metric);
  }

  /**
   * Get token observability metrics summary (§29)
   */
  public getTokenMetricsSummary() {
    let promptTokens = 0;
    let completionTokens = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    let estimatedCostUsd = 0;

    for (const m of this.tokenMetrics) {
      promptTokens += m.promptTokens;
      completionTokens += m.completionTokens;
      if (m.cacheHit) cacheHits++;
      else cacheMisses++;
      estimatedCostUsd += m.estimatedCostUsd;
    }

    return {
      totalRequests: this.tokenMetrics.length,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cacheHits,
      cacheMisses,
      cacheHitRatio:
        this.tokenMetrics.length > 0 ? (cacheHits / this.tokenMetrics.length) * 100 : 0,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
    };
  }
}
