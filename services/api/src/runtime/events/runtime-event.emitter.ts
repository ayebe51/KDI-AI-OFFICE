// ==========================================================
// services/api/src/runtime/events/runtime-event.emitter.ts
// Canonical Real-time Event Broadcaster across WebSocket Telemetry
// ==========================================================

import type { CanonicalTask, AgentDefinition, ExecutionRecord, AgentState } from '@kdi/types';
import { createWSEventEnvelope, StructuredLogger } from '@kdi/shared';
import type { EventsGateway } from '../../websocket/events.gateway.js';
import { AgentActivityMapper } from '../state-machines/activity.mapper.js';

export class RuntimeEventEmitter {
  private readonly logger = new StructuredLogger('RuntimeEventEmitter');

  constructor(private readonly eventsGateway?: EventsGateway) {}

  public emitTaskEvent(
    eventType:
      | 'task.created'
      | 'task.queued'
      | 'task.assigned'
      | 'task.started'
      | 'task.paused'
      | 'task.resumed'
      | 'task.retrying'
      | 'task.completed'
      | 'task.failed'
      | 'task.cancelled'
      | 'task.blocked'
      | 'task.escalated',
    task: CanonicalTask,
    extra?: Record<string, unknown>
  ): void {
    if (!this.eventsGateway) return;

    try {
      const envelope = createWSEventEnvelope(eventType, 'office:events', {
        taskId: task.taskId,
        projectId: task.projectId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedAgent: task.assignedAgent,
        retryCount: task.retryCount,
        ...extra,
      });

      this.eventsGateway.broadcastEvent(envelope);
    } catch (err) {
      this.logger.debug('emitTaskEvent', `Failed to broadcast event ${eventType}`);
    }
  }

  public emitAgentEvent(
    eventType:
      | 'agent.available'
      | 'agent.reserved'
      | 'agent.started'
      | 'agent.waiting'
      | 'agent.completed'
      | 'agent.failed'
      | 'agent.offline',
    agent: AgentDefinition,
    extra?: Record<string, unknown>
  ): void {
    if (!this.eventsGateway) return;

    try {
      const envelope = createWSEventEnvelope(eventType, 'office:events', {
        agentId: agent.agentId,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        availability: agent.availability,
        currentTaskId: agent.currentTaskId,
        ...extra,
      });

      this.eventsGateway.broadcastEvent(envelope);
    } catch (err) {
      this.logger.debug('emitAgentEvent', `Failed to broadcast agent event ${eventType}`);
    }
  }

  public emitAgentStatusChanged(
    agent: AgentDefinition,
    previousState: AgentState,
    taskType?: CanonicalTask['taskType'],
    customActivity?: AgentState
  ): void {
    if (!this.eventsGateway) return;

    try {
      const { officeState, activityLabel } = AgentActivityMapper.mapToOfficeActivity(
        agent.status,
        taskType,
        customActivity
      );

      this.eventsGateway.broadcastAgentState({
        agentId: agent.agentId,
        role: agent.role,
        previousState,
        currentState: officeState,
        roomId: agent.room,
        taskId: agent.currentTaskId,
        activitySummary: activityLabel,
      });
    } catch (err) {
      this.logger.debug('emitAgentStatusChanged', 'Failed to broadcast agent state change');
    }
  }

  public emitExecutionEvent(
    eventType: 'execution.started' | 'execution.completed' | 'execution.failed',
    execution: ExecutionRecord
  ): void {
    if (!this.eventsGateway) return;

    try {
      const envelope = createWSEventEnvelope(eventType, 'office:events', {
        executionId: execution.executionId,
        taskId: execution.taskId,
        attempt: execution.attempt,
        agentId: execution.agentId,
        provider: execution.provider,
        model: execution.model,
        status: execution.status,
        usage: execution.usage,
        costUsd: execution.costUsd,
      });

      this.eventsGateway.broadcastEvent(envelope);
    } catch (err) {
      this.logger.debug('emitExecutionEvent', `Failed to broadcast execution event ${eventType}`);
    }
  }
}
