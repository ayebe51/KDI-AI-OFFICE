// ==========================================================
// services/api/src/engineering/host/repository-allowlist.service.ts
// Repository Allowlist, Path Translation & Branch Protection (§11–§13, §32)
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';

export interface RepositoryMapping {
  slug: string;
  name: string;
  approvedPath: string;
  defaultBranch: string;
  protectedBranches: string[];
  allowedRoles: string[];
}

@Injectable()
export class RepositoryAllowlistService {
  private readonly logger = new StructuredLogger('RepositoryAllowlistService');

  private readonly allowedRepositories = new Map<string, RepositoryMapping>();

  constructor() {
    this.seedDefaultRepositories();
  }

  private findWorkspaceRoot(): string {
    let cur = process.cwd();
    for (let i = 0; i < 4; i++) {
      if (fs.existsSync(path.join(cur, 'fixtures', 'demo-calc-repo'))) {
        return cur;
      }
      cur = path.dirname(cur);
    }
    return process.cwd();
  }

  private seedDefaultRepositories(): void {
    // Current workspace root
    const workspaceRoot = this.findWorkspaceRoot();

    // 1. KDI AI OFFICE repository
    this.allowedRepositories.set('kdi', {
      slug: 'kdi',
      name: 'KDI AI OFFICE',
      approvedPath: workspaceRoot,
      defaultBranch: 'main',
      protectedBranches: ['main', 'master', 'production', 'release'],
      allowedRoles: ['BE', 'FE', 'QA', 'SECURITY', 'DEVOPS', 'FULLSTACK'],
    });

    // 2. SIMMACI (School Management System)
    const simmaciPath = path.resolve(workspaceRoot, '..', 'SIMMACI');
    const simmaciActual = fs.existsSync(simmaciPath)
      ? simmaciPath
      : path.join(workspaceRoot, 'fixtures', 'ai-engineering-repo');

    this.allowedRepositories.set('simmaci', {
      slug: 'simmaci',
      name: 'SIMMACI - Islamic School System',
      approvedPath: simmaciActual,
      defaultBranch: 'main',
      protectedBranches: ['main', 'master', 'production', 'release'],
      allowedRoles: ['BE', 'FE', 'QA', 'SECURITY', 'DEVOPS'],
    });

    // 3. ILMORA (Online Learning & Quiz Platform)
    const ilmoraPath = path.resolve(workspaceRoot, '..', 'ILMORA');
    const ilmoraActual = fs.existsSync(ilmoraPath)
      ? ilmoraPath
      : path.join(workspaceRoot, 'fixtures', 'benchmark-repo');

    this.allowedRepositories.set('ilmora', {
      slug: 'ilmora',
      name: 'ILMORA - Educational LMS',
      approvedPath: ilmoraActual,
      defaultBranch: 'main',
      protectedBranches: ['main', 'master', 'production', 'release'],
      allowedRoles: ['BE', 'FE', 'QA', 'SECURITY', 'DEVOPS'],
    });

    // 4. Test Fixture Repositories (Safe isolated test targets)
    const demoCalcPath = path.join(workspaceRoot, 'fixtures', 'demo-calc-repo');
    if (fs.existsSync(demoCalcPath)) {
      this.allowedRepositories.set('demo-calc', {
        slug: 'demo-calc',
        name: 'Demo Calculator Test Repository',
        approvedPath: demoCalcPath,
        defaultBranch: 'main',
        protectedBranches: ['main', 'master', 'production'],
        allowedRoles: ['BE', 'QA'],
      });
    }

    const aiEngPath = path.join(workspaceRoot, 'fixtures', 'ai-engineering-repo');
    if (fs.existsSync(aiEngPath)) {
      this.allowedRepositories.set('ai-engineering', {
        slug: 'ai-engineering',
        name: 'AI Engineering Fixture Repository',
        approvedPath: aiEngPath,
        defaultBranch: 'main',
        protectedBranches: ['main', 'master', 'production'],
        allowedRoles: ['BE', 'FE', 'QA', 'SECURITY', 'DEVOPS'],
      });
    }

    const bmRepoPath = path.join(workspaceRoot, 'fixtures', 'benchmark-repo');
    if (fs.existsSync(bmRepoPath)) {
      this.allowedRepositories.set('benchmark-repo', {
        slug: 'benchmark-repo',
        name: 'Benchmark Test Fixture Repository',
        approvedPath: bmRepoPath,
        defaultBranch: 'main',
        protectedBranches: ['main', 'master', 'production'],
        allowedRoles: ['BE', 'FE', 'QA', 'SECURITY', 'DEVOPS'],
      });
    }
  }

  /**
   * Verify if a project/repository is in the approved allowlist (§13)
   */
  public isAllowedRepository(repoIdentifier: string): boolean {
    if (!repoIdentifier) return false;
    const normalized = repoIdentifier.trim().toLowerCase();
    return this.allowedRepositories.has(normalized);
  }

  /**
   * Resolve logical repository identifier to an approved native Windows host path (§12)
   */
  public resolveHostRepositoryPath(repoIdentifier: string): {
    allowed: boolean;
    resolvedPath?: string;
    reason?: string;
  } {
    if (!repoIdentifier) {
      return { allowed: false, reason: 'Repository identifier is empty' };
    }

    // Rejection of arbitrary filesystem path injection
    if (repoIdentifier.includes('..') || repoIdentifier.includes('/') || repoIdentifier.includes('\\')) {
      const isDirectMatch = Array.from(this.allowedRepositories.values()).find(
        (r) => path.resolve(r.approvedPath).toLowerCase() === path.resolve(repoIdentifier).toLowerCase()
      );
      if (isDirectMatch) {
        return { allowed: true, resolvedPath: isDirectMatch.approvedPath };
      }
      return {
        allowed: false,
        reason: `Arbitrary filesystem paths are rejected. Must use registered logical identifier (§12 & §13)`,
      };
    }

    const normalized = repoIdentifier.trim().toLowerCase();
    const mapping = this.allowedRepositories.get(normalized);
    if (!mapping) {
      return {
        allowed: false,
        reason: `Repository "${repoIdentifier}" is not registered in the approved allowlist (§13)`,
      };
    }

    return { allowed: true, resolvedPath: mapping.approvedPath };
  }

  /**
   * Validate branch name to prevent unauthorized modification of protected branches (§32)
   */
  public validateBranchName(
    repoIdentifier: string,
    branch: string
  ): { allowed: boolean; isProtected: boolean; reason?: string } {
    const normalized = repoIdentifier.trim().toLowerCase();
    const mapping = this.allowedRepositories.get(normalized);

    const protectedNames = mapping ? mapping.protectedBranches : ['main', 'master', 'production', 'release'];

    const cleanBranch = branch.trim().toLowerCase();

    if (protectedNames.includes(cleanBranch)) {
      return {
        allowed: false,
        isProtected: true,
        reason: `Direct execution against protected branch "${branch}" is rejected (§32). Must use an isolated feature or task branch.`,
      };
    }

    // Check for invalid branch names
    if (cleanBranch.includes('..') || cleanBranch.includes(' ') || cleanBranch.startsWith('-')) {
      return {
        allowed: false,
        isProtected: false,
        reason: `Invalid git branch syntax "${branch}".`,
      };
    }

    return { allowed: true, isProtected: false };
  }

  /**
   * Register or override an approved repository mapping
   */
  public registerApprovedRepository(mapping: RepositoryMapping): void {
    const key = mapping.slug.trim().toLowerCase();
    this.allowedRepositories.set(key, mapping);
    this.logger.info('registerApprovedRepository', `Registered allowlisted repository: ${mapping.slug} -> ${mapping.approvedPath}`);
  }

  /**
   * List all registered repositories
   */
  public listAllowedRepositories(): RepositoryMapping[] {
    return Array.from(this.allowedRepositories.values());
  }
}
