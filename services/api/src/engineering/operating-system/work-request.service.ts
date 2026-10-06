// ==========================================================
// services/api/src/engineering/operating-system/work-request.service.ts
// Phase 16: Universal Work Request Lifecycle & Execution Gateway
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { TaskIntelligenceService } from './task-intelligence.service.js';
import { MultiAgentHandoffService } from './multi-agent-handoff.service.js';
import { EngineeringMemoryService } from './engineering-memory.service.js';
import { EngineeringAnalyticsService } from './engineering-analytics.service.js';
import type {
  WorkRequest,
  WorkRequestStatus,
} from './engineering-os.types.js';
import type {
  EngineeringExecutionResult,
  EngineeringTaskContext,
} from '../execution/engineering-execution.types.js';
import type { EngineeringExecutorService } from '../execution/engineering-executor.service.js';

@Injectable()
export class WorkRequestService {
  private readonly logger = new StructuredLogger('WorkRequestService');
  private readonly requests = new Map<string, WorkRequest>();
  private readonly storageDir: string;

  constructor(
    private readonly intelligence: TaskIntelligenceService,
    private readonly handoffService: MultiAgentHandoffService,
    private readonly memory: EngineeringMemoryService,
    private readonly analytics: EngineeringAnalyticsService,
    @Optional() customStorageDir?: string
  ) {
    this.storageDir =
      customStorageDir ||
      path.resolve(process.cwd(), '.worktrees', 'control-plane', 'work-requests');
    this.ensureStorageDir();
    this.loadPersistedRequests();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private loadPersistedRequests(): void {
    try {
      if (!fs.existsSync(this.storageDir)) return;
      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storageDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const req: WorkRequest = JSON.parse(raw);
          this.requests.set(req.id, req);
        }
      }
      this.logger.info(
        'loadPersistedRequests',
        `Loaded ${this.requests.size} work requests from ${this.storageDir}`
      );
    } catch (err: any) {
      this.logger.warn('loadPersistedRequests', `Error loading work requests: ${err.message}`);
    }
  }

  private persistRequest(req: WorkRequest): void {
    try {
      this.ensureStorageDir();
      const filePath = path.join(this.storageDir, `${req.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(req, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.warn('persistRequest', `Failed to persist request ${req.id}: ${err.message}`);
    }
  }

  /**
   * Create structured work request from user raw input (§5)
   */
  public async createWorkRequest(
    rawText: string,
    requester = 'Ayub',
    options?: { project?: string; dependsOn?: string[] }
  ): Promise<WorkRequest> {
    const analysis = this.intelligence.interpretWorkRequest(rawText);
    const now = new Date().toISOString();
    const reqId = `REQ-${analysis.projectProfile.slug.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const taskId = `ENG-${analysis.projectProfile.slug.toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const status: WorkRequestStatus = analysis.needsClarification
      ? 'NEEDS_CLARIFICATION'
      : 'RECEIVED';

    const workReq: WorkRequest = {
      id: reqId,
      requester,
      project: analysis.projectProfile.name,
      repositoryPath: analysis.projectProfile.repositoryPath,
      description: rawText,
      type: analysis.type,
      priority: analysis.priority,
      domain: analysis.domain,
      assignedAgent: analysis.assignedAgent,
      executor: analysis.executor,
      acceptanceCriteria: analysis.plan.acceptanceCriteria,
      status,
      autonomyLevel: 3, // Level 3 default (§20)
      plan: analysis.plan,
      taskId: analysis.needsClarification ? undefined : taskId,
      dependsOn: options?.dependsOn || [],
      clarificationQuestions: analysis.clarificationQuestions,
      createdAt: now,
      updatedAt: now,
    };

    if (options?.dependsOn && options.dependsOn.length > 0) {
      this.handoffService.registerDependency(reqId, options.dependsOn);
    }

    this.requests.set(reqId, workReq);
    this.persistRequest(workReq);

    this.logger.info(
      'createWorkRequest',
      `Created WorkRequest ${reqId} for ${workReq.project} (Status: ${workReq.status})`
    );

    return workReq;
  }

  /**
   * Execute work request through real engineering execution pipeline (§4, §12, §23)
   */
  public async executeWorkRequest(
    requestId: string,
    executorService: EngineeringExecutorService
  ): Promise<{ workRequest: WorkRequest; executionResult?: EngineeringExecutionResult }> {
    const req = this.requests.get(requestId);
    if (!req) {
      throw new Error(`WorkRequest ${requestId} not found`);
    }

    if (req.status === 'NEEDS_CLARIFICATION') {
      return { workRequest: req };
    }

    // 1. Check Task Dependencies (§24)
    if (req.dependsOn && req.dependsOn.length > 0) {
      const blockers = this.handoffService.checkDependencyBlockers(req.id, (parentId) => {
        const parent = this.requests.get(parentId);
        return !!parent && (parent.status === 'COMMITTED' || parent.status === 'READY_FOR_DEPLOY');
      });

      if (blockers.isBlocked) {
        req.status = 'BLOCKED';
        req.updatedAt = new Date().toISOString();
        this.persistRequest(req);
        this.logger.warn(
          'executeWorkRequest',
          `WorkRequest ${req.id} is BLOCKED waiting on [${blockers.blockedBy.join(', ')}]`
        );
        return { workRequest: req };
      }
    }

    // 2. Prepare Engineering Task Context
    req.status = 'EXECUTING';
    req.updatedAt = new Date().toISOString();
    this.persistRequest(req);

    const context: EngineeringTaskContext = {
      taskId: req.taskId || `ENG-${Date.now()}`,
      project: req.project,
      repository: req.project,
      repositoryPath: req.repositoryPath,
      taskType: req.type,
      domain: req.domain,
      agent: req.assignedAgent.split(' ')[0] || 'BE_ENGINEER',
      agentName: req.assignedAgent,
      title: req.description.slice(0, 100),
      description: req.description,
      acceptanceCriteria: req.acceptanceCriteria,
      constraints: req.plan?.constraints || ['Respect worktree isolation'],
      branch: `ai/feat-${req.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      executor: req.executor,
      timeout: 60000,
      environment: {},
      requestedBy: req.requester,
    };

    const startTime = Date.now();
    let result: EngineeringExecutionResult;

    try {
      result = await executorService.executeTask(context);
    } catch (err: any) {
      req.status = 'FAILED';
      req.updatedAt = new Date().toISOString();
      this.persistRequest(req);
      this.analytics.recordTaskCompletion(false, 1, Date.now() - startTime, 0, 1, 0, true);
      throw err;
    }

    const durationMs = Date.now() - startTime;
    const isSuccess =
      result.status === 'READY_FOR_APPROVAL' ||
      result.status === 'COMMITTED' ||
      result.status === 'READY_FOR_DEPLOY';

    // 3. Update WorkRequest Status from Execution
    if (result.status === 'READY_FOR_APPROVAL') {
      req.status = 'WAITING_FOR_APPROVAL';
    } else if (result.status === 'READY_FOR_DEPLOY') {
      req.status = 'READY_FOR_DEPLOY';
      req.completedAt = new Date().toISOString();
    } else if (result.status === 'COMMITTED') {
      req.status = 'COMMITTED';
    } else {
      req.status = 'FAILED';
    }
    req.updatedAt = new Date().toISOString();
    this.persistRequest(req);

    // 4. Record Telemetry in Analytics Engine (§30)
    const testsRun = result.tests.run || 0;
    const testsFailed = result.tests.failed || 0;
    this.analytics.recordTaskCompletion(
      isSuccess,
      result.attempts.length || 1,
      durationMs,
      testsRun,
      testsFailed,
      0,
      true
    );

    return { workRequest: req, executionResult: result };
  }

  /**
   * Retrieve a work request
   */
  public getWorkRequest(id: string): WorkRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * List all work requests
   */
  public listWorkRequests(): WorkRequest[] {
    return Array.from(this.requests.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update request status (e.g. upon approval)
   */
  public updateStatus(id: string, status: WorkRequestStatus): void {
    const req = this.requests.get(id);
    if (req) {
      req.status = status;
      req.updatedAt = new Date().toISOString();
      if (status === 'READY_FOR_DEPLOY') {
        req.completedAt = new Date().toISOString();
      }
      this.persistRequest(req);
    }
  }
}
