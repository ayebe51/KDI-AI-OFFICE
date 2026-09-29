// ==========================================================
// services/api/src/llm/governance/circuit-breaker.ts
// Provider Circuit Breaker with Cooldown & Half-Open Probing
// ==========================================================

import type { LLMProviderType } from '@kdi/types';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
  provider: LLMProviderType;
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime?: number;
  cooldownUntil?: number;
  tripReason?: string;
}

export class CircuitBreaker {
  private readonly circuits = new Map<LLMProviderType, CircuitStatus>();
  private readonly failureThreshold: number;
  private readonly defaultCooldownMs: number;

  constructor(failureThreshold = 3, defaultCooldownMs = 60_000) {
    this.failureThreshold = failureThreshold;
    this.defaultCooldownMs = defaultCooldownMs;
  }

  private getOrCreate(provider: LLMProviderType): CircuitStatus {
    let status = this.circuits.get(provider);
    if (!status) {
      status = {
        provider,
        state: 'CLOSED',
        consecutiveFailures: 0,
      };
      this.circuits.set(provider, status);
    }
    return status;
  }

  public isOpen(provider: LLMProviderType): boolean {
    const status = this.getOrCreate(provider);
    const now = Date.now();

    if (status.state === 'OPEN') {
      if (status.cooldownUntil && now >= status.cooldownUntil) {
        // Transition to HALF_OPEN to allow a single probe
        status.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }

    return false;
  }

  public recordSuccess(provider: LLMProviderType): void {
    const status = this.getOrCreate(provider);
    status.state = 'CLOSED';
    status.consecutiveFailures = 0;
    status.lastFailureTime = undefined;
    status.cooldownUntil = undefined;
    status.tripReason = undefined;
  }

  public recordFailure(provider: LLMProviderType, reason?: string): void {
    const status = this.getOrCreate(provider);
    status.consecutiveFailures += 1;
    status.lastFailureTime = Date.now();
    status.tripReason = reason;

    const wasHalfOpen = status.state === 'HALF_OPEN';
    if (status.consecutiveFailures >= this.failureThreshold || wasHalfOpen) {
      status.state = 'OPEN';
      // If failed while HALF_OPEN, double cooldown (120s), else default (60s)
      const duration = wasHalfOpen ? this.defaultCooldownMs * 2 : this.defaultCooldownMs;
      status.cooldownUntil = Date.now() + duration;
    }
  }

  public trip(provider: LLMProviderType, durationMs?: number, reason?: string): void {
    const status = this.getOrCreate(provider);
    status.state = 'OPEN';
    status.consecutiveFailures += 1;
    status.lastFailureTime = Date.now();
    status.cooldownUntil = Date.now() + (durationMs ?? this.defaultCooldownMs);
    status.tripReason = reason || 'Manual or Rate Limit trip';
  }

  public getStatus(provider: LLMProviderType): CircuitStatus {
    const status = this.getOrCreate(provider);
    // Refresh state if cooldown passed
    this.isOpen(provider);
    return { ...status };
  }
}
