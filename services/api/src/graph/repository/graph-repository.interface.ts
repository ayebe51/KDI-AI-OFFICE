// ==========================================================
// services/api/src/graph/repository/graph-repository.interface.ts
// Canonical Graph Repository Abstraction for KDI AI Office
// ==========================================================

import type {
  GraphNode,
  GraphRelationship,
  SubgraphResult,
  GraphRetrievalQuery,
  HybridRetrievalQuery,
  HybridRetrievalResult,
  GraphStats,
} from '@kdi/types';

export interface GraphRepository {
  /**
   * Idempotently upsert a graph node.
   */
  upsertNode(node: GraphNode): Promise<void>;

  /**
   * Idempotently upsert a graph relationship between two nodes.
   */
  upsertRelationship(rel: GraphRelationship): Promise<void>;

  /**
   * Remove a relationship by its ID or properties.
   */
  removeRelationship(relId: string): Promise<void>;

  /**
   * Find a node by unique ID.
   */
  findNode(id: string): Promise<GraphNode | null>;

  /**
   * Find immediate neighbors of a node.
   */
  findRelatedNodes(
    id: string,
    relationshipType?: string,
    direction?: 'IN' | 'OUT' | 'BOTH',
    limit?: number
  ): Promise<GraphNode[]>;

  /**
   * Perform bounded k-hop traversal from a start node.
   */
  findSubgraph(
    startNodeId: string,
    maxHops?: number,
    limit?: number
  ): Promise<SubgraphResult>;

  /**
   * Search graph nodes by structured query filters.
   */
  searchGraph(query: GraphRetrievalQuery): Promise<GraphNode[]>;

  /**
   * Perform vector similarity search over graph nodes with embeddings.
   */
  searchSemantic(
    vector: number[],
    topK?: number,
    filter?: Record<string, unknown>
  ): Promise<{ node: GraphNode; score: number }[]>;

  /**
   * Perform hybrid search combining structural graph proximity and vector similarity.
   */
  searchHybrid(query: HybridRetrievalQuery): Promise<HybridRetrievalResult[]>;

  /**
   * Count nodes matching label or total.
   */
  countNodes(label?: string): Promise<number>;

  /**
   * Count relationships matching type or total.
   */
  countRelationships(type?: string): Promise<number>;

  /**
   * Retrieve graph telemetry statistics.
   */
  getStats(): Promise<GraphStats>;
}
