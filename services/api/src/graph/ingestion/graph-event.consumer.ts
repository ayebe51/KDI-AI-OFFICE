// ==========================================================
// services/api/src/graph/ingestion/graph-event.consumer.ts
// Asynchronous Event-Driven Graph Ingestion from Runtime & Engineering
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  EngineeringEvent,
  GraphNode,
  GraphRelationship,
} from '@kdi/types';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import { Neo4jGraphRepository } from '../repository/neo4j-graph.repository.js';
import { EventsGateway } from '../../websocket/events.gateway.js';

@Injectable()
export class GraphEventConsumer {
  private readonly logger = new StructuredLogger('GraphEventConsumer');
  private readonly processedEventIds = new Set<string>();

  constructor(
    private readonly repository: Neo4jGraphRepository,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) {}

  /**
   * Idempotently process an incoming runtime or engineering event.
   */
  public async handleEvent(event: {
    eventId: string;
    type: string;
    payload: Record<string, any>;
    timestamp: string;
  }): Promise<void> {
    if (this.processedEventIds.has(event.eventId)) {
      this.logger.debug('handleEvent', `Duplicate event skipped: ${event.eventId}`);
      return;
    }

    try {
      await this.processEventInternal(event);
      this.processedEventIds.add(event.eventId);
      // Keep memory bound
      if (this.processedEventIds.size > 5000) {
        const oldest = Array.from(this.processedEventIds).slice(0, 1000);
        for (const id of oldest) this.processedEventIds.delete(id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        'handleEvent',
        `Non-blocking graph ingestion failure for event ${event.eventId} (${event.type}): ${msg}`
      );
    }
  }

  private async processEventInternal(event: {
    eventId: string;
    type: string;
    payload: Record<string, any>;
    timestamp: string;
  }): Promise<void> {
    const { type, payload, timestamp } = event;
    const now = timestamp || new Date().toISOString();

    switch (type) {
      case 'task.created': {
        const taskId = payload.taskId || payload.id;
        const projectId = payload.projectId || 'PRJ-KDI';
        if (taskId) {
          await this.repository.upsertNode({
            id: taskId,
            entityType: 'Task',
            sourceSystem: 'kdi-postgres',
            sourceId: taskId,
            properties: {
              title: payload.title || taskId,
              status: payload.status || 'CREATED',
              priority: payload.priority || 'NORMAL',
              projectId,
            },
            createdAt: now,
            updatedAt: now,
          });

          // Link: Project -HAS_TASK-> Task
          await this.repository.upsertRelationship({
            id: `rel_${projectId}_has_task_${taskId}`,
            type: 'HAS_TASK',
            startNodeId: projectId,
            endNodeId: taskId,
            properties: { timestamp: now },
            createdAt: now,
            updatedAt: now,
          });
        }
        break;
      }

      case 'task.assigned': {
        const taskId = payload.taskId;
        const agentId = payload.agentId;
        if (taskId && agentId) {
          await this.repository.upsertRelationship({
            id: `rel_${agentId}_assigned_${taskId}`,
            type: 'ASSIGNED_TO',
            startNodeId: agentId,
            endNodeId: taskId,
            properties: { timestamp: now },
            createdAt: now,
            updatedAt: now,
          });
        }
        break;
      }

      case 'execution.started':
      case 'engineering.started': {
        const execId = payload.executionId;
        const taskId = payload.taskId;
        const agentId = payload.agentId;
        const projectId = payload.projectId || 'PRJ-KDI';

        if (execId) {
          await this.repository.upsertNode({
            id: execId,
            entityType: 'Execution',
            sourceSystem: 'kdi-runtime',
            sourceId: execId,
            properties: {
              status: 'RUNNING',
              taskId,
              agentId,
              projectId,
            },
            createdAt: now,
            updatedAt: now,
          });

          if (agentId) {
            await this.repository.upsertRelationship({
              id: `rel_${agentId}_exec_${execId}`,
              type: 'EXECUTED',
              startNodeId: agentId,
              endNodeId: execId,
              properties: { timestamp: now },
              createdAt: now,
              updatedAt: now,
            });
          }

          if (taskId) {
            await this.repository.upsertRelationship({
              id: `rel_${execId}_for_task_${taskId}`,
              type: 'FOR_TASK',
              startNodeId: execId,
              endNodeId: taskId,
              properties: { timestamp: now },
              createdAt: now,
              updatedAt: now,
            });
          }

          if (projectId) {
            await this.repository.upsertRelationship({
              id: `rel_${execId}_worked_on_${projectId}`,
              type: 'WORKED_ON',
              startNodeId: execId,
              endNodeId: projectId,
              properties: { timestamp: now },
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        break;
      }

      case 'engineering.file.changed': {
        const execId = payload.executionId;
        const filePath = payload.file || payload.filePath;
        if (execId && filePath) {
          const fileNodeId = `file_${Buffer.from(filePath).toString('base64').replace(/=/g, '')}`;
          await this.repository.upsertNode({
            id: fileNodeId,
            entityType: 'File',
            sourceSystem: 'git',
            sourceId: filePath,
            properties: { path: filePath },
            createdAt: now,
            updatedAt: now,
          });

          await this.repository.upsertRelationship({
            id: `rel_${execId}_changed_${fileNodeId}`,
            type: 'CHANGED',
            startNodeId: execId,
            endNodeId: fileNodeId,
            properties: { timestamp: now },
            createdAt: now,
            updatedAt: now,
          });
        }
        break;
      }

      case 'engineering.completed': {
        const execId = payload.executionId;
        if (execId) {
          const node = await this.repository.findNode(execId);
          if (node) {
            node.properties.status = payload.status || 'COMPLETED';
            node.properties.summary = payload.summary;
            node.updatedAt = now;
            await this.repository.upsertNode(node);
          }
        }
        break;
      }

      default:
        // No-op for unhandled event types
        break;
    }

    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('graph:updated', 'office:events', {
          eventType: type,
          timestamp: now,
        })
      );
    }
  }
}
