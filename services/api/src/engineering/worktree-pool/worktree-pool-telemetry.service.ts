// ==========================================================
// services/api/src/engineering/worktree-pool/worktree-pool-telemetry.service.ts
// Phase 23: Worktree Pool Telemetry & Latency Profiling Engine (§16)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  WorktreePoolEventType,
  WorktreePoolTelemetryEvent,
} from './worktree-pool.types.js';

@Injectable()
export class WorktreePoolTelemetryService {
  private readonly logger = new StructuredLogger('WorktreePoolTelemetryService');
  private readonly events: WorktreePoolTelemetryEvent[] = [];

  /**
   * Record a structured telemetry event (§16)
   */
  public recordEvent(
    typeOrEvent: WorktreePoolEventType | Partial<WorktreePoolTelemetryEvent>,
    taskId?: string,
    projectId?: string,
    worktreeId?: string,
    durationMs?: number,
    status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'QUARANTINED' = 'SUCCESS',
    metadata?: Record<string, unknown>
  ): WorktreePoolTelemetryEvent {
    let event: WorktreePoolTelemetryEvent;

    if (typeof typeOrEvent === 'object') {
      const e = typeOrEvent;
      event = {
        eventId: e.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: e.type || 'WORKTREE_POOL_CLAIM',
        taskId: e.taskId || 'unknown',
        projectId: e.projectId || 'engineering',
        worktreeId: e.worktreeId || 'unknown',
        timestamp: e.timestamp || new Date().toISOString(),
        durationMs: e.durationMs ?? 0,
        status: e.status || 'SUCCESS',
        metadata: e.metadata,
      };
    } else {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      event = {
        eventId,
        type: typeOrEvent,
        taskId: taskId || 'unknown',
        projectId: projectId || 'engineering',
        worktreeId: worktreeId || 'unknown',
        timestamp: new Date().toISOString(),
        durationMs: durationMs ?? 0,
        status,
        metadata,
      };
    }

    this.events.push(event);

    this.logger.debug(
      'recordEvent',
      `[${event.type}] Task: ${event.taskId}, Worktree: ${event.worktreeId}, Duration: ${event.durationMs}ms, Status: ${event.status}`
    );

    return event;
  }

  /**
   * Get percentile duration for a specific event type (§16)
   */
  public getPercentile(type: WorktreePoolEventType, p: number): number {
    const events = this.getEventsByType(type);
    if (events.length === 0) return 0;
    const durations = events.map((e) => e.durationMs).sort((a, b) => a - b);
    const idx = Math.max(0, Math.min(durations.length - 1, Math.ceil((p / 100) * durations.length) - 1));
    return durations[idx];
  }

  /**
   * Get all recorded events
   */
  public getEvents(): WorktreePoolTelemetryEvent[] {
    return [...this.events];
  }

  /**
   * Filter events by type
   */
  public getEventsByType(type: WorktreePoolEventType): WorktreePoolTelemetryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Calculate percentile latencies (P50, P90, P95, P99) for a given event type or all events
   */
  public calculatePercentiles(events: WorktreePoolTelemetryEvent[]): {
    count: number;
    mean: number;
    median: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  } {
    if (events.length === 0) {
      return { count: 0, mean: 0, median: 0, p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const durations = events.map((e) => e.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, v) => acc + v, 0);
    const mean = sum / durations.length;

    const getP = (p: number) => {
      const idx = Math.max(0, Math.min(
        durations.length - 1,
        Math.ceil((p / 100) * durations.length) - 1
      ));
      return durations[idx];
    };

    return {
      count: durations.length,
      mean: Math.round(mean * 10) / 10,
      median: getP(50),
      p50: getP(50),
      p90: getP(90),
      p95: getP(95),
      p99: getP(99),
      min: durations[0],
      max: durations[durations.length - 1],
    };
  }

  /**
   * Clear recorded events (useful for test isolation)
   */
  public clear(): void {
    this.events.length = 0;
  }
}
