// ==========================================================
// services/api/src/engineering/manager/portfolio.service.ts
// Phase 17: Multi-Project Portfolio & Health Signals Management
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  ManagedProject,
  PortfolioSummary,
  ProjectHealthSignals,
  ProjectHealthStatus,
  ProjectPriorityLevel,
} from './engineering-manager.types.js';

@Injectable()
export class PortfolioService {
  private readonly logger = new StructuredLogger('PortfolioService');
  private readonly projects = new Map<string, ManagedProject>();

  constructor() {
    this.seedDefaultPortfolio();
  }

  private seedDefaultPortfolio(): void {
    const cur = process.cwd();
    let root = path.resolve(cur);
    while (root !== path.dirname(root)) {
      if (fs.existsSync(path.join(root, 'fixtures', 'demo-calc-repo'))) {
        break;
      }
      root = path.dirname(root);
    }

    const simmaciRepo = fs.existsSync(path.resolve(root, 'fixtures/ai-engineering-repo'))
      ? path.resolve(root, 'fixtures/ai-engineering-repo')
      : path.resolve(root, 'fixtures/demo-calc-repo');

    const demoCalcRepo = path.resolve(root, 'fixtures/demo-calc-repo');
    const benchmarkRepo = path.resolve(root, 'services/api/fixtures/benchmark-repo');
    const ilmoraRepo = fs.existsSync(benchmarkRepo) ? benchmarkRepo : demoCalcRepo;

    // 1. SIMMACI (Core Academic System)
    const simmaci: ManagedProject = {
      projectId: 'PRJ-SIMMACI',
      name: 'SIMMACI Enterprise Academic',
      slug: 'simmaci',
      repositoryPath: simmaciRepo,
      defaultBranch: 'main',
      framework: 'Node.js / Express',
      language: 'TypeScript / JavaScript',
      testCommand: 'node --test test/auth.test.js',
      buildCommand: 'npm run build',
      priority: {
        level: 'CRITICAL',
        reason: 'Core customer production academic portal with active user traffic',
        setBy: 'Ayub (Owner)',
        updatedAt: new Date().toISOString(),
      },
      health: 'HEALTHY',
      signals: {
        activeTasks: 0,
        queuedTasks: 0,
        blockedTasks: 0,
        failedTasks: 0,
        repeatedFailures: 0,
        pendingApprovals: 0,
        healthScore: 100,
        lastActivityAt: new Date().toISOString(),
      },
      assignedLeadAgent: 'Farhan Hakim (BE Engineer)',
      techStack: ['Node.js', 'Express', 'PostgreSQL', 'TypeScript'],
      knownConstraints: [
        'Maintain backward compatibility for student token validation',
        'Fail closed on unauthenticated session access',
        'Strict worktree isolation during builds',
      ],
      recurringBugs: [
        'Token refresh bug returning null session under high concurrence',
      ],
      architectureNotes: 'Central university workflow platform with decree generation and student transcripts.',
    };
    this.registerProject(simmaci);

    // 2. ILMORA (Frontend & Learning Experience)
    const ilmora: ManagedProject = {
      projectId: 'PRJ-ILMORA',
      name: 'ILMORA Learning Experience',
      slug: 'ilmora',
      repositoryPath: ilmoraRepo,
      defaultBranch: 'main',
      framework: 'React / Next.js',
      language: 'TypeScript',
      testCommand: 'npm run test',
      buildCommand: 'npm run build',
      priority: {
        level: 'HIGH',
        reason: 'Q4 flagship educational curriculum & adaptive assessment system',
        setBy: 'Ayub (Owner)',
        updatedAt: new Date().toISOString(),
      },
      health: 'HEALTHY',
      signals: {
        activeTasks: 0,
        queuedTasks: 0,
        blockedTasks: 0,
        failedTasks: 0,
        repeatedFailures: 0,
        pendingApprovals: 0,
        healthScore: 100,
        lastActivityAt: new Date().toISOString(),
      },
      assignedLeadAgent: 'Nadia Putri (FE Engineer)',
      techStack: ['Next.js', 'React', 'TailwindCSS', 'TypeScript'],
      knownConstraints: [
        'Zero bundle size regressions (>10% requires approval)',
        'Responsive layout for mobile and tablet viewport',
      ],
      recurringBugs: [
        'Hydration mismatch on dynamic student schedule rendering',
      ],
      architectureNotes: 'Adaptive learning client supporting interactive assessments and video lessons.',
    };
    this.registerProject(ilmora);

    // 3. KDI AI OFFICE (Internal Operating Platform)
    const kdi: ManagedProject = {
      projectId: 'PRJ-KDI',
      name: 'KDI AI Office Operating System',
      slug: 'kdi',
      repositoryPath: root,
      defaultBranch: 'main',
      framework: 'NestJS / React Monorepo',
      language: 'TypeScript',
      testCommand: 'npm test --workspaces',
      buildCommand: 'npm run build --workspaces',
      priority: {
        level: 'HIGH',
        reason: 'Autonomous company operations and engineering control plane infrastructure',
        setBy: 'Ayub (Owner)',
        updatedAt: new Date().toISOString(),
      },
      health: 'HEALTHY',
      signals: {
        activeTasks: 0,
        queuedTasks: 0,
        blockedTasks: 0,
        failedTasks: 0,
        repeatedFailures: 0,
        pendingApprovals: 0,
        healthScore: 100,
        lastActivityAt: new Date().toISOString(),
      },
      assignedLeadAgent: 'Yusuf Arifin (Security Engineer)',
      techStack: ['NestJS', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Redis'],
      knownConstraints: [
        'Zero tolerance for credential leaks in logs or stdout',
        'Typecheck zero errors across all 5 monorepo workspaces',
      ],
      recurringBugs: [],
      architectureNotes: 'Virtual AI company OS with real worktree isolation, security gate, and multi-agent coordination.',
    };
    this.registerProject(kdi);
  }

  public registerProject(project: ManagedProject): void {
    const slug = project.slug.toLowerCase();
    this.projects.set(slug, project);
    this.projects.set(project.projectId.toLowerCase(), project);
    this.logger.info('registerProject', `Registered project ${project.name} (${project.slug}) with priority ${project.priority.level}`);
  }

  public getProject(slugOrId: string): ManagedProject | undefined {
    return this.projects.get(slugOrId.toLowerCase());
  }

  public listProjects(): ManagedProject[] {
    const unique = new Map<string, ManagedProject>();
    for (const p of this.projects.values()) {
      unique.set(p.slug, p);
    }
    return Array.from(unique.values());
  }

  /**
   * Update project priority with full audit trail (§6)
   */
  public updateProjectPriority(
    slugOrId: string,
    level: ProjectPriorityLevel,
    reason: string,
    setBy = 'Ayub (Owner)'
  ): ManagedProject {
    const project = this.getProject(slugOrId);
    if (!project) {
      throw new Error(`Project not found for identifier: ${slugOrId}`);
    }

    project.priority = {
      level,
      reason,
      setBy,
      updatedAt: new Date().toISOString(),
    };

    this.logger.info(
      'updateProjectPriority',
      `Updated priority of ${project.slug} to ${level} by ${setBy}: "${reason}"`
    );
    return project;
  }

  /**
   * Deterministically calculate project health signals from real tasks (§14)
   */
  public updateProjectSignals(
    slug: string,
    partialSignals: Partial<ProjectHealthSignals>
  ): ManagedProject {
    const project = this.getProject(slug);
    if (!project) {
      throw new Error(`Project not found: ${slug}`);
    }

    project.signals = {
      ...project.signals,
      ...partialSignals,
      lastActivityAt: new Date().toISOString(),
    };

    // Calculate deterministic health score (0 - 100)
    // Baseline = 100
    // -15 for each repeated failure (>0 is critical)
    // -10 for each failed task
    // -8 for each blocked task
    // -2 for each pending approval (>3 begins risk)
    let score = 100;
    score -= project.signals.repeatedFailures * 20;
    score -= project.signals.failedTasks * 10;
    score -= project.signals.blockedTasks * 8;
    if (project.signals.pendingApprovals > 2) {
      score -= (project.signals.pendingApprovals - 2) * 5;
    }
    project.signals.healthScore = Math.max(0, Math.min(100, score));

    // Derive deterministic health status (§14)
    if (project.signals.repeatedFailures >= 2 || project.signals.blockedTasks >= 3 || project.signals.healthScore < 50) {
      project.health = 'BLOCKED';
    } else if (project.signals.failedTasks > 0 || project.signals.blockedTasks > 0 || project.signals.healthScore < 80) {
      project.health = 'AT_RISK';
    } else {
      project.health = 'HEALTHY';
    }

    return project;
  }

  /**
   * Aggregate Portfolio Summary (§5 & §15)
   */
  public getPortfolioSummary(): PortfolioSummary {
    const all = this.listProjects();
    let totalActive = 0;
    let totalQueued = 0;
    let totalBlocked = 0;
    let totalApprovals = 0;
    let criticalCount = 0;
    let hasBlocked = false;
    let hasAtRisk = false;

    for (const p of all) {
      totalActive += p.signals.activeTasks;
      totalQueued += p.signals.queuedTasks;
      totalBlocked += p.signals.blockedTasks;
      totalApprovals += p.signals.pendingApprovals;
      if (p.priority.level === 'CRITICAL') {
        criticalCount++;
      }
      if (p.health === 'BLOCKED') {
        hasBlocked = true;
      } else if (p.health === 'AT_RISK') {
        hasAtRisk = true;
      }
    }

    const portfolioHealth: ProjectHealthStatus = hasBlocked
      ? 'BLOCKED'
      : hasAtRisk
        ? 'AT_RISK'
        : 'HEALTHY';

    return {
      totalProjects: all.length,
      projects: all,
      totalActiveTasks: totalActive,
      totalQueuedTasks: totalQueued,
      totalBlockedTasks: totalBlocked,
      totalAwaitingApproval: totalApprovals,
      criticalProjectsCount: criticalCount,
      portfolioHealth,
    };
  }
}
