// ==========================================================
// services/api/src/graph/graphrag/graphrag.service.ts
// GraphRAG Service with Anti-Hallucination Framing & Citable Answers
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  GraphRAGQuery,
  GraphRAGResult,
  GraphRAGSource,
  GraphContext,
  MemoryVisibility,
  LLMRequest,
} from '@kdi/types';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import { HybridGraphRetriever } from '../retrieval/hybrid-graph.retriever.js';
import { GraphContextBuilder } from '../context/graph-context.builder.js';
import { LLMService } from '../../llm/llm.service.js';
import { EventsGateway } from '../../websocket/events.gateway.js';

@Injectable()
export class GraphRAGService {
  private readonly logger = new StructuredLogger('GraphRAGService');

  constructor(
    private readonly hybridRetriever: HybridGraphRetriever,
    private readonly contextBuilder: GraphContextBuilder,
    @Optional() private readonly llmService?: LLMService,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) {}

  public async queryGraphRAG(request: GraphRAGQuery): Promise<GraphRAGResult> {
    const startTime = Date.now();
    const visibilityLevel: MemoryVisibility = (request.userRole === 'admin' ? 'CONFIDENTIAL' : 'INTERNAL');

    this.logger.info('queryGraphRAG', `Executing GraphRAG for query: "${request.query}"`);
    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('graphrag:started', 'office:events', {
          query: request.query,
          projectId: request.projectId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // 1. Hybrid Retrieval (Graph topology + vector semantic search)
    const hybridResults = await this.hybridRetriever.retrieve({
      query: request.query,
      projectId: request.projectId,
      taskId: request.taskId,
      topK: request.topK || 10,
      maxHops: request.maxHops || 2,
      visibilityLevel,
    });

    // 2. Build Structured Context with Token Budget Enforcement
    const context: GraphContext = this.contextBuilder.buildContext({
      query: request.query,
      hybridResults,
      tokenBudget: request.tokenBudget || 2500,
      visibilityLevel,
      userRole: request.userRole,
    });

    // 3. Extract Sources & Determine Support Status
    const sources: GraphRAGSource[] = [];
    for (const node of context.entities) {
      sources.push({
        id: node.id,
        type: node.entityType,
        title: String(node.properties.title || node.properties.name || node.id),
        confidence: (node.properties.confidence as any) || 'SUPPORTED',
        snippet: String(node.properties.content || node.properties.summary || node.properties.decision || '').slice(0, 160),
      });
    }

    let supportStatus: 'SUPPORTED' | 'INFERRED' | 'INSUFFICIENT_CONTEXT' = 'SUPPORTED';
    if (context.entities.length === 0) {
      supportStatus = 'INSUFFICIENT_CONTEXT';
    } else {
      const hasVerified = context.entities.some(
        (e) => e.properties.confidence === 'VERIFIED'
      );
      supportStatus = hasVerified ? 'SUPPORTED' : 'INFERRED';
    }

    // 4. Generate Answer via AI Router / LLM or Grounded Deterministic Synthesizer
    let answer = '';

    if (supportStatus === 'INSUFFICIENT_CONTEXT') {
      answer = `Evidence in KDI Graph Memory is insufficient to confirm or answer this claim: "${request.query}". No matching architecture decisions, tasks, or verified memories were found.`;
    } else {
      // Try generating answer via LLM with strict Anti-Hallucination framing
      const systemPrompt = `You are the KDI AI Office Graph Intelligence Assistant.
Answer the user's question using ONLY the provided verified context from the KDI Graph Memory.
Rules:
1. Distinguish verified facts from inference.
2. Do not fabricate repositories, commits, decisions, tasks, files, agents, or project facts.
3. Cite source decisions (e.g., [DEC-001]) and tasks whenever making claims.
4. When context is insufficient to answer completely, state that evidence is insufficient.`;

      const prompt = `${context.formattedContext}\n\nBased ONLY on the above verified graph facts, answer:\n"${request.query}"`;

      if (this.llmService) {
        try {
          const llmReq: LLMRequest = {
            requestId: `grag_${Date.now()}`,
            taskType: 'ANALYSIS',
            privacyClass: visibilityLevel === 'CONFIDENTIAL' ? 'CONFIDENTIAL' : 'INTERNAL',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            maxOutputTokens: 1000,
            metadata: { agentId: request.requestedBy || 'ai-manager' },
          };

          const llmRes = await this.llmService.chat(llmReq);
          if (llmRes.content && llmRes.content.trim().length > 0) {
            answer = llmRes.content.trim();
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn('queryGraphRAG', `LLM generation skipped/failed (${msg}), using deterministic synthesis.`);
        }
      }

      // Grounded deterministic synthesis fallback if LLM was unavailable or offline
      if (!answer) {
        answer = this.synthesizeDeterministicAnswer(request.query, context);
      }
    }

    const durationMs = Date.now() - startTime;
    const result: GraphRAGResult = {
      query: request.query,
      answer,
      supportStatus,
      sources,
      contextUsed: context,
      durationMs,
    };

    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('graphrag:completed', 'office:events', {
          query: request.query,
          supportStatus,
          sourceCount: sources.length,
          durationMs,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return result;
  }

  /**
   * Deterministic grounded response synthesis directly from verified GraphContext.
   * Guarantees 0% hallucination when operating in sovereign/offline environments.
   */
  private synthesizeDeterministicAnswer(query: string, context: GraphContext): string {
    const lines: string[] = [];

    lines.push(`Based on verified KDI Graph Memory for query: "${query}"\n`);

    if (context.decisions.length > 0) {
      lines.push('**Key Architecture Decisions:**');
      for (const d of context.decisions) {
        lines.push(`- **[${d.decisionId}] ${d.title}**: ${d.decision} (Reason: ${d.reason})`);
      }
      lines.push('');
    }

    if (context.facts.length > 0) {
      lines.push('**Verified Project Context:**');
      for (const f of context.facts.slice(0, 5)) {
        lines.push(`- ${f}`);
      }
      lines.push('');
    }

    if (context.executionHistory.length > 0) {
      lines.push('**Recent Execution Evidence:**');
      for (const e of context.executionHistory.slice(0, 3)) {
        lines.push(`- ${e}`);
      }
      lines.push('');
    }

    lines.push(`*Support Status:* Grounded by ${context.entities.length} graph nodes and ${context.citations.length} verified citations.`);
    return lines.join('\n');
  }
}
