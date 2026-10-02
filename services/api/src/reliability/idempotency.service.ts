import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { StructuredLogger } from '@kdi/shared';
import type { IdempotencyRecord } from '@kdi/types';

@Injectable()
export class IdempotencyService {
  private readonly logger = new StructuredLogger('IdempotencyService');
  private readonly store = new Map<string, IdempotencyRecord>();
  private readonly defaultTtlMs = 86400000; // 24 hours

  hashPayload(payload: unknown): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  async acquire(
    key: string,
    scope: string,
    payload: unknown,
    ttlMs: number = this.defaultTtlMs
  ): Promise<{ acquired: boolean; existingRecord?: IdempotencyRecord }> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing) {
      if (new Date(existing.expiresAt).getTime() > now) {
        this.logger.info(
          'acquire',
          `Duplicate operation detected for idempotency key "${key}" [scope: ${scope}, status: ${existing.status}]`
        );
        return { acquired: false, existingRecord: existing };
      }
      // Expired, allow overwriting
      this.store.delete(key);
    }

    const payloadHash = this.hashPayload(payload);
    const record: IdempotencyRecord = {
      idempotencyKey: key,
      scope,
      status: 'IN_PROGRESS',
      payloadHash,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    };

    this.store.set(key, record);
    return { acquired: true };
  }

  complete(key: string, responsePayload?: unknown): void {
    const rec = this.store.get(key);
    if (rec) {
      rec.status = 'COMPLETED';
      rec.responsePayload = responsePayload;
    }
  }

  fail(key: string, error?: string): void {
    const rec = this.store.get(key);
    if (rec) {
      rec.status = 'FAILED';
      rec.responsePayload = { error };
    }
  }

  get(key: string): IdempotencyRecord | undefined {
    return this.store.get(key);
  }

  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, rec] of this.store.entries()) {
      if (new Date(rec.expiresAt).getTime() <= now) {
        this.store.delete(key);
        purged++;
      }
    }
    return purged;
  }
}
