import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { CrashLoopRecord, CrashLoopState, RestartPolicySpec } from '@kdi/types';

@Injectable()
export class RestartPolicyService {
  private readonly logger = new StructuredLogger('RestartPolicyService');
  private readonly records = new Map<string, CrashLoopRecord>();

  private readonly defaultPolicy: RestartPolicySpec = {
    restartOnFailure: true,
    maxRestartAttempts: 5,
    initialBackoffMs: 1000,
    maxBackoffMs: 30000,
    backoffFactor: 2,
    cooldownPeriodMs: 60000,
    crashLoopThreshold: 3,
  };

  getRecord(serviceId: string): CrashLoopRecord {
    let rec = this.records.get(serviceId);
    if (!rec) {
      rec = {
        serviceId,
        state: 'NORMAL',
        consecutiveFailures: 0,
        currentBackoffMs: this.defaultPolicy.initialBackoffMs,
      };
      this.records.set(serviceId, rec);
    }
    return rec;
  }

  recordSuccess(serviceId: string, forceReset = true): void {
    const rec = this.getRecord(serviceId);
    const now = Date.now();

    if (
      forceReset ||
      (rec.lastFailureAt && now - new Date(rec.lastFailureAt).getTime() > this.defaultPolicy.cooldownPeriodMs)
    ) {
      rec.consecutiveFailures = 0;
      rec.state = 'NORMAL';
      rec.currentBackoffMs = this.defaultPolicy.initialBackoffMs;
      rec.nextAttemptAllowedAt = undefined;
    }
  }

  recordFailure(serviceId: string, policy: RestartPolicySpec = this.defaultPolicy): {
    state: CrashLoopState;
    retryAllowed: boolean;
    backoffMs: number;
    nextAttemptAllowedAt?: string;
  } {
    const rec = this.getRecord(serviceId);
    const now = Date.now();

    rec.consecutiveFailures += 1;
    rec.lastFailureAt = new Date(now).toISOString();

    // Calculate exponential backoff with jitter
    const jitter = Math.floor(Math.random() * 200);
    const rawBackoff =
      policy.initialBackoffMs * Math.pow(policy.backoffFactor, Math.min(rec.consecutiveFailures - 1, 6));
    const backoffMs = Math.min(rawBackoff, policy.maxBackoffMs) + jitter;
    rec.currentBackoffMs = backoffMs;

    const nextAttempt = new Date(now + backoffMs).toISOString();
    rec.nextAttemptAllowedAt = nextAttempt;

    if (rec.consecutiveFailures >= policy.crashLoopThreshold) {
      if (rec.consecutiveFailures > policy.maxRestartAttempts) {
        rec.state = 'ESCALATED';
        this.logger.error(
          'recordFailure',
          `Service ${serviceId} exceeded max restart attempts (${policy.maxRestartAttempts}). ESCALATING TO OPERATOR.`
        );
        return {
          state: 'ESCALATED',
          retryAllowed: false,
          backoffMs,
          nextAttemptAllowedAt: nextAttempt,
        };
      }

      rec.state = 'CRASH_LOOP';
      this.logger.warn(
        'recordFailure',
        `Service ${serviceId} entered CRASH_LOOP after ${rec.consecutiveFailures} consecutive failures. Backing off ${backoffMs}ms.`
      );
      return {
        state: 'CRASH_LOOP',
        retryAllowed: policy.restartOnFailure,
        backoffMs,
        nextAttemptAllowedAt: nextAttempt,
      };
    }

    rec.state = 'BACKOFF';
    this.logger.info(
      'recordFailure',
      `Service ${serviceId} failed (${rec.consecutiveFailures}/${policy.crashLoopThreshold}). Backoff: ${backoffMs}ms`
    );

    return {
      state: 'BACKOFF',
      retryAllowed: policy.restartOnFailure,
      backoffMs,
      nextAttemptAllowedAt: nextAttempt,
    };
  }

  reset(serviceId: string): void {
    this.records.delete(serviceId);
  }

  getAllRecords(): CrashLoopRecord[] {
    return Array.from(this.records.values());
  }
}
