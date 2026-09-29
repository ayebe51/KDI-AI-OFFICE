// ==========================================================
// services/api/src/graph/memory/memory.service.ts
// 3-Tier Graph Memory Management, Lifecycle & Stale Detection
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  GraphMemoryItem,
  MemoryScope,
  MemoryRetention,
  MemoryConfidence,
  MemoryVisibility,
  MemoryLifecycleStatus,
  GraphNode,
  GraphRelationship,
} from '@kdi/types';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';
import { EmbeddingService } from '../embedding/embedding.service.js';
import { EventsGateway } from '../../websocket/events.gateway.js';

@Injectable()
export class MemoryService {
  private readonly logger = new StructuredLogger('MemoryService');

  constructor(
    private readonly repository: Neo4jGraphRepository,
    private readonly embeddingService: EmbeddingService,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) {}

  /**
   * Create or update a graph memory item.
   */
  public async saveMemory(item: Partial<GraphMemoryItem> & { title: string; content: string }): Promise<GraphMemoryItem> {
    const id = item.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const scope: MemoryScope = item.scope || 'PROJECT';
    const retention: MemoryRetention = item.retention || 'PROJECT';
    const confidence: MemoryConfidence = item.confidence || 'SUPPORTED';
    const visibility: MemoryVisibility = item.visibility || 'INTERNAL';
    const lifecycle: MemoryLifecycleStatus = item.lifecycle || 'ACTIVE';

    // Compute embedding for semantic vector retrieval
    const textToEmbed = `${item.title}: ${item.content} ${(item.tags || []).join(' ')}`;
    const embedding = item.embedding || (await this.embeddingService.embedText(textToEmbed));

    const memoryItem: GraphMemoryItem = {
      id,
      scope,
      title: item.title,
      content: item.content,
      retention,
      confidence,
      visibility,
      lifecycle,
      provenance: item.provenance || {
        sourceType: 'runtime',
        sourceId: id,
        sourceTimestamp: now,
        createdBy: 'ai-system',
        lastVerifiedAt: now,
      },
      validFrom: item.validFrom || now,
      validUntil: item.validUntil,
      embedding,
      tags: item.tags || [],
      projectId: item.projectId,
      taskId: item.taskId,
      agentId: item.agentId,
      createdAt: item.createdAt || now,
      updatedAt: now,
    };

    // Upsert Memory node into graph
    const graphNode: GraphNode = {
      id: memoryItem.id,
      entityType: 'Memory',
      sourceSystem: 'kdi-memory',
      sourceId: memoryItem.id,
      properties: {
        scope: memoryItem.scope,
        title: memoryItem.title,
        content: memoryItem.content,
        retention: memoryItem.retention,
        confidence: memoryItem.confidence,
        visibility: memoryItem.visibility,
        lifecycle: memoryItem.lifecycle,
        provenance: memoryItem.provenance,
        tags: memoryItem.tags,
        projectId: memoryItem.projectId,
        taskId: memoryItem.taskId,
        agentId: memoryItem.agentId,
        validFrom: memoryItem.validFrom,
        validUntil: memoryItem.validUntil,
      },
      embedding: memoryItem.embedding,
      createdAt: memoryItem.createdAt,
      updatedAt: memoryItem.updatedAt,
    };

    await this.repository.upsertNode(graphNode);

    // Link Memory to Project if present
    if (memoryItem.projectId) {
      await this.repository.upsertRelationship({
        id: `rel_${memoryItem.id}_about_prj`,
        type: 'ABOUT',
        startNodeId: memoryItem.id,
        endNodeId: memoryItem.projectId,
        properties: { timestamp: now },
        createdAt: now,
        updatedAt: now,
      });
    }

    // Link Memory to Task if present
    if (memoryItem.taskId) {
      await this.repository.upsertRelationship({
        id: `rel_${memoryItem.id}_about_tsk`,
        type: 'ABOUT',
        startNodeId: memoryItem.id,
        endNodeId: memoryItem.taskId,
        properties: { timestamp: now },
        createdAt: now,
        updatedAt: now,
      });
    }

    // Link Agent to Memory if present
    if (memoryItem.agentId) {
      await this.repository.upsertRelationship({
        id: `rel_${memoryItem.agentId}_gen_${memoryItem.id}`,
        type: 'GENERATED',
        startNodeId: memoryItem.agentId,
        endNodeId: memoryItem.id,
        properties: { timestamp: now },
        createdAt: now,
        updatedAt: now,
      });
    }

    this.logger.info('saveMemory', `Saved ${scope} memory: "${memoryItem.title}" [${memoryItem.id}]`);
    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('memory:created', 'office:events', {
          memoryId: memoryItem.id,
          title: memoryItem.title,
          scope: memoryItem.scope,
          confidence: memoryItem.confidence,
          visibility: memoryItem.visibility,
          projectId: memoryItem.projectId,
        })
      );
    }

    return memoryItem;
  }

  /**
   * Retrieve a memory item by ID.
   */
  public async getMemory(id: string): Promise<GraphMemoryItem | null> {
    const node = await this.repository.findNode(id);
    if (!node || node.entityType !== 'Memory') return null;

    return {
      id: node.id,
      scope: (node.properties.scope as MemoryScope) || 'PROJECT',
      title: String(node.properties.title || node.id),
      content: String(node.properties.content || ''),
      retention: (node.properties.retention as MemoryRetention) || 'PROJECT',
      confidence: (node.properties.confidence as MemoryConfidence) || 'SUPPORTED',
      visibility: (node.properties.visibility as MemoryVisibility) || 'INTERNAL',
      lifecycle: (node.properties.lifecycle as MemoryLifecycleStatus) || 'ACTIVE',
      provenance: (node.properties.provenance as any) || {
        sourceType: 'runtime',
        sourceId: node.id,
        createdBy: 'system',
      },
      validFrom: node.properties.validFrom as string,
      validUntil: node.properties.validUntil as string,
      embedding: node.embedding,
      tags: (node.properties.tags as string[]) || [],
      projectId: node.properties.projectId as string,
      taskId: node.properties.taskId as string,
      agentId: node.properties.agentId as string,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  /**
   * Mark an old memory as SUPERSEDED and STALE when new verified evidence replaces it.
   */
  public async supersedeMemory(oldMemoryId: string, newMemoryId: string): Promise<void> {
    const oldNode = await this.repository.findNode(oldMemoryId);
    if (!oldNode) return;

    oldNode.properties.lifecycle = 'SUPERSEDED';
    oldNode.properties.confidence = 'STALE';
    oldNode.properties.supersededBy = newMemoryId;
    oldNode.properties.validUntil = new Date().toISOString();
    oldNode.updatedAt = new Date().toISOString();

    await this.repository.upsertNode(oldNode);

    // Create SUPERSEDED_BY relationship in graph
    await this.repository.upsertRelationship({
      id: `rel_sup_${oldMemoryId}_${newMemoryId}`,
      type: 'SUPERSEDED_BY',
      startNodeId: oldMemoryId,
      endNodeId: newMemoryId,
      properties: { timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.logger.info(
      'supersedeMemory',
      `Memory ${oldMemoryId} marked SUPERSEDED & STALE by ${newMemoryId}`
    );
    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('memory:updated', 'office:events', {
          memoryId: oldMemoryId,
          lifecycle: 'SUPERSEDED',
          confidence: 'STALE',
          supersededBy: newMemoryId,
        })
      );
    }
  }

  /**
   * Invalidate a false or hallucinated memory.
   */
  public async invalidateMemory(memoryId: string, reason: string): Promise<void> {
    const node = await this.repository.findNode(memoryId);
    if (!node) return;

    node.properties.lifecycle = 'INVALIDATED';
    node.properties.confidence = 'UNVERIFIED';
    node.properties.invalidationReason = reason;
    node.updatedAt = new Date().toISOString();

    await this.repository.upsertNode(node);
    this.logger.warn('invalidateMemory', `Memory ${memoryId} invalidated: ${reason}`);
    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('memory:invalidated', 'office:events', { memoryId, reason })
      );
    }
  }
}
