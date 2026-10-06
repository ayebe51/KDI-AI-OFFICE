// ==========================================================
// services/api/src/engineering/manager/engineering-manager.service.ts
// Phase 17: AI Engineering Manager Unified Core Facade
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { PortfolioService } from './portfolio.service.js';
import { PrioritizationService } from './prioritization.service.js';
import { DependencyGraphService } from './dependency-graph.service.js';
import { WorkloadManagerService } from './workload-manager.service.js';
import { ResourceLockService } from './resource-lock.service.js';
import { BlockerDetectionService } from './blocker-detection.service.js';
import { EngineeringBenchmarkService } from './engineering-benchmark.service.js';
import { Phase18BenchmarkReportGenerator } from './benchmark-report.generator.js';
import {
  TestReliabilityEngine,
  AntigravityOptimizerService,
  AmbiguityResolverService,
  DevOpsPreflightService,
  SelfRepairCoordinatorService,
  Phase19ComparisonGenerator,
  type Phase19ComparisonReport,
} from '../reliability/index.js';
import type {
  BenchmarkSummaryReport,
  EngineeringDailyBrief,
  HumanAttentionItem,
  PortfolioSummary,
  QueuedEngineeringTask,
  QueueTaskStatus,
  TaskPriorityScore,
} from './engineering-manager.types.js';

export interface EnqueueTaskOptions {
  taskId?: string;
  projectSlug: string;
  title: string;
  description: string;
  domain?: 'BACKEND' | 'FRONTEND' | 'QA' | 'SECURITY' | 'DEVOPS' | 'FULLSTACK';
  agentRole?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  taskType?: string;
  dependencies?: string[];
  executor?: string;
  scopeLockKey?: string;
  deadline?: string;
  isProductionCrash?: boolean;
}

@Injectable()
export class EngineeringManagerService {
  private readonly logger = new StructuredLogger('EngineeringManagerService');

  public readonly portfolio: PortfolioService;
  public readonly prioritization: PrioritizationService;
  public readonly dependencies: DependencyGraphService;
  public readonly workload: WorkloadManagerService;
  public readonly locks: ResourceLockService;
  public readonly blockers: BlockerDetectionService;
  public readonly benchmark: EngineeringBenchmarkService;
  public readonly testReliability: TestReliabilityEngine;
  public readonly antigravityOptimizer: AntigravityOptimizerService;
  public readonly ambiguityResolver: AmbiguityResolverService;
  public readonly devopsPreflight: DevOpsPreflightService;
  public readonly selfRepairCoordinator: SelfRepairCoordinatorService;

  private readonly tasks = new Map<string, QueuedEngineeringTask>();
  private isQueuePaused = false;

  constructor(
    @Optional() portfolio?: PortfolioService,
    @Optional() prioritization?: PrioritizationService,
    @Optional() dependencies?: DependencyGraphService,
    @Optional() workload?: WorkloadManagerService,
    @Optional() locks?: ResourceLockService,
    @Optional() blockers?: BlockerDetectionService,
    @Optional() benchmark?: EngineeringBenchmarkService,
    @Optional() testReliability?: TestReliabilityEngine,
    @Optional() antigravityOptimizer?: AntigravityOptimizerService,
    @Optional() ambiguityResolver?: AmbiguityResolverService,
    @Optional() devopsPreflight?: DevOpsPreflightService,
    @Optional() selfRepairCoordinator?: SelfRepairCoordinatorService
  ) {
    this.portfolio = portfolio || new PortfolioService();
    this.prioritization = prioritization || new PrioritizationService(this.portfolio);
    this.dependencies = dependencies || new DependencyGraphService();
    this.workload = workload || new WorkloadManagerService();
    this.locks = locks || new ResourceLockService();
    this.blockers = blockers || new BlockerDetectionService();
    this.benchmark = benchmark || new EngineeringBenchmarkService();
    this.testReliability = testReliability || new TestReliabilityEngine();
    this.antigravityOptimizer = antigravityOptimizer || new AntigravityOptimizerService();
    this.ambiguityResolver = ambiguityResolver || new AmbiguityResolverService();
    this.devopsPreflight = devopsPreflight || new DevOpsPreflightService();
    this.selfRepairCoordinator = selfRepairCoordinator || new SelfRepairCoordinatorService();
  }

  /**
   * Enqueue a new engineering task across projects (§8 & §9)
   */
  public enqueueTask(options: EnqueueTaskOptions): QueuedEngineeringTask {
    const taskId = options.taskId || `ENG-${options.projectSlug.toUpperCase()}-${Date.now().toString(36)}`;
    const domain = options.domain || 'BACKEND';
    const executor = options.executor || 'ANTIGRAVITY';
    const dependencies = options.dependencies || [];

    // 1. Validate project existence
    const project = this.portfolio.getProject(options.projectSlug);
    if (!project) {
      throw new Error(`Project not found in portfolio: ${options.projectSlug}`);
    }

    // 2. Register in Dependency Graph
    const node = this.dependencies.registerNode(taskId, options.projectSlug, dependencies, 'QUEUED');

    // 3. Check Dependency Readiness (§9)
    const readiness = this.dependencies.checkReadiness(taskId);
    const initialStatus: QueueTaskStatus = readiness.isReady ? 'QUEUED' : 'BLOCKED_BY_DEPENDENCY';
    node.status = initialStatus;

    // 4. Calculate Deterministic Priority Score (§7)
    const priorityScore = this.prioritization.calculatePriorityScore({
      taskId,
      projectSlug: options.projectSlug,
      title: options.title,
      taskType: options.taskType || 'FEATURE',
      severity: options.severity || 'MEDIUM',
      isProductionCrash: options.isProductionCrash,
      dependentsCount: this.dependencies.getDependentsCount(taskId),
      isBlockedByDependency: !readiness.isReady,
      deadline: options.deadline,
    });

    // 5. Intelligent Agent Assignment Recommendation (§13)
    const assignment = this.workload.findBestAgentForTask(
      taskId,
      domain,
      options.agentRole
    );

    const queuedTask: QueuedEngineeringTask = {
      taskId,
      projectSlug: options.projectSlug,
      title: options.title,
      description: options.description,
      domain,
      agentRole: assignment?.agentRole || options.agentRole || 'BACKEND_ENGINEER',
      assignedAgentName: assignment?.agentName,
      priorityScore,
      dependencies,
      dependents: [],
      status: initialStatus,
      executor,
      scopeLockKey: options.scopeLockKey,
      deadline: options.deadline,
      enqueuedAt: new Date().toISOString(),
      attemptsCount: 0,
    };

    this.tasks.set(taskId, queuedTask);

    // Record decision (§47)
    this.blockers.recordDecision(
      'ASSIGNMENT',
      `Enqueued task ${taskId} (${queuedTask.status}) with priority ${priorityScore.totalScore} assigned to ${queuedTask.assignedAgentName || 'pool'}`,
      [taskId],
      { project: options.projectSlug, priorityScore: priorityScore.totalScore, readiness }
    );

    // Update project signals
    this.syncProjectSignals(options.projectSlug);

    this.logger.info(
      'enqueueTask',
      `Enqueued task ${taskId} [${options.projectSlug}] Status: ${queuedTask.status}, Score: ${priorityScore.totalScore}`
    );

    return queuedTask;
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): QueuedEngineeringTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * List tasks with optional project and status filters (§5)
   */
  public listTasks(filter?: {
    projectSlug?: string;
    status?: QueueTaskStatus;
  }): QueuedEngineeringTask[] {
    let list = Array.from(this.tasks.values());
    if (filter?.projectSlug) {
      const slug = filter.projectSlug.toLowerCase();
      list = list.filter((t) => t.projectSlug.toLowerCase() === slug);
    }
    if (filter?.status) {
      list = list.filter((t) => t.status === filter.status);
    }
    return this.prioritization.sortTasksByPriority(list);
  }

  /**
   * Re-evaluate and reorder all queued tasks (§7)
   */
  public reorderQueue(): QueuedEngineeringTask[] {
    for (const task of this.tasks.values()) {
      const readiness = this.dependencies.checkReadiness(task.taskId);
      if (!readiness.isReady && task.status === 'QUEUED') {
        task.status = 'BLOCKED_BY_DEPENDENCY';
      } else if (readiness.isReady && task.status === 'BLOCKED_BY_DEPENDENCY') {
        task.status = 'QUEUED';
      }

      task.priorityScore = this.prioritization.calculatePriorityScore({
        taskId: task.taskId,
        projectSlug: task.projectSlug,
        title: task.title,
        dependentsCount: this.dependencies.getDependentsCount(task.taskId),
        isBlockedByDependency: task.status === 'BLOCKED_BY_DEPENDENCY',
        deadline: task.deadline,
      });
    }

    const sorted = this.listTasks();
    this.blockers.recordDecision(
      'REORDER_QUEUE',
      `Reordered ${sorted.length} engineering tasks across all projects`,
      sorted.map((t) => t.taskId),
      { topTaskId: sorted[0]?.taskId }
    );
    return sorted;
  }

  /**
   * Retrieve next executable task satisfying dependencies, capacity, and scope locks (§8, §11, §25)
   */
  public getNextExecutableTask(): {
    task: QueuedEngineeringTask | null;
    lockAcquired: boolean;
    reason?: string;
  } {
    if (this.isQueuePaused) {
      return { task: null, lockAcquired: false, reason: 'Queue is currently paused' };
    }

    const candidateTasks = this.listTasks().filter((t) => t.status === 'QUEUED');

    for (const task of candidateTasks) {
      // 1. Dependency check
      const readiness = this.dependencies.checkReadiness(task.taskId);
      if (!readiness.isReady) {
        task.status = 'BLOCKED_BY_DEPENDENCY';
        continue;
      }

      // 2. Agent capacity check (§11 & §12)
      const agentRole = task.agentRole;
      const agentProfile = this.workload.getAgent(agentRole);
      if (agentProfile && agentProfile.activeTaskIds.length >= agentProfile.maxConcurrentTasks) {
        this.logger.debug(
          'getNextExecutableTask',
          `Skipping task ${task.taskId}: assigned role ${agentRole} is at capacity (${agentProfile.activeTaskIds.length}/${agentProfile.maxConcurrentTasks})`
        );
        continue;
      }

      // 3. Scope Lock check (§25 & §26)
      const lockKey = task.scopeLockKey || `repo:${task.projectSlug}`;
      const lockRes = this.locks.acquireLock(
        lockKey,
        task.taskId,
        task.projectSlug,
        `Active execution of ${task.title}`
      );

      if (!lockRes.acquired) {
        this.logger.debug(
          'getNextExecutableTask',
          `Skipping task ${task.taskId}: ${lockRes.reason}`
        );
        continue;
      }

      // 4. Mark Running and Assign Agent
      task.status = 'RUNNING';
      task.startedAt = new Date().toISOString();
      if (agentProfile) {
        this.workload.assignTask(agentProfile.agentId, task.taskId);
      }
      this.syncProjectSignals(task.projectSlug);

      return { task, lockAcquired: true };
    }

    return { task: null, lockAcquired: false, reason: 'No executable tasks ready in queue' };
  }

  /**
   * Complete task lifecycle and unblock downstream dependents (§9 & §10)
   */
  public completeTask(
    taskId: string,
    success: boolean,
    durationMs = 1500,
    requiredApproval = false,
    errorMessage?: string
  ): { task: QueuedEngineeringTask; unblockedTasks: string[] } {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.completedAt = new Date().toISOString();
    task.attemptsCount += 1;

    // 1. Release locks and agent capacity (§11 & §26)
    this.locks.releaseAllForTask(taskId);
    this.workload.releaseTask(taskId);

    let unblockedTasks: string[] = [];

    if (success) {
      task.status = 'COMPLETED';
      // Unblock downstream dependents
      const { newlyUnblockedTaskIds } = this.dependencies.updateTaskStatus(taskId, 'COMPLETED');
      unblockedTasks = newlyUnblockedTaskIds;

      for (const unblockedId of newlyUnblockedTaskIds) {
        const depTask = this.tasks.get(unblockedId);
        if (depTask) {
          depTask.status = 'QUEUED';
          // Re-score task now that it's unblocked
          depTask.priorityScore = this.prioritization.calculatePriorityScore({
            taskId: depTask.taskId,
            projectSlug: depTask.projectSlug,
            title: depTask.title,
            isBlockedByDependency: false,
          });
          this.syncProjectSignals(depTask.projectSlug);
        }
      }

      this.blockers.recordDecision(
        'UNBLOCK_DEPENDENCY',
        `Task ${taskId} completed successfully. Unblocked: [${unblockedTasks.join(', ')}]`,
        unblockedTasks,
        { completedTaskId: taskId }
      );
    } else {
      task.status = 'FAILED';
      this.dependencies.updateTaskStatus(taskId, 'FAILED');

      // Check for repeated failure escalation (§21 & §27)
      if (task.attemptsCount >= 3) {
        const blk = this.blockers.registerBlocker(
          'REPEATED_FAILURE',
          'CRITICAL',
          task.projectSlug,
          [task.taskId],
          `Task ${task.taskId} failed after ${task.attemptsCount} attempts: ${errorMessage || 'Unknown error'}`,
          'Escalate to Human Owner for investigation'
        );
        this.blockers.escalateToHuman(blk.id, 'Task reached 3 failure limit');
      }
    }

    // Record benchmark metric (§36)
    this.benchmark.recordTaskCompletion({
      taskId,
      projectSlug: task.projectSlug,
      durationMs,
      attemptsCount: task.attemptsCount,
      status: task.status,
      requiredClarification: false,
      requiredManualRepair: !success,
      requiredApproval,
      autonomousCompletion: success && !requiredApproval,
      completedAt: task.completedAt,
    });

    this.syncProjectSignals(task.projectSlug);
    return { task, unblockedTasks };
  }

  /**
   * Pause / Resume Queue (§8)
   */
  public pauseQueue(): boolean {
    this.isQueuePaused = true;
    this.logger.warn('pauseQueue', 'Engineering Task Queue paused by Manager/Owner');
    return true;
  }

  public resumeQueue(): boolean {
    this.isQueuePaused = false;
    this.logger.info('resumeQueue', 'Engineering Task Queue resumed');
    return true;
  }

  public isPaused(): boolean {
    return this.isQueuePaused;
  }

  private syncProjectSignals(projectSlug: string): void {
    const projectTasks = this.listTasks({ projectSlug });
    const activeTasks = projectTasks.filter((t) => t.status === 'RUNNING').length;
    const queuedTasks = projectTasks.filter((t) => t.status === 'QUEUED').length;
    const blockedTasks = projectTasks.filter((t) => t.status === 'BLOCKED_BY_DEPENDENCY').length;
    const failedTasks = projectTasks.filter((t) => t.status === 'FAILED').length;
    const repeatedFailures = projectTasks.filter((t) => t.attemptsCount >= 3).length;

    this.portfolio.updateProjectSignals(projectSlug, {
      activeTasks,
      queuedTasks,
      blockedTasks,
      failedTasks,
      repeatedFailures,
    });
  }

  // ==========================================================
  // TELEGRAM & NATURAL LANGUAGE REPORTING (§15, §16, §17, §30, §31, §45)
  // ==========================================================

  /**
   * Compact Telegram Portfolio Status (§31)
   */
  public getPortfolioTelegramStatus(): string {
    const summary = this.portfolio.getPortfolioSummary();
    const sorted = this.listTasks();
    const topTask = sorted.find((t) => t.status === 'RUNNING' || t.status === 'QUEUED');
    const topPriorityText = topTask
      ? `${topTask.projectSlug.toUpperCase()}: ${topTask.title}`
      : 'None pending';

    const workload = this.workload.getWorkloadSummary();

    return (
      `*KDI ENGINEERING PORTFOLIO*\n\n` +
      `*Active:* ${summary.totalActiveTasks} | ` +
      `*Queued:* ${summary.totalQueuedTasks} | ` +
      `*Blocked:* ${summary.totalBlockedTasks} | ` +
      `*Awaiting Approval:* ${summary.totalAwaitingApproval}\n` +
      `*Agents:* ${workload.activeAgentsCount}/${workload.totalAgents} active | ` +
      `*Critical Projects:* ${summary.criticalProjectsCount}\n\n` +
      `*Top Priority:*\n${topPriorityText}\n\n` +
      `*Portfolio Health:* *${summary.portfolioHealth}*`
    );
  }

  /**
   * Human Attention Center items (§16)
   */
  public getHumanAttentionItems(
    pendingApprovals: Array<{ taskId: string; projectSlug: string; title: string }> = []
  ): HumanAttentionItem[] {
    const activeTasks = Array.from(this.tasks.values());
    this.blockers.scanTasksForBlockers(activeTasks);
    return this.blockers.generateHumanAttentionItems(activeTasks, pendingApprovals);
  }

  /**
   * Format Human Attention Telegram Message (§16 & §45)
   */
  public formatAttentionTelegramMessage(
    pendingApprovals: Array<{ taskId: string; projectSlug: string; title: string }> = []
  ): string {
    const items = this.getHumanAttentionItems(pendingApprovals);
    if (items.length === 0) {
      return (
        `✅ *HUMAN ATTENTION: ALL CLEAR*\n\n` +
        `Semua pekerjaan engineering berjalan lancar tanpa blocker atau eskalasi.\n` +
        `• 0 approval tertunda\n` +
        `• 0 repeated failures\n` +
        `• 0 critical blockers`
      );
    }

    let text = `🚨 *HUMAN ATTENTION REQUIRED (${items.length})*\n\n`;
    items.forEach((item, index) => {
      text += `${index + 1}. *[${item.projectSlug.toUpperCase()}]* ${item.title}\n   👉 \`${item.actionPrompt}\`\n\n`;
    });
    return text.trim();
  }

  /**
   * Engineering Manager Daily Brief (§17)
   */
  public generateDailyBrief(): EngineeringDailyBrief {
    const summary = this.portfolio.getPortfolioSummary();
    const sorted = this.listTasks();
    const activeBlockers = this.blockers.listActiveBlockers();
    const attentionItems = this.getHumanAttentionItems();

    // 1. What Happened
    const completedTasks = sorted.filter((t) => t.status === 'COMPLETED');
    const whatHappened: string[] = [];
    if (completedTasks.length > 0) {
      completedTasks.slice(0, 3).forEach((t) => {
        whatHappened.push(`Completed ${t.taskId} [${t.projectSlug.toUpperCase()}]: ${t.title}`);
      });
    } else {
      whatHappened.push('Active sprint cycle initialized with multi-project queues');
    }

    // 2. What Is At Risk
    const whatIsAtRisk: string[] = [];
    const blockedTasks = sorted.filter((t) => t.status === 'BLOCKED_BY_DEPENDENCY');
    if (blockedTasks.length > 0) {
      whatIsAtRisk.push(`${blockedTasks.length} task(s) currently blocked by dependencies`);
    }
    const failedTasks = sorted.filter((t) => t.status === 'FAILED');
    if (failedTasks.length > 0) {
      whatIsAtRisk.push(`${failedTasks.length} task(s) encountered execution failures`);
    }
    if (whatIsAtRisk.length === 0) {
      whatIsAtRisk.push('Zero critical risk flags detected across project portfolio');
    }

    // 3. What Needs Human Attention
    const whatNeedsHumanAttention: string[] = attentionItems.map((a) => `${a.title} (${a.actionPrompt})`);
    if (whatNeedsHumanAttention.length === 0) {
      whatNeedsHumanAttention.push('All routines automated under boundary; human approval not currently pending');
    }

    // 4. Suggested Priority
    const executable = sorted.filter((t) => t.status === 'QUEUED');
    const suggestedPriority: string[] = executable.slice(0, 3).map((t, idx) => {
      return `#${idx + 1} [${t.projectSlug.toUpperCase()}] ${t.title} (Score: ${t.priorityScore.totalScore})`;
    });
    if (suggestedPriority.length === 0) {
      suggestedPriority.push('Queue empty or waiting for dependency completion');
    }

    return {
      generatedAt: new Date().toISOString(),
      whatHappened,
      whatIsAtRisk,
      whatNeedsHumanAttention,
      suggestedPriority,
      portfolioHealth: summary.portfolioHealth,
    };
  }

  public formatDailyBriefTelegramMessage(): string {
    const brief = this.generateDailyBrief();
    return (
      `📋 *ENGINEERING MANAGER DAILY BRIEF*\n` +
      `*Health:* *${brief.portfolioHealth}*\n\n` +
      `*1. WHAT HAPPENED:*\n` +
      brief.whatHappened.map((w) => `• ${w}`).join('\n') +
      `\n\n*2. WHAT IS AT RISK:*\n` +
      brief.whatIsAtRisk.map((r) => `• ${r}`).join('\n') +
      `\n\n*3. WHAT NEEDS HUMAN ATTENTION:*\n` +
      brief.whatNeedsHumanAttention.map((a) => `• ${a}`).join('\n') +
      `\n\n*4. SUGGESTED PRIORITY:*\n` +
      brief.suggestedPriority.map((p) => `• ${p}`).join('\n')
    );
  }

  /**
   * Natural Language Intent Dispatcher for Engineering Manager queries (§30 & §45)
   */
  public answerManagerQuery(rawQuery: string): string {
    const q = rawQuery.toLowerCase().trim();

    // 1. "Prioritaskan semua pekerjaan" / "Prioritaskan"
    if (q.includes('prioritaskan') || q.includes('reorder') || q.includes('prioritas')) {
      const sorted = this.reorderQueue();
      const explanations = this.prioritization.explainPriorityOrder(sorted);
      return (
        `🎯 *HASIL PRIORITISASI DETERMINISTIK*\n\n` +
        (explanations.length > 0
          ? explanations.slice(0, 5).join('\n')
          : 'Tidak ada task dalam antrean engineering.')
      );
    }

    // 2. "Status seluruh project" / "portfolio"
    if (q.includes('status seluruh project') || q.includes('portfolio') || q.includes('semua project')) {
      return this.getPortfolioTelegramStatus();
    }

    // 3. "Apa yang sedang dikerjakan?" / "active"
    if (q.includes('sedang dikerjakan') || q.includes('active task') || q.includes('apa yang aktif')) {
      const running = this.listTasks({ status: 'RUNNING' });
      if (running.length === 0) {
        return `ℹ️ *Tidak ada task yang sedang berjalan saat ini.* Ketik \`/engineering run-top\` untuk memulai task teratas.`;
      }
      return (
        `⚡ *SEDANG DIKERJAKAN (${running.length})*\n\n` +
        running
          .map((r) => `• [${r.projectSlug.toUpperCase()}] \`${r.taskId}\`: ${r.title}\n  Agent: ${r.assignedAgentName || r.agentRole}`)
          .join('\n\n')
      );
    }

    // 4. "Kenapa <project> tertunda?"
    if (q.includes('kenapa') && (q.includes('tertunda') || q.includes('delay') || q.includes('blocked'))) {
      const projects = this.portfolio.listProjects();
      const matched = projects.find((p) => q.includes(p.slug) || q.includes(p.name.toLowerCase()));
      if (matched) {
        const blk = this.blockers.listActiveBlockers().filter((b) => b.projectSlug === matched.slug);
        return (
          `🔍 *STATUS PENUNDAAN [${matched.name.toUpperCase()}]*\n\n` +
          `• Health: *${matched.health}* (Score: ${matched.signals.healthScore}/100)\n` +
          `• Blocked Tasks: ${matched.signals.blockedTasks}\n` +
          `• Repeated Failures: ${matched.signals.repeatedFailures}\n\n` +
          (blk.length > 0
            ? `*Penyebab Terdeteksi:*\n` + blk.map((b) => `• [${b.type}] ${b.reason}`).join('\n')
            : `_Tidak ada blocker fatal. Menunggu giliran eksekusi atau kapasitas agent._`)
        );
      }
    }

    // 5. "Task mana yang blocked?"
    if (q.includes('task mana yang blocked') || q.includes('blocked') || q.includes('terhambat')) {
      const blocked = this.listTasks({ status: 'BLOCKED_BY_DEPENDENCY' });
      if (blocked.length === 0) {
        return `✅ *Tidak ada task yang berstatus BLOCKED saat ini.*`;
      }
      return (
        `🛑 *TASK TERHAMBAT (${blocked.length})*\n\n` +
        blocked
          .map(
            (b) =>
              `• [${b.projectSlug.toUpperCase()}] \`${b.taskId}\`: ${b.title}\n  Menunggu: [${b.dependencies.join(', ')}]`
          )
          .join('\n\n')
      );
    }

    // 6. "Siapa yang sedang sibuk?" / workload
    if (q.includes('siapa yang sedang sibuk') || q.includes('workload') || q.includes('kapasitas')) {
      const w = this.workload.getWorkloadSummary();
      return (
        `👥 *UTILISASI WORKFORCE ENGINEERING*\n\n` +
        `Rata-rata utilisasi: *${w.averageUtilization}%* (${w.activeAgentsCount}/${w.totalAgents} agent aktif)\n\n` +
        w.agents
          .map(
            (a) =>
              `• *${a.name}* (${a.role}): ${a.activeTaskIds.length}/${a.maxConcurrentTasks} tasks (${a.utilizationPercentage}% load - *${a.availabilityStatus}*)`
          )
          .join('\n')
      );
    }

    // 7. "Apa yang membutuhkan perhatian saya?" / attention
    if (q.includes('perhatian saya') || q.includes('attention') || q.includes('butuh perhatian')) {
      return this.formatAttentionTelegramMessage();
    }

    // 8. "Kerjakan yang paling penting dulu" / run-top
    if (q.includes('paling penting') || q.includes('run-top') || q.includes('kerjakan')) {
      const next = this.getNextExecutableTask();
      if (next.task) {
        return (
          `🚀 *MEMULAI TASK TERPENTING*\n\n` +
          `• Task: \`${next.task.taskId}\` [${next.task.projectSlug.toUpperCase()}]\n` +
          `• Title: ${next.task.title}\n` +
          `• Priority Score: *${next.task.priorityScore.totalScore}*\n` +
          `• Agent: ${next.task.assignedAgentName || next.task.agentRole}\n` +
          `• Lock: \`${next.task.scopeLockKey || 'repo:' + next.task.projectSlug}\` (Acquired)\n\n` +
          `_Task dialihkan ke antrean eksekusi Antigravity._`
        );
      } else {
        return `ℹ️ *Tidak dapat memulai task:* ${next.reason || 'Tidak ada task yang siap dieksekusi.'}`;
      }
    }

    // 9. Benchmark exit report & autonomy stats (§39 & §50)
    if (q.includes('phase 19') || q.includes('reliability') || q.includes('optimasi') || q.includes('perbandingan')) {
      return this.generatePhase19ComparisonReport();
    }

    if (q.includes('benchmark') || q.includes('autonomy') || q.includes('laporan benchmark')) {
      return this.generateBenchmarkExitReport();
    }

    // Fallback: Daily Brief
    return this.formatDailyBriefTelegramMessage();
  }

  /**
   * Phase 18: Retrieve deterministic summary report (§38, §39, §50)
   */
  public getBenchmarkReport(windowDays = 7): BenchmarkSummaryReport {
    return this.benchmark.getPhase18SummaryReport(windowDays);
  }

  /**
   * Phase 18: Generate standardized Real-World Benchmark Exit Report (§50)
   */
  public generateBenchmarkExitReport(windowDays = 7): string {
    const report = this.benchmark.getPhase18SummaryReport(windowDays);
    return Phase18BenchmarkReportGenerator.generateExitReport(report);
  }

  /**
   * Phase 18: Generate detailed Markdown Report (§39)
   */
  public generateBenchmarkMarkdownReport(windowDays = 7): string {
    const report = this.benchmark.getPhase18SummaryReport(windowDays);
    return Phase18BenchmarkReportGenerator.generateMarkdownReport(report);
  }

  /**
   * Phase 19: Generate standardized Reliability Optimization Report (§52)
   */
  public generatePhase19ComparisonReport(
    phase18Report?: BenchmarkSummaryReport,
    phase19Report?: BenchmarkSummaryReport
  ): string {
    const p18 = phase18Report || this.benchmark.getPhase18SummaryReport(7);
    const p19 = phase19Report || this.benchmark.getPhase18SummaryReport(7);
    const comp = Phase19ComparisonGenerator.calculateComparison(p18, p19);
    return Phase19ComparisonGenerator.generateReportText(comp);
  }

  /**
   * Phase 19: Retrieve Phase 19 Comparison Data (§35)
   */
  public getPhase19Comparison(
    phase18Report?: BenchmarkSummaryReport,
    phase19Report?: BenchmarkSummaryReport
  ): Phase19ComparisonReport {
    const p18 = phase18Report || this.benchmark.getPhase18SummaryReport(7);
    const p19 = phase19Report || this.benchmark.getPhase18SummaryReport(7);
    return Phase19ComparisonGenerator.calculateComparison(p18, p19);
  }
}


