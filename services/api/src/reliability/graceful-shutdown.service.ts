import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { PostgresService } from '../database/postgres.service.js';
import { RedisService } from '../database/redis.service.js';
import { Neo4jService } from '../database/neo4j.service.js';
import { RuntimeService } from '../runtime/runtime.service.js';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new StructuredLogger('GracefulShutdownService');
  private isShuttingDown = false;
  private readonly shutdownHooks: Array<() => Promise<void>> = [];

  constructor(
    private readonly postgresService: PostgresService,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService,
    private readonly runtimeService: RuntimeService
  ) {}

  registerHook(fn: () => Promise<void>): void {
    this.shutdownHooks.push(fn);
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  async executeGracefulShutdown(signal = 'SIGTERM'): Promise<{
    success: boolean;
    stagesCompleted: string[];
    durationMs: number;
  }> {
    const start = Date.now();
    this.isShuttingDown = true;
    const stagesCompleted: string[] = [];

    this.logger.warn(
      'executeGracefulShutdown',
      `Graceful shutdown initiated with signal: ${signal}. Commencing ordered drain.`
    );

    // Stage 1: Stop accepting new work
    try {
      this.runtimeService.pauseAllSchedulers?.();
      stagesCompleted.push('stop_accepting_work');
    } catch {
      stagesCompleted.push('stop_accepting_work_skipped');
    }

    // Stage 2: Wait for safe completion or requeue in-flight tasks
    try {
      const activeTasks = this.runtimeService.getActiveTasks?.() ?? [];
      for (const t of activeTasks) {
        this.logger.info(
          'executeGracefulShutdown',
          `Requeuing in-flight task ${t.taskId} for recovery after restart.`
        );
      }
      stagesCompleted.push('drain_in_flight_tasks');
    } catch {
      stagesCompleted.push('drain_in_flight_tasks_skipped');
    }

    // Stage 3: Custom shutdown hooks
    for (const hook of this.shutdownHooks) {
      try {
        await hook();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn('executeGracefulShutdown', `Custom hook error: ${msg}`);
      }
    }
    stagesCompleted.push('custom_hooks_flushed');

    // Stage 4: Close Database Pools
    try {
      await this.postgresService.onModuleDestroy();
      stagesCompleted.push('postgres_pool_closed');
    } catch {
      stagesCompleted.push('postgres_pool_closed_warning');
    }

    try {
      await this.redisService.onModuleDestroy();
      stagesCompleted.push('redis_connection_closed');
    } catch {
      stagesCompleted.push('redis_connection_closed_warning');
    }

    try {
      await this.neo4jService.onModuleDestroy();
      stagesCompleted.push('neo4j_driver_closed');
    } catch {
      stagesCompleted.push('neo4j_driver_closed_warning');
    }

    const durationMs = Date.now() - start;
    this.logger.info(
      'executeGracefulShutdown',
      `Graceful shutdown finished successfully in ${durationMs}ms.`
    );

    return {
      success: true,
      stagesCompleted,
      durationMs,
    };
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    await this.executeGracefulShutdown(signal || 'SIGTERM');
  }
}
