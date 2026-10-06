// ==========================================================
// services/api/src/engineering/operating-system/multi-agent-handoff.service.ts
// Phase 16: Multi-Agent Handoff, Bounded Self-Repair & Task Dependencies
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { MultiAgentHandoffRecord } from './engineering-os.types.js';

export interface HandoffDecision {
  nextAgent: string;
  nextStep: 'IMPLEMENTATION' | 'QA_VERIFICATION' | 'SECURITY_AUDIT' | 'APPROVAL_REVIEW' | 'STOP_HUMAN_ATTENTION';
  reason: string;
  isTerminal: boolean;
  requiresHumanIntervention: boolean;
}

@Injectable()
export class MultiAgentHandoffService {
  private readonly logger = new StructuredLogger('MultiAgentHandoffService');
  private readonly handoffHistory = new Map<string, MultiAgentHandoffRecord[]>();
  private readonly dependencies = new Map<string, string[]>(); // taskId -> parentTaskIds
  private readonly MAX_REPAIR_ATTEMPTS = 3; // Bounded repair loop (§22)

  /**
   * Register task dependency (§24)
   */
  public registerDependency(taskId: string, dependsOnTaskIds: string[]): void {
    if (dependsOnTaskIds && dependsOnTaskIds.length > 0) {
      this.dependencies.set(taskId, dependsOnTaskIds);
      this.logger.info(
        'registerDependency',
        `Task ${taskId} depends on [${dependsOnTaskIds.join(', ')}]`
      );
    }
  }

  /**
   * Check if task is blocked by unfinished dependencies (§24)
   */
  public checkDependencyBlockers(
    taskId: string,
    isTaskCompleteFn: (parentId: string) => boolean
  ): { isBlocked: boolean; blockedBy: string[] } {
    const parentIds = this.dependencies.get(taskId) || [];
    const unfinished = parentIds.filter((pid) => !isTaskCompleteFn(pid));
    return {
      isBlocked: unfinished.length > 0,
      blockedBy: unfinished,
    };
  }

  /**
   * Evaluate multi-agent handoff transition (§23)
   */
  public evaluateHandoff(
    taskId: string,
    currentStep: 'IMPLEMENTATION' | 'QA_VERIFICATION' | 'SECURITY_AUDIT',
    success: boolean,
    currentAttempt: number,
    failureEvidence?: string
  ): HandoffDecision {
    const history = this.handoffHistory.get(taskId) || [];

    // ── Check Bounded Repair Limit (§22) ─────────────────────────
    if (!success && currentAttempt >= this.MAX_REPAIR_ATTEMPTS) {
      this.logger.warn(
        'evaluateHandoff',
        `Task ${taskId} reached maximum repair attempts (${this.MAX_REPAIR_ATTEMPTS}). Escalating to HUMAN_ATTENTION_REQUIRED.`
      );
      this.recordHandoff(taskId, {
        handoffId: `hnd_${Date.now()}`,
        taskId,
        fromAgent: 'QA Engineer',
        toAgent: 'Human Operator',
        step: 'APPROVAL_REVIEW',
        status: 'REJECTED',
        notes: `Bounded repair exceeded ${this.MAX_REPAIR_ATTEMPTS} attempts: ${failureEvidence || 'Repeated verification failures'}`,
        timestamp: new Date().toISOString(),
      });
      return {
        nextAgent: 'Human Operator',
        nextStep: 'STOP_HUMAN_ATTENTION',
        reason: `Maximum automated repair attempts (${this.MAX_REPAIR_ATTEMPTS}) reached. Human attention required.`,
        isTerminal: true,
        requiresHumanIntervention: true,
      };
    }

    // ── Scenario 1: Implementation finished -> Hand off to QA ────
    if (currentStep === 'IMPLEMENTATION' && success) {
      this.recordHandoff(taskId, {
        handoffId: `hnd_${Date.now()}`,
        taskId,
        fromAgent: 'BE Engineer (Farhan Hakim)',
        toAgent: 'QA Engineer (Maya Lestari)',
        step: 'QA_VERIFICATION',
        status: 'PENDING',
        notes: 'Code implementation complete; requesting test suite and regression verification',
        timestamp: new Date().toISOString(),
      });
      return {
        nextAgent: 'QA Engineer (Maya Lestari)',
        nextStep: 'QA_VERIFICATION',
        reason: 'Handing off to QA Engineer for automated regression verification',
        isTerminal: false,
        requiresHumanIntervention: false,
      };
    }

    // ── Scenario 2: QA failed -> Route back to BE Engineer for repair ──
    if (currentStep === 'QA_VERIFICATION' && !success) {
      this.recordHandoff(taskId, {
        handoffId: `hnd_${Date.now()}`,
        taskId,
        fromAgent: 'QA Engineer (Maya Lestari)',
        toAgent: 'BE Engineer (Farhan Hakim)',
        step: 'IMPLEMENTATION',
        status: 'PENDING',
        notes: `Tests failed on attempt ${currentAttempt}: ${failureEvidence || 'Assertion failure'}. Routing back for surgical repair.`,
        timestamp: new Date().toISOString(),
      });
      return {
        nextAgent: 'BE Engineer (Farhan Hakim)',
        nextStep: 'IMPLEMENTATION',
        reason: `Verification failed on attempt ${currentAttempt}. Bounded repair iteration enqueued with test failure context.`,
        isTerminal: false,
        requiresHumanIntervention: false,
      };
    }

    // ── Scenario 3: QA passed -> Hand off to Security Audit ──────
    if (currentStep === 'QA_VERIFICATION' && success) {
      this.recordHandoff(taskId, {
        handoffId: `hnd_${Date.now()}`,
        taskId,
        fromAgent: 'QA Engineer (Maya Lestari)',
        toAgent: 'Security Engineer (Tariq Al-Mansoor)',
        step: 'SECURITY_AUDIT',
        status: 'PENDING',
        notes: 'All automated tests passed; initiating credential & scope security audit',
        timestamp: new Date().toISOString(),
      });
      return {
        nextAgent: 'Security Engineer (Tariq Al-Mansoor)',
        nextStep: 'SECURITY_AUDIT',
        reason: 'Tests verified cleanly; auditing code diff for secret leaks and policy violations',
        isTerminal: false,
        requiresHumanIntervention: false,
      };
    }

    // ── Scenario 4: Security Audit passed -> Hand off to Approval ─
    if (currentStep === 'SECURITY_AUDIT' && success) {
      this.recordHandoff(taskId, {
        handoffId: `hnd_${Date.now()}`,
        taskId,
        fromAgent: 'Security Engineer (Tariq Al-Mansoor)',
        toAgent: 'Human Approver',
        step: 'APPROVAL_REVIEW',
        status: 'PENDING',
        notes: 'Security audit clean; waiting for cryptographic human approval',
        timestamp: new Date().toISOString(),
      });
      return {
        nextAgent: 'Human Approver',
        nextStep: 'APPROVAL_REVIEW',
        reason: 'Security check cleared; task ready for human approval gate',
        isTerminal: false,
        requiresHumanIntervention: true,
      };
    }

    // Fallback: Security or other step failed
    return {
      nextAgent: 'Human Operator',
      nextStep: 'STOP_HUMAN_ATTENTION',
      reason: `Pipeline halted at ${currentStep}: ${failureEvidence || 'Validation error'}`,
      isTerminal: true,
      requiresHumanIntervention: true,
    };
  }

  private recordHandoff(taskId: string, record: MultiAgentHandoffRecord): void {
    const list = this.handoffHistory.get(taskId) || [];
    list.push(record);
    this.handoffHistory.set(taskId, list);
    this.logger.info(
      'recordHandoff',
      `Handoff [${record.fromAgent} -> ${record.toAgent}] on step ${record.step} for task ${taskId}`
    );
  }

  /**
   * Get handoff trail for audit (§23)
   */
  public getHandoffHistory(taskId: string): MultiAgentHandoffRecord[] {
    return this.handoffHistory.get(taskId) || [];
  }
}
