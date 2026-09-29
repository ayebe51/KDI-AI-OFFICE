// ==========================================================
// services/api/src/engineering/engineering.service.ts
// NestJS Core Engineering Service: MetaGPT + Antigravity Orchestrator
// ==========================================================

import { Injectable, OnModuleInit } from '@nestjs/common';
import type {
  EngineeringPlan,
  EngineeringSession,
  EngineeringResult,
  EngineeringProviderHealth,
  EngineeringApprovalRequest,
  HumanGoalRequest,
  EngineeringTask,
  EngineeringExecutionContext,
} from '@kdi/types';
import { AntigravityEngineeringProvider } from './provider/antigravity.provider.js';
import { MetaGPTPlannerService } from './metagpt/metagpt-planner.service.js';
import { EngineeringEventEmitter } from './events/engineering-event.emitter.js';
import { EngineeringRepository } from './persistence/engineering.repository.js';
import { Neo4jEngineeringService } from './persistence/neo4j-engineering.service.js';
import { ApprovalGateService } from './security/approval-gate.service.js';
import { WorkspaceManager } from './workspace/workspace-manager.js';
import { PostgresService } from '../database/postgres.service.js';
import { RedisService } from '../database/redis.service.js';
import { Neo4jService } from '../database/neo4j.service.js';
import { EventsGateway } from '../websocket/events.gateway.js';
import { StructuredLogger } from '@kdi/shared';

@Injectable()
export class EngineeringService implements OnModuleInit {
  private readonly logger = new StructuredLogger('EngineeringService');

  public readonly provider: AntigravityEngineeringProvider;
  public readonly planner: MetaGPTPlannerService;
  public readonly eventEmitter: EngineeringEventEmitter;
  public readonly repository: EngineeringRepository;
  public readonly neo4jGraph: Neo4jEngineeringService;
  public readonly approvalGate: ApprovalGateService;
  public readonly workspaceManager: WorkspaceManager;

  constructor(
    private readonly postgresService: PostgresService,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService,
    private readonly eventsGateway: EventsGateway
  ) {
    this.approvalGate = new ApprovalGateService();
    this.workspaceManager = new WorkspaceManager();
    this.eventEmitter = new EngineeringEventEmitter(this.eventsGateway, this.redisService);
    this.repository = new EngineeringRepository(this.postgresService);
    this.neo4jGraph = new Neo4jEngineeringService(this.neo4jService);
    this.planner = new MetaGPTPlannerService();

    this.provider = new AntigravityEngineeringProvider(
      undefined,
      undefined,
      this.workspaceManager,
      undefined,
      this.approvalGate
    );
  }

  async onModuleInit() {
    this.logger.info('onModuleInit', 'Initializing Phase 4 Engineering Subsystem');
    await this.provider.initialize();
  }

  /**
   * Health and readiness check for engineering subsystem
   */
  public async getHealth(): Promise<EngineeringProviderHealth> {
    return this.provider.healthCheck();
  }

  /**
   * Run MetaGPT software company planning for a high-level goal
   */
  public async createPlan(goalRequest: {
    goal: string;
    projectId?: string;
    repository?: string;
  }): Promise<EngineeringPlan> {
    const plan = await this.planner.plan(goalRequest);
    this.eventEmitter.emit(
      'engineering.plan.started',
      'system',
      plan.planId,
      plan.tasks[0]?.taskId || 'tsk_root',
      plan.recommendedAgent,
      {
        goal: plan.goal,
        tasksCount: plan.tasks.length,
        complexity: plan.estimatedComplexity,
      }
    );
    return plan;
  }

  /**
   * Execute an engineering task through Antigravity with full lifecycle tracking
   */
  public async executeTask(
    task: EngineeringTask,
    contextOverride?: Partial<EngineeringExecutionContext>
  ): Promise<EngineeringResult> {
    const executionId = `eng_exec_${task.taskId}_${Date.now()}`;
    const agentId = `AGT_${task.agentRole.toUpperCase()}`;

    // 1. Create Session
    const session = await this.provider.createSession({
      taskId: task.taskId,
      executionId,
      agentId,
      repository: task.repository,
      workspacePath: task.workspace,
    });

    await this.repository.saveSession(session);
    this.eventEmitter.emit('engineering.session.created', session.sessionId, executionId, task.taskId, agentId, {
      repository: task.repository,
      branch: session.branch,
      workspace: session.workspacePath,
    });

    // 2. Prepare Context
    const context: EngineeringExecutionContext = {
      executionId,
      taskId: task.taskId,
      projectId: 'PRJ-KDI',
      agentId,
      agentRole: task.agentRole,
      repository: task.repository,
      branch: session.branch,
      workspace: session.workspacePath,
      goal: task.title,
      requirements: [task.description],
      acceptanceCriteria: task.acceptanceCriteria,
      constraints: ['Respect workspace isolation', 'Follow KDI security policy'],
      allowedPaths: task.allowedPaths,
      forbiddenPaths: task.forbiddenPaths,
      environment: {},
      securityPolicy: {
        allowWrite: true,
        allowTestExecution: true,
        requireApprovalForHighRisk: true,
        protectedBranches: ['main', 'master', 'production'],
      },
      ...contextOverride,
    };

    // 3. Emit Started Event
    this.eventEmitter.emit('engineering.started', session.sessionId, executionId, task.taskId, agentId, {
      goal: task.title,
      taskType: task.type,
    });

    // 4. Execute through Antigravity
    const result = await this.provider.executeTask(task, context);

    // 5. Persist Result & Graph
    await this.repository.saveResult(result);
    await this.neo4jGraph.ingestExecutionGraph(session, result, context);

    // 6. Emit Completion or Failure Event
    if (result.status === 'VERIFIED') {
      this.eventEmitter.emit('engineering.completed', session.sessionId, executionId, task.taskId, agentId, {
        summary: result.summary,
        testsPassed: result.testsPassed.length,
        commitHash: result.commitHash,
      });
    } else {
      this.eventEmitter.emit('engineering.failed', session.sessionId, executionId, task.taskId, agentId, {
        status: result.status,
        blockers: result.blockers,
      });
    }

    return result;
  }

  /**
   * Request human approval for high-risk action
   */
  public requestApproval(
    executionId: string,
    taskId: string,
    agentId: string,
    command: string,
    reason: string
  ): EngineeringApprovalRequest {
    const req = this.approvalGate.createApprovalRequest(
      executionId,
      taskId,
      agentId,
      command,
      'HIGH',
      reason
    );
    this.eventEmitter.emit('engineering.approval.required', 'system', executionId, taskId, agentId, {
      approvalId: req.approvalId,
      command,
      reason,
    });
    return req;
  }

  /**
   * Resolve an approval request
   */
  public resolveApproval(
    approvalId: string,
    approved: boolean,
    resolvedBy: string
  ): EngineeringApprovalRequest | null {
    const req = this.approvalGate.resolveApproval(approvalId, approved, resolvedBy);
    if (req) {
      this.repository.saveApproval(req);
    }
    return req;
  }

  public getApproval(approvalId: string): EngineeringApprovalRequest | undefined {
    return this.approvalGate.getApproval(approvalId);
  }

  public listPendingApprovals(): EngineeringApprovalRequest[] {
    return this.approvalGate.listPending();
  }
}
