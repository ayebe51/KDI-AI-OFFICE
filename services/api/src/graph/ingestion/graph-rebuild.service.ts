// ==========================================================
// services/api/src/graph/ingestion/graph-rebuild.service.ts
// Graph Rebuild & Disaster Recovery Service from Operational Truth
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';
import { DecisionService } from '../memory/decision.service.js';
import { MemoryService } from '../memory/memory.service.js';

@Injectable()
export class GraphRebuildService {
  private readonly logger = new StructuredLogger('GraphRebuildService');

  constructor(
    private readonly repository: Neo4jGraphRepository,
    private readonly decisionService: DecisionService,
    private readonly memoryService: MemoryService
  ) {}

  /**
   * Rebuild graph context for a specific project.
   */
  public async rebuildProjectGraph(projectId: string): Promise<{
    nodesCreated: number;
    relationshipsCreated: number;
  }> {
    let nodesCreated = 0;
    let relationshipsCreated = 0;
    const now = new Date().toISOString();

    this.logger.info('rebuildProjectGraph', `Rebuilding graph for project: ${projectId}`);

    // 1. Project Root Node
    await this.repository.upsertNode({
      id: projectId,
      entityType: 'Project',
      sourceSystem: 'kdi-postgres',
      sourceId: projectId,
      properties: {
        name: projectId === 'PRJ-KDI' ? 'KDI AI Office' : projectId,
        status: 'ACTIVE',
        description: 'Autonomous Software Engineering & Living Digital Office Platform',
      },
      createdAt: now,
      updatedAt: now,
    });
    nodesCreated++;

    // 2. Standard Technologies
    const technologies = [
      { id: 'tech_typescript', name: 'TypeScript', category: 'Language' },
      { id: 'tech_nestjs', name: 'NestJS', category: 'Framework' },
      { id: 'tech_postgres', name: 'PostgreSQL', category: 'Database' },
      { id: 'tech_neo4j', name: 'Neo4j', category: 'Graph Database' },
      { id: 'tech_redis', name: 'Redis', category: 'Queue & Cache' },
      { id: 'tech_playcanvas', name: 'PlayCanvas React', category: '3D Engine' },
      { id: 'tech_antigravity', name: 'Google Antigravity', category: 'Engineering Layer' },
    ];

    for (const tech of technologies) {
      await this.repository.upsertNode({
        id: tech.id,
        entityType: 'Technology',
        sourceSystem: 'kdi-registry',
        sourceId: tech.id,
        properties: { name: tech.name, category: tech.category },
        createdAt: now,
        updatedAt: now,
      });
      nodesCreated++;

      // Link: Project -USES-> Technology
      await this.repository.upsertRelationship({
        id: `rel_${projectId}_uses_${tech.id}`,
        type: 'USES',
        startNodeId: projectId,
        endNodeId: tech.id,
        properties: { timestamp: now },
        createdAt: now,
        updatedAt: now,
      });
      relationshipsCreated++;
    }

    // 3. Core Architecture Decisions
    const baselineDecisions = [
      {
        decisionId: 'DEC-018',
        projectId,
        title: 'Antigravity as Primary Engineering Execution Layer',
        context: 'OpenCode had limitations and high maintenance overhead.',
        decision: 'Adopt Google Antigravity SDK/CLI as the primary engineering execution layer, decoupling OpenCode.',
        reason: 'Antigravity provides verified autonomous tools, sandboxing, and non-interactive headless CLI execution.',
        alternatives: ['OpenCode standalone', 'Raw bash script runners'],
        status: 'ACCEPTED' as const,
        confidence: 'VERIFIED' as const,
        visibility: 'INTERNAL' as const,
        source: 'ADR-018',
        createdAt: now,
        updatedAt: now,
      },
      {
        decisionId: 'DEC-019',
        projectId,
        title: 'Neo4j as KDI Intelligence Graph',
        context: 'PostgreSQL excels at transactions, but multi-hop relationship and context traversal requires a graph model.',
        decision: 'Use Neo4j as the secondary relationship and intelligence graph, keeping PostgreSQL as operational source of truth.',
        reason: 'Native Cypher graph traversal, vector index support, and sub-second k-hop neighborhood retrieval.',
        alternatives: ['PostgreSQL recursive CTEs', 'Vector-only embeddings'],
        status: 'ACCEPTED' as const,
        confidence: 'VERIFIED' as const,
        visibility: 'INTERNAL' as const,
        source: 'ADR-019',
        createdAt: now,
        updatedAt: now,
      },
      {
        decisionId: 'DEC-020',
        projectId,
        title: 'GraphRAG with Hybrid Graph and Semantic Retrieval',
        context: 'Pure vector retrieval suffers from hallucination and lack of structural relationship context.',
        decision: 'Implement Hybrid GraphRAG combining graph topology traversal and dense vector similarity with normalized reciprocal rank fusion.',
        reason: 'Guarantees grounded, citable answers with strict source provenance.',
        alternatives: ['Naive vector RAG', 'Keyword BM25 search'],
        status: 'ACCEPTED' as const,
        confidence: 'VERIFIED' as const,
        visibility: 'INTERNAL' as const,
        source: 'ADR-020',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const dec of baselineDecisions) {
      await this.decisionService.saveDecision(dec);
      nodesCreated++;
      relationshipsCreated++;
    }

    // 4. Baseline Memory Records
    await this.memoryService.saveMemory({
      scope: 'PROJECT',
      title: `${projectId} Architectural Conventions`,
      content: 'Strict separation: PostgreSQL is operational truth, Redis is queue/event bus, Neo4j is intelligence graph, Antigravity executes coding.',
      retention: 'PROJECT',
      confidence: 'VERIFIED',
      visibility: 'INTERNAL',
      lifecycle: 'ACTIVE',
      tags: ['architecture', 'conventions', 'governance'],
      projectId,
    });
    nodesCreated++;
    relationshipsCreated++;

    this.logger.info(
      'rebuildProjectGraph',
      `Rebuild complete for ${projectId}: Created ${nodesCreated} nodes, ${relationshipsCreated} relationships`
    );

    return { nodesCreated, relationshipsCreated };
  }

  /**
   * Rebuild the entire graph topology across all known projects.
   */
  public async rebuildAll(): Promise<{
    projects: number;
    totalNodes: number;
    totalRelationships: number;
  }> {
    const projects = ['PRJ-KDI', 'PRJ-SIMMACI'];
    let totalNodes = 0;
    let totalRelationships = 0;

    for (const pid of projects) {
      const res = await this.rebuildProjectGraph(pid);
      totalNodes += res.nodesCreated;
      totalRelationships += res.relationshipsCreated;
    }

    return {
      projects: projects.length,
      totalNodes,
      totalRelationships,
    };
  }
}
