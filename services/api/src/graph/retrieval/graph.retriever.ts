// ==========================================================
// services/api/src/graph/retrieval/graph.retriever.ts
// Structural Graph Topology & Neighborhood Retriever
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  GraphNode,
  GraphNodeType,
  GraphRelationshipType,
  GraphRetrievalQuery,
  SubgraphResult,
  MemoryVisibility,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';

@Injectable()
export class GraphRetriever {
  private readonly logger = new StructuredLogger('GraphRetriever');

  constructor(private readonly repository: Neo4jGraphRepository) {}

  /**
   * Retrieve bounded k-hop neighborhood context around a specific entity.
   */
  public async getEntityContext(
    entityId: string,
    maxHops: number = 2,
    limit: number = 50,
    visibilityLevel: MemoryVisibility = 'INTERNAL'
  ): Promise<SubgraphResult> {
    const subgraph = await this.repository.findSubgraph(entityId, maxHops, limit);

    // Apply visibility authorization filter
    const allowedNodes = subgraph.nodes.filter((node) => {
      const vis = (node.properties.visibility as MemoryVisibility) || 'INTERNAL';
      if (visibilityLevel === 'PUBLIC') return vis === 'PUBLIC';
      if (visibilityLevel === 'INTERNAL') return vis === 'PUBLIC' || vis === 'INTERNAL';
      if (visibilityLevel === 'PRIVATE') return vis !== 'CONFIDENTIAL';
      return true; // CONFIDENTIAL has access to everything
    });

    const allowedNodeIds = new Set(allowedNodes.map((n) => n.id));
    const allowedRels = subgraph.relationships.filter(
      (rel) => allowedNodeIds.has(rel.startNodeId) && allowedNodeIds.has(rel.endNodeId)
    );

    return {
      nodes: allowedNodes,
      relationships: allowedRels,
    };
  }

  /**
   * Retrieve all related entities for a project (Tasks, Decisions, Technologies, Repositories).
   */
  public async getProjectContext(
    projectId: string,
    visibilityLevel: MemoryVisibility = 'INTERNAL'
  ): Promise<SubgraphResult> {
    return this.getEntityContext(projectId, 2, 75, visibilityLevel);
  }

  /**
   * Retrieve all related entities for a task (Assigned Agent, Dependencies, Executions, Commits, Files, Issues).
   */
  public async getTaskContext(
    taskId: string,
    visibilityLevel: MemoryVisibility = 'INTERNAL'
  ): Promise<SubgraphResult> {
    return this.getEntityContext(taskId, 2, 50, visibilityLevel);
  }

  /**
   * Retrieve agent experience graph (Projects worked on, Technologies used, Tasks completed).
   */
  public async getAgentExperience(
    agentId: string,
    visibilityLevel: MemoryVisibility = 'INTERNAL'
  ): Promise<SubgraphResult> {
    return this.getEntityContext(agentId, 2, 50, visibilityLevel);
  }

  /**
   * Structured query search across the graph with strict bounds.
   */
  public async search(query: GraphRetrievalQuery): Promise<GraphNode[]> {
    return this.repository.searchGraph(query);
  }
}
