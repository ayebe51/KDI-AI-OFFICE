// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// KdiEventAdapter: Normalizes WebSocket event envelopes
// ==========================================================

import type { KdiNormalizedEvent } from '../types';
import { SecretSanitizer } from '../security/SecretSanitizer.ts';

export interface RawWSEvent {
  eventId?: string;
  id?: string;
  type?: string;
  eventType?: string;
  event?: string;
  timestamp?: string;
  correlationId?: string;
  data?: any;
  payload?: any;
}

export class KdiEventAdapter {
  static normalizeEventType(rawType?: string): KdiNormalizedEvent['eventType'] {
    if (!rawType) return 'agent.status.changed';
    const t = rawType.toLowerCase().replace(/_/g, '.');
    if (t.includes('agent.status') || t.includes('agentstatus')) return 'agent.status.changed';
    if (t.includes('agent.location')) return 'agent.location.changed';
    if (t.includes('task.create')) return 'task.created';
    if (t.includes('task.assign')) return 'task.assigned';
    if (t.includes('task.complete')) return 'task.completed';
    if (t.includes('task.block')) return 'task.blocked';
    if (t.includes('task.update')) return 'task.updated';
    if (t.includes('execution.start')) return 'execution.started';
    if (t.includes('execution.progress') || t.includes('execution.log')) return 'execution.progress';
    if (t.includes('execution.complete')) return 'execution.completed';
    if (t.includes('approval.require') || t.includes('approval.create')) return 'approval.required';
    if (t.includes('approval.decide') || t.includes('approval.resolve')) return 'approval.decided';
    if (t.includes('incident.create')) return 'incident.created';
    if (t.includes('incident.update')) return 'incident.updated';
    if (t.includes('health')) return 'system.health.changed';
    if (t.includes('telegram')) return 'telegram.command.received';
    if (t.includes('orchestrator')) return 'orchestrator.decision.created';
    return 'agent.status.changed';
  }

  static sanitizePayload(payload: any): any {
    if (payload == null) return payload;
    if (typeof payload === 'string') {
      return SecretSanitizer.sanitize(payload);
    }
    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizePayload(item));
    }
    if (typeof payload === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(payload)) {
        sanitized[key] = this.sanitizePayload(val);
      }
      return sanitized;
    }
    return payload;
  }

  static toNormalizedEvent(raw: RawWSEvent): KdiNormalizedEvent {
    const rawType = raw.type || raw.eventType || raw.event;
    const eventType = this.normalizeEventType(rawType);
    const data = this.sanitizePayload(raw.data || raw.payload || {});

    return {
      eventId: raw.eventId || raw.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      timestamp: raw.timestamp || new Date().toISOString(),
      correlationId: raw.correlationId || (data && data.correlationId),
      data,
    };
  }
}
