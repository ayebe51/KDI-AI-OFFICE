import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  ServiceItem,
  ServiceRegistrySnapshot,
  ServiceCriticality,
  RestartPolicySpec,
} from '@kdi/types';

@Injectable()
export class ServiceRegistryService {
  private readonly logger = new StructuredLogger('ServiceRegistryService');
  private readonly services = new Map<string, ServiceItem>();

  constructor() {
    this.registerCanonicalServices();
  }

  private registerCanonicalServices(): void {
    const defaultRestartPolicy: RestartPolicySpec = {
      restartOnFailure: true,
      maxRestartAttempts: 5,
      initialBackoffMs: 1000,
      maxBackoffMs: 30000,
      backoffFactor: 2,
      cooldownPeriodMs: 60000,
      crashLoopThreshold: 3,
    };

    const canonicalList: ServiceItem[] = [
      {
        serviceId: 'kdi-postgres',
        name: 'PostgreSQL Database Engine',
        type: 'DATABASE',
        host: '127.0.0.1',
        port: 5432,
        environment: 'production',
        dependencies: [],
        healthEndpoint: '/health/postgres',
        startupOrder: 1,
        shutdownOrder: 11,
        criticality: 'CRITICAL',
        restartPolicy: { ...defaultRestartPolicy, maxRestartAttempts: 10 },
        backupRequired: true,
        description: 'Authoritative relational store for projects, tasks, executions, users, and audit logs.',
      },
      {
        serviceId: 'kdi-redis',
        name: 'Redis Queue & Event Bus',
        type: 'CACHE',
        host: '127.0.0.1',
        port: 6379,
        environment: 'production',
        dependencies: [],
        healthEndpoint: '/health/redis',
        startupOrder: 2,
        shutdownOrder: 10,
        criticality: 'CRITICAL',
        restartPolicy: { ...defaultRestartPolicy, maxRestartAttempts: 10 },
        backupRequired: true,
        description: 'Fast in-memory broker, task queues, pub/sub event bus, and token-bucket rate limiter.',
      },
      {
        serviceId: 'kdi-neo4j',
        name: 'Neo4j Graph Database',
        type: 'GRAPH',
        host: '127.0.0.1',
        port: 7687,
        environment: 'production',
        dependencies: [],
        healthEndpoint: '/health/neo4j',
        startupOrder: 3,
        shutdownOrder: 9,
        criticality: 'CRITICAL',
        restartPolicy: { ...defaultRestartPolicy, maxRestartAttempts: 5 },
        backupRequired: true,
        description: 'Enterprise knowledge graph, GraphRAG semantic associations, and memory lineage.',
      },
      {
        serviceId: 'kdi-api',
        name: 'KDI Core API & NestJS Host',
        type: 'API',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-postgres', 'kdi-redis', 'kdi-neo4j'],
        healthEndpoint: '/health',
        startupOrder: 4,
        shutdownOrder: 8,
        criticality: 'CRITICAL',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'Core REST controllers, security guards, domain modules, and service orchestration.',
      },
      {
        serviceId: 'kdi-ai-router',
        name: 'Dynamic AI Router & Fallback',
        type: 'ROUTER',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-api'],
        healthEndpoint: '/health/ai-router',
        startupOrder: 5,
        shutdownOrder: 7,
        criticality: 'CRITICAL',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'Multi-LLM router dispatching between local Ollama and external cloud providers.',
      },
      {
        serviceId: 'kdi-ollama',
        name: 'Ollama Local LLM Inference Engine',
        type: 'ORCHESTRATOR',
        host: '127.0.0.1',
        port: 11434,
        environment: 'production',
        dependencies: [],
        healthEndpoint: '/health/ollama',
        startupOrder: 6,
        shutdownOrder: 6,
        criticality: 'HIGH',
        restartPolicy: { ...defaultRestartPolicy, maxRestartAttempts: 3 },
        backupRequired: false,
        description: 'Local GPU/CPU quantized model execution for private and zero-cloud tasks.',
      },
      {
        serviceId: 'kdi-agent-runtime',
        name: 'Multi-Agent Runtime & Task Scheduler',
        type: 'WORKER',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-postgres', 'kdi-redis', 'kdi-ai-router'],
        healthEndpoint: '/health/agent-runtime',
        startupOrder: 7,
        shutdownOrder: 5,
        criticality: 'CRITICAL',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'Worker lifecycle management, state machine transitions, and task execution engine.',
      },
      {
        serviceId: 'kdi-metagpt',
        name: 'MetaGPT Roleplay Orchestrator',
        type: 'ORCHESTRATOR',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-agent-runtime'],
        healthEndpoint: '/health/metagpt',
        startupOrder: 8,
        shutdownOrder: 4,
        criticality: 'HIGH',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'SOP-driven multi-agent roleplay coordinating software engineering teams.',
      },
      {
        serviceId: 'kdi-antigravity',
        name: 'Antigravity Engineering Execution Sandbox',
        type: 'WORKER',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-agent-runtime'],
        healthEndpoint: '/health/antigravity',
        startupOrder: 9,
        shutdownOrder: 3,
        criticality: 'CRITICAL',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'Isolated git worktrees, file operations, test runners, and command execution sandbox.',
      },
      {
        serviceId: 'kdi-autonomy-engine',
        name: 'Autonomous Operations & Human Command Center',
        type: 'ORCHESTRATOR',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-agent-runtime', 'kdi-ai-router'],
        healthEndpoint: '/health/autonomy',
        startupOrder: 10,
        shutdownOrder: 2,
        criticality: 'CRITICAL',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'Strategic objectives decomposition, runbooks, triggers, incidents, and daily briefings.',
      },
      {
        serviceId: 'kdi-websocket',
        name: 'Real-time WebSocket Digital Twin Gateway',
        type: 'GATEWAY',
        host: '127.0.0.1',
        port: 3000,
        environment: 'production',
        dependencies: ['kdi-api', 'kdi-redis'],
        healthEndpoint: '/health/websocket',
        startupOrder: 11,
        shutdownOrder: 1,
        criticality: 'HIGH',
        restartPolicy: defaultRestartPolicy,
        backupRequired: false,
        description: 'Bidirectional streaming of telemetry envelopes to the PlayCanvas 3D Virtual Office.',
      },
    ];

    for (const item of canonicalList) {
      this.services.set(item.serviceId, item);
    }

    this.logger.info(
      'registerCanonicalServices',
      `Registered ${this.services.size} canonical services in ServiceRegistry.`
    );
  }

  getService(serviceId: string): ServiceItem | undefined {
    return this.services.get(serviceId);
  }

  getAllServices(): ServiceItem[] {
    return Array.from(this.services.values());
  }

  getServicesByCriticality(criticality: ServiceCriticality): ServiceItem[] {
    return this.getAllServices().filter((s) => s.criticality === criticality);
  }

  getStartupSequence(): ServiceItem[] {
    return this.getAllServices().sort((a, b) => a.startupOrder - b.startupOrder);
  }

  getShutdownSequence(): ServiceItem[] {
    return this.getAllServices().sort((a, b) => a.shutdownOrder - b.shutdownOrder);
  }

  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const service of this.services.values()) {
      for (const depId of service.dependencies) {
        const dep = this.services.get(depId);
        if (!dep) {
          errors.push(`Service ${service.serviceId} references unknown dependency ${depId}`);
        } else if (dep.startupOrder >= service.startupOrder) {
          errors.push(
            `Startup order violation: ${service.serviceId} (order ${service.startupOrder}) depends on ${depId} (order ${dep.startupOrder}), which starts later or equal.`
          );
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getSnapshot(): ServiceRegistrySnapshot {
    const all = this.getAllServices();
    return {
      timestamp: new Date().toISOString(),
      services: all,
      totalServices: all.length,
      criticalCount: all.filter((s) => s.criticality === 'CRITICAL').length,
      startupSequence: this.getStartupSequence().map((s) => s.serviceId),
      shutdownSequence: this.getShutdownSequence().map((s) => s.serviceId),
    };
  }
}
