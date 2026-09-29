// ==========================================================
// services/api/src/engineering/events/engineering-event.emitter.ts
// Normalized Engineering Event Pipeline & Virtual Office Activity Bridge
// ==========================================================

import type {
  EngineeringEvent,
  EngineeringEventType,
  AgentState,
  AgentRole,
  AgentStatusChangedPayload,
} from '@kdi/types';
import { StructuredLogger, createWSEventEnvelope, scrubSensitiveData } from '@kdi/shared';
import type { EventsGateway } from '../../websocket/events.gateway.js';
import type { RedisService } from '../../database/redis.service.js';

export class EngineeringEventEmitter {
  private readonly logger = new StructuredLogger('EngineeringEventEmitter');

  constructor(
    private readonly eventsGateway?: EventsGateway,
    private readonly redisService?: RedisService
  ) {}

  /**
   * Emit a normalized, correlated, timestamped engineering event
   */
  public emit(
    type: EngineeringEventType,
    sessionId: string,
    executionId: string,
    taskId: string,
    agentId: string,
    payload: Record<string, unknown> = {}
  ): EngineeringEvent {
    const eventId = `eng_evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sanitizedPayload = scrubSensitiveData(payload) as Record<string, unknown>;

    const event: EngineeringEvent = {
      eventId,
      sessionId,
      executionId,
      taskId,
      agentId,
      type,
      timestamp: new Date().toISOString(),
      payload: sanitizedPayload,
    };

    this.logger.info('emit', `[${type}] session=${sessionId} task=${taskId} agent=${agentId}`);

    // 1. Broadcast over WebSockets
    if (this.eventsGateway) {
      const wsEnvelope = createWSEventEnvelope(type, 'office:events', event);
      this.eventsGateway.broadcastEvent(wsEnvelope);

      // Map to 3D Virtual Office Activity State
      const visualState = this.mapEventToOfficeActivity(type);
      if (visualState) {
        const statusPayload: AgentStatusChangedPayload = {
          agentId,
          role: 'SOFTWARE_ENGINEER' as AgentRole,
          previousState: 'WORKING',
          currentState: visualState,
          roomId: 'Room-Engineering',
          taskId,
          activitySummary: this.describeActivity(type, payload),
        };
        this.eventsGateway.broadcastAgentState(statusPayload);
      }
    }

    // 2. Publish to Redis event transport
    if (this.redisService) {
      const redisClient = this.redisService.getClient();
      if (redisClient && redisClient.status === 'ready') {
        redisClient.publish('kdi:events:engineering', JSON.stringify(event)).catch((err) => {
          this.logger.debug('emit', `Redis publish skipped: ${err.message}`);
        });
      }
    }

    return event;
  }

  /**
   * Deterministic mapping from engineering event to 3D office visual state
   */
  public mapEventToOfficeActivity(type: EngineeringEventType): AgentState | null {
    switch (type) {
      case 'engineering.started':
        return 'THINKING';
      case 'engineering.plan.started':
        return 'PLANNING';
      case 'engineering.tool.started':
        return 'READING';
      case 'engineering.file.changed':
        return 'CODING';
      case 'engineering.test.started':
      case 'engineering.test.completed':
        return 'TESTING';
      case 'engineering.approval.required':
      case 'engineering.permission.requested':
        return 'WAITING_APPROVAL';
      case 'engineering.error':
        return 'DEBUGGING';
      case 'engineering.completed':
        return 'COMPLETED';
      case 'engineering.failed':
        return 'ERROR';
      default:
        return 'WORKING';
    }
  }

  private describeActivity(type: EngineeringEventType, payload: Record<string, unknown>): string {
    switch (type) {
      case 'engineering.file.changed':
        return `Editing file: ${payload.file || 'source code'}`;
      case 'engineering.test.started':
        return `Running verification tests: ${payload.command || 'npm test'}`;
      case 'engineering.tool.started':
        return `Inspecting codebase using ${payload.tool || 'tool'}`;
      case 'engineering.approval.required':
        return `Waiting for operator approval: ${payload.reason || 'Restricted command'}`;
      case 'engineering.completed':
        return 'Engineering task verified and completed';
      case 'engineering.failed':
        return 'Engineering task failed verification';
      default:
        return 'Autonomous engineering execution in progress';
    }
  }
}
