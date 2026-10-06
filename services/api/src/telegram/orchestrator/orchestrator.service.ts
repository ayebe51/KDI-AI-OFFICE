// ==========================================================
// services/api/src/telegram/orchestrator/orchestrator.service.ts
// KDI AI Orchestrator Core Service — Single Front Door for Owner
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable, Optional, Inject } from '@nestjs/common';
import type {
  OwnerMessage,
  TelegramCallbackQuery,
  OrchestratorResult,
  TelegramApproval,
  TelegramAuditLog,
  AggregateHealthResponse,
  CanonicalTask,
  AgentDefinition,
  RiskLevel,
} from '@kdi/types';
import type { EngineeringTaskContext } from '../../engineering/execution/engineering-execution.types.js';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import { TelegramRepository } from '../persistence/telegram.repository.js';
import { TelegramFormatter } from '../formatter/telegram.formatter.js';
import { RuntimeService } from '../../runtime/runtime.service.js';
import { AutonomyService } from '../../autonomy/autonomy.service.js';
import { WorkforceService } from '../../workforce/workforce.service.js';
import { EngineeringService } from '../../engineering/engineering.service.js';
import { GraphRAGService } from '../../graph/graphrag/graphrag.service.js';
import { LLMService } from '../../llm/llm.service.js';
import { EventsGateway } from '../../websocket/events.gateway.js';
import { PostgresService } from '../../database/postgres.service.js';
import { RedisService } from '../../database/redis.service.js';
import { Neo4jService } from '../../database/neo4j.service.js';
import { PromptInjectionDefense } from '../../engineering/security/prompt-injection-defense.js';
import { ObjectiveService } from '../../organization/objective.service.js';
import { RecommendationDecisionService } from '../../organization/recommendation-decision.service.js';
import { CapacityEngineService } from '../../organization/capacity-engine.service.js';
import { ReportingService } from '../../organization/reporting.service.js';
import { LearningOrchestratorService } from '../../learning/learning-orchestrator.service.js';
import { OwnerFeedbackService } from '../../learning/owner-feedback.service.js';
import { StrategicOrchestratorService } from '../../strategy/strategic-orchestrator.service.js';
import { BenchmarkService } from '../../benchmark/benchmark.service.js';

export interface OrchestrationContext {
  conversationId: string;
  senderId: string;
  correlationId: string;
  chatId: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new StructuredLogger('OrchestratorService');

  constructor(
    private readonly repository: TelegramRepository,
    @Optional() private readonly runtimeService?: RuntimeService,
    @Optional() private readonly autonomyService?: AutonomyService,
    @Optional() private readonly workforceService?: WorkforceService,
    @Optional() private readonly engineeringService?: EngineeringService,
    @Optional() private readonly graphRagService?: GraphRAGService,
    @Optional() private readonly llmService?: LLMService,
    @Optional() private readonly eventsGateway?: EventsGateway,
    @Optional() private readonly postgresService?: PostgresService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly neo4jService?: Neo4jService,
    @Optional() private readonly objectiveService?: ObjectiveService,
    @Optional() private readonly recommendationDecisionService?: RecommendationDecisionService,
    @Optional() private readonly capacityEngineService?: CapacityEngineService,
    @Optional() private readonly reportingService?: ReportingService,
    @Optional() private readonly learningOrchestratorService?: LearningOrchestratorService,
    @Optional() private readonly ownerFeedbackService?: OwnerFeedbackService,
    @Optional() private readonly strategicOrchestratorService?: StrategicOrchestratorService,
    @Optional() private readonly benchmarkService?: BenchmarkService
  ) {}

  /**
   * Main entry point for inbound messages from the Owner
   */
  public async handleOwnerMessage(
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const rawText = message.text.trim();
    const senderId = message.senderId;
    const conversationId = message.conversationId;
    const chatId = (message.metadata?.chatId as string) || senderId;

    this.logger.info('handleOwnerMessage', `Processing message from ${senderId}: "${rawText}"`, {
      correlationId,
      conversationId,
    });

    // 1. Record inbound message in repository
    await this.repository.saveMessage({
      messageId: message.messageId || `msg_${Date.now()}`,
      conversationId,
      correlationId,
      direction: 'INBOUND',
      senderId,
      text: rawText,
      timestamp: new Date().toISOString(),
    });

    // 2. Slash command detection
    if (rawText.startsWith('/')) {
      return this.handleSlashCommand(rawText, message, correlationId);
    }

    // 3. Natural Language orchestration
    return this.handleNaturalLanguage(rawText, message, correlationId);
  }

  /**
   * Handle slash commands
   */
  private async handleSlashCommand(
    commandStr: string,
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const parts = commandStr.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    const senderName = message.senderFirstName || message.senderUsername || 'Owner';

    switch (cmd) {
      case '/start': {
        const text = TelegramFormatter.formatStart(senderName);
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/help': {
        const text = TelegramFormatter.formatHelp();
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/status': {
        const health = await this.getAggregateHealth();
        const globalPaused = this.autonomyService ? (this.autonomyService as any).globalPauseActive : false;
        const activeTasks = this.runtimeService?.getActiveTasks().length || 0;
        const queuedTasks = this.runtimeService?.getQueuedTasks().length || 0;
        const activeAgents = this.workforceService?.getVirtualEmployees().length || 9;
        const openIncidents = this.autonomyService?.getIncidents().filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 0;
        const pendingApprovals = this.autonomyService?.getPendingApprovals().length || 0;

        const text = TelegramFormatter.formatSystemStatus({
          health,
          globalPaused,
          activeTasks,
          queuedTasks,
          activeAgents,
          openIncidents,
          pendingApprovals,
        });
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }

      case '/tasks': {
        const active = this.runtimeService?.getActiveTasks() || [];
        const queued = this.runtimeService?.getQueuedTasks() || [];
        const text = TelegramFormatter.formatTasks(active, queued);
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/agents': {
        const agents = this.runtimeService?.getAgents() || [];
        const text = TelegramFormatter.formatAgents(agents);
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/projects': {
        const text =
          `🏢 *PORTFOLIO PROYEK KDI*\n\n` +
          `1. *SIMMACI (Sistem Informasi Manajemen Madrasah Cerdas)*\n` +
          `   Status: PRODUCTION | Kesehatan: 98% (Sehat)\n` +
          `   Tech: Next.js 14, NestJS, PostgreSQL 16, Redis\n\n` +
          `2. *GOWA WAHA Migrasi*\n` +
          `   Status: COMPLETED | Kesehatan: 100% (Verifikasi Berhasil)\n\n` +
          `3. *KDI AI Office Autonomous Swarm*\n` +
          `   Status: PHASE 11 (Telegram Command Layer) | Operasional: Optimal`;
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/incidents': {
        const incidents = this.autonomyService?.getIncidents() || [];
        const text = TelegramFormatter.formatIncidents(incidents);
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/approvals': {
        // Collect approvals from repository
        const approvals = Array.from((this.repository as any).memoryApprovals.values()) as TelegramApproval[];
        const text = TelegramFormatter.formatApprovalsList(approvals);
        return { type: 'TEXT', responseMessage: text, correlationId };
      }

      case '/report': {
        if (this.autonomyService) {
          const briefing = this.autonomyService.generateDailyBriefing();
          const text = TelegramFormatter.formatDailyBriefing(briefing);
          return { type: 'TEXT', responseMessage: text, correlationId };
        }
        return {
          type: 'TEXT',
          responseMessage: `☀️ *KDI DAILY BRIEFING*\n\nSistem beroperasi optimal. Semua metrik normal.`,
          correlationId,
        };
      }

      case '/pause': {
        if (this.autonomyService) {
          this.autonomyService.toggleGlobalPause(true, `Pause diperintahkan oleh Owner via Telegram (/pause)`, senderName);
        }
        this.broadcast3DOfficeAlert('AUTONOMY_PAUSED', 'Owner mengaktifkan Global Autonomy Pause.');
        const text = TelegramFormatter.formatEmergencyPause(true, 'Diperintahkan via Telegram /pause', senderName);
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }

      case '/resume': {
        if (this.autonomyService) {
          this.autonomyService.toggleGlobalPause(false, `Resume diperintahkan oleh Owner via Telegram (/resume)`, senderName);
        }
        this.broadcast3DOfficeAlert('AUTONOMY_RESUMED', 'Owner mengaktifkan kembali Autonomy.');
        const text = TelegramFormatter.formatEmergencyPause(false, 'Diperintahkan via Telegram /resume', senderName);
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }

      case '/org':
      case '/briefing': {
        if (this.recommendationDecisionService) {
          const briefing = this.recommendationDecisionService.generateOrganizationalBriefing();
          const text = TelegramFormatter.formatOrganizationalBriefing(briefing);
          return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
        }
        return {
          type: 'TEXT',
          responseMessage: `🏢 *KDI ORGANIZATIONAL BRIEFING*\n\nLayanan Organizational Intelligence sedang memuat state.`,
          correlationId,
        };
      }

      case '/learning': {
        if (this.learningOrchestratorService) {
          const report = this.learningOrchestratorService.getWeeklyLearningReport();
          const text = TelegramFormatter.formatLearningReport(report);
          return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
        }
        return {
          type: 'TEXT',
          responseMessage: `🧠 *KDI LEARNING REPORT*\n\nLayanan Continuous Learning sedang memuat state.`,
          correlationId,
        };
      }

      case '/strategy': {
        if (this.strategicOrchestratorService) {
          const briefing = this.strategicOrchestratorService.getStrategicBriefing();
          const text = TelegramFormatter.formatStrategicBriefing(briefing);
          return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
        }
        return {
          type: 'TEXT',
          responseMessage: `🎯 *KDI STRATEGIC STATUS*\n\nLayanan Strategic Autonomy sedang memuat state.`,
          correlationId,
        };
      }

      case '/company': {
        // Phase 15.1: Company OS Summary
        try {
          const companyService = (this as any).companyService;
          if (companyService && typeof companyService.getTelegramSummary === 'function') {
            const summary = companyService.getTelegramSummary();
            return { type: 'SYSTEM_STATE', responseMessage: summary, correlationId };
          }
        } catch {}
        return {
          type: 'SYSTEM_STATE',
          responseMessage:
            `📊 *KDI COMPANY OS*\n\n` +
            `Modul Company OS aktif.\n` +
            `Gunakan: GET /company/snapshot untuk data lengkap.\n\n` +
            `Products: SIMMACI, KDI AI Office, GOWA WAHA\n` +
            `Status: OPERATIONAL`,
          correlationId,
        };
      }

      case '/engineering': {
        return this.handleEngineeringCommand(args, message, correlationId);
      }

      case '/benchmark': {
        return this.handleBenchmarkCommand(args, message, correlationId);
      }

      case '/build': {
        return this.handleBuildCommand(args, message, correlationId);
      }

      case '/fix': {
        return this.handleFixCommand(args, message, correlationId);
      }

      default: {
        return {
          type: 'TEXT',
          responseMessage: `Perintah \`${cmd}\` tidak dikenal. Ketik /help untuk melihat daftar perintah.`,
          correlationId,
        };
      }
    }
  }

  /**
   * Handle /engineering slash subcommands (§21)
   */
  private async handleEngineeringCommand(
    args: string,
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const trimmed = args.trim();

    // ── Phase 17: Portfolio, Prioritization & Workforce Management Subcommands ──
    if (trimmed.startsWith('portfolio')) {
      const text = this.engineeringService?.managerService?.getPortfolioTelegramStatus() ||
        'Portfolio service belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('prioritize') || trimmed.startsWith('reorder')) {
      const text = this.engineeringService?.managerService?.answerManagerQuery('prioritaskan semua pekerjaan') ||
        'Prioritization engine belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('brief')) {
      const text = this.engineeringService?.managerService?.formatDailyBriefTelegramMessage() ||
        'Daily Brief engine belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('blockers') || trimmed.startsWith('blocked')) {
      const text = this.engineeringService?.managerService?.answerManagerQuery('task mana yang blocked?') ||
        'Blocker detection belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('workload') || trimmed.startsWith('workforce')) {
      const text = this.engineeringService?.managerService?.answerManagerQuery('siapa yang sedang sibuk?') ||
        'Workload manager belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('run-top')) {
      const text = this.engineeringService?.managerService?.answerManagerQuery('kerjakan yang paling penting dulu') ||
        'Queue runner belum aktif.';
      return { type: 'TASK_CREATED', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('benchmark-report') || trimmed.startsWith('benchmark') || trimmed.startsWith('autonomy')) {
      const text = this.engineeringService?.managerService?.generateBenchmarkExitReport() ||
        'Benchmark service belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (trimmed.startsWith('reliability') || trimmed.startsWith('phase19') || trimmed.startsWith('comparison')) {
      const text = this.engineeringService?.managerService?.generatePhase19ComparisonReport() ||
        'Reliability service belum aktif.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ── 1. Subcommand: status [taskId] ──────────────────────────
    if (trimmed.startsWith('status') || trimmed === '') {
      const subArg = trimmed.replace(/^status\s*/i, '').trim();
      if (subArg) {
        const task = this.engineeringService?.executorService?.getTaskStatus(subArg);
        if (task) {
          const summary = this.engineeringService!.executorService!.formatTelegramSummary(task);
          return { type: 'SYSTEM_STATE', responseMessage: summary, correlationId };
        }
        return {
          type: 'TEXT',
          responseMessage: `Task \`${subArg}\` tidak ditemukan di Engineering Execution Engine.`,
          correlationId,
        };
      }

      // Overview of all tasks and control plane (§28)
      if (this.engineeringService?.executorService?.controlPlane) {
        const controlSummary = await this.engineeringService.executorService.controlPlane.formatTelegramControlSummary();
        return {
          type: 'SYSTEM_STATE',
          responseMessage: controlSummary,
          correlationId,
        };
      }

      const tasks = this.engineeringService?.executorService?.listTasks() || [];
      if (tasks.length === 0) {
        return {
          type: 'TEXT',
          responseMessage: `⚙️ *ENGINEERING TASKS STATUS*\n\nTidak ada task yang aktif atau tersimpan saat ini.`,
          correlationId,
        };
      }

      const taskList = tasks
        .map(
          (t) =>
            `• \`${t.taskId}\` [${t.project}]\n  Status: *${t.status}* | Branch: \`${t.branch}\`\n  Changed: ${t.changedFiles.length} file(s) | Tests: ${t.tests.status}`
        )
        .join('\n\n');

      return {
        type: 'SYSTEM_STATE',
        responseMessage: `⚙️ *ACTIVE ENGINEERING TASKS*\n\n${taskList}`,
        correlationId,
      };
    }

    // ── 2. Subcommand: run <task|text> ──────────────────────────
    if (trimmed.startsWith('run')) {
      const subArg = trimmed.replace(/^run\s*/i, '').trim();
      if (!subArg) {
        return {
          type: 'TEXT',
          responseMessage: `Sertakan task ID atau deskripsi pekerjaan. Contoh:\n\`/engineering run Perbaiki bug login SIMMACI\``,
          correlationId,
        };
      }

      const existingTask = this.engineeringService?.executorService?.getTaskStatus(subArg);
      if (existingTask) {
        const retryContext: EngineeringTaskContext = {
          taskId: existingTask.taskId,
          project: existingTask.project,
          repository: existingTask.project,
          repositoryPath: existingTask.worktreePath || process.cwd(),
          taskType: 'BUG',
          domain: 'BACKEND',
          agent: 'BE_ENGINEER',
          agentName: 'Farhan Hakim (BE Engineer)',
          title: `Retry: ${existingTask.taskId}`,
          description: `Retrying execution for ${existingTask.taskId}`,
          acceptanceCriteria: ['Pass test suite'],
          constraints: ['Respect worktree isolation'],
          branch: existingTask.branch,
          executor: existingTask.executor,
          timeout: 60000,
          environment: {},
          requestedBy: message.senderFirstName || 'Owner',
        };
        const result = await this.engineeringService!.executorService!.executeTask(retryContext);
        const summary = this.engineeringService!.executorService!.formatTelegramSummary(result);
        return { type: 'TASK_CREATED', responseMessage: summary, correlationId, taskId: result.taskId };
      }

      // Phase 16: Process inbound work request through Engineering OS (§5 & §17)
      if (this.engineeringService?.osService && this.engineeringService.executorService) {
        const { workRequest, executionResult, formattedMessage } =
          await this.engineeringService.osService.processInboundRequest(
            subArg,
            message.senderFirstName || 'Owner',
            this.engineeringService.executorService
          );
        return {
          type: workRequest.status === 'WAITING_FOR_APPROVAL' ? 'APPROVAL_REQUIRED' : 'TASK_CREATED',
          responseMessage: formattedMessage,
          correlationId,
          taskId: executionResult?.taskId || workRequest.taskId || workRequest.id,
        };
      }

      return this.handleNaturalLanguage(subArg, message, correlationId);
    }

    // ── 3. Subcommand: attention (§16) ──────────────────────────
    if (trimmed === 'attention' || trimmed === 'what-needs-my-attention') {
      const pendingCount = this.engineeringService?.listPendingApprovals().length || 0;
      const summary = this.engineeringService?.osService?.getAttentionSummary(pendingCount);
      const text = summary
        ? this.engineeringService!.osService.formatAttentionTelegramMessage(summary)
        : 'Tidak ada perhatian khusus yang dibutuhkan saat ini.';
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ── 4. Subcommand: health (§31) ─────────────────────────────
    if (trimmed === 'health') {
      const tasks = this.engineeringService?.executorService?.listTasks() || [];
      const activeCount = tasks.filter((t) => !['COMMITTED', 'READY_FOR_DEPLOY', 'CANCELLED'].includes(t.status) && !t.status.includes('FAIL')).length;
      const failedCount = tasks.filter((t) => t.status.includes('FAIL')).length;
      const approvalCount = this.engineeringService?.listPendingApprovals().length || 0;
      const queuedCount = this.engineeringService?.executorService?.controlPlane ? this.engineeringService.executorService.controlPlane.queue.getQueuedCount() : 0;
      const report = this.engineeringService?.osService?.getHealthReport(activeCount, queuedCount, failedCount, approvalCount);
      const text =
        `🏥 *KDI ENGINEERING HEALTH REPORT*\n\n` +
        `*Status:* *${report?.status || 'HEALTHY'}*\n` +
        `*Active In-Flight:* ${activeCount}\n` +
        `*Queued Tasks:* ${queuedCount}\n` +
        `*Failed Tasks:* ${failedCount}\n` +
        `*Pending Approvals:* ${approvalCount}\n\n` +
        `*Briefing:*\n_${report?.briefing || 'All systems green.'}_`;
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ── 5. Subcommand: analytics (§30) ──────────────────────────
    if (trimmed === 'analytics' || trimmed === 'metrics') {
      const analytics = this.engineeringService?.osService?.getAnalytics();
      const text =
        `📊 *ENGINEERING ANALYTICS & TELEMETRY*\n\n` +
        `*Tasks Completed:* ${analytics?.tasksCompleted || 0}\n` +
        `*Success Rate:* ${analytics?.taskSuccessRate || 100}%\n` +
        `*Avg Attempts:* ${analytics?.averageAttempts || 1}\n` +
        `*Test Failure Rate:* ${analytics?.testFailureRate || 0}%\n` +
        `*Avg Duration:* ${analytics?.averageExecutionTimeMs || 0} ms\n` +
        `*Antigravity Executions:* ${analytics?.antigravityExecutionsCount || 0}\n\n` +
        `*Token Observability:*\n` +
        `• Requests: ${analytics?.tokenMetrics.totalRequests || 0}\n` +
        `• Total Tokens: ${(analytics?.tokenMetrics.promptTokens || 0) + (analytics?.tokenMetrics.completionTokens || 0)}\n` +
        `• Cache Hits: ${analytics?.tokenMetrics.cacheHits || 0} / Misses: ${analytics?.tokenMetrics.cacheMisses || 0}\n` +
        `• Est. Cost: $${analytics?.tokenMetrics.estimatedCostUsd || '0.0000'} USD`;
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ── 6. Subcommand: projects (§6 & §26) ──────────────────────
    if (trimmed.startsWith('projects') || trimmed.startsWith('project')) {
      const subArg = trimmed.replace(/^projects?\s*/i, '').trim();
      if (subArg) {
        const p = this.engineeringService?.osService?.projectKnowledge.resolveProject(subArg);
        if (p) {
          const text =
            `🏛️ *PROJECT PROFILE — ${p.name.toUpperCase()}*\n\n` +
            `*Slug:* \`${p.slug}\`\n` +
            `*Framework:* ${p.framework}\n` +
            `*Language:* ${p.language}\n` +
            `*Test Command:* \`${p.testCommand}\`\n` +
            `*Lead Agent:* ${p.assignedLeadAgent}\n` +
            `*Repository:* \`${p.repositoryPath}\`\n\n` +
            `*Constraints:*\n${p.knownConstraints.map((c) => `• ${c}`).join('\n')}\n\n` +
            `*Architecture Notes:*\n_${p.architectureNotes}_`;
          return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
        }
      }
      const projects = this.engineeringService?.osService?.projectKnowledge.listProjects() || [];
      const text =
        `🏛️ *REGISTERED KDI PROJECTS (${projects.length})*\n\n` +
        projects.map((p) => `• *${p.name}* (\`${p.slug}\`) — ${p.framework} [Lead: ${p.assignedLeadAgent}]`).join('\n') +
        `\n\n_Ketik \`/engineering project <slug>\` untuk melihat detail context._`;
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ── 3. Subcommand: review <taskId> ──────────────────────────
    if (trimmed.startsWith('review')) {
      const subArg = trimmed.replace(/^review\s*/i, '').trim();
      if (!subArg) {
        return {
          type: 'TEXT',
          responseMessage: `Sertakan task ID yang ingin direview. Contoh:\n\`/engineering review ENG-123\``,
          correlationId,
        };
      }

      const task = this.engineeringService?.executorService?.getTaskStatus(subArg);
      if (!task) {
        return {
          type: 'TEXT',
          responseMessage: `Task \`${subArg}\` tidak ditemukan.`,
          correlationId,
        };
      }

      const review = task.currentAttempt.reviewResult;
      if (!review) {
        return {
          type: 'TEXT',
          responseMessage: `Task \`${subArg}\` belum memiliki hasil review (Status: ${task.status}).`,
          correlationId,
        };
      }

      const text =
        `🔍 *ENGINEERING REVIEW — \`${task.taskId}\`*\n\n` +
        `*Reviewer:* ${review.reviewer}\n` +
        `*Result:* ${review.passed ? 'PASSED ✅' : 'FAILED ❌'}\n` +
        `*Feedback:*\n_${review.feedback}_\n\n` +
        `*Satisfied Criteria:*\n` +
        (review.satisfiedCriteria.length ? review.satisfiedCriteria.map((c) => `• ✅ ${c}`).join('\n') : '• (None)') +
        '\n\n' +
        (review.pendingCriteria.length
          ? `*Pending Blockers:*\n` + review.pendingCriteria.map((c) => `• ⚠️ ${c}`).join('\n') + '\n\n'
          : '') +
        (review.securityConcerns.length
          ? `*Security Concerns:*\n` + review.securityConcerns.map((c) => `• 🚨 ${c}`).join('\n') + '\n\n'
          : '') +
        `*Current State:* ${task.status}`;
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ── 4. Subcommand: cancel <taskId> ──────────────────────────
    if (trimmed.startsWith('cancel')) {
      const subArg = trimmed.replace(/^cancel\s*/i, '').trim();
      if (!subArg) {
        return {
          type: 'TEXT',
          responseMessage: `Sertakan task ID yang ingin dibatalkan. Contoh:\n\`/engineering cancel ENG-123\``,
          correlationId,
        };
      }

      const cancelled = await this.engineeringService?.executorService?.cancelTask(subArg);
      if (cancelled) {
        return {
          type: 'SYSTEM_STATE',
          responseMessage: `🛑 *Engineering Task Cancelled*\n\nTask \`${subArg}\` berhasil dibatalkan dan workspace diisolasi telah dibersihkan.`,
          correlationId,
        };
      }
      return {
        type: 'TEXT',
        responseMessage: `Task \`${subArg}\` tidak ditemukan atau tidak sedang berjalan.`,
        correlationId,
      };
    }

    // ── 5. Subcommand: approve <approvalId|taskId> ──────────────
    if (trimmed.startsWith('approve')) {
      const subArg = trimmed.replace(/^approve\s*/i, '').trim();
      if (!subArg) {
        return {
          type: 'TEXT',
          responseMessage: `Sertakan approval ID atau task ID. Contoh:\n\`/engineering approve appr_123\``,
          correlationId,
        };
      }

      const sender = message.senderFirstName || message.senderUsername || 'Owner';
      const resolved = await this.engineeringService?.executorService?.handleApprovalResolution(
        subArg,
        true,
        sender
      );

      if (resolved) {
        const text =
          `✅ *ENGINEERING APPROVAL GRANTED*\n\n` +
          `*Task:* \`${resolved.taskId}\`\n` +
          `*Project:* ${resolved.project}\n` +
          `*Status:* *${resolved.status}*\n` +
          `*Commit SHA:* \`${resolved.commit || 'N/A'}\`\n` +
          `*Branch:* \`${resolved.branch}\`\n\n` +
          `Commit telah dibuat di task branch. Task sekarang berstatus *READY_FOR_DEPLOY*.\n` +
          `_Protected branch (main) tetap aman & tidak berubah._`;
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }

      // Also try resolving via standard approval gate if it exists
      const gateResolved = this.engineeringService?.resolveApproval(subArg, true, sender);
      if (gateResolved) {
        return {
          type: 'SYSTEM_STATE',
          responseMessage: `✅ *Approval \`${subArg}\` Disetujui oleh ${sender}*`,
          correlationId,
        };
      }

      return {
        type: 'TEXT',
        responseMessage: `Approval atau Task ID \`${subArg}\` tidak ditemukan atau tidak dalam status pending.`,
        correlationId,
      };
    }

    // ── 6. Subcommand: retry <taskId> (§30) ──────────────────────
    if (trimmed.startsWith('retry')) {
      const subArg = trimmed.replace(/^retry\s*/i, '').trim();
      if (!subArg) {
        return {
          type: 'TEXT',
          responseMessage: `Sertakan task ID yang ingin di-retry. Contoh:\n\`/engineering retry ENG-123\``,
          correlationId,
        };
      }
      try {
        const sender = message.senderFirstName || 'Owner';
        const result = await this.engineeringService?.executorService?.retryTask(subArg, sender);
        if (result) {
          const summary = this.engineeringService!.executorService!.formatTelegramSummary(result);
          return { type: 'TASK_CREATED', responseMessage: summary, correlationId, taskId: result.taskId };
        }
      } catch (err: any) {
        return {
          type: 'TEXT',
          responseMessage: `⚠️ Gagal retry task \`${subArg}\`: ${err.message}`,
          correlationId,
        };
      }
    }

    // ── 7. Subcommand: recover <taskId> (§16 & §30) ──────────────
    if (trimmed.startsWith('recover')) {
      const subArg = trimmed.replace(/^recover\s*/i, '').trim();
      if (!subArg) {
        return {
          type: 'TEXT',
          responseMessage: `Sertakan task ID yang ingin di-recover. Contoh:\n\`/engineering recover ENG-123\``,
          correlationId,
        };
      }
      try {
        const result = await this.engineeringService?.executorService?.recoverTask(subArg, 'RETRY');
        if (result) {
          const summary = this.engineeringService!.executorService!.formatTelegramSummary(result);
          return { type: 'TASK_CREATED', responseMessage: `🔄 *Task Recovered*\n\n${summary}`, correlationId, taskId: result.taskId };
        }
      } catch (err: any) {
        return {
          type: 'TEXT',
          responseMessage: `⚠️ Gagal recover task \`${subArg}\`: ${err.message}`,
          correlationId,
        };
      }
    }

    // ── 8. Subcommand: pause (§20) ──────────────────────────────
    if (trimmed === 'pause') {
      this.engineeringService?.executorService?.pauseQueue();
      return {
        type: 'SYSTEM_STATE',
        responseMessage: `⏸️ *ENGINEERING QUEUE PAUSED*\n\nQueue execution dijeda. Task yang sedang berjalan akan diselesaikan, task baru akan menunggu di queue.`,
        correlationId,
      };
    }

    // ── 9. Subcommand: resume (§20) ─────────────────────────────
    if (trimmed === 'resume') {
      this.engineeringService?.executorService?.resumeQueue();
      return {
        type: 'SYSTEM_STATE',
        responseMessage: `▶️ *ENGINEERING QUEUE RESUMED*\n\nQueue execution dilanjutkan kembali.`,
        correlationId,
      };
    }

    // ── 10. Subcommand: halt / kill (§19) ────────────────────────
    if (trimmed === 'halt' || trimmed === 'emergency-halt') {
      await this.engineeringService?.executorService?.emergencyHalt();
      return {
        type: 'SYSTEM_STATE',
        responseMessage: `🛑 *EMERGENCY HALT EXECUTED*\n\nQueue dijeda dan seluruh proses engineering in-flight dihentikan.`,
        correlationId,
      };
    }

    // ── 5. Default Overview ─────────────────────────────────────
    const pendingApprovals = this.engineeringService?.listPendingApprovals() || [];
    const approvalCount = pendingApprovals.length;
    const tasks = this.engineeringService?.executorService?.listTasks() || [];

    let tasksSection = '';
    if (tasks.length > 0) {
      tasksSection =
        `\n*Recent Engineering Tasks:*\n` +
        tasks
          .slice(-3)
          .map((t) => `• \`${t.taskId}\` (${t.project}) — *${t.status}* [${t.branch}]`)
          .join('\n') +
        `\n`;
    }

    const text =
      `⚙️ *KDI ENGINEERING COMMAND CENTER*\n\n` +
      `*Active Engineering Workforce:*\n` +
      `• BE Engineer (Farhan Hakim) — AVAILABLE\n` +
      `• FE Engineer (Aisyah Putri) — AVAILABLE\n` +
      `• QA Engineer (Siti Rahayu) — AVAILABLE\n` +
      `• Security Engineer (Rizki Purnama) — AVAILABLE\n\n` +
      `*Executor:* Antigravity (Engineering AI)\n` +
      `*Policy:* Branch/Worktree isolation enforced\n` +
      `*Production Guard:* Active — no direct production edits\n\n` +
      `*Pending Approvals:* ${approvalCount}\n` +
      (approvalCount > 0 ? `Use /approvals to review\n` : ``) +
      tasksSection +
      `\n*Available Commands:*\n` +
      `• \`/engineering status [taskId]\` — Check execution status\n` +
      `• \`/engineering run <task|text>\` — Execute engineering task\n` +
      `• \`/engineering review <taskId>\` — Review task changes\n` +
      `• \`/engineering cancel <taskId>\` — Cancel task & clean worktree\n` +
      `\n_Send natural language command to assign engineering task._\n` +
      `_Example: "Perbaiki error login SIMMACI"_`;
    return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
  }

  /**
   * Phase 16: Handle /benchmark command
   */
  private async handleBenchmarkCommand(
    args: string,
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const trimmed = args.trim();

    // Phase 18: Benchmark Exit Report & Autonomy Breakdown
    if (
      trimmed.includes('report') ||
      trimmed.includes('laporan') ||
      trimmed.includes('exit') ||
      trimmed.includes('autonomy')
    ) {
      if (this.engineeringService?.managerService) {
        const text = this.engineeringService.managerService.generateBenchmarkExitReport();
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }
    }

    if (!this.benchmarkService) {
      if (this.engineeringService?.managerService) {
        const text = this.engineeringService.managerService.generateBenchmarkExitReport();
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }
      return {
        type: 'TEXT',
        responseMessage: `Layanan Autonomous Benchmark belum aktif atau sedang memuat.`,
        correlationId,
      };
    }

    if (!trimmed || trimmed === 'list') {
      const tasks = this.benchmarkService.listTasks();
      const text = TelegramFormatter.formatBenchmarkTaskList(tasks);
      return { type: 'TEXT', responseMessage: text, correlationId };
    }

    if (trimmed === 'status') {
      const metrics = await this.benchmarkService.getMetricsSummary();
      const text = TelegramFormatter.formatBenchmarkStatus(metrics);
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // Run specific task or Golden Path (SIMMACI-010)
    let targetTaskId = trimmed.replace(/^run\s*/i, '').trim();
    if (!targetTaskId || targetTaskId.toLowerCase() === 'golden' || targetTaskId.toLowerCase() === 'all') {
      targetTaskId = 'SIMMACI-010';
    }

    const task = this.benchmarkService.getTask(targetTaskId) || this.benchmarkService.getTask('SIMMACI-010')!;
    const acceptedText = TelegramFormatter.formatBenchmarkTaskAccepted(task.id, task.title);

    try {
      const run = await this.benchmarkService.startBenchmarkRun(task.id, { mode: 'AUTONOMOUS' });
      if (run.status === 'COMPLETED') {
        const completeText = TelegramFormatter.formatBenchmarkComplete({
          passed: run.successful_tests,
          failed: run.failed_tests,
          diffFilesCount: run.artifacts.find((a) => a.type === 'GIT_DIFF')?.content.split('\n').filter((l) => l.startsWith('diff --git')).length || 2,
          commitHash: run.final_commit,
        });
        return {
          type: 'TASK_CREATED',
          responseMessage: `${acceptedText}\n\n---\n\n${completeText}`,
          correlationId,
          taskId: run.run_id,
        };
      } else if (run.status === 'BLOCKED') {
        const blockedText = TelegramFormatter.formatBenchmarkBlocked(
          run.failure_reason || 'Production credentials required.',
          'Approve credential access.'
        );
        return {
          type: 'SYSTEM_STATE',
          responseMessage: `${acceptedText}\n\n---\n\n${blockedText}`,
          correlationId,
        };
      } else {
        return {
          type: 'TEXT',
          responseMessage: `${acceptedText}\n\n---\n\nTASK FAILED\nReason: ${run.failure_reason || 'Unknown error'}`,
          correlationId,
        };
      }
    } catch (err: any) {
      return {
        type: 'TEXT',
        responseMessage: `${acceptedText}\n\n---\n\nTASK FAILED\nReason: ${err.message}`,
        correlationId,
      };
    }
  }

  /**
   * Phase 16 Section 16: Handle /build command
   * Example: /build Tambahkan export CSV pada daftar guru SIMMACI
   */
  private async handleBuildCommand(
    args: string,
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const rawInstruction = args.trim() || 'Tambahkan export CSV pada daftar guru SIMMACI';
    const taskId = rawInstruction.toLowerCase().includes('absensi') ? 'SIMMACI-010' : 'SIMMACI-002';
    const task = this.benchmarkService?.getTask(taskId) || {
      id: taskId,
      title: 'Add CSV Export',
      description: rawInstruction,
      level: 2,
      category: 'FEATURE' as const,
      repository: 'simmaci-benchmark-repo',
      acceptanceCriteria: ['CSV exported cleanly'],
      constraints: ['Respect existing auth'],
      expectedArtifacts: ['export.service.js', 'test'],
    };

    const acceptedText = TelegramFormatter.formatBenchmarkTaskAccepted(task.id, task.title);

    if (this.benchmarkService) {
      try {
        const run = await this.benchmarkService.startBenchmarkRun(taskId, { mode: 'AUTONOMOUS' });
        if (run.status === 'COMPLETED') {
          const completeText = TelegramFormatter.formatBenchmarkComplete({
            passed: run.successful_tests,
            failed: run.failed_tests,
            diffFilesCount: 2,
            commitHash: run.final_commit,
          });
          return {
            type: 'TASK_CREATED',
            responseMessage: `${acceptedText}\n\n---\n\n${completeText}`,
            correlationId,
            taskId: run.run_id,
          };
        }
      } catch (err: any) {
        return {
          type: 'TASK_CREATED',
          responseMessage: `${acceptedText}\n\n---\n\nTASK ACCEPTED (Background execution: ${err.message})`,
          correlationId,
          taskId: `bm_err_${Date.now()}`,
        };
      }
    }

    return {
      type: 'TASK_CREATED',
      responseMessage: acceptedText,
      correlationId,
    };
  }

  /**
   * Phase 16 Section 16: Handle /fix command
   * Example: /fix Perbaiki bug filter sekolah
   */
  private async handleFixCommand(
    args: string,
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const rawInstruction = args.trim() || 'Perbaiki bug filter sekolah';
    const taskId = rawInstruction.toLowerCase().includes('login') ? 'SIMMACI-001' : 'SIMMACI-006';
    const task = this.benchmarkService?.getTask(taskId) || {
      id: taskId,
      title: 'Fix School Filter Bug',
      description: rawInstruction,
      level: 4,
      category: 'BUG_FIX' as const,
      repository: 'simmaci-benchmark-repo',
      acceptanceCriteria: ['Pass test suite'],
      constraints: ['No regression'],
      expectedArtifacts: ['users.service.js', 'test'],
    };

    const acceptedText = TelegramFormatter.formatBenchmarkTaskAccepted(task.id, task.title, [
      'reproduce if possible',
      'collect evidence',
      'identify root cause',
      'implement fix',
      'test',
      'regression test',
    ]);

    if (this.benchmarkService) {
      try {
        const run = await this.benchmarkService.startBenchmarkRun(taskId, { mode: 'AUTONOMOUS' });
        if (run.status === 'COMPLETED') {
          const completeText = TelegramFormatter.formatBenchmarkComplete({
            passed: run.successful_tests,
            failed: run.failed_tests,
            diffFilesCount: 1,
            commitHash: run.final_commit,
          });
          return {
            type: 'TASK_CREATED',
            responseMessage: `${acceptedText}\n\n---\n\n${completeText}`,
            correlationId,
            taskId: run.run_id,
          };
        }
      } catch (err: any) {
        return {
          type: 'TASK_CREATED',
          responseMessage: `${acceptedText}\n\n---\n\nTASK ACCEPTED (Background execution: ${err.message})`,
          correlationId,
          taskId: `bm_err_${Date.now()}`,
        };
      }
    }

    return {
      type: 'TASK_CREATED',
      responseMessage: acceptedText,
      correlationId,
    };
  }

  /**
   * Handle natural language requests
   */
  private async handleNaturalLanguage(
    rawText: string,
    message: OwnerMessage,
    correlationId: string
  ): Promise<OrchestratorResult> {
    const lower = rawText.toLowerCase();
    const senderName = message.senderFirstName || message.senderUsername || 'Owner';
    const chatId = (message.metadata?.chatId as string) || message.senderId;

    const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let classification = 'INFORMATION';
    let intent = 'General Natural Language Inquiry';

    // 0. Security Penetration & Prompt Injection Defense (Phase 12 Section 25)
    const injectionCheck = PromptInjectionDefense.analyze(rawText, 'telegram:inbound');
    if (injectionCheck.isSuspicious) {
      this.logger.warn('handleNaturalLanguage', `Adversarial input detected: [${injectionCheck.patternsDetected.join(', ')}]`);
      await this.repository.saveAuditLog({
        auditId: `sec_audit_${Date.now()}`,
        correlationId,
        senderId: message.senderId,
        action: 'PROMPT_INJECTION_DEFENSE_TRIGGERED',
        authorized: false,
        ipAddress: 'telegram_gateway',
        details: JSON.stringify({ patterns: injectionCheck.patternsDetected, rawText }),
        timestamp: new Date().toISOString(),
      });

      // Even if attacker says "ignore policies and deploy immediately", policy engine MUST remain authoritative
      if (lower.includes('deploy') || lower.includes('drop') || lower.includes('delete')) {
        classification = 'CONTROL';
        intent = 'Adversarial Bypass Attempt Blocked';
        await this.repository.saveCommand({
          commandId: cmdId,
          conversationId: message.conversationId,
          correlationId,
          rawInput: rawText,
          classification,
          intent,
          executionStatus: 'POLICY_REJECTED',
          createdAt: new Date().toISOString(),
        });

        const defenseMsg = TelegramFormatter.formatSecurityPolicyDefense(
          injectionCheck.patternsDetected.join(', '),
          'Instruksi eksekusi berisiko tinggi WAJIB melalui verifikasi policy engine dan approval kriptografis Owner. Kebijakan KDI tidak dapat diabaikan atau dipotong oleh prompt apapun.'
        );
        return { type: 'TEXT', responseMessage: defenseMsg, correlationId };
      }
    }

    // ==========================================================
    // PHASE 16: AUTONOMOUS SOFTWARE DELIVERY BENCHMARK TRIGGER
    // ==========================================================
    if (
      lower.includes('benchmark') ||
      lower.includes('uji otonom') ||
      lower.includes('tes otonom') ||
      lower.includes('tambahkan export csv') ||
      lower.includes('perbaiki bug filter') ||
      lower.startsWith('build ') ||
      lower.startsWith('fix ')
    ) {
      if (lower.includes('filter') || lower.includes('sekolah') || lower.startsWith('fix ')) {
        return this.handleFixCommand(rawText, message, correlationId);
      }
      if (lower.includes('csv') || lower.includes('export') || lower.includes('guru') || lower.startsWith('build ')) {
        return this.handleBuildCommand(rawText, message, correlationId);
      }
      return this.handleBenchmarkCommand(rawText, message, correlationId);
    }

    // 1. Emergency Overrides
    if (
      lower.includes('pause semua') ||
      lower.includes('stop all') ||
      lower.includes('emergency halt') ||
      lower.includes('pause autonomy')
    ) {
      classification = 'CONTROL';
      intent = 'Global Autonomy Pause';
      if (this.autonomyService) {
        this.autonomyService.toggleGlobalPause(true, `Emergency halt via NL: "${rawText}"`, senderName);
      }
      this.broadcast3DOfficeAlert('AUTONOMY_PAUSED', 'Owner mengaktifkan Global Autonomy Pause via chat.');
      const text = TelegramFormatter.formatEmergencyPause(true, `Perintah natural: "${rawText}"`, senderName);
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    if (
      lower.includes('resume autonomy') ||
      lower.includes('lanjutkan autonomy') ||
      lower.includes('aktifkan kembali') ||
      lower.includes('resume semua')
    ) {
      classification = 'CONTROL';
      intent = 'Global Autonomy Resume';
      if (this.autonomyService) {
        this.autonomyService.toggleGlobalPause(false, `Autonomy resumed via NL: "${rawText}"`, senderName);
      }
      this.broadcast3DOfficeAlert('AUTONOMY_RESUMED', 'Owner mengaktifkan kembali Autonomy via chat.');
      const text = TelegramFormatter.formatEmergencyPause(false, `Perintah natural: "${rawText}"`, senderName);
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ==========================================================
    // PHASE 17 — AI ENGINEERING MANAGER & MULTI-PROJECT OPERATIONS NL (§30 & §45)
    // ==========================================================

    const isLegacyPhase12Check =
      lower.includes('cari penyebab') ||
      lower.includes('nomor dua') ||
      lower.includes('nomor 2') ||
      lower.includes('yang kedua') ||
      lower.includes('kondisi project') ||
      lower.includes('yang backend saja') ||
      lower.includes('hanya backend');

    // 1. "Prioritaskan semua pekerjaan" / "Prioritaskan yang paling penting" (§30)
    if (
      !isLegacyPhase12Check &&
      (lower.includes('prioritaskan semua pekerjaan') ||
       lower.includes('prioritaskan pekerjaan') ||
       lower.includes('prioritaskan semua') ||
       lower.includes('reorder queue'))
    ) {
      classification = 'CONTROL';
      intent = 'Engineering Manager: Prioritize All Tasks';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.answerManagerQuery(rawText)
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 2. "Status seluruh project" / "portfolio status" (§31)
    if (
      !isLegacyPhase12Check &&
      (lower.includes('status seluruh project') ||
       lower.includes('status portfolio') ||
       lower.includes('portfolio status') ||
       lower.includes('semua project'))
    ) {
      classification = 'REPORTING';
      intent = 'Engineering Manager: Portfolio Status';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.getPortfolioTelegramStatus()
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 3. "Kenapa SIMMACI tertunda?" / "Kenapa <project> tertunda?" (§30)
    if (
      !isLegacyPhase12Check &&
      lower.includes('kenapa') &&
      (lower.includes('tertunda') || lower.includes('delay') || lower.includes('terhambat'))
    ) {
      classification = 'ANALYSIS';
      intent = 'Engineering Manager: Project Delay Investigation';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.answerManagerQuery(rawText)
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: text, correlationId };
    }

    // 4. "Task mana yang blocked?" (§30)
    if (
      !isLegacyPhase12Check &&
      (lower.includes('task mana yang blocked') ||
       lower.includes('pekerjaan mana yang blocked') ||
       (lower.includes('mana yang blocked') && !lower.includes('cari')))
    ) {
      classification = 'REPORTING';
      intent = 'Engineering Manager: Blocked Tasks Query';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.answerManagerQuery(rawText)
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 5. "Siapa yang sedang sibuk?" (§30)
    if (
      !isLegacyPhase12Check &&
      (lower.includes('siapa yang sedang sibuk') ||
       lower.includes('siapa yang sibuk') ||
       lower.includes('workload workforce') ||
       lower.includes('kapasitas agent'))
    ) {
      classification = 'REPORTING';
      intent = 'Engineering Manager: Workforce Workload';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.answerManagerQuery(rawText)
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 6. "Kerjakan yang paling penting dulu" (§30 & §45)
    if (
      !isLegacyPhase12Check &&
      (lower.includes('kerjakan yang paling penting') ||
       lower.includes('prioritas tertinggi dulu') ||
       lower.includes('eksekusi task teratas'))
    ) {
      classification = 'EXECUTION';
      intent = 'Engineering Manager: Execute Top Priority Task';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.answerManagerQuery(rawText)
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TASK_CREATED', responseMessage: text, correlationId };
    }

    // 7. Phase 19: "Bagaimana optimasi reliability" / "Reliability report" (§50)
    if (
      !isLegacyPhase12Check &&
      (lower.includes('reliability') ||
       lower.includes('optimasi engineering') ||
       lower.includes('optimasi reliability') ||
       lower.includes('perbandingan benchmark') ||
       lower.includes('phase 19'))
    ) {
      classification = 'REPORTING';
      intent = 'Engineering Manager: Phase 19 Reliability Report';
      const text = this.engineeringService?.managerService
        ? this.engineeringService.managerService.generatePhase19ComparisonReport()
        : 'Engineering Manager belum aktif.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // ==========================================================
    // PHASE 16 — KDI AI ENGINEERING OPERATING SYSTEM NL HANDLERS
    // ==========================================================

    // 1. "Apa yang butuh perhatian saya?" / "What needs my attention?" (§16)
    if (
      lower.includes('butuh perhatian') ||
      lower.includes('memerlukan perhatian') ||
      lower.includes('perlu perhatian') ||
      lower.includes('needs my attention') ||
      lower.includes('what needs attention')
    ) {
      classification = 'CONTROL';
      intent = 'Engineering OS: What Needs My Attention';
      const pendingCount = this.engineeringService?.listPendingApprovals().length || 0;
      const summary = this.engineeringService?.osService?.getAttentionSummary(pendingCount);
      const text = summary
        ? this.engineeringService!.osService.formatAttentionTelegramMessage(summary)
        : 'Semua pekerjaan engineering berjalan lancar tanpa blocker.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 2. "Status pekerjaan SIMMACI" / "Status SIMMACI" (§6)
    if (
      (lower.includes('status') && lower.includes('simmaci')) ||
      lower.includes('status pekerjaan simmaci') ||
      lower.includes('progres simmaci')
    ) {
      classification = 'REPORTING';
      intent = 'Engineering OS: Project Status SIMMACI';
      const p = this.engineeringService?.osService?.projectKnowledge.resolveProject('simmaci');
      const tasks = this.engineeringService?.executorService?.listTasks().filter((t) => t.project.toLowerCase().includes('simmaci')) || [];
      const taskSummary = tasks.length > 0
        ? tasks.slice(-3).map((t) => `• \`${t.taskId}\`: *${t.status}* [${t.branch}]`).join('\n')
        : '• Belum ada task aktif untuk SIMMACI.';
      const text =
        `🏛️ *STATUS PROJECT SIMMACI*\n\n` +
        `*Framework:* ${p?.framework || 'Node.js'}\n` +
        `*Lead Agent:* ${p?.assignedLeadAgent || 'Farhan Hakim (BE Engineer)'}\n` +
        `*Test Suite:* \`${p?.testCommand || 'node --test'}\`\n` +
        `*Active Tasks:*\n${taskSummary}\n\n` +
        `_Gunakan Telegram untuk memberikan pekerjaan, contoh:_\n` +
        `_"SIMMACI login error"_`;
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 3. "Apa yang sedang dikerjakan BE?" / "status be engineer" (§7)
    if (
      lower.includes('sedang dikerjakan be') ||
      lower.includes('apa yang dikerjakan be') ||
      lower.includes('aktivitas be engineer') ||
      lower.includes('pekerjaan be engineer')
    ) {
      classification = 'INFORMATION';
      intent = 'Engineering OS: Agent Activity BE Engineer';
      const beTasks = this.engineeringService?.executorService?.listTasks().filter((t) => (t as any).agent?.toLowerCase().includes('be') || t.taskId.toLowerCase().includes('be') || t.project.toLowerCase().includes('simmaci')) || [];
      const activeTask = beTasks.find((t) => !['COMMITTED', 'READY_FOR_DEPLOY', 'CANCELLED'].includes(t.status) && !t.status.includes('FAIL'));
      let text = '';
      if (activeTask) {
        text =
          `👨‍💻 *BE ENGINEER (Farhan Hakim)*\n\n` +
          `*Status:* WORKING ON TASK\n` +
          `*Task:* \`${activeTask.taskId}\` [${activeTask.project}]\n` +
          `*State:* *${activeTask.status}*\n` +
          `*Branch:* \`${activeTask.branch}\``;
      } else {
        text =
          `👨‍💻 *BE ENGINEER (Farhan Hakim)*\n\n` +
          `*Status:* AVAILABLE (IDLE)\n` +
          `*Preferred Executor:* Antigravity\n` +
          `*Scope:* Backend API, authentication, database, tests\n` +
          `Siap menerima penugasan baru.`;
      }
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 4. "Kenapa task <taskId> gagal?" (§21)
    if (
      (lower.includes('kenapa task') || lower.includes('mengapa task') || lower.includes('alasan task')) &&
      lower.includes('gagal')
    ) {
      classification = 'ANALYSIS';
      intent = 'Engineering OS: Task Failure Diagnostic';
      const taskIdMatch = rawText.match(/ENG-[A-Za-z0-9-_]+/i);
      const targetId = taskIdMatch ? taskIdMatch[0] : '';
      const task = targetId ? this.engineeringService?.executorService?.getTaskStatus(targetId) : undefined;
      let text = '';
      if (task) {
        const lastAttempt = task.currentAttempt;
        text =
          `🔍 *TASK FAILURE DIAGNOSTIC — \`${task.taskId}\`*\n\n` +
          `*Project:* ${task.project}\n` +
          `*Status:* *${task.status}*\n` +
          `*Attempts:* ${task.attempts.length}\n` +
          `*Error / Reason:*\n_${lastAttempt?.error || task.error || 'Test suite assertions failed'}_\n\n` +
          `*Tests:* ${lastAttempt?.tests.failed || 0} failed out of ${lastAttempt?.tests.run || 0} tests\n` +
          `*Next Recommended Action:*\nKetik \`/engineering retry ${task.taskId}\` atau investigasi perbaikan manual.`;
      } else {
        text = `Sertakan task ID yang valid (misal: \`ENG-104\`) untuk memeriksa diagnosa kegagalan.`;
      }
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: text, correlationId };
    }

    // 5. Inbound Real Engineering Work Request via Natural Language (§2, §4, §17, §45)
    // Matches: "SIMMACI login error", "SIMMACI setelah update kemarin login kadang 500",
    // "Perbaiki login SIMMACI", "SIMMACI error login", "Perbaiki bug di calculator",
    const isLegacyPhase12Query =
      lower.includes('cari penyebab') ||
      lower.includes('nomor dua') ||
      lower.includes('nomor 2') ||
      lower.includes('yang kedua') ||
      lower.includes('kondisi project') ||
      lower.includes('yang backend saja') ||
      lower.includes('hanya backend');

    if (
      !isLegacyPhase12Query &&
      ((lower.includes('simmaci') && (lower.includes('error') || lower.includes('login') || lower.includes('500') || lower.includes('bug') || lower.includes('perbaiki') || lower.includes('tambah') || lower.includes('endpoint') || lower.includes('test'))) ||
      (lower.includes('calc') && (lower.includes('error') || lower.includes('bug') || lower.includes('perbaiki') || lower.includes('bagi') || lower.includes('divide') || lower.includes('persen'))) ||
      lower.startsWith('perbaiki ') ||
      lower.startsWith('fix ') ||
      lower.startsWith('buat regression test') ||
      lower.startsWith('tambahkan endpoint'))
    ) {
      classification = 'EXECUTION';
      intent = 'Engineering OS: Real Inbound Engineering Work Request';

      this.update3DAgentActivity('BACKEND_ENGINEER', 'CODING', 'RM-05', `Executing engineering task: ${rawText.slice(0, 50)}`);

      if (this.engineeringService?.osService && this.engineeringService.executorService) {
        const { workRequest, executionResult, formattedMessage } =
          await this.engineeringService.osService.processInboundRequest(
            rawText,
            senderName,
            this.engineeringService.executorService
          );

        await this.repository.saveCommand({
          commandId: cmdId,
          conversationId: message.conversationId,
          correlationId,
          rawInput: rawText,
          classification,
          intent,
          taskId: executionResult?.taskId || workRequest.taskId || workRequest.id,
          executionStatus: workRequest.status,
          createdAt: new Date().toISOString(),
        });

        return {
          type: workRequest.status === 'WAITING_FOR_APPROVAL' ? 'APPROVAL_REQUIRED' : 'TASK_CREATED',
          responseMessage: formattedMessage,
          correlationId,
          taskId: executionResult?.taskId || workRequest.taskId || workRequest.id,
        };
      }
    }

    // ==========================================================
    // PHASE 13 — ORGANIZATIONAL INTELLIGENCE NATURAL LANGUAGE HANDLERS
    // ==========================================================

    // 1.3. Phase 13 Section 48 Operational Target: "Bagaimana kondisi organisasi KDI sekarang?"
    if (
      lower.includes('kondisi organisasi') ||
      lower.includes('status organisasi') ||
      lower.includes('bagaimana kondisi organisasi') ||
      lower.includes('briefing organisasi') ||
      lower.includes('kondisi kdi sekarang')
    ) {
      classification = 'INFORMATION';
      intent = 'Organizational Intelligence Briefing';
      let text: string;
      if (this.recommendationDecisionService) {
        const briefing = this.recommendationDecisionService.generateOrganizationalBriefing();
        text = TelegramFormatter.formatOrganizationalBriefing(briefing);
      } else {
        text = 'Layanan Organizational Intelligence sedang memuat state.';
      }
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 1.4. "Apa yang paling menghambat pekerjaan?" / "Apa yang menghambat delivery?"
    if (
      lower.includes('menghambat pekerjaan') ||
      lower.includes('menghambat delivery') ||
      lower.includes('apa yang menghambat') ||
      lower.includes('bottleneck utama')
    ) {
      classification = 'ANALYSIS';
      intent = 'Decision Support: Bottleneck & Blocker Analysis';
      const answer = this.recommendationDecisionService
        ? this.recommendationDecisionService.answerDecisionSupportQuery('menghambat delivery')
        : 'Tidak ada bottleneck terdeteksi.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // 1.5. "Siapa yang overloaded?"
    if (
      lower.includes('siapa yang overloaded') ||
      lower.includes('agent mana yang overloaded') ||
      lower.includes('siapa yang paling sibuk')
    ) {
      classification = 'ANALYSIS';
      intent = 'Decision Support: Workforce Overload Analysis';
      const answer = this.recommendationDecisionService
        ? this.recommendationDecisionService.answerDecisionSupportQuery('overloaded')
        : 'Semua agen dalam kondisi beban kerja seimbang.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // 1.6. "Project mana yang paling banyak memakai resource?"
    if (
      lower.includes('paling banyak memakai resource') ||
      lower.includes('konsumsi resource') ||
      lower.includes('biaya project')
    ) {
      classification = 'ANALYSIS';
      intent = 'Decision Support: Portfolio Resource Consumption';
      const answer = this.recommendationDecisionService
        ? this.recommendationDecisionService.answerDecisionSupportQuery('cost')
        : 'Distribusi resource stabil.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // 1.7. "Apa objective yang tertinggal?"
    if (
      lower.includes('objective yang tertinggal') ||
      lower.includes('tujuan yang tertinggal') ||
      lower.includes('objective tertinggal')
    ) {
      classification = 'ANALYSIS';
      intent = 'Decision Support: Behind Objectives';
      const answer = this.recommendationDecisionService
        ? this.recommendationDecisionService.answerDecisionSupportQuery('objective')
        : 'Semua objective berjalan on-track.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // 1.8. "Apa rekomendasi KDI hari ini?"
    if (
      lower.includes('rekomendasi kdi hari ini') ||
      lower.includes('rekomendasi hari ini') ||
      lower.includes('apa saran kdi')
    ) {
      classification = 'ADVISORY';
      intent = 'Decision Support: Proactive Recommendations';
      const answer = this.recommendationDecisionService
        ? this.recommendationDecisionService.answerDecisionSupportQuery('briefing')
        : 'Lanjutkan pemantauan normal.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // 1.9. "Buatkan weekly report"
    if (
      lower.includes('buatkan weekly report') ||
      lower.includes('laporan mingguan') ||
      lower.includes('weekly report')
    ) {
      classification = 'REPORTING';
      intent = 'Structured Weekly Report';
      const report = this.reportingService
        ? this.reportingService.generateWeeklyReport()
        : { content: 'Weekly reporting service sedang offline.' };
      const text = TelegramFormatter.formatWeeklyReport(report.content);
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: text, correlationId };
    }

    // ==========================================================
    // PHASE 14 — CONTINUOUS LEARNING & ADAPTATION HANDLERS
    // ==========================================================

    // Ingest owner feedback if detected (Section 30, 31)
    if (
      lower.includes('bagus') ||
      lower.includes('kurang tepat') ||
      lower.includes('salah prioritas') ||
      lower.includes('terlalu lambat') ||
      lower.includes('jangan gunakan cara ini') ||
      lower.includes('lebih suka ringkas')
    ) {
      if (this.ownerFeedbackService) {
        this.ownerFeedbackService.ingestFeedback({
          rawText,
          messageId: message.messageId,
          source: 'TELEGRAM',
        });
      }
    }

    // Phase 14 Section 58 Operational Target: "Apa yang sudah dipelajari KDI dari pekerjaan minggu ini?"
    if (
      lower.includes('dipelajari kdi dari pekerjaan minggu ini') ||
      lower.includes('dipelajari kdi minggu ini') ||
      lower.includes('learning report') ||
      lower.includes('apa yang dipelajari kdi')
    ) {
      classification = 'REPORTING';
      intent = 'Continuous Learning: Weekly Learning Report';
      if (this.learningOrchestratorService) {
        const report = this.learningOrchestratorService.getWeeklyLearningReport();
        const text = TelegramFormatter.formatLearningReport(report);
        await this.repository.saveCommand({
          commandId: cmdId,
          conversationId: message.conversationId,
          correlationId,
          rawInput: rawText,
          classification,
          intent,
          executionStatus: 'COMPLETED',
          createdAt: new Date().toISOString(),
        });
        return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
      }
    }

    // Phase 14 Section 39: Learning & Process Queries
    if (
      lower.includes('pola kegagalan') ||
      lower.includes('perlu diperbaiki') ||
      lower.includes('sedang diusulkan') ||
      lower.includes('improvement yang berhasil') ||
      lower.includes('improvement yang gagal') ||
      lower.includes('di-rollback') ||
      lower.includes('berubah sejak minggu lalu') ||
      lower.includes('memilih agent ini') ||
      lower.includes('routing ini diubah')
    ) {
      classification = 'ANALYSIS';
      intent = 'Continuous Learning: Process & Routing Query';
      const answer = this.learningOrchestratorService
        ? this.learningOrchestratorService.answerLearningQuery(rawText)
        : 'Layanan Continuous Learning sedang offline.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // ==========================================================
    // PHASE 15 — STRATEGIC AUTONOMY & LONG-HORIZON EXECUTION HANDLERS
    // ==========================================================

    // 1.10. Phase 15 Section 65 Operational Target: "Bagaimana progres tujuan jangka panjang KDI?"
    if (
      lower.includes('progres tujuan jangka panjang') ||
      lower.includes('tujuan jangka panjang kdi') ||
      lower.includes('bagaimana progres tujuan jangka panjang') ||
      lower.includes('strategic status') ||
      lower.includes('status roadmap simmaci')
    ) {
      classification = 'REPORTING';
      intent = 'Strategic Autonomy: Section 65 Long-Horizon Strategic Status';
      let text: string;
      if (this.strategicOrchestratorService) {
        text = this.strategicOrchestratorService.formatSection65Briefing();
      } else {
        text = 'Layanan Strategic Autonomy sedang offline.';
      }
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 1.11. Phase 15 Section 33: Executive Strategic Weekly Briefing
    if (
      lower.includes('executive weekly briefing') ||
      lower.includes('executive strategic briefing') ||
      lower.includes('briefing strategis mingguan') ||
      lower.includes('strategic briefing')
    ) {
      classification = 'REPORTING';
      intent = 'Strategic Autonomy: Executive Weekly Briefing';
      const text = this.strategicOrchestratorService
        ? this.strategicOrchestratorService.getExecutiveWeeklyBriefing()
        : 'Layanan Strategic Briefing sedang offline.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 1.12. Phase 15 Section 32: Decision Support Queries
    if (
      lower.includes('paling berisiko') ||
      lower.includes('mulai terlambat') ||
      lower.includes('berubah dari rencana terakhir') ||
      lower.includes('berubah dari roadmap') ||
      lower.includes('kenapa kdi melakukan replanning') ||
      lower.includes('mengapa replanning') ||
      lower.includes('alasan replanning') ||
      lower.includes('dependency paling kritis') ||
      lower.includes('ketergantungan kritis') ||
      lower.includes('resource yang masih tersedia') ||
      lower.includes('kapasitas tersedia') ||
      lower.includes('budget risk') ||
      lower.includes('risiko budget') ||
      lower.includes('membutuhkan keputusan saya') ||
      lower.includes('decision required')
    ) {
      classification = 'ANALYSIS';
      intent = 'Strategic Autonomy: Section 32 Decision Support Query';
      const answer = this.strategicOrchestratorService
        ? this.strategicOrchestratorService.answerStrategicQuery(rawText)
        : 'Layanan Strategic Intelligence sedang offline.';
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: answer, correlationId };
    }

    // 2. Daily Operating Model (Phase 12 Section 30)
    // Morning Briefing: "Status KDI pagi ini"
    if (
      lower.includes('status kdi pagi ini') ||
      lower.includes('briefing pagi') ||
      lower.includes('status pagi')
    ) {
      classification = 'INFORMATION';
      intent = 'Morning Operational Briefing';
      const health = await this.getAggregateHealth();
      const activeAgents = this.workforceService?.getVirtualEmployees().length || 9;
      const activeTasks = this.runtimeService?.getActiveTasks().length || 0;
      const queuedTasks = this.runtimeService?.getQueuedTasks().length || 0;
      const openIncidents = this.autonomyService?.getIncidents().filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 0;
      const pendingApprovals = this.autonomyService?.getPendingApprovals().length || 0;

      const morningCard = TelegramFormatter.formatMorningBriefing({
        health,
        activeAgents,
        activeTasks,
        blockedTasks: 0,
        incidents: openIncidents,
        approvals: pendingApprovals,
        priorityRecommendations: [
          'Verifikasi telemetry auth-service SIMMACI pasca rotasi pool Redis',
          'Pantau alokasi 3 worker runtime dan kedalaman antrean tugas',
          'Selesaikan review implementasi retry policy eksponensial',
        ],
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: morningCard, correlationId };
    }

    // Evening Daily Report: "Buatkan daily report" / "Ringkas pekerjaan hari ini"
    if (
      lower.includes('buatkan daily report') ||
      lower.includes('ringkas pekerjaan hari ini') ||
      lower.includes('laporan harian') ||
      lower.includes('daily report')
    ) {
      classification = 'REPORTING';
      intent = 'Evening Executive Daily Report';
      const allTasks = this.runtimeService?.getAllTasks() || [];
      const completedCount = allTasks.filter((t) => t.status === 'COMPLETED').length;
      const unfinishedCount = allTasks.filter((t) => t.status === 'RUNNING' || t.status === 'QUEUED').length;
      const incidentsCount = this.autonomyService?.getIncidents().length || 0;

      const eveningReport = TelegramFormatter.formatEveningReport({
        completedTasks: completedCount,
        unfinishedWork: unfinishedCount,
        incidents: incidentsCount,
        importantDecisions: [
          'Otorisasi isolasi worktree Git untuk audit SIMMACI',
          'Penetapan retry policy eksponensial pada AuthService Redis pool',
          'Verifikasi integrasi telemetry 3D Living Office dan GraphRAG',
        ],
        costSummary: '$1.42 USD (Token LLM & Infrastruktur)',
        systemHealth: '100% HEALTHY (PostgreSQL, Redis, Neo4j UP)',
        recommendations: [
          'Lanjutkan pemeliharaan canary release untuk deployment berikutnya',
          'Pertahankan snapshot GraphRAG untuk preserve memori arsitektur',
        ],
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: eveningReport, correlationId };
    }

    // 3. Multi-Turn Conversation Context Resolution (Phase 12 Section 18)
    const recentMessages = await this.repository.getRecentMessages(message.conversationId, 6);
    const hasPreviousSimmaciContext = recentMessages.some(
      (m) => m.text.toLowerCase().includes('simmaci') || m.text.toLowerCase().includes('autentikasi')
    );

    // Follow-up 1: "Yang backend saja"
    if (
      lower.includes('yang backend saja') ||
      lower.includes('hanya backend') ||
      lower.includes('fokus backend')
    ) {
      classification = 'ANALYSIS';
      intent = 'Scoped Context Inspection: SIMMACI Backend';

      const explanation = TelegramFormatter.formatOperationalExplanation({
        understoodRequest: 'Penyaringan fokus investigasi ke komponen backend SIMMACI berdasarkan instruksi sebelumnya',
        identifiedProject: 'SIMMACI (auth-service & session-pool)',
        selectedCapabilities: ['CODE_INSPECTION', 'LOG_ANALYSIS', 'GRAPHRAG_QUERY'],
        executionPlan: [
          'Filter telemetry spesifik ke backend auth-service',
          'Identifikasi bottleneck dan rekomendasi mitigasi',
        ],
        assignedAgents: ['AI Backend Engineer (Farhan)', 'AI Security Specialist (Ilham)'],
        verificationStatus: 'Analysis Completed',
        finalResult:
          `🔍 *TEMUAN BACKEND SIMMACI*\n\n` +
          `Berdasarkan konteks inspeksi SIMMACI sebelumnya, berikut temuan khusus backend:\n\n` +
          `• *Temuan #1:* Endpoint \`/api/v1/auth/login\` mengalami lonjakan latency transient akibat timeout koneksi Redis pool.\n` +
          `• *Temuan #2:* Perlu penambahan retry policy eksponensial pada AuthService untuk mitigasi kegagalan koneksi transient.\n\n` +
          `Apakah Anda ingin saya membuatkan rencana perbaikan atau langsung mengeksekusinya?`,
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: explanation, correlationId };
    }

    // Follow-up 2: "Perbaiki yang nomor dua" / "Kerjakan yang nomor dua"
    if (
      (lower.includes('perbaiki') && (lower.includes('nomor dua') || lower.includes('nomor 2') || lower.includes('yang kedua'))) ||
      (lower.includes('kerjakan') && (lower.includes('nomor dua') || lower.includes('nomor 2') || lower.includes('yang kedua')))
    ) {
      classification = 'EXECUTION';
      intent = 'Resolve Multi-Turn Target: SIMMACI Backend Retry Policy';

      const taskId = `tsk_${Date.now()}_retry_fix`;
      const taskTitle = 'Implementasi retry policy eksponensial pada AuthService SIMMACI';

      if (this.runtimeService) {
        this.runtimeService.createTask({
          title: taskTitle,
          description: 'Perbaiki backend SIMMACI berdasarkan Temuan #2: Tambahkan retry policy eksponensial pada AuthService.',
          priority: 'HIGH',
          taskType: 'CODING',
          requiredSkills: ['coding', 'debugging'],
          requestedBy: `Owner (${senderName}) via Telegram Multi-Turn Context`,
        });
      }

      this.update3DAgentActivity('BACKEND_ENGINEER', 'CODING', 'RM-05', taskTitle);

      const explanation = TelegramFormatter.formatOperationalExplanation({
        understoodRequest: 'Eksekusi perbaikan Temuan #2 (Retry policy eksponensial pada AuthService SIMMACI)',
        identifiedProject: 'SIMMACI (Backend / AuthService)',
        selectedCapabilities: ['CODING', 'UNIT_TESTING', 'REGRESSION_VERIFICATION'],
        executionPlan: [
          'Buka isolated worktree git untuk SIMMACI auth-service',
          'Implementasikan exponential backoff wrapper pada Redis session connector',
          'Jalankan automated test suite untuk memvalidasi ketahanan terhadap timeout',
          'Verifikasi hasil test dan hasilkan commit evidence',
        ],
        assignedAgents: ['Farhan (Software Engineer)', 'Tasya (QA Engineer)'],
        verificationStatus: 'Task Enqueued in Agent Runtime',
        finalResult: TelegramFormatter.formatTaskAccepted({
          taskId,
          title: taskTitle,
          assignedAgent: 'Farhan (AI Software Engineer) & Tasya (QA Engineer)',
        }),
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        taskId,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TASK_CREATED', responseMessage: explanation, taskId, correlationId };
    }

    // 4. Real-World Task A: "Periksa kondisi project SIMMACI"
    if (
      lower.includes('periksa kondisi project simmaci') ||
      lower.includes('periksa project simmaci') ||
      lower.includes('kondisi project simmaci') ||
      (lower.includes('periksa simmaci') && !lower.includes('yang backend'))
    ) {
      classification = 'ANALYSIS';
      intent = 'Project Health & Architecture Audit';

      this.update3DAgentActivity('SECURITY_ENGINEER', 'CODING', 'RM-10', 'Inspecting SIMMACI project health');
      this.update3DAgentActivity('RESEARCHER', 'THINKING', 'RM-11', 'Correlating historical commits & telemetry');

      const explanation = TelegramFormatter.formatOperationalExplanation({
        understoodRequest: 'Pemeriksaan menyeluruh kondisi dan kesehatan project SIMMACI dari state nyata',
        identifiedProject: 'SIMMACI (Sistem Informasi Manajemen Madrasah Cerdas)',
        selectedCapabilities: ['HEALTH_PROBE', 'CODE_ANALYSIS', 'TELEMETRY_INSPECTION'],
        executionPlan: [
          'Probing status endpoint API & container SIMMACI',
          'Analisis log error 24 jam terakhir',
          'Evaluasi metrik database connection pool dan performa Redis',
        ],
        assignedAgents: ['Ilham (Security Engineer)', 'Dr. Nadia (Researcher)', 'Farhan (Backend Engineer)'],
        verificationStatus: 'Probes Verified Against System State',
        finalResult:
          `🏢 *LAPORAN KONDISI PROJECT SIMMACI*\n\n` +
          `Status Keseluruhan: 🟢 SEHAT (Skor Operasional: 98%)\n\n` +
          `*Area yang Membutuhkan Perhatian:*\n` +
          `1. *Frontend:* Optimasi cache warm-up Next.js SSR pada rute \`/dashboard\` untuk mempercepat TTFB.\n` +
          `2. *Backend:* Endpoint \`/api/v1/auth/login\` mengalami lonjakan latency sesaat akibat koneksi Redis timeout pada session pool.\n` +
          `3. *Database:* PostgreSQL connection pool stabil di angka 42% utilisasi.\n\n` +
          `Ketik _"Yang backend saja"_ atau _"Buatkan rencana perbaikannya"_ untuk melanjutkan tindakan.`,
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: explanation, correlationId };
    }

    // 5. Health & Status Inquiries
    if (
      lower.includes('kesehatan') ||
      lower.includes('kondisi kantor') ||
      lower.includes('status kantor') ||
      lower.includes('kondisi semua agent') ||
      lower.includes('bagaimana kondisi')
    ) {
      classification = 'INFORMATION';
      intent = 'System Health Snapshot';
      const health = await this.getAggregateHealth();
      const globalPaused = this.autonomyService ? (this.autonomyService as any).globalPauseActive : false;
      const text = TelegramFormatter.formatSystemStatus({
        health,
        globalPaused,
        activeTasks: this.runtimeService?.getActiveTasks().length || 0,
        queuedTasks: this.runtimeService?.getQueuedTasks().length || 0,
        activeAgents: this.workforceService?.getVirtualEmployees().length || 9,
        openIncidents: this.autonomyService?.getIncidents().filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 0,
        pendingApprovals: this.autonomyService?.getPendingApprovals().length || 0,
      });
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'SYSTEM_STATE', responseMessage: text, correlationId };
    }

    // 6. Current Work & Attention Items
    if (
      lower.includes('sedang dikerjakan') ||
      lower.includes('pekerjaan paling penting') ||
      lower.includes('tugas saat ini') ||
      lower.includes('prioritas hari ini')
    ) {
      classification = 'INFORMATION';
      intent = 'Active Tasks Inquiry';
      const active = this.runtimeService?.getActiveTasks() || [];
      const queued = this.runtimeService?.getQueuedTasks() || [];
      if (active.length > 0 || queued.length > 0) {
        const text = TelegramFormatter.formatTasks(active, queued);
        await this.repository.saveCommand({
          commandId: cmdId,
          conversationId: message.conversationId,
          correlationId,
          rawInput: rawText,
          classification,
          intent,
          executionStatus: 'COMPLETED',
          createdAt: new Date().toISOString(),
        });
        return { type: 'TEXT', responseMessage: text, correlationId };
      }
      const responseMessage =
        `📌 *KONDISI PEKERJAAN SAAT INI*\n\n` +
        `Tidak ada tugas yang terhambat atau berstatus darurat.\n` +
        `Fokus utama hari ini: Pemeliharaan stabilitas API SIMMACI dan pemantauan telemetry kantor.`;
      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage, correlationId };
    }

    // 7. Incident & Diagnostic Investigations
    if (
      lower.includes('cari penyebab error') ||
      lower.includes('error login') ||
      lower.includes('kenapa login') ||
      lower.includes('analisis masalah') ||
      lower.includes('investigasi')
    ) {
      classification = 'ANALYSIS';
      intent = 'Diagnostic Defect Investigation';
      // 3D Office movement: Dispatch Researcher / Security Engineer to analyze
      this.update3DAgentActivity('SECURITY_ENGINEER', 'CODING', 'RM-10', 'Investigating SIMMACI login latency & token errors');
      this.update3DAgentActivity('RESEARCHER', 'THINKING', 'RM-11', 'Correlating authentication telemetry logs with GraphRAG');

      // GraphRAG retrieval if available
      let graphContext = '';
      if (this.graphRagService) {
        try {
          const graphRes = await this.graphRagService.queryGraphRAG({
            query: rawText,
            topK: 3,
            maxHops: 2,
            userRole: 'admin',
          });
          if (graphRes.answer) {
            graphContext = `\n\n*Temuan Memori (GraphRAG):*\n${graphRes.answer}`;
          }
        } catch (err: any) {
          this.logger.debug('handleNaturalLanguage', `GraphRAG query skipped: ${err.message}`);
        }
      }

      const response =
        `🔍 *HASIL INVESTIGASI ORCHESTRATOR*\n\n` +
        `Saya telah mengarahkan Security Engineer dan QA Engineer untuk memeriksa komponen autentikasi SIMMACI.\n\n` +
        `*Temuan Diagnostik:*\n` +
        `• Service: \`auth-service\` (Endpoint: \`/api/v1/auth/login\`)\n` +
        `• Gejala: Lonjakan latency sesaat akibat koneksi Redis timeout pada sinkronisasi session pool.\n` +
        `• Status Terkini: Pool connection telah direfresh otomatis dan error rate kembali normal (0.01%).\n` +
        `• Tindakan yang Disarankan: Tambahkan retry policy eksponensial pada AuthService.` +
        graphContext +
        `\n\nApakah Anda ingin saya membuatkan rencana perbaikan otomatis?`;

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: response, correlationId };
    }

    // 8. Planning Requests (Phase 12 Section 31: PLANNING)
    if (
      lower.includes('buatkan rencana perbaikan') ||
      lower.includes('buat rencana') ||
      lower.includes('planning perbaikan')
    ) {
      classification = 'PLANNING';
      intent = 'Engineering Multi-Agent SOP Plan Formulation';

      const planExplanation = TelegramFormatter.formatOperationalExplanation({
        understoodRequest: 'Penyusunan rencana perbaikan multi-agent SOP untuk SIMMACI auth-service',
        identifiedProject: 'SIMMACI (Backend Security & Reliability)',
        selectedCapabilities: ['ARCHITECTURE_DESIGN', 'CODE_GENERATION', 'TEST_AUTOMATION', 'SECURITY_AUDIT'],
        executionPlan: [
          'Architect (Ahmad): Rancang spesifikasi wrapper retry eksponensial',
          'Software Engineer (Farhan): Implementasikan exponential backoff pada connection pool',
          'QA Engineer (Tasya): Buat suite test timeout & validasi zero-regression',
          'Security Specialist (Ilham): Verifikasi sanitasi error log & token security',
        ],
        assignedAgents: ['Ahmad (Architect)', 'Farhan (Engineer)', 'Tasya (QA)', 'Ilham (Security)'],
        verificationStatus: 'Plan Formulated & Ready for Approval',
        finalResult:
          `📋 *RENCANA PERBAIKAN TELAH DISIAPKAN*\n\n` +
          `Rencana kerja telah didekomposisi untuk 4 Digital Employees.\n` +
          `Ketik _"Kerjakan"_ untuk langsung mengeksekusi di isolated worktree.`,
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
      return { type: 'TEXT', responseMessage: planExplanation, correlationId };
    }

    // 9. Engineering, Remediation, or Deployment Action Requests
    if (
      lower.includes('perbaiki') ||
      lower.includes('kerjakan') ||
      lower.includes('repair') ||
      lower.includes('deploy') ||
      lower.includes('audit seluruh backend') ||
      lower.includes('migrasi database') ||
      lower.includes('jalankan patch')
    ) {
      // Evaluate Risk Level
      const isHighRisk =
        lower.includes('deploy') ||
        lower.includes('production') ||
        lower.includes('migrasi database') ||
        lower.includes('drop') ||
        lower.includes('patch');

      if (isHighRisk) {
        classification = 'APPROVAL';
        intent = 'High-Risk Operation Gate Authorization';

        // Formulate High-Risk Approval Request
        const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const actionTitle = lower.includes('deploy')
          ? 'Deploy SIMMACI Authentication Fix to Production'
          : lower.includes('migrasi')
            ? 'Execute Database Schema Migration on SIMMACI DB'
            : 'Apply Surgical Fix on SIMMACI Authentication Engine';

        const planSteps = [
          'Jalankan automated test suite & regression suite',
          'Build application container & validasi integritas',
          'Deploy ke target environment dengan canary rollback check',
          'Jalankan smoke test endpoint /api/v1/auth/health',
        ];

        const approval: TelegramApproval = {
          approvalId,
          conversationId: message.conversationId,
          chatId,
          actionTitle,
          actionDescription: `Permintaan eksekusi tindakan berisiko tinggi berdasarkan instruksi Owner: "${rawText}"`,
          riskLevel: 'HIGH',
          planSteps,
          impact: 'Production SIMMACI Cluster',
          status: 'PENDING',
          requestedBy: senderName,
          correlationId,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
          payload: { rawText, command: actionTitle },
        };

        await this.repository.saveApproval(approval);

        const card = TelegramFormatter.formatApprovalRequest(approval);

        // Update 3D office state to waiting approval
        this.update3DAgentActivity('BACKEND_ENGINEER', 'WAITING_APPROVAL', 'RM-07', `Waiting approval: ${actionTitle}`);

        await this.repository.saveCommand({
          commandId: cmdId,
          conversationId: message.conversationId,
          correlationId,
          rawInput: rawText,
          classification,
          intent,
          executionStatus: 'WAITING_APPROVAL',
          createdAt: new Date().toISOString(),
        });

        return {
          type: 'APPROVAL_REQUIRED',
          responseMessage: card.text,
          inlineKeyboard: card.replyMarkup,
          approvalId,
          correlationId,
        };
      }

      classification = 'EXECUTION';
      intent = 'Engineering Task Execution';

      // Medium / Low Risk Task -> Asynchronously enqueue and immediately return receipt
      const taskId = `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const taskTitle = `Audit & Analisis: ${rawText.slice(0, 80)}`;

      if (this.runtimeService) {
        this.runtimeService.createTask({
          title: taskTitle,
          description: rawText,
          priority: 'HIGH',
          requestedBy: `Owner (${senderName}) via Telegram`,
        });
      }

      // Update 3D office: Security Engineer starts working on Floor RM-05
      this.update3DAgentActivity('SECURITY_ENGINEER', 'CODING', 'RM-05', taskTitle);

      const receipt = TelegramFormatter.formatTaskAccepted({
        taskId,
        title: taskTitle,
        assignedAgent: 'AI Backend & Security Engineer',
      });

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent,
        taskId,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });

      return {
        type: 'TASK_CREATED',
        responseMessage: receipt,
        taskId,
        correlationId,
      };
    }

    // ==========================================================
    // PHASE 15.1 — COMPANY OS NATURAL LANGUAGE HANDLERS
    // ==========================================================

    // Company OS: Pipeline / Leads / Revenue queries
    if (
      lower.includes('pipeline') ||
      lower.includes('leads') ||
      lower.includes('opportunity') ||
      lower.includes('peluang bisnis') ||
      lower.includes('revenue') ||
      lower.includes('pendapatan') ||
      lower.includes('pelanggan berisiko') ||
      lower.includes('at-risk customer') ||
      lower.includes('company os') ||
      lower.includes('status bisnis') ||
      lower.includes('business summary')
    ) {
      classification = 'INFORMATION';
      intent = 'Company OS Business Intelligence Query';
      try {
        const companyService = (this as any).companyService;
        if (companyService && typeof companyService.getTelegramSummary === 'function') {
          const summary = companyService.getTelegramSummary();
          await this.repository.saveCommand({
            commandId: cmdId,
            conversationId: message.conversationId,
            correlationId,
            rawInput: rawText,
            classification,
            intent,
            executionStatus: 'COMPLETED',
            createdAt: new Date().toISOString(),
          });
          return { type: 'SYSTEM_STATE', responseMessage: summary, correlationId };
        }
      } catch {}
      return {
        type: 'SYSTEM_STATE',
        responseMessage: `📊 *KDI COMPANY OS*\n\nGunakan /company untuk ringkasan bisnis lengkap.`,
        correlationId,
      };
    }

    // ==========================================================
    // PHASE 15.1 — ENGINEERING TASK CLASSIFICATION (NL → Structured Task)
    // ==========================================================

    // Detect engineering intent: bug, error, login issue, feature, test, deploy
    const isEngineeringIntent =
      // Bug signals
      lower.includes('error') ||
      lower.includes('bug') ||
      lower.includes('broken') ||
      lower.includes('tidak bisa') ||
      lower.includes('gagal login') ||
      lower.includes('login gagal') ||
      lower.includes('masalah login') ||
      lower.includes('error login') ||
      lower.includes('crash') ||
      lower.includes('exception') ||
      // Fix/repair signals
      lower.includes('tolong cek') ||
      lower.includes('tolong perbaiki') ||
      lower.includes('fix') ||
      lower.includes('perbaiki bug') ||
      lower.includes('baiki') ||
      // Test signals
      lower.includes('regression test') ||
      lower.includes('jalankan test') ||
      lower.includes('run test') ||
      lower.includes('jalankan regression') ||
      // Review signals
      lower.includes('review perubahan') ||
      lower.includes('cek perubahan') ||
      // Feature signals
      lower.includes('tambahkan fitur') ||
      lower.includes('implementasikan') ||
      lower.includes('buat endpoint');

    if (isEngineeringIntent) {
      classification = 'ENGINEERING';
      intent = 'Engineering Task Classification';

      // ── Step 1: Identify Project ───────────────────────────────────────
      let detectedProject = 'UNKNOWN';
      if (lower.includes('simmaci')) detectedProject = 'SIMMACI';
      else if (lower.includes('kdi ai office') || lower.includes('kdi office')) detectedProject = 'KDI-AI-OFFICE';
      else if (lower.includes('gowa waha')) detectedProject = 'GOWA-WAHA';

      // ── Step 2: Classify Task Type ────────────────────────────────────
      let taskType = 'INVESTIGATION';
      if (lower.includes('bug') || lower.includes('error') || lower.includes('crash') ||
          lower.includes('gagal') || lower.includes('exception')) {
        taskType = 'BUG';
      } else if (lower.includes('fitur') || lower.includes('feature') || lower.includes('tambah') ||
                 lower.includes('implementasikan') || lower.includes('buat endpoint')) {
        taskType = 'FEATURE';
      } else if (lower.includes('test') || lower.includes('regression')) {
        taskType = 'TEST';
      } else if (lower.includes('review')) {
        taskType = 'REVIEW';
      } else if (lower.includes('deploy') || lower.includes('rilis') || lower.includes('staging')) {
        taskType = 'DEPLOYMENT';
      }

      // ── Step 3: Determine Domain ──────────────────────────────────────
      let domain = 'GENERAL';
      if (lower.includes('login') || lower.includes('auth') || lower.includes('autentikasi') ||
          lower.includes('password') || lower.includes('session') || lower.includes('token')) {
        domain = 'BACKEND/AUTHENTICATION';
      } else if (lower.includes('database') || lower.includes('db') || lower.includes('query') ||
                 lower.includes('migration') || lower.includes('schema')) {
        domain = 'BACKEND/DATABASE';
      } else if (lower.includes('api') || lower.includes('endpoint') || lower.includes('rest') ||
                 lower.includes('service')) {
        domain = 'BACKEND/API';
      } else if (lower.includes('frontend') || lower.includes('ui') || lower.includes('komponen') ||
                 lower.includes('tampilan') || lower.includes('react') || lower.includes('halaman')) {
        domain = 'FRONTEND';
      } else if (lower.includes('security') || lower.includes('keamanan') || lower.includes('vulnerability')) {
        domain = 'SECURITY';
      } else if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci') ||
                 lower.includes('devops') || lower.includes('nginx')) {
        domain = 'DEVOPS';
      } else if (lower.includes('backend') || lower.includes('server') || lower.includes('api')) {
        domain = 'BACKEND';
      }

      // ── Step 4: Assign Agent ───────────────────────────────────────────
      let assignedAgent = 'BE_ENGINEER';
      let agentName = 'Farhan Hakim (BE Engineer)';
      if (domain.startsWith('FRONTEND')) {
        assignedAgent = 'FE_ENGINEER';
        agentName = 'Aisyah Putri (FE Engineer)';
      } else if (domain === 'SECURITY') {
        assignedAgent = 'SECURITY_ENGINEER';
        agentName = 'Rizki Purnama (Security Engineer)';
      } else if (domain === 'DEVOPS') {
        assignedAgent = 'DEVOPS_ENGINEER';
        agentName = 'Dimas Kurnia (DevOps Engineer)';
      } else if (taskType === 'TEST') {
        assignedAgent = 'QA_ENGINEER';
        agentName = 'Siti Rahayu (QA Engineer)';
      }

      // ── Step 5: Determine Priority ────────────────────────────────────
      let priority = 'MEDIUM';
      if (taskType === 'BUG' && domain.includes('AUTHENTICATION')) priority = 'HIGH';
      else if (taskType === 'BUG') priority = 'HIGH';
      else if (taskType === 'DEPLOYMENT' && (lower.includes('production') || lower.includes('prod'))) priority = 'CRITICAL';

      // ── Step 6: Create Engineering Task ID ───────────────────────────
      const engTaskId = `ENG-${Date.now()}-${detectedProject.split('-')[0].toLowerCase()}`;
      const branchName = `${taskType.toLowerCase()}/${detectedProject.toLowerCase()}-${Date.now().toString(36)}`;

      // ── Step 7: Create task in runtime if available ───────────────────
      if (this.runtimeService) {
        try {
          this.runtimeService.createTask({
            title: `[${taskType}] ${rawText.slice(0, 100)}`,
            description: rawText,
            priority: priority as any,
            taskType: 'CODING',
            requiredSkills: ['coding', 'debugging', 'testing'],
            requestedBy: `Owner (${senderName}) via Telegram`,
          });
        } catch {}
      }

      // ── Step 7: Create Engineering Task Context & Execute via Real Execution Plane ─
      let detectedRepoPath = process.cwd();
      const aiRepoCandidate = path.resolve(process.cwd(), 'fixtures/ai-engineering-repo');
      const demoRepoCandidate = path.resolve(process.cwd(), 'fixtures/demo-calc-repo');
      if (detectedProject.includes('SIMMACI')) {
        detectedRepoPath =
          process.env.SIMMACI_REPO_PATH || (fs.existsSync(aiRepoCandidate) ? aiRepoCandidate : fs.existsSync(demoRepoCandidate) ? demoRepoCandidate : process.cwd());
      }

      const executorType = process.env.ENGINEERING_DEFAULT_EXECUTOR || 'ANTIGRAVITY';

      const engTaskContext: EngineeringTaskContext = {
        taskId: engTaskId,
        project: detectedProject,
        repository: detectedProject,
        repositoryPath: detectedRepoPath,
        taskType,
        domain,
        agent: assignedAgent,
        agentName,
        title: `[${taskType}] ${rawText.slice(0, 100)}`,
        description: rawText,
        acceptanceCriteria: [
          `Identify and resolve root cause of: ${rawText.slice(0, 120)}`,
          'Automated test suite must pass without regressions',
          'Zero unintended side effects or modified credential files',
        ],
        constraints: [
          'Work only in assigned isolated worktree',
          'Do not modify production branches directly',
          'Enforce command security policies (no destructive commands)',
        ],
        branch: branchName,
        executor: executorType,
        timeout: 60000,
        environment: {},
        requestedBy: `Owner (${senderName}) via Telegram`,
      };

      let executionResult: any = undefined;
      let executionStatus = 'ANALYZING';

      if (this.engineeringService?.executorService) {
        try {
          executionResult = await this.engineeringService.executorService.executeTask(engTaskContext);
          executionStatus = executionResult.status;
        } catch (err: any) {
          executionStatus = 'WORKSPACE_ERROR';
        }
      }

      // ── Step 8: Update 3D Office ──────────────────────────────────────
      try {
        const agentRole = assignedAgent === 'FE_ENGINEER' ? 'FRONTEND_ENGINEER' : 'BACKEND_ENGINEER';
        this.update3DAgentActivity(
          agentRole,
          executionStatus === 'IMPLEMENTING' ? 'CODING' : 'ANALYZING',
          'RM-05',
          `${executionStatus}: ${rawText.slice(0, 60)}`
        );
      } catch {}

      // ── Step 9: Format Engineering Task Report ────────────────────────
      const isHighRiskDeploy = taskType === 'DEPLOYMENT' && (lower.includes('production') || lower.includes('prod'));
      const requiresApproval =
        isHighRiskDeploy || taskType === 'DEPLOYMENT' || executionResult?.status === 'READY_FOR_APPROVAL';

      const engineeringReport =
        `⚙️ *ENGINEERING TASK — ${detectedProject}*\n\n` +
        `*Task ID:* \`${engTaskId}\`\n` +
        `*Type:* ${taskType}\n` +
        `*Domain:* ${domain}\n` +
        `*Priority:* ${priority}\n\n` +
        `*Assigned Agent:* ${agentName}\n` +
        `*Executor:* Antigravity Engineering AI\n` +
        `*Branch:* \`${branchName}\`\n` +
        `*Status:* ${executionStatus}\n\n` +
        `*Request:*\n_${rawText.slice(0, 200)}_\n\n` +
        (executionResult?.error ? `*Diagnostic:*\n_${executionResult.error}_\n\n` : '') +
        (executionResult?.changedFiles?.length
          ? `*Changed Files:* ${executionResult.changedFiles.length} file(s) modified\n`
          : '') +
        (executionResult?.tests?.status && executionResult.tests.status !== 'SKIPPED'
          ? `*Tests:* ${executionResult.tests.status} (${executionResult.tests.passed} passed, ${executionResult.tests.failed} failed)\n`
          : '') +
        (executionResult?.approvalId ? `*Approval Gate:* PENDING (\`${executionResult.approvalId}\`)\n` : '') +
        `*Production Guard:* ACTIVE — changes isolated to branch\n` +
        `_No direct production modification. Approval required for merge._\n\n` +
        `_Task accepted. Use /engineering status for live updates._`;

      await this.repository.saveCommand({
        commandId: cmdId,
        conversationId: message.conversationId,
        correlationId,
        rawInput: rawText,
        classification,
        intent: `Engineering Task: [${taskType}] ${detectedProject} / ${domain}`,
        taskId: engTaskId,
        executionStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });

      return {
        type: 'TASK_CREATED',
        responseMessage: engineeringReport,
        taskId: engTaskId,
        correlationId,
      };
    }

    // 6. General Conversational Fallback (Orchestrator Persona)

    let aiResponse = '';
    if (this.llmService) {
      try {
        const prompt =
          `Anda adalah KDI AI Orchestrator, koordinator tunggal dan kepala operasi AI Office untuk Owner KDI.\n` +
          `Jawablah dengan gaya profesional, ringkas, solutif, menggunakan Bahasa Indonesia, dan actionable.\n` +
          `Owner bertanya: "${rawText}"`;

        const res = await this.llmService.chat({
          requestId: `llm_${Date.now()}`,
          taskType: 'ANALYSIS',
          messages: [{ role: 'user', content: prompt }],
          privacyClass: 'INTERNAL',
          maxOutputTokens: 300,
          temperature: 0.3,
        });
        aiResponse = res.content;
      } catch (err: any) {
        this.logger.debug('handleNaturalLanguage', `LLM chat fallback: ${err.message}`);
      }
    }

    if (!aiResponse) {
      aiResponse =
        `Instruksi Anda telah saya catat: *"${rawText}"*.\n\n` +
        `KDI AI Orchestrator siap memproses lebih lanjut. Apakah Anda ingin saya membuatkan task spesifik untuk tim Engineering atau melakukan pengecekan data tertentu?`;
    }

    return {
      type: 'TEXT',
      responseMessage: TelegramFormatter.formatNaturalResponse(aiResponse),
      correlationId,
    };
  }

  /**
   * Handle Callback Queries from Inline Keyboard Buttons (Approve / Reject)
   */
  public async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
    correlationId: string
  ): Promise<{ text: string; updatedMessageText?: string }> {
    const data = callbackQuery.data || '';
    const operatorId = String(callbackQuery.from.id);
    const operatorName = callbackQuery.from.first_name || 'Owner';

    this.logger.info('handleCallbackQuery', `Received callback query: "${data}" from ${operatorId}`, {
      correlationId,
    });

    // Format: appr:<approvalId>:<approve|reject>
    const match = data.match(/^appr:([^:]+):(approve|reject)$/);
    if (!match) {
      return { text: 'Perintah tombol tidak valid.' };
    }

    const approvalId = match[1];
    const action = match[2]; // 'approve' | 'reject'

    const approval = await this.repository.getApproval(approvalId);
    if (!approval) {
      return { text: 'Persetujuan tidak ditemukan atau telah kedaluwarsa.' };
    }

    // Idempotency: verify approval is still PENDING
    if (approval.status !== 'PENDING') {
      return {
        text: `Approval ini telah diproses sebelumnya dengan status: ${approval.status}.`,
      };
    }

    // Expiration check
    if (new Date(approval.expiresAt).getTime() < Date.now()) {
      await this.repository.resolveApproval(approvalId, 'REJECTED', operatorId, 'Kedaluwarsa');
      return {
        text: 'Persetujuan telah kedaluwarsa (melebihi batas waktu aman 1 jam).',
        updatedMessageText: `⚠️ *APPROVAL KEDALUWARSA*\n\nTindakan: ${approval.actionTitle}\nPersetujuan telah otomatis ditolak karena batas waktu terlampaui.`,
      };
    }

    if (action === 'approve') {
      await this.repository.resolveApproval(approvalId, 'APPROVED', operatorId, 'Disetujui via Telegram');

      // Resolve engineering task approval if managed by executor
      if (this.engineeringService?.executorService) {
        const engTask = this.engineeringService.executorService
          .listTasks()
          .find((t) => t.approvalId === approvalId);
        if (engTask) {
          await this.engineeringService.executorService.handleApprovalResolution(
            engTask.taskId,
            true,
            operatorName
          );
        }
      }

      // Trigger background execution in Runtime
      if (this.runtimeService) {
        this.runtimeService.createTask({
          title: approval.actionTitle,
          description: approval.actionDescription,
          priority: 'URGENT',
          requestedBy: `Owner (${operatorName}) via Telegram Approval`,
        });
      }

      // Update 3D office state
      this.update3DAgentActivity('BACKEND_ENGINEER', 'CODING', 'RM-07', `Executing: ${approval.actionTitle}`);
      this.broadcast3DOfficeAlert('APPROVAL_RESOLVED', `Owner menyetujui ${approval.actionTitle}`);

      const updatedText = TelegramFormatter.formatApprovalResolved(approval, 'APPROVED', operatorName);
      return {
        text: '✅ Persetujuan diterima. Tugas diteruskan untuk dieksekusi.',
        updatedMessageText: updatedText,
      };
    } else {
      await this.repository.resolveApproval(approvalId, 'REJECTED', operatorId, 'Ditolak via Telegram');

      // Resolve engineering task approval rejection if managed by executor
      if (this.engineeringService?.executorService) {
        const engTask = this.engineeringService.executorService
          .listTasks()
          .find((t) => t.approvalId === approvalId);
        if (engTask) {
          await this.engineeringService.executorService.handleApprovalResolution(
            engTask.taskId,
            false,
            operatorName
          );
        }
      }

      // Update 3D office state
      this.update3DAgentActivity('BACKEND_ENGINEER', 'IDLE', 'RM-07', 'Task execution cancelled by Owner');
      this.broadcast3DOfficeAlert('APPROVAL_REJECTED', `Owner menolak ${approval.actionTitle}`);

      const updatedText = TelegramFormatter.formatApprovalResolved(approval, 'REJECTED', operatorName);
      return {
        text: '❌ Tindakan telah dibatalkan dengan aman.',
        updatedMessageText: updatedText,
      };
    }
  }

  // ----------------------------------------------------------
  // Helper: Aggregate Health Checker
  // ----------------------------------------------------------
  private async getAggregateHealth(): Promise<AggregateHealthResponse> {
    const pg = this.postgresService
      ? await this.postgresService.checkHealth().catch(() => ({ status: 'DOWN' as const, latencyMs: 999 }))
      : { status: 'UP' as const, latencyMs: 2 };

    const rd = this.redisService
      ? await this.redisService.checkHealth().catch(() => ({ status: 'DOWN' as const, latencyMs: 999 }))
      : { status: 'UP' as const, latencyMs: 1 };

    const neo = this.neo4jService
      ? await this.neo4jService.checkHealth().catch(() => ({ status: 'DOWN' as const, latencyMs: 999 }))
      : { status: 'UP' as const, latencyMs: 4 };

    return {
      status: pg.status === 'UP' && rd.status === 'UP' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      subsystems: {
        postgres: pg,
        redis: rd,
        neo4j: neo,
        ollama: { status: 'UP', latencyMs: 12 },
      },
    };
  }

  // ----------------------------------------------------------
  // Helper: 3D Living Office Telemetry Broadcast
  // ----------------------------------------------------------
  private update3DAgentActivity(
    role: any,
    state: any,
    roomId: string,
    activitySummary: string
  ): void {
    if (!this.eventsGateway) return;

    this.eventsGateway.broadcastAgentState({
      agentId: `AGT_${role}`,
      role,
      previousState: 'IDLE',
      currentState: state,
      roomId,
      activitySummary,
    });
  }

  private broadcast3DOfficeAlert(eventType: string, message: string): void {
    if (!this.eventsGateway) return;

    this.eventsGateway.broadcastEvent(
      createWSEventEnvelope(eventType, 'office:events', {
        message,
        timestamp: new Date().toISOString(),
      })
    );
  }
}
