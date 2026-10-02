// ==========================================================
// services/api/src/organization/objective.service.ts
// Phase 13: Objective Domain Model & Task Traceability Service
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  OrgObjective,
  Initiative,
  TaskObjectiveTrace,
  OrgObjectiveType,
  OrgObjectiveStatus,
  OrganizationalHierarchyLevel,
  RiskLevel,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

@Injectable()
export class ObjectiveService {
  private readonly logger = new StructuredLogger('ObjectiveService');

  // In-memory operational store backed by Postgres in production
  private readonly objectives = new Map<string, OrgObjective>();
  private readonly initiatives = new Map<string, Initiative>();
  private readonly taskToInitiativeMap = new Map<string, string>(); // taskId -> initiativeId

  constructor() {
    this.seedCanonicalObjectives();
  }

  private seedCanonicalObjectives() {
    const now = new Date().toISOString();

    // 1. VISION
    const vision: OrgObjective = {
      id: 'OBJ-VIS-001',
      name: 'World-Class Sovereign Autonomous AI Organization',
      description: 'Establish KDI AI Office as the sovereign, self-improving autonomous engineering workforce for digital ecosystems in Indonesia.',
      owner: 'OWNER',
      hierarchyLevel: 'VISION',
      type: 'STRATEGIC',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      startDate: '2026-01-01T00:00:00Z',
      targetDate: '2026-12-31T23:59:59Z',
      successCriteria: [
        'Autonomous multi-agent lifecycle across engineering, verification, and governance',
        'Zero production downtime incidents caused by autonomous agents',
        'Cryptographic human approval gates for critical infrastructure actions',
      ],
      measurementMethod: 'Autonomous Task Success Rate & Production MTTR',
      riskLevel: 'MEDIUM',
      progressPercentage: 85,
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(vision.id, vision);

    // 2. STRATEGIC OBJECTIVES
    const strat1: OrgObjective = {
      id: 'OBJ-STRAT-001',
      name: 'SIMMACI Production Reliability & Incident Zero-Downtime',
      description: 'Ensure SIMMACI (Smart Madrasah ERP) maintains 99.9% uptime, resilient database pooling, and seamless API performance.',
      owner: 'OWNER',
      parentObjectiveId: vision.id,
      hierarchyLevel: 'STRATEGIC',
      type: 'ENGINEERING',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      startDate: '2026-02-01T00:00:00Z',
      targetDate: '2026-11-30T23:59:59Z',
      successCriteria: [
        'API error rate < 0.05%',
        'Auth service Redis connection resiliency under burst traffic',
        'All migration scripts executed through isolated worktrees with 100% verification pass',
      ],
      measurementMethod: 'Uptime SLA & Incident Frequency in Production',
      riskLevel: 'HIGH',
      progressPercentage: 82,
      projectId: 'prj_01J9X8SIMMACI',
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(strat1.id, strat1);

    const strat2: OrgObjective = {
      id: 'OBJ-STRAT-002',
      name: 'KDI AI Autonomous Swarm Self-Governance & Engineering Excellence',
      description: 'Maturity of autonomous decision-making, deterministic priority, real workforce capacity balancing, and GraphRAG organizational memory.',
      owner: 'AI_MANAGER',
      parentObjectiveId: vision.id,
      hierarchyLevel: 'STRATEGIC',
      type: 'OPERATIONAL',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      startDate: '2026-03-01T00:00:00Z',
      targetDate: '2026-12-31T23:59:59Z',
      successCriteria: [
        'Deterministic priority calculation with explainable multi-dimensional factors',
        'Real-time capacity tracking preventing worker overload',
        'Zero autonomous policy violations and prompt injection immunity',
      ],
      measurementMethod: 'Autonomy Maturity Index & Workforce Utilization Metrics',
      riskLevel: 'LOW',
      progressPercentage: 90,
      projectId: 'prj_03J9X8KDIOFFICE',
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(strat2.id, strat2);

    const strat3: OrgObjective = {
      id: 'OBJ-STRAT-003',
      name: 'Koneksi Santri Islamic Tech Platform Modernization',
      description: 'Deliver the decentralized community and education hub for pesantren alumni with modern React architecture.',
      owner: 'PRODUCT_MANAGER',
      parentObjectiveId: vision.id,
      hierarchyLevel: 'STRATEGIC',
      type: 'PRODUCT',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      startDate: '2026-04-01T00:00:00Z',
      targetDate: '2026-10-31T23:59:59Z',
      successCriteria: [
        'Mobile-friendly responsive UI for santri network',
        'Verified integration with SIMMACI student records',
      ],
      measurementMethod: 'Feature Delivery Velocity & User Engagement',
      riskLevel: 'LOW',
      progressPercentage: 65,
      projectId: 'prj_02J9X8KONEKSI',
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(strat3.id, strat3);

    // 3. PROJECT OBJECTIVE (Child of STRAT-001)
    const projObj1: OrgObjective = {
      id: 'OBJ-PROJ-001',
      name: 'Reduce SIMMACI API Incidents & Connection Leakage',
      description: 'Surgically refactor connection handling in auth and pickup services to prevent connection starvation and timeout spikes.',
      owner: 'SYSTEM_ARCHITECT',
      parentObjectiveId: strat1.id,
      hierarchyLevel: 'PROJECT',
      type: 'ENGINEERING',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      startDate: '2026-09-01T00:00:00Z',
      targetDate: '2026-10-15T23:59:59Z',
      successCriteria: [
        'Zero idle connection leaks in PostgreSQL pool',
        'Exponential backoff retry configured for Redis session caching',
      ],
      measurementMethod: 'Connection Pool Metrics & Synthetic Load Pass Rate',
      riskLevel: 'MEDIUM',
      progressPercentage: 75,
      projectId: 'prj_01J9X8SIMMACI',
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(projObj1.id, projObj1);

    // 4. INITIATIVES
    const init1: Initiative = {
      id: 'INIT-001',
      objectiveId: projObj1.id,
      name: 'SIMMACI Redis Connection Hardening & Retry Loop',
      description: 'Implement exponential backoff retry policy on auth-service and patch PickupService null pointer exception.',
      status: 'IN_PROGRESS',
      owner: 'BACKEND_ENGINEER',
      targetDate: '2026-10-05T00:00:00Z',
      taskIds: ['tsk_01J9X8A1B2C3', 'tsk_pilot_A', 'tsk_pilot_B'],
      createdAt: now,
      updatedAt: now,
    };
    this.initiatives.set(init1.id, init1);

    const init2: Initiative = {
      id: 'INIT-002',
      objectiveId: strat2.id,
      name: 'Deterministic Workforce Capacity & Priority Engine Deployment',
      description: 'Implement mathematical priority scoring, real capacity allocation, and bottleneck detection across all digital agents.',
      status: 'IN_PROGRESS',
      owner: 'AI_MANAGER',
      targetDate: '2026-10-02T00:00:00Z',
      taskIds: ['tsk_p13_priority', 'tsk_p13_capacity', 'tsk_p13_kpi'],
      createdAt: now,
      updatedAt: now,
    };
    this.initiatives.set(init2.id, init2);

    // Link tasks to initiatives
    this.taskToInitiativeMap.set('tsk_01J9X8A1B2C3', init1.id);
    this.taskToInitiativeMap.set('tsk_pilot_A', init1.id);
    this.taskToInitiativeMap.set('tsk_pilot_B', init1.id);
    this.taskToInitiativeMap.set('tsk_p13_priority', init2.id);
    this.taskToInitiativeMap.set('tsk_p13_capacity', init2.id);
    this.taskToInitiativeMap.set('tsk_p13_kpi', init2.id);
  }

  public getAllObjectives(): OrgObjective[] {
    return Array.from(this.objectives.values());
  }

  public getObjectiveById(id: string): OrgObjective | undefined {
    return this.objectives.get(id);
  }

  public getObjectivesByLevel(level: OrganizationalHierarchyLevel): OrgObjective[] {
    return Array.from(this.objectives.values()).filter((o) => o.hierarchyLevel === level);
  }

  public getObjectivesByProject(projectId: string): OrgObjective[] {
    return Array.from(this.objectives.values()).filter((o) => o.projectId === projectId);
  }

  public getAtRiskObjectives(): OrgObjective[] {
    return Array.from(this.objectives.values()).filter(
      (o) => o.status === 'AT_RISK' || (o.riskLevel === 'HIGH' && o.progressPercentage < 50)
    );
  }

  public createObjective(input: Omit<OrgObjective, 'id' | 'createdAt' | 'updatedAt'>): OrgObjective {
    const id = `OBJ-${input.type.substring(0, 4)}-${Date.now()}`;
    const now = new Date().toISOString();
    const objective: OrgObjective = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(id, objective);
    this.logger.info('createObjective', `Created new objective: ${id} ("${objective.name}")`);
    return objective;
  }

  public updateObjective(id: string, updates: Partial<OrgObjective>): OrgObjective | undefined {
    const existing = this.objectives.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.objectives.set(id, updated);
    return updated;
  }

  // Initiatives
  public getAllInitiatives(): Initiative[] {
    return Array.from(this.initiatives.values());
  }

  public getInitiativesByObjective(objectiveId: string): Initiative[] {
    return Array.from(this.initiatives.values()).filter((i) => i.objectiveId === objectiveId);
  }

  public createInitiative(input: Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>): Initiative {
    const id = `INIT-${Date.now()}`;
    const now = new Date().toISOString();
    const initiative: Initiative = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.initiatives.set(id, initiative);
    for (const taskId of input.taskIds) {
      this.taskToInitiativeMap.set(taskId, id);
    }
    return initiative;
  }

  public linkTaskToInitiative(taskId: string, initiativeId: string): boolean {
    const init = this.initiatives.get(initiativeId);
    if (!init) return false;
    if (!init.taskIds.includes(taskId)) {
      init.taskIds.push(taskId);
      init.updatedAt = new Date().toISOString();
    }
    this.taskToInitiativeMap.set(taskId, initiativeId);
    return true;
  }

  /**
   * Trace any task back to its initiative, project objective, strategic objective, and vision
   * Answers Section 5: "Task ini sebenarnya berkontribusi ke tujuan apa?"
   */
  public getTaskObjectiveTrace(taskId: string, taskTitle = 'Task Execution'): TaskObjectiveTrace {
    const initiativeId = this.taskToInitiativeMap.get(taskId);
    if (!initiativeId) {
      // Return default organization operational trace if not explicitly linked
      const defaultStrat = this.objectives.get('OBJ-STRAT-002') || Array.from(this.objectives.values())[0];
      return {
        taskId,
        taskTitle,
        objectiveId: defaultStrat.id,
        objectiveName: defaultStrat.name,
        parentObjectiveName: 'World-Class Sovereign Autonomous AI Organization',
        strategicAlignmentReason: 'Autonomous swarming operational excellence and system health maintenance',
      };
    }

    const initiative = this.initiatives.get(initiativeId)!;
    const objective = this.objectives.get(initiative.objectiveId);
    let parentObjectiveName: string | undefined;

    if (objective?.parentObjectiveId) {
      const parent = this.objectives.get(objective.parentObjectiveId);
      parentObjectiveName = parent?.name;
    }

    return {
      taskId,
      taskTitle,
      initiativeId: initiative.id,
      initiativeName: initiative.name,
      objectiveId: objective?.id || 'OBJ-GENERIC',
      objectiveName: objective?.name || 'General Engineering Objective',
      parentObjectiveName,
      strategicAlignmentReason: `Berkontribusi langsung ke inisiatif "${initiative.name}" dalam kerangka tujuan "${objective?.name || 'Strategis'}"`,
    };
  }

  /**
   * Returns a complete hierarchical representation of objectives
   */
  public getObjectiveHierarchy(): Array<OrgObjective & { children: Array<OrgObjective & { initiativeDetails: Initiative[] }> }> {
    const topLevel = Array.from(this.objectives.values()).filter((o) => !o.parentObjectiveId);

    return topLevel.map((parent) => {
      const children = Array.from(this.objectives.values())
        .filter((o) => o.parentObjectiveId === parent.id)
        .map((child) => ({
          ...child,
          initiativeDetails: this.getInitiativesByObjective(child.id),
        }));

      return {
        ...parent,
        children,
      };
    });
  }
}
