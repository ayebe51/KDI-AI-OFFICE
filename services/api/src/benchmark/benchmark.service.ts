// ==========================================================
// services/api/src/benchmark/benchmark.service.ts
// NestJS Autonomous Software Delivery Benchmark Service (Phase 16)
// ==========================================================

import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import type {
  BenchmarkRun,
  BenchmarkTask,
  BenchmarkArtifact,
  BenchmarkApproval,
  HumanIntervention,
  HumanInterventionType,
} from '@kdi/types';
import type { BenchmarkExecutionOptions } from './types/benchmark.types.js';
import { BenchmarkTaskCatalog } from './catalog/benchmark-suite.catalog.js';
import { BenchmarkRepository } from './persistence/benchmark.repository.js';
import { BenchmarkRunner } from './engine/benchmark-runner.js';
import { PostgresService } from '../database/postgres.service.js';
import { RedisService } from '../database/redis.service.js';
import { EventsGateway } from '../websocket/events.gateway.js';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';

@Injectable()
export class BenchmarkService implements OnModuleInit {
  private readonly logger = new StructuredLogger('BenchmarkService');
  public readonly catalog: BenchmarkTaskCatalog;
  public readonly repository: BenchmarkRepository;
  public readonly runner: BenchmarkRunner;

  constructor(
    @Optional() private readonly postgresService?: PostgresService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) {
    this.catalog = new BenchmarkTaskCatalog();
    this.repository = new BenchmarkRepository(this.postgresService);
    this.runner = new BenchmarkRunner(this.repository);
  }

  async onModuleInit() {
    this.logger.info('onModuleInit', 'Initialized Phase 16 Autonomous Software Delivery Benchmark Subsystem');
  }

  /**
   * List all available benchmark tasks from the standardized catalog
   */
  public listTasks(): BenchmarkTask[] {
    return this.catalog.listTasks();
  }

  /**
   * Get benchmark task definition by ID
   */
  public getTask(id: string): BenchmarkTask | undefined {
    return this.catalog.getTask(id);
  }

  /**
   * List historical benchmark runs
   */
  public async listRuns(): Promise<BenchmarkRun[]> {
    return this.repository.listRuns();
  }

  /**
   * Get benchmark run detail by runId
   */
  public async getRun(runId: string): Promise<BenchmarkRun | undefined> {
    return this.repository.getRun(runId);
  }

  /**
   * Start and execute a benchmark run
   */
  public async startBenchmarkRun(
    taskId: string,
    options: BenchmarkExecutionOptions = {}
  ): Promise<BenchmarkRun> {
    const task = this.catalog.getTask(taskId);
    if (!task) {
      throw new Error(`Benchmark task not found: ${taskId}`);
    }

    this.emitEvent('benchmark.run.started', {
      taskId: task.id,
      title: task.title,
      level: task.level,
      mode: options.mode || 'AUTONOMOUS',
    });

    const run = await this.runner.executeBenchmark(task, options, (step, activeRunId) => {
      this.emitEvent('benchmark.step.completed', {
        runId: activeRunId || task.id,
        taskId: task.id,
        stepName: step.name,
        actor: step.actor,
        status: step.status,
        durationMs: step.durationMs,
      });
    });

    if (run.status === 'COMPLETED') {
      this.emitEvent('benchmark.run.completed', {
        runId: run.run_id,
        taskId: task.id,
        metrics: run.metrics,
        finalCommit: run.final_commit,
      });
    } else {
      this.emitEvent('benchmark.run.failed', {
        runId: run.run_id,
        taskId: task.id,
        status: run.status,
        failureReason: run.failure_reason,
      });
    }

    return run;
  }

  /**
   * Record a human intervention in an active run (H1 to H6)
   */
  public async recordIntervention(
    runId: string,
    type: HumanInterventionType,
    description: string,
    actor: string = 'OWNER'
  ): Promise<HumanIntervention> {
    const run = await this.repository.getRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    const isNecessary = type === 'H6_APPROVAL' && description.toLowerCase().includes('production');
    const intervention: HumanIntervention = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      runId,
      type,
      description,
      isNecessary,
      actor,
      timestamp: new Date().toISOString(),
    };

    await this.repository.recordIntervention(runId, intervention);
    this.emitEvent('benchmark.intervention.recorded', { runId, intervention });
    return intervention;
  }

  /**
   * Resolve an approval request
   */
  public async resolveApproval(
    approvalId: string,
    approved: boolean,
    resolvedBy: string
  ): Promise<BenchmarkApproval | undefined> {
    const approval = await this.repository.getApproval(approvalId);
    if (!approval) return undefined;

    approval.status = approved ? 'APPROVED' : 'REJECTED';
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = resolvedBy;

    await this.repository.saveApproval(approval);
    this.emitEvent('benchmark.approval.resolved', { approvalId, status: approval.status, resolvedBy });
    return approval;
  }

  /**
   * Get run artifacts
   */
  public async getArtifacts(runId: string): Promise<BenchmarkArtifact[]> {
    return this.repository.getArtifacts(runId);
  }

  /**
   * Aggregate benchmark metrics across all historical runs
   */
  public async getMetricsSummary(): Promise<{
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    blockedRuns: number;
    taskCompletionRate: number;
    autonomousCompletionRate: number;
    firstPassSuccessRate: number;
    averageRecoveryRate: number;
    averageCycleTimeSeconds: number;
    totalHumanInterventions: number;
    unnecessaryInterventions: number;
    necessaryApprovals: number;
  }> {
    const runs = await this.repository.listRuns();
    if (runs.length === 0) {
      return {
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        blockedRuns: 0,
        taskCompletionRate: 0,
        autonomousCompletionRate: 0,
        firstPassSuccessRate: 0,
        averageRecoveryRate: 0,
        averageCycleTimeSeconds: 0,
        totalHumanInterventions: 0,
        unnecessaryInterventions: 0,
        necessaryApprovals: 0,
      };
    }

    const totalRuns = runs.length;
    const completedRuns = runs.filter((r) => r.status === 'COMPLETED').length;
    const failedRuns = runs.filter((r) => r.status === 'FAILED').length;
    const blockedRuns = runs.filter((r) => r.status === 'BLOCKED').length;

    const autonomousCompleted = runs.filter((r) => r.metrics?.autonomousCompletion).length;
    const firstPassCount = runs.filter((r) => r.metrics?.firstPassSuccess).length;

    const totalRecoveryRates = runs.reduce((acc, r) => acc + (r.metrics?.recoverySuccessRate || 0), 0);
    const totalCycleTime = runs.reduce((acc, r) => acc + (r.metrics?.deliveryCycleTimeMs || 0), 0);
    const totalInterventions = runs.reduce((acc, r) => acc + (r.human_interventions || 0), 0);
    const unnecessaryInterventions = runs.reduce((acc, r) => acc + (r.metrics?.unnecessaryInterventions || 0), 0);
    const necessaryApprovals = runs.reduce((acc, r) => acc + (r.metrics?.necessaryApprovals || 0), 0);

    return {
      totalRuns,
      completedRuns,
      failedRuns,
      blockedRuns,
      taskCompletionRate: Math.round((completedRuns / totalRuns) * 100) / 100,
      autonomousCompletionRate: completedRuns > 0 ? Math.round((autonomousCompleted / completedRuns) * 100) / 100 : 0,
      firstPassSuccessRate: Math.round((firstPassCount / totalRuns) * 100) / 100,
      averageRecoveryRate: Math.round((totalRecoveryRates / totalRuns) * 100) / 100,
      averageCycleTimeSeconds: Math.round(totalCycleTime / totalRuns / 1000),
      totalHumanInterventions: totalInterventions,
      unnecessaryInterventions,
      necessaryApprovals,
    };
  }

  /**
   * Helper to broadcast WebSocket and Redis telemetry events
   */
  private emitEvent(eventType: string, data: unknown): void {
    if (this.eventsGateway) {
      const envelope = createWSEventEnvelope(
        eventType as any,
        'office:events',
        data
      );
      this.eventsGateway.broadcastEvent(envelope);
    }
    if (this.redisService) {
      const client = this.redisService.getClient();
      if (client && client.status === 'ready') {
        client.publish('kdi:benchmark:events', JSON.stringify(data)).catch(() => {});
      }
    }
  }
}
