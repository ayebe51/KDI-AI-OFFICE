// ==========================================================
// services/api/src/graph/repository/neo4j-graph.repository.ts
// Primary Neo4j Graph Repository Implementation with Resilient Fallback
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  GraphNode,
  GraphNodeType,
  GraphRelationship,
  GraphRelationshipType,
  SubgraphResult,
  GraphRetrievalQuery,
  HybridRetrievalQuery,
  HybridRetrievalResult,
  GraphStats,
  MemoryVisibility,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { Neo4jConnectionService } from '../connection/neo4j-connection.service.js';
import type { GraphRepository } from './graph-repository.interface.js';

// Valid labels whitelist for strict Cypher injection defense
const VALID_LABELS = new Set<string>([
  'Person',
  'Agent',
  'Department',
  'Project',
  'Task',
  'Execution',
  'Repository',
  'Branch',
  'Workspace',
  'File',
  'Commit',
  'TestRun',
  'Artifact',
  'Decision',
  'Requirement',
  'Architecture',
  'Technology',
  'Skill',
  'Tool',
  'Provider',
  'Model',
  'Document',
  'Memory',
  'Issue',
  'Incident',
  'Policy',
  'Approval',
  'Event',
]);

const VALID_REL_TYPES = new Set<string>([
  'OWNS',
  'HAS_TASK',
  'DEPENDS_ON',
  'ASSIGNED_TO',
  'EXECUTED',
  'HAS_SKILL',
  'FOR_TASK',
  'WORKED_ON',
  'USED_MODEL',
  'USED_PROVIDER',
  'USED_TOOL',
  'USED_WORKSPACE',
  'FOR_REPOSITORY',
  'HAS_BRANCH',
  'CONTAINS_COMMIT',
  'CHANGED',
  'PRODUCED',
  'PRODUCED_TEST',
  'USES',
  'IMPLEMENTS',
  'HAS_DECISION',
  'AFFECTS',
  'SUPERSEDED_BY',
  'RELATES_TO',
  'GENERATED',
  'ABOUT',
  'COLLABORATED_WITH',
  'CAUSED_BY',
  'RESOLVED_BY',
  'VERIFIED_BY',
  'HAS_EXPERIENCE_WITH',
  'SOLVED',
  'SUCCEEDED_ON',
]);

@Injectable()
export class Neo4jGraphRepository implements GraphRepository {
  private readonly logger = new StructuredLogger('Neo4jGraphRepository');

  // Resilient in-memory fallback graph store (used when Neo4j is offline or during testing)
  private readonly fallbackNodes = new Map<string, GraphNode>();
  private readonly fallbackRelationships = new Map<string, GraphRelationship>();

  constructor(private readonly connection: Neo4jConnectionService) {}

  private sanitizeLabel(label: string): string {
    return VALID_LABELS.has(label) ? label : 'Entity';
  }

  private sanitizeRelType(relType: string): string {
    return VALID_REL_TYPES.has(relType) ? relType : 'RELATED_TO';
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  public async upsertNode(node: GraphNode): Promise<void> {
    // 1. Always update local fallback for offline consistency & immediate test speed
    this.fallbackNodes.set(node.id, {
      ...node,
      updatedAt: new Date().toISOString(),
    });

    if (!this.connection.isAvailable()) {
      return;
    }

    const safeLabel = this.sanitizeLabel(node.entityType);
    const cypher = `
      MERGE (n:${safeLabel} { id: $id })
      SET n.entityType = $entityType,
          n.sourceSystem = $sourceSystem,
          n.sourceId = $sourceId,
          n.properties = $properties,
          n.embedding = $embedding,
          n.createdAt = coalesce(n.createdAt, $createdAt),
          n.updatedAt = $updatedAt
    `;

    try {
      await this.connection.executeWrite(cypher, {
        id: node.id,
        entityType: node.entityType,
        sourceSystem: node.sourceSystem,
        sourceId: node.sourceId,
        properties: JSON.stringify(node.properties || {}),
        embedding: node.embedding || null,
        createdAt: node.createdAt || new Date().toISOString(),
        updatedAt: node.updatedAt || new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('upsertNode', `Neo4j node upsert failed, stored in fallback: ${msg}`);
    }
  }

  public async upsertRelationship(rel: GraphRelationship): Promise<void> {
    // 1. Update local fallback
    this.fallbackRelationships.set(rel.id, {
      ...rel,
      updatedAt: new Date().toISOString(),
    });

    if (!this.connection.isAvailable()) {
      return;
    }

    const safeType = this.sanitizeRelType(rel.type);
    const cypher = `
      MATCH (a { id: $startNodeId })
      MATCH (b { id: $endNodeId })
      MERGE (a)-[r:${safeType} { id: $id }]->(b)
      SET r.properties = $properties,
          r.createdAt = coalesce(r.createdAt, $createdAt),
          r.updatedAt = $updatedAt
    `;

    try {
      await this.connection.executeWrite(cypher, {
        id: rel.id,
        startNodeId: rel.startNodeId,
        endNodeId: rel.endNodeId,
        properties: JSON.stringify(rel.properties || {}),
        createdAt: rel.createdAt || new Date().toISOString(),
        updatedAt: rel.updatedAt || new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('upsertRelationship', `Neo4j relationship upsert failed, stored in fallback: ${msg}`);
    }
  }

  public async removeRelationship(relId: string): Promise<void> {
    this.fallbackRelationships.delete(relId);

    if (!this.connection.isAvailable()) return;

    const cypher = `MATCH ()-[r { id: $relId }]-() DELETE r`;
    try {
      await this.connection.executeWrite(cypher, { relId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('removeRelationship', `Failed to delete relationship ${relId}: ${msg}`);
    }
  }

  public async findNode(id: string): Promise<GraphNode | null> {
    if (!this.connection.isAvailable()) {
      return this.fallbackNodes.get(id) || null;
    }

    const cypher = `
      MATCH (n { id: $id })
      RETURN n.id AS id, n.entityType AS entityType, n.sourceSystem AS sourceSystem,
             n.sourceId AS sourceId, n.properties AS properties, n.embedding AS embedding,
             n.createdAt AS createdAt, n.updatedAt AS updatedAt
    `;

    try {
      const records = await this.connection.executeRead<Record<string, any>>(cypher, { id });
      if (records.length === 0) {
        return this.fallbackNodes.get(id) || null;
      }
      const r = records[0];
      return {
        id: r.id,
        entityType: r.entityType as GraphNodeType,
        sourceSystem: r.sourceSystem || 'kdi',
        sourceId: r.sourceId || r.id,
        properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}),
        embedding: r.embedding || undefined,
        createdAt: String(r.createdAt),
        updatedAt: String(r.updatedAt),
      };
    } catch {
      return this.fallbackNodes.get(id) || null;
    }
  }

  public async findRelatedNodes(
    id: string,
    relationshipType?: string,
    direction: 'IN' | 'OUT' | 'BOTH' = 'BOTH',
    limit: number = 50
  ): Promise<GraphNode[]> {
    if (!this.connection.isAvailable()) {
      const relatedNodeIds = new Set<string>();
      for (const rel of this.fallbackRelationships.values()) {
        if (relationshipType && rel.type !== relationshipType) continue;
        if ((direction === 'OUT' || direction === 'BOTH') && rel.startNodeId === id) {
          relatedNodeIds.add(rel.endNodeId);
        }
        if ((direction === 'IN' || direction === 'BOTH') && rel.endNodeId === id) {
          relatedNodeIds.add(rel.startNodeId);
        }
      }
      return Array.from(relatedNodeIds)
        .map((nid) => this.fallbackNodes.get(nid))
        .filter((n): n is GraphNode => Boolean(n))
        .slice(0, limit);
    }

    const relClause = relationshipType ? `:${this.sanitizeRelType(relationshipType)}` : '';
    const arrow = direction === 'OUT' ? `-[r${relClause}]->` : direction === 'IN' ? `<-[r${relClause}]-` : `-[r${relClause}]-`;

    const cypher = `
      MATCH (a { id: $id })${arrow}(b)
      RETURN DISTINCT b.id AS id, b.entityType AS entityType, b.sourceSystem AS sourceSystem,
             b.sourceId AS sourceId, b.properties AS properties, b.embedding AS embedding,
             b.createdAt AS createdAt, b.updatedAt AS updatedAt
      LIMIT $limit
    `;

    try {
      const records = await this.connection.executeRead<Record<string, any>>(cypher, { id, limit });
      return records.map((r) => ({
        id: r.id,
        entityType: r.entityType as GraphNodeType,
        sourceSystem: r.sourceSystem || 'kdi',
        sourceId: r.sourceId || r.id,
        properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}),
        embedding: r.embedding || undefined,
        createdAt: String(r.createdAt),
        updatedAt: String(r.updatedAt),
      }));
    } catch {
      return this.findRelatedNodes(id, relationshipType, direction, limit);
    }
  }

  public async findSubgraph(
    startNodeId: string,
    maxHops: number = 2,
    limit: number = 100
  ): Promise<SubgraphResult> {
    // Bound depth between 1 and 4 to strictly prevent graph explosion
    const boundedHops = Math.min(Math.max(maxHops, 1), 4);

    // In-memory BFS traversal for fallback or unit testing
    const visitedNodes = new Map<string, GraphNode>();
    const visitedRels = new Map<string, GraphRelationship>();

    const startNode = this.fallbackNodes.get(startNodeId);
    if (startNode) {
      visitedNodes.set(startNode.id, startNode);
    }

    let currentLevelNodes = new Set<string>([startNodeId]);
    for (let hop = 0; hop < boundedHops; hop++) {
      const nextLevelNodes = new Set<string>();
      for (const currentId of currentLevelNodes) {
        for (const rel of this.fallbackRelationships.values()) {
          if (rel.startNodeId === currentId || rel.endNodeId === currentId) {
            visitedRels.set(rel.id, rel);
            const neighborId = rel.startNodeId === currentId ? rel.endNodeId : rel.startNodeId;
            if (!visitedNodes.has(neighborId)) {
              const neighborNode = this.fallbackNodes.get(neighborId);
              if (neighborNode) {
                visitedNodes.set(neighborId, neighborNode);
                nextLevelNodes.add(neighborId);
              }
            }
          }
        }
      }
      currentLevelNodes = nextLevelNodes;
      if (visitedNodes.size >= limit) break;
    }

    if (!this.connection.isAvailable()) {
      return {
        nodes: Array.from(visitedNodes.values()).slice(0, limit),
        relationships: Array.from(visitedRels.values()).slice(0, limit * 2),
      };
    }

    // Neo4j variable-length path traversal
    const cypher = `
      MATCH path = (start { id: $startNodeId })-[*1..${boundedHops}]-(neighbor)
      WITH nodes(path) AS ns, relationships(path) AS rs
      UNWIND ns AS n
      UNWIND rs AS r
      RETURN DISTINCT n.id AS nodeId, n.entityType AS entityType, n.properties AS properties,
             r.id AS relId, type(r) AS relType, startNode(r).id AS startId, endNode(r).id AS endId,
             r.properties AS relProps
      LIMIT $limit
    `;

    try {
      const records = await this.connection.executeRead<Record<string, any>>(cypher, {
        startNodeId,
        limit,
      });

      const neoNodes = new Map<string, GraphNode>();
      const neoRels = new Map<string, GraphRelationship>();

      for (const rec of records) {
        if (rec.nodeId && !neoNodes.has(rec.nodeId)) {
          neoNodes.set(rec.nodeId, {
            id: rec.nodeId,
            entityType: rec.entityType || 'Entity',
            sourceSystem: 'kdi-neo4j',
            sourceId: rec.nodeId,
            properties: typeof rec.properties === 'string' ? JSON.parse(rec.properties) : (rec.properties || {}),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        if (rec.relId && !neoRels.has(rec.relId)) {
          neoRels.set(rec.relId, {
            id: rec.relId,
            type: rec.relType || 'RELATED_TO',
            startNodeId: rec.startId,
            endNodeId: rec.endId,
            properties: typeof rec.relProps === 'string' ? JSON.parse(rec.relProps) : (rec.relProps || {}),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (neoNodes.size === 0) {
        return {
          nodes: Array.from(visitedNodes.values()).slice(0, limit),
          relationships: Array.from(visitedRels.values()).slice(0, limit * 2),
        };
      }

      return {
        nodes: Array.from(neoNodes.values()),
        relationships: Array.from(neoRels.values()),
      };
    } catch {
      return {
        nodes: Array.from(visitedNodes.values()).slice(0, limit),
        relationships: Array.from(visitedRels.values()).slice(0, limit * 2),
      };
    }
  }

  public async searchGraph(query: GraphRetrievalQuery): Promise<GraphNode[]> {
    const limit = query.limit || 50;
    const candidates = Array.from(this.fallbackNodes.values());

    return candidates
      .filter((n) => {
        if (query.targetEntityTypes && query.targetEntityTypes.length > 0) {
          if (!query.targetEntityTypes.includes(n.entityType)) return false;
        }
        if (query.projectId && n.properties.projectId && n.properties.projectId !== query.projectId) {
          return false;
        }
        if (query.taskId && n.properties.taskId && n.properties.taskId !== query.taskId) {
          return false;
        }
        if (query.visibilityLevel) {
          const vis = (n.properties.visibility as MemoryVisibility) || 'INTERNAL';
          if (query.visibilityLevel === 'PUBLIC' && vis !== 'PUBLIC') return false;
          if (query.visibilityLevel === 'INTERNAL' && (vis === 'PRIVATE' || vis === 'CONFIDENTIAL')) return false;
        }
        return true;
      })
      .slice(0, limit);
  }

  public async searchSemantic(
    vector: number[],
    topK: number = 10,
    filter?: Record<string, unknown>
  ): Promise<{ node: GraphNode; score: number }[]> {
    const scoredNodes: { node: GraphNode; score: number }[] = [];

    // Score all fallback nodes containing embeddings
    for (const node of this.fallbackNodes.values()) {
      if (!node.embedding || node.embedding.length === 0) continue;

      if (filter) {
        let match = true;
        for (const [k, v] of Object.entries(filter)) {
          if (node.properties[k] !== v) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      const score = this.cosineSimilarity(vector, node.embedding);
      if (score > 0.05) {
        scoredNodes.push({ node, score });
      }
    }

    scoredNodes.sort((a, b) => b.score - a.score);
    return scoredNodes.slice(0, topK);
  }

  public async searchHybrid(query: HybridRetrievalQuery): Promise<HybridRetrievalResult[]> {
    const topK = query.topK || 10;
    const alpha = query.alpha !== undefined ? query.alpha : 0.5; // 0.5 balanced

    // 1. Graph structural expansion if startNodeId is provided
    const graphScores = new Map<string, { node: GraphNode; score: number; path: string[] }>();
    if (query.startNodeId) {
      const subgraph = await this.findSubgraph(query.startNodeId, query.maxHops || 2, 50);
      for (const node of subgraph.nodes) {
        const hops = node.id === query.startNodeId ? 0 : 1;
        const gScore = 1 / (hops + 1); // 1.0 for start node, 0.5 for 1-hop
        graphScores.set(node.id, { node, score: gScore, path: [query.startNodeId, node.id] });
      }
    }

    // 2. Semantic search
    // If query text provided, we search nodes by embedding or keyword relevance
    const semanticScores = new Map<string, { node: GraphNode; score: number }>();
    const allNodes = Array.from(this.fallbackNodes.values());

    for (const node of allNodes) {
      // Filter by entityTypes
      if (query.entityTypes && query.entityTypes.length > 0 && !query.entityTypes.includes(node.entityType)) {
        continue;
      }
      // Filter by projectId
      if (query.projectId && node.properties.projectId && node.properties.projectId !== query.projectId) {
        continue;
      }
      // Filter by visibilityLevel
      if (query.visibilityLevel) {
        const vis = (node.properties.visibility as MemoryVisibility) || 'INTERNAL';
        if (query.visibilityLevel === 'PUBLIC' && vis !== 'PUBLIC') continue;
        if (query.visibilityLevel === 'INTERNAL' && (vis === 'PRIVATE' || vis === 'CONFIDENTIAL')) continue;
      }

      // Keyword text matching heuristic for semantic fallback
      const textToMatch = `${node.properties.title || ''} ${node.properties.content || ''} ${node.properties.summary || ''} ${node.id}`.toLowerCase();
      const terms = query.query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
      let matchCount = 0;
      for (const term of terms) {
        if (textToMatch.includes(term)) matchCount++;
      }
      const textScore = terms.length > 0 ? matchCount / terms.length : 0;

      if (textScore > 0.1 || graphScores.has(node.id)) {
        semanticScores.set(node.id, { node, score: textScore });
      }
    }

    // 3. Fusion of graph & semantic scores
    const fusedMap = new Map<string, HybridRetrievalResult>();

    // Merge all candidate node IDs
    const allCandidateIds = new Set<string>([
      ...Array.from(graphScores.keys()),
      ...Array.from(semanticScores.keys()),
    ]);

    for (const id of allCandidateIds) {
      const gItem = graphScores.get(id);
      const sItem = semanticScores.get(id);
      const node = gItem?.node || sItem?.node || this.fallbackNodes.get(id);
      if (!node) continue;

      const gScore = gItem?.score || 0;
      const sScore = sItem?.score || 0;
      const combinedScore = alpha * sScore + (1 - alpha) * gScore;

      fusedMap.set(id, {
        node,
        score: Math.round(combinedScore * 1000) / 1000,
        graphScore: Math.round(gScore * 1000) / 1000,
        semanticScore: Math.round(sScore * 1000) / 1000,
        path: gItem?.path || [id],
      });
    }

    const results = Array.from(fusedMap.values());
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  public async countNodes(label?: string): Promise<number> {
    if (!this.connection.isAvailable()) {
      if (!label) return this.fallbackNodes.size;
      return Array.from(this.fallbackNodes.values()).filter((n) => n.entityType === label).length;
    }

    const safeLabel = label ? `:${this.sanitizeLabel(label)}` : '';
    const cypher = `MATCH (n${safeLabel}) RETURN count(n) AS cnt`;
    try {
      const res = await this.connection.executeRead<{ cnt: any }>(cypher);
      return Number(res[0]?.cnt || 0);
    } catch {
      return this.fallbackNodes.size;
    }
  }

  public async countRelationships(type?: string): Promise<number> {
    if (!this.connection.isAvailable()) {
      if (!type) return this.fallbackRelationships.size;
      return Array.from(this.fallbackRelationships.values()).filter((r) => r.type === type).length;
    }

    const safeType = type ? `:${this.sanitizeRelType(type)}` : '';
    const cypher = `MATCH ()-[r${safeType}]->() RETURN count(r) AS cnt`;
    try {
      const res = await this.connection.executeRead<{ cnt: any }>(cypher);
      return Number(res[0]?.cnt || 0);
    } catch {
      return this.fallbackRelationships.size;
    }
  }

  public async getStats(): Promise<GraphStats> {
    const isConn = this.connection.isAvailable();
    const totalNodes = await this.countNodes();
    const totalRelationships = await this.countRelationships();

    const nodesByLabel: Record<string, number> = {};
    for (const node of this.fallbackNodes.values()) {
      nodesByLabel[node.entityType] = (nodesByLabel[node.entityType] || 0) + 1;
    }

    const memoryCount = nodesByLabel['Memory'] || 0;
    const decisionCount = nodesByLabel['Decision'] || 0;

    return {
      totalNodes,
      totalRelationships,
      nodesByLabel,
      memoryCount,
      decisionCount,
      vectorIndexStatus: isConn ? 'ONLINE' : 'DEGRADED_LOCAL',
      isConnected: isConn,
    };
  }

  // Helper for test fixtures / resetting local state
  public clearLocalFallback(): void {
    this.fallbackNodes.clear();
    this.fallbackRelationships.clear();
  }
}
