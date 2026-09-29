// ==========================================================
// services/api/src/runtime/engine/agent.registry.ts
// Canonical Agent Registry & Persona Catalog
// ==========================================================

import type {
  AgentDefinition,
  AgentRole,
  AgentRuntimeStatus,
  AgentAvailabilityStatus,
  AgentLifecycleState,
} from '@kdi/types';
import { AgentStateMachine } from '../state-machines/agent.state-machine.js';
import { StructuredLogger } from '@kdi/shared';

export class AgentRegistry {
  private readonly logger = new StructuredLogger('AgentRegistry');
  private agents: Map<string, AgentDefinition> = new Map();

  constructor() {
    this.initDefaultCatalog();
  }

  public register(agent: AgentDefinition): void {
    this.agents.set(agent.agentId, agent);
    this.logger.info('register', `Registered agent ${agent.name} [${agent.agentId}]`);
  }

  public get(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  public getByRole(role: AgentRole): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((a) => a.role === role);
  }

  public list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  public listActive(): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((a) => a.lifecycle === 'ACTIVE');
  }

  public activate(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lifecycle = 'ACTIVE';
      agent.status = 'AVAILABLE';
      agent.availability = 'AVAILABLE';
      return true;
    }
    return false;
  }

  public deactivate(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lifecycle = 'DISABLED';
      agent.status = 'OFFLINE';
      agent.availability = 'OFFLINE';
      return true;
    }
    return false;
  }

  public updateStatus(
    agentId: string,
    status: AgentRuntimeStatus,
    currentTaskId?: string,
    currentActivity?: string
  ): AgentDefinition {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    AgentStateMachine.transition(agent, status);
    agent.currentTaskId = currentTaskId;
    if (currentActivity) {
      agent.currentActivity = currentActivity;
    }

    return agent;
  }

  private initDefaultCatalog(): void {
    const baseline: AgentDefinition[] = [
      {
        agentId: 'AGT-MGR-001',
        name: 'Rian (AI Engineering Manager)',
        role: 'AI_MANAGER',
        department: 'Management',
        grade: 'GR-07',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['planning', 'decomposition', 'review'],
        capabilities: ['TEXT', 'REASONING', 'TOOL_CALLING', 'LOCAL', 'PRIVATE'],
        tools: ['task.dispatch', 'agent.assign', 'report.generate'],
        permissions: ['*'],
        concurrencyLimit: 4,
        currentRunningTasks: 0,
        costCenter: 'CC-MGMT',
        room: 'RM-02',
        baseSalary: 32000000,
      },
      {
        agentId: 'AGT-ENG-001',
        name: 'Farhan (AI Software Engineer)',
        role: 'SOFTWARE_ENGINEER',
        department: 'Engineering',
        grade: 'GR-04',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['coding', 'debugging', 'testing'],
        capabilities: ['TEXT', 'CODE', 'REASONING', 'FAST', 'LOCAL', 'PRIVATE'],
        tools: ['git.branch', 'code.patch', 'test.run'],
        permissions: ['code:read', 'code:write'],
        concurrencyLimit: 2,
        currentRunningTasks: 0,
        costCenter: 'CC-ENG',
        room: 'RM-05',
        baseSalary: 18000000,
      },
      {
        agentId: 'AGT-ARC-001',
        name: 'Ahmad (AI System Architect)',
        role: 'SYSTEM_ARCHITECT',
        department: 'Architecture',
        grade: 'GR-06',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['architecture', 'planning', 'research', 'decomposition'],
        capabilities: ['TEXT', 'REASONING', 'LONG_CONTEXT', 'LOCAL', 'PRIVATE'],
        tools: ['adr.author', 'diagram.render', 'spec.validate'],
        permissions: ['arch:read', 'arch:write'],
        concurrencyLimit: 2,
        currentRunningTasks: 0,
        costCenter: 'CC-ARCH',
        room: 'RM-04',
        baseSalary: 28000000,
      },
      {
        agentId: 'AGT-QA-001',
        name: 'Tasya (AI QA Engineer)',
        role: 'QA_ENGINEER',
        department: 'Quality Assurance',
        grade: 'GR-04',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['testing', 'debugging'],
        capabilities: ['TEXT', 'CODE', 'FAST', 'LOCAL', 'PRIVATE'],
        tools: ['test.execute', 'coverage.report'],
        permissions: ['test:run'],
        concurrencyLimit: 2,
        currentRunningTasks: 0,
        costCenter: 'CC-QA',
        room: 'RM-09',
        baseSalary: 17000000,
      },
      {
        agentId: 'AGT-SEC-001',
        name: 'Ilham (AI Security Specialist)',
        role: 'SECURITY_ENGINEER',
        department: 'Security',
        grade: 'GR-05',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['security', 'review'],
        capabilities: ['TEXT', 'REASONING', 'LOCAL', 'PRIVATE'],
        tools: ['cve.scan', 'secret.detect', 'policy.audit'],
        permissions: ['sec:audit'],
        concurrencyLimit: 2,
        currentRunningTasks: 0,
        costCenter: 'CC-SEC',
        room: 'RM-10',
        baseSalary: 24000000,
      },
      {
        agentId: 'AGT-DOC-001',
        name: 'Lina (AI Technical Writer)',
        role: 'TECHNICAL_WRITER',
        department: 'Documentation',
        grade: 'GR-03',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['documentation', 'research'],
        capabilities: ['TEXT', 'FAST', 'LOCAL', 'PRIVATE'],
        tools: ['doc.generate', 'markdown.lint'],
        permissions: ['doc:write'],
        concurrencyLimit: 3,
        currentRunningTasks: 0,
        costCenter: 'CC-DOC',
        room: 'RM-05',
        baseSalary: 14000000,
      },
      {
        agentId: 'AGT-RES-001',
        name: 'Dr. Nadia (AI Research Scientist)',
        role: 'RESEARCHER',
        department: 'Research',
        grade: 'GR-06',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        lifecycle: 'ACTIVE',
        skills: ['research', 'analysis', 'planning'],
        capabilities: ['TEXT', 'REASONING', 'LONG_CONTEXT', 'LOCAL', 'PRIVATE'],
        tools: ['web.search', 'paper.summarize'],
        permissions: ['research:read'],
        concurrencyLimit: 2,
        currentRunningTasks: 0,
        costCenter: 'CC-RES',
        room: 'RM-11',
        baseSalary: 27000000,
      },
    ];

    for (const a of baseline) {
      this.agents.set(a.agentId, a);
    }
  }
}
