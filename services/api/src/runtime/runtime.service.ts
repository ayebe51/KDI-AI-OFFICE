// ==========================================================
// services/api/src/runtime/runtime.service.ts
// NestJS Core Service for Agent Runtime & Task Orchestration
// ==========================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { EventsGateway } from '../websocket/events.gateway.js';
import { AgentRegistry } from './engine/agent.registry.js';
import { AgentRuntime } from './engine/agent.runtime.js';
import { AIManager, type InboundTaskRequest } from './engine/ai.manager.js';
import { LLMExecutionProvider } from './execution/llm-execution.provider.js';
import { CompositeExecutionProvider } from './execution/composite-execution.provider.js';
import { AntigravityEngineeringProvider } from '../engineering/provider/antigravity.provider.js';
import { RuntimeEventEmitter } from './events/runtime-event.emitter.js';
import { InMemoryMemoryService } from './memory/memory.service.js';
import type {
  CanonicalTask,
  AgentDefinition,
  ExecutionRecord,
  RuntimeStatusSummary,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

@Injectable()
export class RuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('RuntimeService');
  private readonly agentRegistry: AgentRegistry;
  private readonly runtime: AgentRuntime;
  private readonly aiManager: AIManager;
  private readonly memoryService: InMemoryMemoryService;
  private readonly eventEmitter: RuntimeEventEmitter;
  private readonly antigravityProvider: AntigravityEngineeringProvider;

  private pollInterval?: NodeJS.Timeout;
  private staleRecoveryInterval?: NodeJS.Timeout;

  constructor(
    private readonly llmService: LLMService,
    private readonly eventsGateway: EventsGateway
  ) {
    this.eventEmitter = new RuntimeEventEmitter(this.eventsGateway);
    this.agentRegistry = new AgentRegistry();
    this.memoryService = new InMemoryMemoryService();

    const llmExecutionProvider = new LLMExecutionProvider(this.llmService);
    this.antigravityProvider = new AntigravityEngineeringProvider();
    const compositeProvider = new CompositeExecutionProvider(
      llmExecutionProvider,
      this.antigravityProvider
    );

    this.runtime = new AgentRuntime(
      compositeProvider,
      this.agentRegistry,
      this.eventEmitter,
      3 // 3 autonomous worker slots
    );

    this.aiManager = new AIManager(this.runtime);
  }

  onModuleInit() {
    this.logger.info('onModuleInit', 'Starting Agent Runtime scheduler daemon loop');

    // Run scheduler loop every 1 second to dispatch queued work
    this.pollInterval = setInterval(async () => {
      try {
        await this.runtime.processQueue();
      } catch (err: any) {
        this.logger.debug('onModuleInit', `Queue loop tick error: ${err.message}`);
      }
    }, 1000);

    // Stale worker recovery scan every 15 seconds
    this.staleRecoveryInterval = setInterval(() => {
      try {
        this.runtime.recoverStaleWorkers(30_000);
      } catch (err: any) {
        this.logger.debug('onModuleInit', `Stale recovery error: ${err.message}`);
      }
    }, 15_000);
  }

  onModuleDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.staleRecoveryInterval) clearInterval(this.staleRecoveryInterval);
    this.logger.info('onModuleDestroy', 'Agent Runtime scheduler stopped cleanly');
  }

  // Task API methods
  public createTask(request: InboundTaskRequest): CanonicalTask {
    return this.aiManager.handleRequest(request);
  }

  public getTask(taskId: string): CanonicalTask | undefined {
    return this.runtime.getTask(taskId);
  }

  public getAllTasks(): CanonicalTask[] {
    return this.runtime.getAllTasks();
  }

  public pauseTask(taskId: string): boolean {
    return this.runtime.pauseTask(taskId);
  }

  public resumeTask(taskId: string): boolean {
    return this.runtime.resumeTask(taskId);
  }

  public cancelTask(taskId: string, reason?: string): boolean {
    return this.runtime.cancelTask(taskId, reason);
  }

  public retryTask(taskId: string): boolean {
    return this.runtime.retryTask(taskId);
  }

  public approveTask(taskId: string, operator?: string): boolean {
    return this.aiManager.approveTask(taskId, operator);
  }

  public rejectTask(taskId: string, reason?: string): boolean {
    return this.aiManager.rejectTask(taskId, reason);
  }

  public getTaskExecutions(taskId: string): ExecutionRecord[] {
    return this.runtime.getExecutions(taskId);
  }

  // Agent API methods
  public getAgents(): AgentDefinition[] {
    return this.agentRegistry.list();
  }

  public getAgent(agentId: string): AgentDefinition | undefined {
    return this.agentRegistry.get(agentId);
  }

  // Runtime & Health API methods
  public getRuntimeSummary(): RuntimeStatusSummary {
    return this.runtime.getSummary();
  }

  public getQueuedTasks(): CanonicalTask[] {
    return this.runtime.queue.getQueuedTasks();
  }

  public getDLQTasks() {
    return this.runtime.queue.getDLQ();
  }

  public getRuntime(): AgentRuntime {
    return this.runtime;
  }

  public getAIManager(): AIManager {
    return this.aiManager;
  }

  public getActiveWorkers(): any[] {
    return (this.runtime as any).workers || [];
  }

  public getQueueDepth(): number {
    return this.runtime.queue?.size() ?? 0;
  }

  public getActiveTasks(): CanonicalTask[] {
    return this.runtime.getAllTasks().filter((t) => t.status === 'RUNNING');
  }

  public pauseAllSchedulers(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.staleRecoveryInterval) clearInterval(this.staleRecoveryInterval);
  }
}
