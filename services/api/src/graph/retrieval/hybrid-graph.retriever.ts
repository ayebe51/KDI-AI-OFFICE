// ==========================================================
// services/api/src/graph/retrieval/hybrid-graph.retriever.ts
// Hybrid Graph + Semantic Retriever with Reciprocal Fusion
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  GraphNode,
  HybridRetrievalQuery,
  HybridRetrievalResult,
  MemoryConfidence,
  MemoryVisibility,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { GraphRetriever } from './graph.retriever.js';
import { SemanticRetriever } from './semantic.retriever.js';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';

const CONFIDENCE_WEIGHTS: Record<MemoryConfidence, number> = {
  VERIFIED: 1.0,
  SUPPORTED: 0.85,
  INFERRED: 0.65,
  UNVERIFIED: 0.4,
  STALE: 0.1,
};

@Injectable()
export class HybridGraphRetriever {
  private readonly logger = new StructuredLogger('HybridGraphRetriever');

  constructor(
    private readonly graphRetriever: GraphRetriever,
    private readonly semanticRetriever: SemanticRetriever,
    private readonly repository: Neo4jGraphRepository
  ) {}

  public async retrieve(query: HybridRetrievalQuery): Promise<HybridRetrievalResult[]> {
    const topK = query.topK || 10;
    const alpha = query.alpha !== undefined ? query.alpha : 0.5; // Weight between semantic (alpha) and graph (1-alpha)
    const visibilityLevel: MemoryVisibility = query.visibilityLevel || 'INTERNAL';

    // 1. Structural graph retrieval if start node is specified
    const graphMap = new Map<string, { node: GraphNode; graphScore: number; path: string[] }>();
    if (query.startNodeId) {
      const subgraph = await this.graphRetriever.getEntityContext(
        query.startNodeId,
        query.maxHops || 2,
        40,
        visibilityLevel
      );
      for (const node of subgraph.nodes) {
        const hops = node.id === query.startNodeId ? 0 : 1;
        const score = 1.0 / (hops + 1); // 1.0 for root, 0.5 for 1-hop
        graphMap.set(node.id, {
          node,
          graphScore: score,
          path: [query.startNodeId, node.id],
        });
      }
    }

    // 2. Semantic vector retrieval
    const semanticResults = await this.semanticRetriever.retrieve({
      query: query.query,
      entityTypes: query.entityTypes,
      projectId: query.projectId,
      topK: topK * 2,
      visibilityLevel,
    });

    const semanticMap = new Map<string, number>();
    for (const item of semanticResults) {
      semanticMap.set(item.node.id, item.similarity);
    }

    // 3. Fusion of Candidate Nodes
    const candidateNodes = new Map<string, GraphNode>();
    for (const g of graphMap.values()) candidateNodes.set(g.node.id, g.node);
    for (const s of semanticResults) candidateNodes.set(s.node.id, s.node);

    // Also include any fallback repository match
    const repoHybrid = await this.repository.searchHybrid(query);
    for (const r of repoHybrid) {
      if (!candidateNodes.has(r.node.id)) {
        candidateNodes.set(r.node.id, r.node);
      }
    }

    // 4. Score Normalization & Confidence/Recency Adjustment
    const finalResults: HybridRetrievalResult[] = [];
    const now = Date.now();

    for (const [nodeId, node] of candidateNodes.entries()) {
      // Visibility authorization check
      const vis = (node.properties.visibility as MemoryVisibility) || 'INTERNAL';
      if (visibilityLevel === 'PUBLIC' && vis !== 'PUBLIC') continue;
      if (visibilityLevel === 'INTERNAL' && (vis === 'PRIVATE' || vis === 'CONFIDENTIAL')) continue;
      if (visibilityLevel === 'PRIVATE' && vis === 'CONFIDENTIAL') continue;

      // Filter by projectId
      if (query.projectId && node.properties.projectId && node.properties.projectId !== query.projectId) {
        continue;
      }

      // Base scores
      const gItem = graphMap.get(nodeId);
      const gScore = gItem ? gItem.graphScore : 0.05;
      const sScore = semanticMap.has(nodeId) ? semanticMap.get(nodeId)! : 0.05;

      // Confidence modifier
      const conf = (node.properties.confidence as MemoryConfidence) || 'SUPPORTED';
      const confMultiplier = CONFIDENCE_WEIGHTS[conf] || 0.7;

      // Recency modifier (up to +10% for memories updated in the last 7 days)
      let recencyBonus = 0;
      if (node.updatedAt) {
        const ageDays = (now - new Date(node.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= 7 && ageDays >= 0) {
          recencyBonus = 0.1 * (1 - ageDays / 7);
        }
      }

      // Combined formula:
      // (alpha * semantic + (1 - alpha) * graph + recency) * confidence
      const rawCombined = (alpha * sScore + (1 - alpha) * gScore + recencyBonus) * confMultiplier;
      const normalizedScore = Math.min(1.0, Math.max(0.01, rawCombined));

      finalResults.push({
        node,
        score: Math.round(normalizedScore * 1000) / 1000,
        graphScore: Math.round(gScore * 1000) / 1000,
        semanticScore: Math.round(sScore * 1000) / 1000,
        path: gItem?.path || [node.id],
      });
    }

    finalResults.sort((a, b) => b.score - a.score);
    return finalResults.slice(0, topK);
  }
}
