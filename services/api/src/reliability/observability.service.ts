import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { StructuredLogger, generateTraceId, generateSpanId } from '@kdi/shared';
import type {
  TraceContext,
  SpanRecord,
  MetricSample,
  AlertRecord,
  AlertSeverity,
  SLODefinition,
} from '@kdi/types';

@Injectable()
export class ObservabilityService {
  private readonly logger = new StructuredLogger('ObservabilityService');
  private readonly activeSpans = new Map<string, SpanRecord>();
  private readonly completedSpans: SpanRecord[] = [];
  private readonly metrics: MetricSample[] = [];
  private readonly alerts = new Map<string, AlertRecord>();
  private readonly alertDeduplicationMap = new Map<string, number>();

  private readonly slos: SLODefinition[] = [
    {
      sloId: 'slo_api_availability',
      name: 'API Availability',
      service: 'kdi-api',
      targetPercentage: 99.5,
      currentPercentage: 99.9,
      windowPeriod: '30d',
      errorBudgetPercentageRemaining: 80.0,
      status: 'HEALTHY',
    },
    {
      sloId: 'slo_backup_success',
      name: 'Database Backup Success Rate',
      service: 'kdi-backup',
      targetPercentage: 99.9,
      currentPercentage: 100.0,
      windowPeriod: '30d',
      errorBudgetPercentageRemaining: 100.0,
      status: 'HEALTHY',
    },
    {
      sloId: 'slo_task_latency',
      name: 'Task Processing Latency P95 < 5s',
      service: 'kdi-agent-runtime',
      targetPercentage: 95.0,
      currentPercentage: 98.2,
      windowPeriod: '7d',
      errorBudgetPercentageRemaining: 64.0,
      status: 'HEALTHY',
    },
    {
      sloId: 'slo_websocket_uptime',
      name: '3D Virtual Office WebSocket Streaming Uptime',
      service: 'kdi-websocket',
      targetPercentage: 99.0,
      currentPercentage: 99.8,
      windowPeriod: '30d',
      errorBudgetPercentageRemaining: 80.0,
      status: 'HEALTHY',
    },
  ];

  createTraceContext(correlationId?: string): TraceContext {
    return {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      correlationId: correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      sampled: true,
    };
  }

  startSpan(
    name: string,
    parentCtx?: TraceContext,
    attributes: Record<string, unknown> = {}
  ): { span: SpanRecord; context: TraceContext } {
    const traceId = parentCtx?.traceId || generateTraceId();
    const spanId = generateSpanId();
    const correlationId = parentCtx?.correlationId || `corr_${Date.now()}`;

    const span: SpanRecord = {
      traceId,
      spanId,
      parentSpanId: parentCtx?.spanId,
      name,
      startTime: new Date().toISOString(),
      attributes,
      status: 'OK',
    };

    this.activeSpans.set(spanId, span);
    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentCtx?.spanId,
      correlationId,
      sampled: true,
    };

    return { span, context };
  }

  endSpan(spanId: string, status: 'OK' | 'ERROR' = 'OK', errorMessage?: string): SpanRecord | undefined {
    const span = this.activeSpans.get(spanId);
    if (!span) return undefined;

    span.endTime = new Date().toISOString();
    span.durationMs = new Date(span.endTime).getTime() - new Date(span.startTime).getTime();
    span.status = status;
    span.errorMessage = errorMessage;

    this.activeSpans.delete(spanId);
    this.completedSpans.unshift(span);
    if (this.completedSpans.length > 500) {
      this.completedSpans.pop();
    }

    return span;
  }

  recordMetric(name: string, value: number, unit = 'count', labels: Record<string, string> = {}): void {
    const sample: MetricSample = {
      metricName: name,
      value,
      unit,
      labels,
      timestamp: new Date().toISOString(),
    };
    this.metrics.unshift(sample);
    if (this.metrics.length > 1000) {
      this.metrics.pop();
    }
  }

  triggerAlert(
    severity: AlertSeverity,
    source: string,
    reason: string,
    impact: string,
    recommendedAction: string,
    runbook: string
  ): AlertRecord | null {
    // Deduplicate identical alerts within 60s
    const dedupKey = `${severity}_${source}_${reason}`;
    const now = Date.now();
    const lastFired = this.alertDeduplicationMap.get(dedupKey);

    if (lastFired && now - lastFired < 60000) {
      return null;
    }
    this.alertDeduplicationMap.set(dedupKey, now);

    const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: AlertRecord = {
      alertId,
      severity,
      source,
      reason,
      impact,
      recommendedAction,
      runbook,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
    };

    this.alerts.set(alertId, record);
    this.logger.warn(
      'triggerAlert',
      `[${severity}] Alert triggered from ${source}: ${reason} (Runbook: ${runbook})`
    );

    return record;
  }

  acknowledgeAlert(alertId: string, operator: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    alert.acknowledgedBy = operator;
    alert.acknowledgedAt = new Date().toISOString();
    return true;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    return true;
  }

  getActiveAlerts(): AlertRecord[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved);
  }

  getAllAlerts(): AlertRecord[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getSLOs(): SLODefinition[] {
    return this.slos;
  }

  getRecentSpans(): SpanRecord[] {
    return this.completedSpans.slice(0, 50);
  }

  getMetricsSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const m of this.metrics.slice(0, 100)) {
      summary[m.metricName] = m.value;
    }
    return summary;
  }
}
