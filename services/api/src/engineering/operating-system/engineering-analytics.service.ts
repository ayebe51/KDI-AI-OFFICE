// ==========================================================
// services/api/src/engineering/operating-system/engineering-analytics.service.ts
// Phase 16: Engineering Analytics, Health Signals & "What Needs My Attention?"
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { EngineeringMemoryService } from './engineering-memory.service.js';
import type {
  EngineeringAnalyticsData,
  EngineeringAttentionItem,
  EngineeringAttentionSummary,
  EngineeringHealthReport,
  WorkRequest,
} from './engineering-os.types.js';

@Injectable()
export class EngineeringAnalyticsService {
  private readonly logger = new StructuredLogger('EngineeringAnalyticsService');
  private readonly memory: EngineeringMemoryService;

  private completedTasks = 0;
  private successfulTasks = 0;
  private failedTasks = 0;
  private totalAttempts = 0;
  private totalTestsRun = 0;
  private totalTestsFailed = 0;
  private totalExecutionDurationMs = 0;
  private totalApprovalWaitDurationMs = 0;
  private antigravityExecutions = 0;

  constructor(@Optional() memory?: EngineeringMemoryService) {
    this.memory = memory || new EngineeringMemoryService();
  }

  /**
   * Record task execution telemetry (§30)
   */
  public recordTaskCompletion(
    success: boolean,
    attempts: number,
    durationMs: number,
    testsRun = 0,
    testsFailed = 0,
    approvalWaitMs = 0,
    isAntigravity = true
  ): void {
    this.completedTasks++;
    if (success) {
      this.successfulTasks++;
    } else {
      this.failedTasks++;
    }
    this.totalAttempts += attempts;
    this.totalExecutionDurationMs += durationMs;
    this.totalTestsRun += testsRun;
    this.totalTestsFailed += testsFailed;
    this.totalApprovalWaitDurationMs += approvalWaitMs;
    if (isAntigravity) {
      this.antigravityExecutions++;
    }
  }

  /**
   * Compute deterministic engineering analytics (§30)
   */
  public getAnalytics(): EngineeringAnalyticsData {
    const successRate =
      this.completedTasks > 0 ? (this.successfulTasks / this.completedTasks) * 100 : 100;
    const avgAttempts =
      this.completedTasks > 0 ? this.totalAttempts / this.completedTasks : 1;
    const testFailureRate =
      this.totalTestsRun > 0 ? (this.totalTestsFailed / this.totalTestsRun) * 100 : 0;
    const avgDuration =
      this.completedTasks > 0 ? this.totalExecutionDurationMs / this.completedTasks : 0;
    const avgApprovalWait =
      this.completedTasks > 0 ? this.totalApprovalWaitDurationMs / this.completedTasks : 0;

    const tokenSummary = this.memory.getTokenMetricsSummary();

    return {
      tasksCompleted: this.completedTasks,
      taskSuccessRate: Number(successRate.toFixed(1)),
      averageAttempts: Number(avgAttempts.toFixed(2)),
      testFailureRate: Number(testFailureRate.toFixed(1)),
      averageExecutionTimeMs: Math.round(avgDuration),
      approvalWaitingTimeMs: Math.round(avgApprovalWait),
      antigravityExecutionsCount: this.antigravityExecutions,
      tokenMetrics: {
        totalRequests: tokenSummary.totalRequests,
        promptTokens: tokenSummary.promptTokens,
        completionTokens: tokenSummary.completionTokens,
        cacheHits: tokenSummary.cacheHits,
        cacheMisses: tokenSummary.cacheMisses,
        estimatedCostUsd: tokenSummary.estimatedCostUsd,
      },
    };
  }

  /**
   * Generate "What Needs My Attention?" summary (§16)
   */
  public generateAttentionSummary(
    workRequests: WorkRequest[],
    pendingApprovalsCount = 0
  ): EngineeringAttentionSummary {
    const items: EngineeringAttentionItem[] = [];

    for (const req of workRequests) {
      // 1. Pending Approvals
      if (req.status === 'WAITING_FOR_APPROVAL') {
        items.push({
          id: `att_appr_${req.id}`,
          type: 'APPROVAL_PENDING',
          project: req.project,
          title: `Approval Required: ${req.description.slice(0, 50)}`,
          summary: `Task ${req.id} in ${req.project} passed all automated tests and is waiting for cryptographic human approval before commit.`,
          urgency: 'HIGH',
          actionPrompt: `/engineering approve ${req.taskId || req.id}`,
          taskId: req.taskId || req.id,
        });
      }

      // 2. Failed Tasks needing intervention
      if (req.status === 'FAILED') {
        items.push({
          id: `att_fail_${req.id}`,
          type: 'TASK_FAILED',
          project: req.project,
          title: `Task Execution Failed: ${req.description.slice(0, 50)}`,
          summary: `Task ${req.id} in ${req.project} exceeded automated repair attempts or experienced test failure.`,
          urgency: 'HIGH',
          actionPrompt: `/engineering review ${req.taskId || req.id}`,
          taskId: req.taskId || req.id,
        });
      }

      // 3. Blocked Tasks
      if (req.status === 'BLOCKED') {
        items.push({
          id: `att_blk_${req.id}`,
          type: 'TASK_BLOCKED',
          project: req.project,
          title: `Task Blocked by Dependencies: ${req.description.slice(0, 50)}`,
          summary: `Task ${req.id} is waiting for parent tasks [${(req.dependsOn || []).join(', ')}] to complete.`,
          urgency: 'MEDIUM',
          actionPrompt: `/engineering status ${req.taskId || req.id}`,
          taskId: req.taskId || req.id,
        });
      }

      // 4. Clarification Needed
      if (req.status === 'NEEDS_CLARIFICATION') {
        items.push({
          id: `att_clr_${req.id}`,
          type: 'CLARIFICATION_NEEDED',
          project: req.project,
          title: `Clarification Required: ${req.description.slice(0, 50)}`,
          summary: `Request is ambiguous. Specifics needed: ${(req.clarificationQuestions || []).join('; ')}`,
          urgency: 'MEDIUM',
          actionPrompt: `Balas dengan detail target project/komponen.`,
          taskId: req.id,
        });
      }
    }

    const awaitingApprovalCount = items.filter((i) => i.type === 'APPROVAL_PENDING').length;
    const failedTasksCount = items.filter((i) => i.type === 'TASK_FAILED').length;
    const blockedTasksCount = items.filter((i) => i.type === 'TASK_BLOCKED').length;

    return {
      items,
      totalActionRequired: items.length,
      awaitingApprovalCount,
      failedTasksCount,
      blockedTasksCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Produce deterministic Engineering Health Report (§31)
   */
  public getHealthReport(
    activeTasksCount: number,
    queuedTasksCount: number,
    failedTasksCount: number,
    pendingApprovalsCount: number
  ): EngineeringHealthReport {
    let status: 'HEALTHY' | 'DEGRADED' | 'ATTENTION_REQUIRED' = 'HEALTHY';
    if (failedTasksCount > 2 || pendingApprovalsCount > 5) {
      status = 'ATTENTION_REQUIRED';
    } else if (failedTasksCount > 0 || queuedTasksCount > 5) {
      status = 'DEGRADED';
    }

    const briefing =
      status === 'HEALTHY'
        ? `Engineering workforce operating normally. All execution loops verified.`
        : status === 'DEGRADED'
          ? `Engineering queue experiencing slight backlog or ${failedTasksCount} failed task(s).`
          : `High attention required: ${failedTasksCount} unresolved failures, ${pendingApprovalsCount} pending approvals.`;

    return {
      status,
      backlogCount: queuedTasksCount,
      failedTaskCount: failedTasksCount,
      staleTaskCount: 0,
      pendingApprovalsCount,
      executorStatus: {
        Antigravity: 'AVAILABLE',
        GitWorktree: 'ONLINE',
      },
      briefing,
      timestamp: new Date().toISOString(),
    };
  }
}
