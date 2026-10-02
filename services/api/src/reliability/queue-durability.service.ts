import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { IdempotencyService } from './idempotency.service.js';
import type { DLQRecord, EventReplayRequest, EventReplayResult } from '@kdi/types';

@Injectable()
export class QueueDurabilityService {
  private readonly logger = new StructuredLogger('QueueDurabilityService');
  private readonly dlq = new Map<string, DLQRecord>();
  private readonly replayHistory: Array<{ timestamp: string; replayedCount: number }> = [];

  constructor(private readonly idempotencyService: IdempotencyService) {}

  enqueueDeadLetter(
    eventId: string,
    source: string,
    attempts: number,
    lastError: string,
    payload: unknown
  ): DLQRecord {
    const dlqId = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: DLQRecord = {
      dlqId,
      eventId,
      source,
      attempts,
      lastError,
      payload,
      createdAt: new Date().toISOString(),
      nextAction: 'MANUAL_INSPECTION',
    };

    this.dlq.set(dlqId, record);
    this.logger.error(
      'enqueueDeadLetter',
      `Event ${eventId} from ${source} moved to DLQ (${dlqId}) after ${attempts} failed attempts: ${lastError}`
    );

    return record;
  }

  getDLQRecords(): DLQRecord[] {
    return Array.from(this.dlq.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getDLQRecord(dlqId: string): DLQRecord | undefined {
    return this.dlq.get(dlqId);
  }

  async replayEvent(
    dlqId: string,
    targetHandler?: (payload: unknown) => Promise<void>
  ): Promise<{ success: boolean; error?: string }> {
    const record = this.dlq.get(dlqId);
    if (!record) {
      return { success: false, error: 'DLQ record not found' };
    }

    const idempotencyKey = `replay_${record.eventId}`;
    const { acquired } = await this.idempotencyService.acquire(
      idempotencyKey,
      'event_replay',
      record.payload
    );

    if (!acquired) {
      this.logger.warn(
        'replayEvent',
        `Replay skipped for ${record.eventId} due to existing idempotency record.`
      );
      return { success: true };
    }

    try {
      if (targetHandler) {
        await targetHandler(record.payload);
      }
      this.idempotencyService.complete(idempotencyKey, { replayedAt: new Date().toISOString() });
      record.nextAction = 'RETRY';
      record.resolvedAt = new Date().toISOString();
      this.logger.info('replayEvent', `DLQ event ${dlqId} successfully replayed.`);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.idempotencyService.fail(idempotencyKey, msg);
      this.logger.error('replayEvent', `Failed to replay DLQ event ${dlqId}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async replayBatch(request: EventReplayRequest): Promise<EventReplayResult> {
    const start = Date.now();
    const details: EventReplayResult['details'] = [];
    let replayedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const targetRecords = request.eventIds
      ? Array.from(this.dlq.values()).filter((r) => request.eventIds!.includes(r.eventId))
      : Array.from(this.dlq.values());

    for (const rec of targetRecords) {
      if (request.dryRun) {
        details.push({ eventId: rec.eventId, status: 'REPLAYED' });
        replayedCount++;
        continue;
      }

      const res = await this.replayEvent(rec.dlqId);
      if (res.success) {
        replayedCount++;
        details.push({ eventId: rec.eventId, status: 'REPLAYED' });
      } else {
        failedCount++;
        details.push({ eventId: rec.eventId, status: 'FAILED', error: res.error });
      }
    }

    const durationMs = Date.now() - start;
    this.replayHistory.push({ timestamp: new Date().toISOString(), replayedCount });

    return {
      replayedCount,
      skippedCount,
      failedCount,
      durationMs,
      details,
    };
  }

  purgeResolved(): number {
    let count = 0;
    for (const [key, rec] of this.dlq.entries()) {
      if (rec.resolvedAt) {
        this.dlq.delete(key);
        count++;
      }
    }
    return count;
  }
}
