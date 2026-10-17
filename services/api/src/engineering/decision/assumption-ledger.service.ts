// ==========================================================
// services/api/src/engineering/decision/assumption-ledger.service.ts
// Phase 22: Machine-Readable Assumption Ledger & Verification Lifecycle (§3, §16)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  AssumptionRecord,
  AssumptionStatus,
  DecisionAction,
  DecisionRiskLevel,
  ReversibilityLevel,
} from './decision.types.js';

export interface RecordAssumptionParams {
  taskId: string;
  ambiguityId: string;
  decision: DecisionAction;
  assumption: string;
  evidence: string[];
  confidence: number;
  risk: DecisionRiskLevel;
  reversibility: ReversibilityLevel;
}

@Injectable()
export class AssumptionLedgerService {
  private readonly logger = new StructuredLogger('AssumptionLedgerService');
  private readonly assumptions = new Map<string, AssumptionRecord>();
  private readonly taskIndex = new Map<string, string[]>(); // taskId -> assumptionIds

  /**
   * Record a new assumption into the machine-readable ledger (§3)
   */
  public recordAssumption(params: RecordAssumptionParams): AssumptionRecord {
    const assumptionId = `asm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: AssumptionRecord = {
      assumptionId,
      taskId: params.taskId,
      ambiguityId: params.ambiguityId,
      decision: params.decision,
      assumption: params.assumption,
      evidence: [...params.evidence],
      confidence: params.confidence,
      risk: params.risk,
      reversibility: params.reversibility,
      timestamp: new Date().toISOString(),
      result: 'ACTIVE',
    };

    this.assumptions.set(assumptionId, record);

    const existingList = this.taskIndex.get(params.taskId) || [];
    existingList.push(assumptionId);
    this.taskIndex.set(params.taskId, existingList);

    this.logger.info(
      'recordAssumption',
      `[${params.taskId}] Recorded assumption ${assumptionId} (${params.decision}): "${params.assumption}" (Confidence: ${params.confidence}, Risk: ${params.risk})`
    );

    return record;
  }

  /**
   * Get all assumptions for a specific task
   */
  public getAssumptions(taskId: string): AssumptionRecord[] {
    const ids = this.taskIndex.get(taskId) || [];
    return ids.map((id) => this.assumptions.get(id)!).filter(Boolean);
  }

  /**
   * Get a specific assumption by ID
   */
  public getAssumption(assumptionId: string): AssumptionRecord | undefined {
    return this.assumptions.get(assumptionId);
  }

  /**
   * Mark assumption as CONFIRMED upon successful post-execution verification (§16)
   */
  public confirmAssumption(assumptionId: string): AssumptionRecord {
    const record = this.assumptions.get(assumptionId);
    if (!record) {
      throw new Error(`ASSUMPTION_NOT_FOUND: Assumption ${assumptionId} does not exist`);
    }

    record.result = 'CONFIRMED';
    record.verifiedAt = new Date().toISOString();

    this.logger.info(
      'confirmAssumption',
      `[${record.taskId}] Assumption ${assumptionId} CONFIRMED after verification`
    );

    return record;
  }

  /**
   * Mark assumption as INVALIDATED upon verification failure or regression (§16)
   * Records failure reason transparently - never hides assumption errors.
   */
  public invalidateAssumption(assumptionId: string, reason: string): AssumptionRecord {
    const record = this.assumptions.get(assumptionId);
    if (!record) {
      throw new Error(`ASSUMPTION_NOT_FOUND: Assumption ${assumptionId} does not exist`);
    }

    record.result = 'INVALIDATED';
    record.invalidationReason = reason;
    record.verifiedAt = new Date().toISOString();

    this.logger.warn(
      'invalidateAssumption',
      `[${record.taskId}] Assumption ${assumptionId} INVALIDATED: ${reason}`
    );

    return record;
  }

  /**
   * Confirm all active assumptions for a task after all tests & verifications pass
   */
  public confirmAllForTask(taskId: string): void {
    const records = this.getAssumptions(taskId);
    for (const r of records) {
      if (r.result === 'ACTIVE') {
        r.result = 'CONFIRMED';
        r.verifiedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Invalidate all active assumptions for a task upon test failure
   */
  public invalidateAllForTask(taskId: string, reason: string): void {
    const records = this.getAssumptions(taskId);
    for (const r of records) {
      if (r.result === 'ACTIVE') {
        r.result = 'INVALIDATED';
        r.invalidationReason = reason;
        r.verifiedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Summary for a single task
   */
  public getTaskSummary(taskId: string): {
    total: number;
    active: number;
    confirmed: number;
    invalidated: number;
    accuracy: number;
  } {
    const records = this.getAssumptions(taskId);
    const confirmed = records.filter((r) => r.result === 'CONFIRMED').length;
    const invalidated = records.filter((r) => r.result === 'INVALIDATED').length;
    const active = records.filter((r) => r.result === 'ACTIVE').length;
    const resolved = confirmed + invalidated;
    const accuracy = resolved > 0 ? (confirmed / resolved) * 100 : 100;

    return {
      total: records.length,
      active,
      confirmed,
      invalidated,
      accuracy,
    };
  }

  /**
   * Global summary of all assumptions in the ledger
   */
  public getGlobalSummary(): {
    total: number;
    active: number;
    confirmed: number;
    invalidated: number;
    accuracy: number;
  } {
    const all = Array.from(this.assumptions.values());
    const confirmed = all.filter((r) => r.result === 'CONFIRMED').length;
    const invalidated = all.filter((r) => r.result === 'INVALIDATED').length;
    const active = all.filter((r) => r.result === 'ACTIVE').length;
    const resolved = confirmed + invalidated;
    const accuracy = resolved > 0 ? (confirmed / resolved) * 100 : 100;

    return {
      total: all.length,
      active,
      confirmed,
      invalidated,
      accuracy,
    };
  }

  /**
   * Clear all records (useful for test isolation)
   */
  public clear(): void {
    this.assumptions.clear();
    this.taskIndex.clear();
  }
}
