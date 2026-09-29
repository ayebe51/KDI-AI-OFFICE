// ==========================================================
// services/api/src/runtime/engine/ai.manager.ts
// AI Manager: Central Request Normalizer, Risk Gatekeeper & Supervisor
// ==========================================================

import type {
  CanonicalTask,
  TaskType,
  TaskPriority,
  RiskLevel,
  PrivacyClass,
  AgentSkill,
  ModelCapability,
} from '@kdi/types';
import { AgentRuntime } from './agent.runtime.js';
import { StructuredLogger } from '@kdi/shared';

export interface InboundTaskRequest {
  title: string;
  description: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  riskLevel?: RiskLevel;
  requiredSkills?: AgentSkill[];
  requiredCapabilities?: ModelCapability[];
  dependencies?: string[];
  privacyClass?: PrivacyClass;
  requestedBy?: string;
  projectId?: string;
  timeoutMs?: number;
  approvalRequired?: boolean;
  context?: string;
}

export class AIManager {
  private readonly logger = new StructuredLogger('AIManager');

  constructor(private readonly runtime: AgentRuntime) {}

  /**
   * AI Manager Request Ingestion Flow
   */
  public handleRequest(req: InboundTaskRequest): CanonicalTask {
    this.logger.info('handleRequest', `Ingesting new request: "${req.title}"`);

    // 1. Task Normalization
    const normalized = this.normalizeTask(req);

    // 2. Risk & Governance Evaluation
    const riskAssessment = this.evaluateRisk(normalized);
    normalized.riskLevel = riskAssessment.riskLevel;
    normalized.approvalRequired = riskAssessment.approvalRequired;

    // 3. Dispatch to Agent Runtime
    return this.runtime.submitTask(normalized);
  }

  /**
   * Approve a task currently in WAITING_APPROVAL
   */
  public approveTask(taskId: string, approvedBy = 'Human Operator'): boolean {
    const task = this.runtime.getTask(taskId);
    if (!task || task.status !== 'WAITING_APPROVAL') {
      return false;
    }

    this.logger.info('approveTask', `Task ${taskId} approved by ${approvedBy}. Re-enqueuing.`);
    task.approvalRequired = false;
    task.status = 'QUEUED';
    this.runtime.queue.enqueue(task);
    this.runtime.eventEmitter.emitTaskEvent('task.queued', task, { approvedBy });
    return true;
  }

  /**
   * Reject a task currently in WAITING_APPROVAL
   */
  public rejectTask(taskId: string, reason = 'Rejected by human operator'): boolean {
    const task = this.runtime.getTask(taskId);
    if (!task || task.status !== 'WAITING_APPROVAL') {
      return false;
    }

    this.logger.warn('rejectTask', `Task ${taskId} rejected: ${reason}`);
    task.status = 'CANCELLED';
    task.failureReason = reason;
    this.runtime.eventEmitter.emitTaskEvent('task.cancelled', task, { reason });
    return true;
  }

  private normalizeTask(req: InboundTaskRequest): CanonicalTask {
    const taskId = `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const taskType: TaskType = req.taskType || this.inferTaskType(req.title, req.description);
    const requiredSkills: AgentSkill[] = req.requiredSkills || this.inferSkills(taskType);
    const requiredCapabilities: ModelCapability[] = req.requiredCapabilities || this.inferCapabilities(taskType);

    const dependencies = (req.dependencies || []).map((depId) => ({
      taskId,
      dependsOnTaskId: depId,
      required: true,
      failurePolicy: 'BLOCK' as const,
    }));

    return {
      taskId,
      projectId: req.projectId || 'PRJ-DEFAULT',
      title: req.title,
      description: req.description,
      taskType,
      priority: req.priority || 'NORMAL',
      riskLevel: req.riskLevel || 'LOW',
      status: 'CREATED',
      requestedBy: req.requestedBy || 'SYSTEM',
      requiredSkills,
      requiredCapabilities,
      dependencies,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      timeoutMs: req.timeoutMs || 60_000,
      approvalRequired: req.approvalRequired ?? false,
      context: req.context,
      privacyClass: req.privacyClass || 'INTERNAL',
    };
  }

  private evaluateRisk(task: CanonicalTask): { riskLevel: RiskLevel; approvalRequired: boolean } {
    let riskLevel: RiskLevel = task.riskLevel || 'LOW';
    let approvalRequired = task.approvalRequired;

    // High risk triggers
    if (task.taskType === 'SECURITY' || task.title.toLowerCase().includes('delete') || task.title.toLowerCase().includes('drop')) {
      riskLevel = 'HIGH';
      approvalRequired = true;
    } else if (task.priority === 'URGENT' && task.taskType === 'CODING') {
      riskLevel = 'MEDIUM';
    }

    return { riskLevel, approvalRequired };
  }

  private inferTaskType(title: string, description: string): TaskType {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('test') || text.includes('unit test') || text.includes('spec')) return 'TESTING';
    if (text.includes('code') || text.includes('implement') || text.includes('fix') || text.includes('bug')) return 'CODING';
    if (text.includes('arch') || text.includes('design') || text.includes('adr')) return 'PLANNING';
    if (text.includes('security') || text.includes('cve') || text.includes('audit')) return 'SECURITY';
    if (text.includes('doc') || text.includes('guide') || text.includes('readme')) return 'DOCUMENTATION';
    if (text.includes('research') || text.includes('explore') || text.includes('investigate')) return 'RESEARCH';
    return 'ANALYSIS';
  }

  private inferSkills(taskType: TaskType): AgentSkill[] {
    switch (taskType) {
      case 'CODING': return ['coding', 'debugging'];
      case 'TESTING': return ['testing'];
      case 'PLANNING': return ['planning', 'architecture'];
      case 'SECURITY': return ['security', 'review'];
      case 'DOCUMENTATION': return ['documentation'];
      case 'RESEARCH': return ['research', 'analysis'];
      case 'REVIEW': return ['review'];
      default: return ['analysis'];
    }
  }

  private inferCapabilities(taskType: TaskType): ModelCapability[] {
    switch (taskType) {
      case 'CODING': return ['TEXT', 'CODE'];
      case 'TESTING': return ['TEXT', 'FAST'];
      case 'PLANNING': return ['TEXT', 'REASONING'];
      case 'SECURITY': return ['TEXT', 'REASONING'];
      default: return ['TEXT'];
    }
  }
}
