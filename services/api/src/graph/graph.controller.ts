// ==========================================================
// services/api/src/graph/graph.controller.ts
// REST Controller for Graph Memory, Intelligence & GraphRAG
// ==========================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type {
  GraphStats,
  GraphRAGQuery,
  GraphRAGResult,
  DecisionNode,
  HybridRetrievalResult,
  SubgraphResult,
  MemoryVisibility,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { Neo4jGraphRepository } from './repository/neo4j-graph.repository.js';
import { GraphRetriever } from './retrieval/graph.retriever.js';
import { HybridGraphRetriever } from './retrieval/hybrid-graph.retriever.js';
import { GraphRAGService } from './graphrag/graphrag.service.js';
import { DecisionService } from './memory/decision.service.js';
import { MemoryService } from './memory/memory.service.js';
import { GraphRebuildService } from './ingestion/graph-rebuild.service.js';

@Controller('memory')
export class GraphController {
  private readonly logger = new StructuredLogger('GraphController');

  constructor(
    private readonly repository: Neo4jGraphRepository,
    private readonly graphRetriever: GraphRetriever,
    private readonly hybridRetriever: HybridGraphRetriever,
    private readonly graphRAGService: GraphRAGService,
    private readonly decisionService: DecisionService,
    private readonly memoryService: MemoryService,
    private readonly rebuildService: GraphRebuildService
  ) {}

  @Get('stats')
  public async getStats(): Promise<GraphStats> {
    return this.repository.getStats();
  }

  @Get('projects/:projectId')
  public async getProjectContext(
    @Param('projectId') projectId: string,
    @Query('visibility') visibility?: MemoryVisibility
  ): Promise<SubgraphResult> {
    return this.graphRetriever.getProjectContext(projectId, visibility || 'INTERNAL');
  }

  @Get('tasks/:taskId')
  public async getTaskContext(
    @Param('taskId') taskId: string,
    @Query('visibility') visibility?: MemoryVisibility
  ): Promise<SubgraphResult> {
    return this.graphRetriever.getTaskContext(taskId, visibility || 'INTERNAL');
  }

  @Get('agents/:agentId')
  public async getAgentExperience(
    @Param('agentId') agentId: string,
    @Query('visibility') visibility?: MemoryVisibility
  ): Promise<SubgraphResult> {
    return this.graphRetriever.getAgentExperience(agentId, visibility || 'INTERNAL');
  }

  @Get('decisions/:projectId')
  public async getDecisions(
    @Param('projectId') projectId: string
  ): Promise<DecisionNode[]> {
    return this.decisionService.getDecisionsForProject(projectId);
  }

  @Get('history/:entityId')
  public async getEntityHistory(
    @Param('entityId') entityId: string,
    @Query('hops') hops?: string,
    @Query('visibility') visibility?: MemoryVisibility
  ): Promise<SubgraphResult> {
    const maxHops = hops ? parseInt(hops, 10) : 2;
    return this.graphRetriever.getEntityContext(entityId, maxHops, 50, visibility || 'INTERNAL');
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  public async search(
    @Body() body: { query: string; projectId?: string; topK?: number; alpha?: number }
  ): Promise<HybridRetrievalResult[]> {
    return this.hybridRetriever.retrieve({
      query: body.query,
      projectId: body.projectId,
      topK: body.topK || 10,
      alpha: body.alpha,
    });
  }

  @Post('graphrag')
  @HttpCode(HttpStatus.OK)
  public async queryGraphRAG(@Body() body: GraphRAGQuery): Promise<GraphRAGResult> {
    return this.graphRAGService.queryGraphRAG(body);
  }

  @Post('rebuild')
  @HttpCode(HttpStatus.OK)
  public async rebuild(
    @Body() body: { projectId?: string }
  ): Promise<{ message: string; details: any }> {
    if (body.projectId) {
      const details = await this.rebuildService.rebuildProjectGraph(body.projectId);
      return { message: `Rebuilt graph for project ${body.projectId}`, details };
    }
    const details = await this.rebuildService.rebuildAll();
    return { message: 'Rebuilt complete graph across all projects', details };
  }
}
