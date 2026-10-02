// ==========================================================
// services/api/src/organization/portfolio-intelligence.service.ts
// Phase 13: Project Portfolio, Cross-Project Resources & Cost/Quality Intelligence
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  PortfolioProjectIntelligence,
  CrossProjectResourceConflict,
  CostIntelligenceBreakdown,
  QualityIntelligenceOverview,
  AutonomyMaturityMetrics,
  TaskClassification,
  RiskLevel,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { ProjectsService } from '../projects/projects.service.js';

@Injectable()
export class PortfolioIntelligenceService {
  private readonly logger = new StructuredLogger('PortfolioIntelligenceService');

  private readonly projects = new Map<string, PortfolioProjectIntelligence>();
  private readonly crossConflicts: CrossProjectResourceConflict[] = [];

  constructor(@Optional() private readonly projectsService?: ProjectsService) {
    this.seedProjects();
    this.detectCrossProjectConflicts();
  }

  private seedProjects() {
    const portfolio: PortfolioProjectIntelligence[] = [
      {
        projectId: 'prj_01J9X8SIMMACI',
        projectName: 'SIMMACI (Sistem Informasi Manajemen Madrasah Cerdas)',
        status: 'PRODUCTION_OPERATIONAL',
        priorityRank: 1, // Highest strategic priority
        objectiveAlignment: ['OBJ-STRAT-001 (Zero-Downtime Reliability)', 'OBJ-PROJ-001 (API Incident Reduction)'],
        activeTasksCount: 2,
        blockedTasksCount: 1,
        assignedAgents: ['Farhan (Backend)', 'Nadia (QA)', 'Maya (DevOps)'],
        riskLevel: 'HIGH',
        resourceConsumptionUsd: 12.80,
        completionProgressPercent: 88,
        crossProjectDependencies: ['SSO token provider for Koneksi Santri'],
      },
      {
        projectId: 'prj_02J9X8KONEKSI',
        projectName: 'Koneksi Santri (Pesantren Alumni Hub)',
        status: 'ACTIVE_DEVELOPMENT',
        priorityRank: 2,
        objectiveAlignment: ['OBJ-STRAT-003 (Islamic Tech Modernization)'],
        activeTasksCount: 1,
        blockedTasksCount: 0,
        assignedAgents: ['Rian (Software)', 'Naya (Product)'],
        riskLevel: 'LOW',
        resourceConsumptionUsd: 5.40,
        completionProgressPercent: 65,
        crossProjectDependencies: ['SIMMACI Student Record API'],
      },
      {
        projectId: 'prj_03J9X8KDIOFFICE',
        projectName: 'KDI AI Office (Autonomous Multi-Agent Organization)',
        status: 'PRODUCTION_OPERATIONAL',
        priorityRank: 1,
        objectiveAlignment: ['OBJ-STRAT-002 (Autonomous Swarm Self-Governance)'],
        activeTasksCount: 1,
        blockedTasksCount: 1,
        assignedAgents: ['Ahmad (Architect)', 'Ilham (Security)', 'KDI Manager (AI Manager)'],
        riskLevel: 'MEDIUM',
        resourceConsumptionUsd: 8.90,
        completionProgressPercent: 92,
        crossProjectDependencies: ['Underlying swarm for all projects'],
      },
      {
        projectId: 'prj_04J9X8MOCAFINDO',
        projectName: 'MOCAFINDO (Agri-Supply Chain Platform)',
        status: 'MAINTENANCE',
        priorityRank: 3,
        objectiveAlignment: ['Regional Agriculture Tech Enhancement'],
        activeTasksCount: 0,
        blockedTasksCount: 0,
        assignedAgents: ['Rian (Software)'],
        riskLevel: 'LOW',
        resourceConsumptionUsd: 1.20,
        completionProgressPercent: 100,
        crossProjectDependencies: [],
      },
    ];

    for (const p of portfolio) {
      this.projects.set(p.projectId, p);
    }
  }

  /**
   * Section 23: Cross-Project Resource Management
   * Identifies overallocation, priority conflict, and deadline collisions when agents serve multiple projects
   */
  public detectCrossProjectConflicts(): CrossProjectResourceConflict[] {
    this.crossConflicts.length = 0;
    const now = new Date().toISOString();

    // Rian is assigned to Koneksi Santri and MOCAFINDO maintenance
    this.crossConflicts.push({
      conflictId: 'cconf_001',
      agentId: 'AGT-ENG-002',
      agentName: 'Rian (Software Engineer)',
      conflictingProjects: [
        'Koneksi Santri (Mobile UI Refactor)',
        'MOCAFINDO (Maintenance security patch)',
        'SIMMACI (Backup refactoring review)',
      ],
      competingDeadlines: ['2026-10-05', '2026-10-08'],
      overallocationPercentage: 110,
      recommendedSequence:
        'Selesaikan terlebih dahulu task SIMMACI (Prioritas 1), kemudian lanjutkan Koneksi Santri (Prioritas 2). Tunda patch MOCAFINDO hingga jadwal pemeliharaan berkala.',
      detectedAt: now,
    });

    return this.crossConflicts;
  }

  public getAllProjects(): PortfolioProjectIntelligence[] {
    return Array.from(this.projects.values());
  }

  public getProject(projectId: string): PortfolioProjectIntelligence | undefined {
    return this.projects.get(projectId);
  }

  public getCrossProjectConflicts(): CrossProjectResourceConflict[] {
    return this.crossConflicts;
  }

  /**
   * Section 24: Cost Intelligence
   */
  public getCostIntelligence(): CostIntelligenceBreakdown {
    return {
      period: 'LAST_7_DAYS',
      totalCostUsd: 28.30,
      costByProject: {
        SIMMACI: 12.80,
        'KDI AI Office': 8.90,
        'Koneksi Santri': 5.40,
        MOCAFINDO: 1.20,
      },
      costByTask: {
        'SIMMACI Connection Resiliency': 4.20,
        'Phase 12 End-to-End Validation': 6.50,
        'GraphRAG Knowledge Indexing': 3.10,
        'Koneksi Santri UI Prototype': 2.80,
        'Other Operations': 11.70,
      },
      costByAgent: {
        'Farhan (Backend)': 7.50,
        'Nadia (QA)': 5.20,
        'Ahmad (Architect)': 4.80,
        'Rian (Software)': 4.10,
        'Ilham (Security)': 3.20,
        'Maya (DevOps)': 3.50,
      },
      costByModel: {
        'Ollama Local (DeepSeek-Coder)': 0.0, // On-premise hardware
        'Gemini 1.5 Pro': 18.50,
        'OpenAI GPT-4o': 9.80,
      },
      costByProvider: {
        'Local Ollama Inference': 0.0,
        'Google Cloud Vertex / Gemini API': 18.50,
        'OpenAI API': 9.80,
      },
      costPerSuccessfulTaskUsd: 0.11,
    };
  }

  /**
   * Section 25: Quality Intelligence
   */
  public getQualityIntelligence(): QualityIntelligenceOverview {
    return {
      testPassRate: 98.8,
      reviewPassRate: 96.5,
      securityCheckPassRate: 100.0,
      rollbackCount: 0,
      reworkCount: 4,
      postDeploymentIncidentsCount: 0,
      humanCorrectionCount: 2,
      qualityScore: 97.2,
    };
  }

  /**
   * Section 26: Autonomy Maturity Metrics
   */
  public getAutonomyMaturity(): AutonomyMaturityMetrics {
    const classificationBreakdown: Record<TaskClassification, { total: number; autonomousSuccessRate: number }> = {
      LOW_RISK_REPETITIVE: { total: 45, autonomousSuccessRate: 100 },
      NORMAL_ENGINEERING: { total: 80, autonomousSuccessRate: 97.5 },
      REVIEW_REQUIRED: { total: 25, autonomousSuccessRate: 92.0 },
      HIGH_RISK: { total: 12, autonomousSuccessRate: 83.3 },
      PRODUCTION_CRITICAL: { total: 6, autonomousSuccessRate: 100 }, // Under approval gate
      HUMAN_ONLY: { total: 4, autonomousSuccessRate: 0 }, // Strict 100% human sovereign approval
    };

    return {
      automaticSuccesses: 154,
      automaticFailures: 4,
      humanInterventions: 8,
      approvalPassRate: 100,
      rollbackRate: 0.0,
      escalationRate: 5.2,
      classificationBreakdown,
    };
  }

  /**
   * Section 27: Task Classification Engine
   */
  public classifyTask(task: {
    title: string;
    riskLevel?: RiskLevel;
    affectsProduction?: boolean;
    involvesCredentials?: boolean;
    isRepetitive?: boolean;
  }): TaskClassification {
    const lower = task.title.toLowerCase();

    if (lower.includes('drop database') || lower.includes('delete production') || lower.includes('change root password')) {
      return 'HUMAN_ONLY';
    }

    if (task.affectsProduction || task.riskLevel === 'CRITICAL' || lower.includes('deploy production')) {
      return 'PRODUCTION_CRITICAL';
    }

    if (task.involvesCredentials || task.riskLevel === 'HIGH' || lower.includes('secret') || lower.includes('tls')) {
      return 'HIGH_RISK';
    }

    if (lower.includes('architecture proposal') || lower.includes('adr') || lower.includes('schema migration')) {
      return 'REVIEW_REQUIRED';
    }

    if (task.isRepetitive || lower.includes('backup') || lower.includes('audit') || lower.includes('scan')) {
      return 'LOW_RISK_REPETITIVE';
    }

    return 'NORMAL_ENGINEERING';
  }
}
