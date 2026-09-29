// ==========================================================
// services/api/src/graph/memory/decision.service.ts
// Architecture Decision Record (ADR) & Decision History Service
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  DecisionNode,
  GraphNode,
  GraphRelationship,
  MemoryVisibility,
} from '@kdi/types';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';
import { EventsGateway } from '../../websocket/events.gateway.js';

@Injectable()
export class DecisionService {
  private readonly logger = new StructuredLogger('DecisionService');

  constructor(
    private readonly repository: Neo4jGraphRepository,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) {}

  public async saveDecision(decision: DecisionNode): Promise<DecisionNode> {
    const now = new Date().toISOString();

    const graphNode: GraphNode = {
      id: decision.decisionId,
      entityType: 'Decision',
      sourceSystem: 'kdi-adr',
      sourceId: decision.decisionId,
      properties: {
        projectId: decision.projectId,
        title: decision.title,
        context: decision.context,
        decision: decision.decision,
        reason: decision.reason,
        alternatives: decision.alternatives,
        status: decision.status,
        supersededBy: decision.supersededBy,
        confidence: decision.confidence,
        visibility: decision.visibility,
        source: decision.source,
      },
      createdAt: decision.createdAt || now,
      updatedAt: decision.updatedAt || now,
    };

    await this.repository.upsertNode(graphNode);

    // Link: Project -HAS_DECISION-> Decision
    if (decision.projectId) {
      await this.repository.upsertRelationship({
        id: `rel_${decision.projectId}_has_dec_${decision.decisionId}`,
        type: 'HAS_DECISION',
        startNodeId: decision.projectId,
        endNodeId: decision.decisionId,
        properties: { timestamp: now },
        createdAt: now,
        updatedAt: now,
      });
    }

    this.logger.info('saveDecision', `Saved Decision [${decision.decisionId}]: "${decision.title}" (${decision.status})`);
    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('decision:created', 'office:events', {
          decisionId: decision.decisionId,
          title: decision.title,
          projectId: decision.projectId,
          status: decision.status,
        })
      );
    }

    return decision;
  }

  public async getDecisionsForProject(projectId: string): Promise<DecisionNode[]> {
    const related = await this.repository.findRelatedNodes(projectId, 'HAS_DECISION', 'OUT', 50);
    return related.map((node) => ({
      decisionId: node.id,
      projectId: String(node.properties.projectId || projectId),
      title: String(node.properties.title || node.id),
      context: String(node.properties.context || ''),
      decision: String(node.properties.decision || ''),
      reason: String(node.properties.reason || ''),
      alternatives: (node.properties.alternatives as string[]) || [],
      status: (node.properties.status as any) || 'ACCEPTED',
      supersededBy: node.properties.supersededBy as string,
      confidence: (node.properties.confidence as any) || 'VERIFIED',
      visibility: (node.properties.visibility as any) || 'INTERNAL',
      source: String(node.properties.source || 'ADR'),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }));
  }

  public async supersedeDecision(oldDecisionId: string, newDecisionId: string): Promise<void> {
    const oldNode = await this.repository.findNode(oldDecisionId);
    if (!oldNode) return;

    oldNode.properties.status = 'SUPERSEDED';
    oldNode.properties.supersededBy = newDecisionId;
    oldNode.properties.confidence = 'STALE';
    oldNode.updatedAt = new Date().toISOString();

    await this.repository.upsertNode(oldNode);

    // Link: Decision -SUPERSEDED_BY-> Decision
    await this.repository.upsertRelationship({
      id: `rel_sup_dec_${oldDecisionId}_${newDecisionId}`,
      type: 'SUPERSEDED_BY',
      startNodeId: oldDecisionId,
      endNodeId: newDecisionId,
      properties: { timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.logger.info(
      'supersedeDecision',
      `Decision ${oldDecisionId} marked SUPERSEDED by ${newDecisionId}`
    );
  }
}
