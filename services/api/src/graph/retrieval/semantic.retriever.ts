// ==========================================================
// services/api/src/graph/retrieval/semantic.retriever.ts
// Vector-based Semantic Retriever with Score Normalization
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  GraphNode,
  SemanticRetrievalQuery,
  MemoryVisibility,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';
import { EmbeddingService } from '../embedding/embedding.service.js';

export interface ScoredSemanticNode {
  node: GraphNode;
  similarity: number; // Normalized [0, 1]
}

@Injectable()
export class SemanticRetriever {
  private readonly logger = new StructuredLogger('SemanticRetriever');

  constructor(
    private readonly repository: Neo4jGraphRepository,
    private readonly embeddingService: EmbeddingService
  ) {}

  public async retrieve(query: SemanticRetrievalQuery): Promise<ScoredSemanticNode[]> {
    const topK = query.topK || 10;
    const minScore = query.minScore || 0.1;
    const visibilityLevel: MemoryVisibility = query.visibilityLevel || 'INTERNAL';

    // 1. Generate query embedding if not provided
    const vector = query.queryVector || (await this.embeddingService.embedText(query.query));

    // 2. Perform vector retrieval
    const rawMatches = await this.repository.searchSemantic(vector, topK * 2);

    // 3. Filter and normalize results
    const results: ScoredSemanticNode[] = [];
    for (const match of rawMatches) {
      const node = match.node;

      // Entity type filter
      if (query.entityTypes && query.entityTypes.length > 0 && !query.entityTypes.includes(node.entityType)) {
        continue;
      }

      // Project scope filter
      if (query.projectId && node.properties.projectId && node.properties.projectId !== query.projectId) {
        continue;
      }

      // Visibility authorization filter
      const vis = (node.properties.visibility as MemoryVisibility) || 'INTERNAL';
      if (visibilityLevel === 'PUBLIC' && vis !== 'PUBLIC') continue;
      if (visibilityLevel === 'INTERNAL' && (vis === 'PRIVATE' || vis === 'CONFIDENTIAL')) continue;
      if (visibilityLevel === 'PRIVATE' && vis === 'CONFIDENTIAL') continue;

      // Normalize score to [0, 1]
      const normalizedScore = Math.max(0, Math.min(1, match.score));
      if (normalizedScore >= minScore) {
        results.push({
          node,
          similarity: Math.round(normalizedScore * 1000) / 1000,
        });
      }

      if (results.length >= topK) break;
    }

    return results;
  }
}
