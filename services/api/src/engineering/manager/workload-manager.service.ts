// ==========================================================
// services/api/src/engineering/manager/workload-manager.service.ts
// Phase 17: Engineering Workforce Workload & Intelligent Assignment
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  AgentAssignmentRecommendation,
  AgentAvailabilityStatus,
  AgentCapacityProfile,
  WorkforceWorkloadSummary,
} from './engineering-manager.types.js';

@Injectable()
export class WorkloadManagerService {
  private readonly logger = new StructuredLogger('WorkloadManagerService');
  private readonly agents = new Map<string, AgentCapacityProfile>();

  constructor() {
    this.seedDefaultWorkforce();
  }

  private seedDefaultWorkforce(): void {
    // 1. Backend Engineer (Farhan Hakim) - Capacity: 2
    this.registerAgent({
      agentId: 'AGT_BACKEND',
      name: 'Farhan Hakim',
      role: 'BACKEND_ENGINEER',
      maxConcurrentTasks: 2,
      preferredDomains: ['BACKEND', 'API', 'DATABASE', 'AUTH'],
      activeTaskIds: [],
      queuedTaskIds: [],
      utilizationPercentage: 0,
      availabilityStatus: 'AVAILABLE',
    });

    // 2. Frontend Engineer (Nadia Putri) - Capacity: 2
    this.registerAgent({
      agentId: 'AGT_FRONTEND',
      name: 'Nadia Putri',
      role: 'FRONTEND_ENGINEER',
      maxConcurrentTasks: 2,
      preferredDomains: ['FRONTEND', 'UI', 'WEB', 'CLIENT'],
      activeTaskIds: [],
      queuedTaskIds: [],
      utilizationPercentage: 0,
      availabilityStatus: 'AVAILABLE',
    });

    // 3. QA Engineer (Rian Pratama) - Capacity: 3
    this.registerAgent({
      agentId: 'AGT_QA',
      name: 'Rian Pratama',
      role: 'QA_ENGINEER',
      maxConcurrentTasks: 3,
      preferredDomains: ['QA', 'TEST', 'INTEGRATION', 'E2E'],
      activeTaskIds: [],
      queuedTaskIds: [],
      utilizationPercentage: 0,
      availabilityStatus: 'AVAILABLE',
    });

    // 4. Security Engineer (Yusuf Arifin) - Capacity: 2
    this.registerAgent({
      agentId: 'AGT_SECURITY',
      name: 'Yusuf Arifin',
      role: 'SECURITY_ENGINEER',
      maxConcurrentTasks: 2,
      preferredDomains: ['SECURITY', 'AUDIT', 'COMPLIANCE', 'AUTH'],
      activeTaskIds: [],
      queuedTaskIds: [],
      utilizationPercentage: 0,
      availabilityStatus: 'AVAILABLE',
    });

    // 5. DevOps Engineer (Dian Saputra) - Capacity: 2
    this.registerAgent({
      agentId: 'AGT_DEVOPS',
      name: 'Dian Saputra',
      role: 'DEVOPS_ENGINEER',
      maxConcurrentTasks: 2,
      preferredDomains: ['DEVOPS', 'INFRA', 'DEPLOY', 'CI', 'DOCKER'],
      activeTaskIds: [],
      queuedTaskIds: [],
      utilizationPercentage: 0,
      availabilityStatus: 'AVAILABLE',
    });
  }

  public registerAgent(profile: AgentCapacityProfile): void {
    this.agents.set(profile.agentId.toUpperCase(), profile);
    this.agents.set(profile.role.toUpperCase(), profile);
  }

  public getAgent(agentIdOrRole: string): AgentCapacityProfile | undefined {
    return this.agents.get(agentIdOrRole.toUpperCase());
  }

  public listAgents(): AgentCapacityProfile[] {
    const unique = new Map<string, AgentCapacityProfile>();
    for (const a of this.agents.values()) {
      unique.set(a.agentId, a);
    }
    return Array.from(unique.values());
  }

  /**
   * Assign task to agent with strict capacity limits (§11 & §12)
   */
  public assignTask(agentIdOrRole: string, taskId: string): boolean {
    const agent = this.getAgent(agentIdOrRole);
    if (!agent) {
      this.logger.warn('assignTask', `Agent not found for: ${agentIdOrRole}`);
      return false;
    }

    if (agent.activeTaskIds.includes(taskId)) {
      return true; // Already assigned
    }

    if (agent.activeTaskIds.length >= agent.maxConcurrentTasks) {
      this.logger.warn(
        'assignTask',
        `Agent ${agent.name} (${agent.role}) is at maximum capacity (${agent.activeTaskIds.length}/${agent.maxConcurrentTasks})`
      );
      return false;
    }

    agent.activeTaskIds.push(taskId);
    this.updateUtilization(agent);
    this.logger.info(
      'assignTask',
      `Assigned task ${taskId} to ${agent.name} (${agent.activeTaskIds.length}/${agent.maxConcurrentTasks})`
    );
    return true;
  }

  /**
   * Release task from assigned agent upon completion or failure (§11)
   */
  public releaseTask(taskId: string): void {
    for (const agent of this.listAgents()) {
      const idx = agent.activeTaskIds.indexOf(taskId);
      if (idx !== -1) {
        agent.activeTaskIds.splice(idx, 1);
        this.updateUtilization(agent);
        this.logger.info(
          'releaseTask',
          `Released task ${taskId} from ${agent.name} (remaining: ${agent.activeTaskIds.length}/${agent.maxConcurrentTasks})`
        );
      }
    }
  }

  private updateUtilization(agent: AgentCapacityProfile): void {
    const active = agent.activeTaskIds.length;
    agent.utilizationPercentage = Math.round((active / agent.maxConcurrentTasks) * 100);

    if (active === 0) {
      agent.availabilityStatus = 'AVAILABLE';
    } else if (active < agent.maxConcurrentTasks) {
      agent.availabilityStatus = 'NEAR_CAPACITY';
    } else {
      agent.availabilityStatus = 'OVERLOADED';
    }
  }

  /**
   * Intelligent deterministic assignment policy (§13)
   * 1. Domain & Skillset match
   * 2. Agent availability (active < maxConcurrentTasks)
   * 3. Workload leveling (lowest utilization among candidates)
   */
  public findBestAgentForTask(
    taskId: string,
    domain: string,
    requestedRole?: string
  ): AgentAssignmentRecommendation | null {
    const candidates = this.listAgents();
    const upperDomain = domain.toUpperCase();
    const upperRole = requestedRole ? requestedRole.toUpperCase() : undefined;

    let bestAgent: AgentCapacityProfile | null = null;
    let highestScore = -1;
    let matchReason = '';

    for (const agent of candidates) {
      let score = 0;

      // Role exact match
      const isRoleMatch = upperRole ? (agent.role.toUpperCase() === upperRole || agent.agentId.toUpperCase() === upperRole) : false;
      const isDomainMatch = agent.preferredDomains.some((d) => upperDomain.includes(d) || d.includes(upperDomain));

      // Skip agents that match neither role nor domain
      if (upperRole && !isRoleMatch && !isDomainMatch) {
        continue;
      }
      if (!upperRole && !isDomainMatch) {
        continue;
      }

      // Capacity availability check (§11 & §12)
      const isAvailable = agent.activeTaskIds.length < agent.maxConcurrentTasks;
      if (!isAvailable) {
        continue; // Agent is fully booked at maxConcurrentTasks
      }

      if (isRoleMatch) score += 50;
      if (isDomainMatch) score += 30;

      // Less utilized agents get higher priority (workload leveling)
      score += (100 - agent.utilizationPercentage) / 5;

      if (score > highestScore) {
        highestScore = score;
        bestAgent = agent;
        matchReason = `Domain match [${agent.preferredDomains.join(', ')}] with ${agent.utilizationPercentage}% current load (${agent.activeTaskIds.length}/${agent.maxConcurrentTasks} active)`;
      }
    }

    if (!bestAgent || highestScore < 0) {
      return null;
    }

    return {
      taskId,
      recommendedAgentId: bestAgent.agentId,
      agentName: bestAgent.name,
      agentRole: bestAgent.role,
      matchScore: Math.round(highestScore),
      reason: matchReason,
      decisionSource: 'RULE_ENGINE',
    };
  }

  /**
   * Workforce Workload Summary (§11 & §15)
   */
  public getWorkloadSummary(): WorkforceWorkloadSummary {
    const agents = this.listAgents();
    let totalActive = 0;
    let activeAgentsCount = 0;
    let totalUtil = 0;

    for (const a of agents) {
      totalActive += a.activeTaskIds.length;
      if (a.activeTaskIds.length > 0) activeAgentsCount++;
      totalUtil += a.utilizationPercentage;
    }

    const averageUtilization = agents.length > 0 ? Math.round(totalUtil / agents.length) : 0;

    return {
      totalAgents: agents.length,
      activeAgentsCount,
      totalActiveTasks: totalActive,
      averageUtilization,
      agents,
    };
  }
}
