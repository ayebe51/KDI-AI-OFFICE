// ==========================================================
// services/api/src/engineering/operating-system/project-knowledge.service.ts
// Phase 16: Project-Centric Workspace & Knowledge Registry
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { ProjectProfile } from './engineering-os.types.js';

@Injectable()
export class ProjectKnowledgeService {
  private readonly logger = new StructuredLogger('ProjectKnowledgeService');
  private readonly projects = new Map<string, ProjectProfile>();
  private readonly projectCache = new Map<string, { profile: ProjectProfile; timestamp: number }>();
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor() {
    this.seedDefaultProjects();
  }

  private seedDefaultProjects(): void {
    const cur = process.cwd();
    let root = path.resolve(cur);
    while (root !== path.dirname(root)) {
      if (fs.existsSync(path.join(root, 'fixtures', 'demo-calc-repo'))) {
        break;
      }
      root = path.dirname(root);
    }

    // 1. SIMMACI Project Profile (Mapped to AI engineering fixture / production repo)
    const simmaciCandidate = path.resolve(root, 'fixtures/ai-engineering-repo');
    const simmaciFallback = path.resolve(root, 'fixtures/demo-calc-repo');
    const simmaciRepoPath = fs.existsSync(simmaciCandidate) ? simmaciCandidate : simmaciFallback;

    const simmaciProfile: ProjectProfile = {
      projectId: 'prj_01_simmaci',
      name: 'SIMMACI',
      slug: 'simmaci',
      repositoryPath: simmaciRepoPath,
      defaultBranch: 'main',
      framework: 'Node.js / Express',
      language: 'JavaScript / TypeScript',
      testCommand: 'node --test test/auth.test.js',
      buildCommand: 'npm run build',
      architectureNotes:
        'SIMMACI enterprise academic ecosystem: auth-service with token validation, student evaluation, decree export.',
      knownConstraints: [
        'Respect worktree isolation at all times',
        'Preserve backwards compatibility for authentication tokens',
        'Do not modify database credentials or .env files',
        'No direct commits to main branch',
      ],
      recurringBugs: [
        'Login 500 error due to token refresh failure returning null',
        'Session pool timeout under high concurrence',
      ],
      assignedLeadAgent: 'Farhan Hakim (BE Engineer)',
      allowedDirectories: ['src/**', 'test/**', 'packages/**'],
      environment: { NODE_ENV: 'test' },
    };
    this.projects.set('simmaci', simmaciProfile);
    this.projects.set('simmaci-academic', simmaciProfile);
    this.projects.set('prj_01_simmaci', simmaciProfile);

    // 2. Demo Calculator Project Profile
    const calcRepoPath = path.resolve(root, 'fixtures/demo-calc-repo');
    const calcProfile: ProjectProfile = {
      projectId: 'prj_demo_calc',
      name: 'Demo Calculator',
      slug: 'demo-calc-repo',
      repositoryPath: calcRepoPath,
      defaultBranch: 'main',
      framework: 'Node.js',
      language: 'JavaScript',
      testCommand: 'node --test test/calculator.test.js',
      architectureNotes: 'Core calculation utility modules for math operations and percentage scoring.',
      knownConstraints: [
        'Handle division by zero safely without uncaught crashes',
        'Keep percentage calculation accurate with 100 multiplier',
        'Zero regression on existing arithmetic test suites',
      ],
      recurringBugs: [
        'Percentage calculation returns ratio without multiplying by 100',
        'Division by zero throws unhandled exception',
      ],
      assignedLeadAgent: 'Farhan Hakim (BE Engineer)',
      allowedDirectories: ['src/**', 'test/**'],
    };
    this.projects.set('demo-calc-repo', calcProfile);
    this.projects.set('calculator', calcProfile);
    this.projects.set('calc', calcProfile);

    // 3. AI Engineering Repo
    const aiEngRepoPath = path.resolve(root, 'fixtures/ai-engineering-repo');
    const aiEngProfile: ProjectProfile = {
      projectId: 'prj_ai_engineering',
      name: 'AI Engineering Core',
      slug: 'ai-engineering-repo',
      repositoryPath: aiEngRepoPath,
      defaultBranch: 'main',
      framework: 'Node.js',
      language: 'JavaScript',
      testCommand: 'node --test test/auth.test.js',
      architectureNotes: 'Authentication engine and session token management service.',
      knownConstraints: [
        'Maintain cryptographic security standards',
        'Zero credential leakage in logs or responses',
      ],
      recurringBugs: [
        'Token refresh bug returning null session instead of persisted token',
      ],
      assignedLeadAgent: 'Farhan Hakim (BE Engineer)',
      allowedDirectories: ['src/**', 'test/**'],
    };
    this.projects.set('ai-engineering-repo', aiEngProfile);
    this.projects.set('auth-service', aiEngProfile);

    // 4. KDI AI Office Root Monorepo
    const rootProfile: ProjectProfile = {
      projectId: 'prj_kdi_office',
      name: 'KDI AI Office',
      slug: 'kdi-ai-office',
      repositoryPath: root,
      defaultBranch: 'main',
      framework: 'NestJS / React / Next.js',
      language: 'TypeScript',
      testCommand: 'npm run test --workspaces',
      buildCommand: 'npm run build --workspaces',
      architectureNotes: 'Living Virtual Office & Autonomous Multi-Agent Software Development Platform.',
      knownConstraints: [
        'Strict typecheck with zero errors',
        'No direct edits to production main branch',
        'Fail closed on permission or policy boundaries',
      ],
      recurringBugs: [],
      assignedLeadAgent: 'Farhan Hakim (BE Engineer)',
      allowedDirectories: ['services/**', 'packages/**', 'apps/**'],
    };
    this.projects.set('kdi-office', rootProfile);
    this.projects.set('kdi', rootProfile);

    this.logger.info(
      'seedDefaultProjects',
      `Loaded ${this.projects.size} project aliases into ProjectKnowledgeService`
    );
  }

  /**
   * Resolve project profile from user text or project identifier (§6)
   */
  public resolveProject(query: string): ProjectProfile {
    const normalized = query.trim().toLowerCase();

    // 1. Direct cache check (§28)
    const cached = this.projectCache.get(normalized);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.profile;
    }

    // 2. Direct exact or slug lookup
    if (this.projects.has(normalized)) {
      const p = this.projects.get(normalized)!;
      this.projectCache.set(normalized, { profile: p, timestamp: Date.now() });
      return p;
    }

    // 3. Keyword matching in query text
    if (normalized.includes('simmaci') || normalized.includes('akademik') || normalized.includes('pesantren')) {
      const p = this.projects.get('simmaci')!;
      this.projectCache.set(normalized, { profile: p, timestamp: Date.now() });
      return p;
    }

    if (normalized.includes('calc') || normalized.includes('hitung') || normalized.includes('kalkulator')) {
      const p = this.projects.get('demo-calc-repo')!;
      this.projectCache.set(normalized, { profile: p, timestamp: Date.now() });
      return p;
    }

    if (normalized.includes('auth') || normalized.includes('login') || normalized.includes('token')) {
      // If user talks about login/auth without project, default to SIMMACI auth-service
      const p = this.projects.get('simmaci')!;
      this.projectCache.set(normalized, { profile: p, timestamp: Date.now() });
      return p;
    }

    if (normalized.includes('office') || normalized.includes('kdi')) {
      const p = this.projects.get('kdi-office')!;
      this.projectCache.set(normalized, { profile: p, timestamp: Date.now() });
      return p;
    }

    // 4. Fallback default project (SIMMACI is primary operational project)
    const fallback = this.projects.get('simmaci')!;
    this.logger.info(
      'resolveProject',
      `Query "${query}" defaulted to primary project "${fallback.name}" (${fallback.slug})`
    );
    return fallback;
  }

  /**
   * Register or update a project profile
   */
  public registerProject(profile: ProjectProfile): void {
    this.projects.set(profile.slug.toLowerCase(), profile);
    this.projects.set(profile.projectId.toLowerCase(), profile);
    this.projects.set(profile.name.toLowerCase(), profile);
    this.projectCache.clear();
    this.logger.info('registerProject', `Registered project "${profile.name}" at ${profile.repositoryPath}`);
  }

  /**
   * List all registered projects
   */
  public listProjects(): ProjectProfile[] {
    const unique = new Map<string, ProjectProfile>();
    for (const p of this.projects.values()) {
      unique.set(p.projectId, p);
    }
    return Array.from(unique.values());
  }

  /**
   * Get project knowledge summary for agent prompt (§26 & §27)
   */
  public getProjectSummary(projectSlug: string): string {
    const p = this.resolveProject(projectSlug);
    return (
      `Project: ${p.name} (${p.slug})\n` +
      `Language/Framework: ${p.language} / ${p.framework}\n` +
      `Test Command: ${p.testCommand}\n` +
      `Architecture Notes: ${p.architectureNotes}\n` +
      `Constraints: ${p.knownConstraints.join('; ')}\n` +
      `Known Gotchas: ${p.recurringBugs.join('; ')}`
    );
  }
}
