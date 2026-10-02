import { Injectable, Logger } from '@nestjs/common';
import {
  StrategicObjective,
  StrategicProgram,
  StrategicMilestone,
  ObjectiveHorizon,
  MilestoneStatus,
  TaskPriority,
  RiskLevel,
  OrgObjectiveStatus,
} from '@kdi/types';

export interface TraceabilityResult {
  taskId: string;
  initiativeId?: string;
  milestone?: StrategicMilestone;
  project?: { id: string; name: string };
  program?: StrategicProgram;
  objective?: StrategicObjective;
  rationale: string;
}

@Injectable()
export class StrategicObjectiveService {
  private readonly logger = new Logger(StrategicObjectiveService.name);

  // Authoritative in-memory state (mirrored to PostgreSQL in production)
  private readonly objectives: Map<string, StrategicObjective> = new Map();
  private readonly programs: Map<string, StrategicProgram> = new Map();
  private readonly milestones: Map<string, StrategicMilestone> = new Map();

  // Traceability links: taskId -> { initiativeId, milestoneId, projectId, programId, objectiveId }
  private readonly taskLineage: Map<
    string,
    {
      taskId: string;
      initiativeId: string;
      milestoneId: string;
      projectId: string;
      programId: string;
      objectiveId: string;
      rationale: string;
    }
  > = new Map();

  constructor() {
    this.seedInitialStrategicPortfolio();
  }

  // ==========================================================
  // Strategic Objectives Management (Phase 15 Section 4)
  // ==========================================================

  createObjective(dto: Omit<StrategicObjective, 'createdAt' | 'updatedAt'>): StrategicObjective {
    const now = new Date().toISOString();
    const objective: StrategicObjective = {
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
    this.objectives.set(objective.id, objective);
    this.logger.log(`Created Strategic Objective: [${objective.id}] ${objective.name} (${objective.horizon})`);
    return objective;
  }

  getObjective(id: string): StrategicObjective | undefined {
    return this.objectives.get(id);
  }

  getAllObjectives(): StrategicObjective[] {
    return Array.from(this.objectives.values());
  }

  updateObjectiveStatus(id: string, status: OrgObjectiveStatus, authority: string): StrategicObjective {
    const obj = this.objectives.get(id);
    if (!obj) {
      throw new Error(`Strategic Objective ${id} not found`);
    }
    // Only authorized authority can update strategic objective status
    obj.status = status;
    obj.ownerAuthority = authority;
    obj.updatedAt = new Date().toISOString();
    this.objectives.set(id, obj);
    this.logger.log(`Updated Strategic Objective [${id}] status to ${status} by ${authority}`);
    return obj;
  }

  // ==========================================================
  // Strategic Program Model (Phase 15 Section 6)
  // ==========================================================

  createProgram(dto: Omit<StrategicProgram, 'createdAt'>): StrategicProgram {
    const program: StrategicProgram = {
      ...dto,
      createdAt: new Date().toISOString(),
    };
    this.programs.set(program.id, program);
    this.logger.log(`Created Strategic Program: [${program.id}] ${program.name}`);
    return program;
  }

  getProgram(id: string): StrategicProgram | undefined {
    return this.programs.get(id);
  }

  getAllPrograms(): StrategicProgram[] {
    return Array.from(this.programs.values());
  }

  getProgramsByObjective(objectiveId: string): StrategicProgram[] {
    return Array.from(this.programs.values()).filter((p) => p.objectiveId === objectiveId);
  }

  // ==========================================================
  // Milestone Model (Phase 15 Section 7, 11)
  // ==========================================================

  createMilestone(dto: StrategicMilestone): StrategicMilestone {
    this.milestones.set(dto.id, dto);
    this.logger.log(`Created Strategic Milestone: [${dto.id}] ${dto.name} (${dto.status})`);
    return dto;
  }

  getMilestone(id: string): StrategicMilestone | undefined {
    return this.milestones.get(id);
  }

  getAllMilestones(): StrategicMilestone[] {
    return Array.from(this.milestones.values());
  }

  getMilestonesByProgram(programId: string): StrategicMilestone[] {
    return Array.from(this.milestones.values()).filter((m) => m.programId === programId);
  }

  updateMilestoneHealth(
    id: string,
    status: MilestoneStatus,
    progressPercent: number,
    evidence?: string[]
  ): StrategicMilestone {
    const milestone = this.milestones.get(id);
    if (!milestone) {
      throw new Error(`Milestone ${id} not found`);
    }
    milestone.status = status;
    milestone.progressPercent = progressPercent;
    if (evidence && evidence.length > 0) {
      milestone.evidenceRequirements = Array.from(
        new Set([...milestone.evidenceRequirements, ...evidence])
      );
    }
    if (status === 'COMPLETED' && !milestone.actualCompletionDate) {
      milestone.actualCompletionDate = new Date().toISOString();
    }
    this.milestones.set(id, milestone);
    return milestone;
  }

  // ==========================================================
  // Strategy -> Execution Traceability (Phase 15 Section 5)
  // Answers "Kenapa task ini dikerjakan?"
  // ==========================================================

  registerTraceability(link: {
    taskId: string;
    initiativeId: string;
    milestoneId: string;
    projectId: string;
    programId: string;
    objectiveId: string;
    rationale: string;
  }): void {
    this.taskLineage.set(link.taskId, link);
  }

  explainTaskIntent(taskId: string): TraceabilityResult {
    const link = this.taskLineage.get(taskId);
    if (!link) {
      return {
        taskId,
        rationale: 'Task ini belum terhubung ke Strategic Lineage resmi.',
      };
    }

    const milestone = this.milestones.get(link.milestoneId);
    const program = this.programs.get(link.programId);
    const objective = this.objectives.get(link.objectiveId);

    return {
      taskId,
      initiativeId: link.initiativeId,
      milestone,
      project: { id: link.projectId, name: 'SIMMACI Core' },
      program,
      objective,
      rationale:
        link.rationale ||
        `Task [${taskId}] dikerjakan untuk mendukung Milestone [${milestone?.name || link.milestoneId}], bagian dari Program [${program?.name || link.programId}], demi mencapai Strategic Objective [${objective?.name || link.objectiveId}].`,
    };
  }

  // ==========================================================
  // Seed Authoritative Strategic Portfolio
  // ==========================================================

  private seedInitialStrategicPortfolio(): void {
    // 1. Primary Long-Horizon Objective: SIMMACI Reliability
    const objReliability: StrategicObjective = {
      id: 'OBJ-SIMMACI-REL',
      name: 'Improve SIMMACI reliability',
      description: 'Zero recurring production incidents, zero downtime connection failover, and sub-100ms response time.',
      owner: 'Owner / Chief Architect',
      horizon: 'MEDIUM',
      strategicIntent: 'Transform SIMMACI from a functional Madrasah system into an enterprise-grade resilient platform.',
      successDefinition: [
        'Zero connection pool exhaustion incidents under peak loads',
        '99.9% uptime across all Madrasah academic workflows',
        'Full test automation coverage > 85%',
        'Automated failover recovery within 3 seconds',
      ],
      constraints: [
        'Budget limit $10,000 USD',
        'No direct schema mutation on live production during peak hours',
        'All changes must pass security static analysis',
      ],
      budgetLimitUsd: 10000,
      resourceLimitHours: 600,
      deadline: '2026-12-31T23:59:59Z',
      milestonesCount: 5,
      riskTolerance: 'MEDIUM',
      ownerAuthority: 'OWNER_ONLY',
      reviewCadence: 'WEEKLY',
      status: 'IN_PROGRESS',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };
    this.objectives.set(objReliability.id, objReliability);

    // 2. Program: Reliability Improvement
    const progReliability: StrategicProgram = {
      id: 'PROG-REL-01',
      name: 'Reliability Improvement Program',
      objectiveId: 'OBJ-SIMMACI-REL',
      owner: 'Farhan (Chief AI Architect)',
      description: 'End-to-end reliability hardening covering database connection pool, graceful sockets, and automated runbooks.',
      startDate: '2026-09-01',
      targetDate: '2026-12-15',
      status: 'ACTIVE',
      priority: 'HIGH',
      budgetUsd: 6500,
      resourceConstraints: ['Engineering capacity <= 80h/week', 'QA capacity <= 40h/week'],
      successCriteria: [
        'Zero connection pool leaks',
        'Automated failover in < 3s',
        'Verified E2E test pass rate 100%',
      ],
      riskProfile: 'MEDIUM',
      createdAt: '2026-09-01T00:00:00Z',
    };
    this.programs.set(progReliability.id, progReliability);

    // 3. Milestones under Program
    const m1: StrategicMilestone = {
      id: 'MS-SIM-01',
      programId: 'PROG-REL-01',
      projectId: 'SIMMACI',
      name: 'Connection Lifecycle & Pool Hardening',
      description: 'Audit and refactor database pool lifecycle, timeout thresholds, and graceful release.',
      targetDate: '2026-09-15',
      actualCompletionDate: '2026-09-14',
      successCriteria: ['No connection leaks under 500 concurrent simulated queries', 'Pool metric exporter online'],
      dependencies: [],
      status: 'COMPLETED',
      risk: 'LOW',
      evidenceRequirements: ['Load test report pool_test_pass.json', 'Code review by Farhan'],
      progressPercent: 100,
    };

    const m2: StrategicMilestone = {
      id: 'MS-SIM-02',
      programId: 'PROG-REL-01',
      projectId: 'SIMMACI',
      name: 'Socket Keepalive & Graceful Teardown',
      description: 'Implement bi-directional heartbeat and zero-loss socket reconnection in WA blast and realtime sync.',
      targetDate: '2026-09-25',
      actualCompletionDate: '2026-09-24',
      successCriteria: ['Zero zombie socket connections', 'Client auto-reconnect within 1.5s'],
      dependencies: ['MS-SIM-01'],
      status: 'COMPLETED',
      risk: 'LOW',
      evidenceRequirements: ['Socket stress test report', 'Integration test suite passed'],
      progressPercent: 100,
    };

    const m3: StrategicMilestone = {
      id: 'MS-SIM-03',
      programId: 'PROG-REL-01',
      projectId: 'SIMMACI',
      name: 'E2E Failover & Load Stress Benchmarks',
      description: 'Simulate database primary failover and measure recovery continuity.',
      targetDate: '2026-09-30',
      actualCompletionDate: '2026-09-30',
      successCriteria: ['Failover completed in < 3 seconds', 'No dropped transactions'],
      dependencies: ['MS-SIM-02'],
      status: 'COMPLETED',
      risk: 'MEDIUM',
      evidenceRequirements: ['Failover test log in staging', 'Grafana dashboard telemetry'],
      progressPercent: 100,
    };

    const m4: StrategicMilestone = {
      id: 'MS-SIM-04',
      programId: 'PROG-REL-01',
      projectId: 'SIMMACI',
      name: 'QA Verification & Automated Security Review',
      description: 'Execute end-to-end regression test suite, fuzz testing, and OWASP security review.',
      targetDate: '2026-10-05',
      successCriteria: ['Full suite pass rate 100%', 'Zero high-severity vulnerabilities'],
      dependencies: ['MS-SIM-03'],
      status: 'AT_RISK', // Deliberate Section 65 alignment: QA verification is 4 days behind baseline
      risk: 'HIGH',
      evidenceRequirements: ['QA regression runbook', 'Security scan artifact'],
      progressPercent: 65,
    };

    const m5: StrategicMilestone = {
      id: 'MS-SIM-05',
      programId: 'PROG-REL-01',
      projectId: 'SIMMACI',
      name: 'Production Rollout & Zero-Outage Sign-off',
      description: 'Canary deployment to production cluster, metric verification, and owner sign-off.',
      targetDate: '2026-10-15',
      successCriteria: ['Canary health 100%', 'Owner approval signature logged'],
      dependencies: ['MS-SIM-04'],
      status: 'ON_TRACK',
      risk: 'MEDIUM',
      evidenceRequirements: ['Canary telemetry logs', 'Owner cryptographic approval'],
      progressPercent: 10,
    };

    this.milestones.set(m1.id, m1);
    this.milestones.set(m2.id, m2);
    this.milestones.set(m3.id, m3);
    this.milestones.set(m4.id, m4);
    this.milestones.set(m5.id, m5);

    // Register initial task lineages for traceability
    this.registerTraceability({
      taskId: 'TASK-POOL-REFACTOR',
      initiativeId: 'INIT-POOL-01',
      milestoneId: 'MS-SIM-01',
      projectId: 'SIMMACI',
      programId: 'PROG-REL-01',
      objectiveId: 'OBJ-SIMMACI-REL',
      rationale: 'Mengganti connection acquisition timeout dari 30s ke 5s dan menerapkan connection pooling pool-size dynamic.',
    });

    this.registerTraceability({
      taskId: 'TASK-QA-SEC-VERIFY',
      initiativeId: 'INIT-SEC-02',
      milestoneId: 'MS-SIM-04',
      projectId: 'SIMMACI',
      programId: 'PROG-REL-01',
      objectiveId: 'OBJ-SIMMACI-REL',
      rationale: 'Menjalankan verification queue setelah security review mendalam pada modul otentikasi SIMMACI.',
    });
  }
}
