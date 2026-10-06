// ==========================================================
// services/api/src/engineering/operating-system/engineering-os.service.ts
// Phase 16: KDI AI Engineering Operating System — Unified Core Facade
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { ProjectKnowledgeService } from './project-knowledge.service.js';
import { EngineeringMemoryService } from './engineering-memory.service.js';
import { TaskIntelligenceService } from './task-intelligence.service.js';
import { MultiAgentHandoffService } from './multi-agent-handoff.service.js';
import { EngineeringAnalyticsService } from './engineering-analytics.service.js';
import { WorkRequestService } from './work-request.service.js';
import type {
  EngineeringAttentionSummary,
  EngineeringHealthReport,
  WorkRequest,
} from './engineering-os.types.js';
import type { EngineeringExecutionResult } from '../execution/engineering-execution.types.js';
import type { EngineeringExecutorService } from '../execution/engineering-executor.service.js';

@Injectable()
export class EngineeringOSService {
  private readonly logger = new StructuredLogger('EngineeringOSService');

  public readonly projectKnowledge: ProjectKnowledgeService;
  public readonly memory: EngineeringMemoryService;
  public readonly intelligence: TaskIntelligenceService;
  public readonly handoffService: MultiAgentHandoffService;
  public readonly analytics: EngineeringAnalyticsService;
  public readonly workRequests: WorkRequestService;

  constructor(
    @Optional() projectKnowledge?: ProjectKnowledgeService,
    @Optional() memory?: EngineeringMemoryService,
    @Optional() intelligence?: TaskIntelligenceService,
    @Optional() handoffService?: MultiAgentHandoffService,
    @Optional() analytics?: EngineeringAnalyticsService,
    @Optional() workRequests?: WorkRequestService
  ) {
    this.projectKnowledge = projectKnowledge || new ProjectKnowledgeService();
    this.memory = memory || new EngineeringMemoryService();
    this.intelligence =
      intelligence || new TaskIntelligenceService(this.projectKnowledge, this.memory);
    this.handoffService = handoffService || new MultiAgentHandoffService();
    this.analytics = analytics || new EngineeringAnalyticsService(this.memory);
    this.workRequests =
      workRequests ||
      new WorkRequestService(
        this.intelligence,
        this.handoffService,
        this.memory,
        this.analytics
      );
  }

  /**
   * Process inbound engineering work request end-to-end (§4 & §5)
   */
  public async processInboundRequest(
    rawText: string,
    requester = 'Ayub',
    executorService: EngineeringExecutorService,
    options?: { project?: string; dependsOn?: string[] }
  ): Promise<{ workRequest: WorkRequest; executionResult?: EngineeringExecutionResult; formattedMessage: string }> {
    this.logger.info('processInboundRequest', `Processing inbound request from ${requester}: "${rawText}"`);

    // 1. Create structured WorkRequest
    const workReq = await this.workRequests.createWorkRequest(rawText, requester, options);

    // 2. If ambiguous and needs clarification (§10)
    if (workReq.status === 'NEEDS_CLARIFICATION') {
      const clarifyText =
        `❓ *KLARIFIKASI DIPERLUKAN*\n\n` +
        `Permintaan *"_${rawText}_"* belum cukup spesifik untuk diinvestigasi secara otomatis.\n\n` +
        `*Mohon berikan informasi tambahan:*\n` +
        (workReq.clarificationQuestions || []).map((q) => `• ${q}`).join('\n') +
        `\n\n_Contoh:_ \`Perbaiki login SIMMACI karena token refresh gagal\``;
      return { workRequest: workReq, formattedMessage: clarifyText };
    }

    // 3. Execute WorkRequest via EngineeringExecutorService
    const { executionResult } = await this.workRequests.executeWorkRequest(
      workReq.id,
      executorService
    );

    // 4. Format concise operational Telegram summary (§18)
    const formattedMessage = this.formatOperationalTelegramSummary(workReq, executionResult);

    return {
      workRequest: workReq,
      executionResult,
      formattedMessage,
    };
  }

  /**
   * Compact Telegram Operational Reporting (§18)
   */
  public formatOperationalTelegramSummary(
    request: WorkRequest,
    result?: EngineeringExecutionResult
  ): string {
    const project = request.project.toUpperCase();
    const domainName =
      request.domain.charAt(0).toUpperCase() + request.domain.slice(1).toLowerCase();
    const domain = `${domainName} Engineering`;
    const taskTitle = request.description.length > 50
      ? `${request.description.slice(0, 47)}...`
      : request.description;
    const agent = request.assignedAgent;
    const executor = request.executor === 'ANTIGRAVITY' ? 'Antigravity' : 'Git Worktree';
    const status = result?.status || request.status;

    let testStatus = 'NOT_RUN';
    if (result) {
      testStatus =
        result.tests.status === 'PASSED'
          ? 'PASS'
          : result.tests.status === 'FAILED'
            ? `FAIL (${result.tests.failed} failed)`
            : result.tests.status;
    }

    const changedCount = result ? result.changedFiles.length : 0;
    const risk = request.plan?.risk || 'LOW';
    const approval = status === 'READY_FOR_APPROVAL' || status === 'WAITING_FOR_APPROVAL'
      ? 'REQUIRED'
      : status === 'READY_FOR_DEPLOY' || status === 'COMMITTED'
        ? 'APPROVED'
        : 'NONE';

    let extraActionPrompt = '';
    if (approval === 'REQUIRED' && result?.taskId) {
      extraActionPrompt = `\n\n*Action:*\nKetik \`/engineering approve ${result.taskId}\` untuk menyelesaikan commit.`;
    } else if (status === 'READY_FOR_DEPLOY') {
      extraActionPrompt = `\n\n*Target:* \`${result?.branch || 'worktree'}\`\n*Ready for staging deploy verification.*`;
    }

    return (
      `*${project}*\n` +
      `*${domain}*\n\n` +
      `*Task:*\n${taskTitle}\n\n` +
      `*Agent:*\n${agent}\n\n` +
      `*Executor:*\n${executor}\n\n` +
      `*Status:*\n*${status}*\n\n` +
      `*Tests:*\n${testStatus}\n\n` +
      `*Changed:*\n${changedCount} file(s)\n\n` +
      `*Risk:*\n${risk}\n\n` +
      `*Approval:*\n${approval}` +
      extraActionPrompt
    );
  }

  /**
   * "What Needs My Attention?" Briefing (§16)
   */
  public getAttentionSummary(pendingApprovalsCount = 0): EngineeringAttentionSummary {
    const allRequests = this.workRequests.listWorkRequests();
    return this.analytics.generateAttentionSummary(allRequests, pendingApprovalsCount);
  }

  /**
   * Format attention summary for Telegram (§16 & §17)
   */
  public formatAttentionTelegramMessage(summary: EngineeringAttentionSummary): string {
    if (summary.totalActionRequired === 0) {
      return (
        `✅ *ALL CLEAR — NO HUMAN ATTENTION REQUIRED*\n\n` +
        `Semua pekerjaan engineering berjalan lancar tanpa blocker.\n` +
        `• 0 tasks awaiting approval\n` +
        `• 0 failed engineering tasks\n` +
        `• 0 blocked dependency tasks`
      );
    }

    let text = `🚨 *WHAT NEEDS YOUR ATTENTION (${summary.totalActionRequired})*\n\n`;

    if (summary.awaitingApprovalCount > 0) {
      text += `*Awaiting Approval (${summary.awaitingApprovalCount}):*\n`;
      const approvals = summary.items.filter((i) => i.type === 'APPROVAL_PENDING');
      for (const a of approvals) {
        text += `• \`${a.taskId}\` [${a.project}]: ${a.title}\n  👉 \`${a.actionPrompt}\`\n`;
      }
      text += '\n';
    }

    if (summary.failedTasksCount > 0) {
      text += `*Failed Tasks (${summary.failedTasksCount}):*\n`;
      const fails = summary.items.filter((i) => i.type === 'TASK_FAILED');
      for (const f of fails) {
        text += `• \`${f.taskId}\` [${f.project}]: ${f.title}\n  👉 \`${f.actionPrompt}\`\n`;
      }
      text += '\n';
    }

    if (summary.blockedTasksCount > 0) {
      text += `*Blocked Tasks (${summary.blockedTasksCount}):*\n`;
      const blk = summary.items.filter((i) => i.type === 'TASK_BLOCKED');
      for (const b of blk) {
        text += `• \`${b.taskId}\` [${b.project}]: ${b.title}\n`;
      }
      text += '\n';
    }

    const clar = summary.items.filter((i) => i.type === 'CLARIFICATION_NEEDED');
    if (clar.length > 0) {
      text += `*Clarification Needed (${clar.length}):*\n`;
      for (const c of clar) {
        text += `• [${c.project}]: ${c.title}\n`;
      }
    }

    return text.trim();
  }

  /**
   * Deterministic Health Report (§31)
   */
  public getHealthReport(activeCount = 0, queuedCount = 0, failedCount = 0, approvalCount = 0): EngineeringHealthReport {
    return this.analytics.getHealthReport(activeCount, queuedCount, failedCount, approvalCount);
  }

  /**
   * Engineering Analytics (§30)
   */
  public getAnalytics() {
    return this.analytics.getAnalytics();
  }
}
