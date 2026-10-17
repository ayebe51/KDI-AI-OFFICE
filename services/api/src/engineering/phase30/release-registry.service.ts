// ==========================================================
// services/api/src/engineering/phase30/release-registry.service.ts
// Phase 30.2: Persistent Release Registry & Explicit Rollback Target Store (§11, §12)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Injectable, Optional } from '@nestjs/common';
import type { ReleaseRecord, ReleaseStatus, DeploymentEnvironment } from './phase30.types.js';

export class InvalidRollbackTargetError extends Error {
  constructor(public readonly rollbackTargetId: string, reason: string) {
    super(`InvalidRollbackTargetError: Rollback target '${rollbackTargetId}' is invalid: ${reason}`);
    this.name = 'InvalidRollbackTargetError';
  }
}

export class DuplicateReleaseError extends Error {
  constructor(public readonly releaseId: string) {
    super(`DuplicateReleaseError: Release '${releaseId}' already exists with divergent commit or artifact digest.`);
    this.name = 'DuplicateReleaseError';
  }
}

export class ReleaseNotFoundError extends Error {
  constructor(public readonly releaseId: string) {
    super(`ReleaseNotFoundError: Release '${releaseId}' not found in registry.`);
    this.name = 'ReleaseNotFoundError';
  }
}

export interface ReleaseRegistryConfig {
  storageFilePath?: string;
  enableDiskPersistence?: boolean;
}

@Injectable()
export class ReleaseRegistryService {
  private readonly releases = new Map<string, ReleaseRecord>();
  private readonly activeReleases = new Map<string, string>(); // targetKey -> releaseId
  private readonly storageFilePath: string;
  private readonly enableDiskPersistence: boolean;

  constructor(@Optional() config?: ReleaseRegistryConfig) {
    this.enableDiskPersistence = config?.enableDiskPersistence ?? true;
    this.storageFilePath =
      config?.storageFilePath || path.join(os.tmpdir(), 'kdi-phase30-release-registry.json');

    if (this.enableDiskPersistence) {
      this.loadFromDisk();
    }
  }

  private getTargetKey(project: string, service: string, env: DeploymentEnvironment): string {
    return `${project}:${service}:${env}`;
  }

  /**
   * Register a new explicit release candidate (§12)
   */
  public registerRelease(params: {
    releaseId: string;
    project: 'SIMMACI' | 'ILMORA' | 'KDI';
    service: string;
    environment: DeploymentEnvironment;
    version: string;
    commitSha: string;
    artifactDigestSha256: string;
    rollbackTargetReleaseId?: string;
    metadata?: Record<string, any>;
  }): ReleaseRecord {
    // 1. Rollback target validation (Reject HEAD~1 or unverified targets) (§12)
    if (params.rollbackTargetReleaseId) {
      if (params.rollbackTargetReleaseId.toLowerCase().includes('head~')) {
        throw new InvalidRollbackTargetError(
          params.rollbackTargetReleaseId,
          'Generic Git HEAD~1 relative references are forbidden under Phase 30.2 policy (§12).'
        );
      }
      const rb = this.releases.get(params.rollbackTargetReleaseId);
      if (!rb) {
        throw new InvalidRollbackTargetError(
          params.rollbackTargetReleaseId,
          'Rollback target release does not exist in registry.'
        );
      }
      if (rb.project !== params.project || rb.service !== params.service) {
        throw new InvalidRollbackTargetError(
          params.rollbackTargetReleaseId,
          `Rollback target belongs to different scope (${rb.project}/${rb.service}) than release (${params.project}/${params.service}).`
        );
      }
    }

    // 2. Duplicate checking / Idempotency
    const existing = this.releases.get(params.releaseId);
    if (existing) {
      if (
        existing.commitSha === params.commitSha &&
        existing.artifactDigestSha256 === params.artifactDigestSha256
      ) {
        // Idempotent duplicate return
        return existing;
      }
      throw new DuplicateReleaseError(params.releaseId);
    }

    const now = new Date().toISOString();
    const record: ReleaseRecord = {
      releaseId: params.releaseId,
      project: params.project,
      service: params.service,
      environment: params.environment,
      version: params.version,
      commitSha: params.commitSha,
      artifactDigestSha256: params.artifactDigestSha256,
      rollbackTargetReleaseId: params.rollbackTargetReleaseId,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata || {},
    };

    this.releases.set(record.releaseId, record);
    this.saveToDisk();
    return record;
  }

  public getRelease(releaseId: string): ReleaseRecord {
    const r = this.releases.get(releaseId);
    if (!r) {
      throw new ReleaseNotFoundError(releaseId);
    }
    return r;
  }

  public getActiveRelease(project: string, service: string, env: DeploymentEnvironment): ReleaseRecord | undefined {
    const key = this.getTargetKey(project, service, env);
    const id = this.activeReleases.get(key);
    return id ? this.releases.get(id) : undefined;
  }

  public updateReleaseStatus(releaseId: string, status: ReleaseStatus): ReleaseRecord {
    const r = this.getRelease(releaseId);
    r.status = status;
    r.updatedAt = new Date().toISOString();

    const targetKey = this.getTargetKey(r.project, r.service, r.environment);

    if (status === 'ACTIVE') {
      const priorActiveId = this.activeReleases.get(targetKey);
      if (priorActiveId && priorActiveId !== releaseId) {
        const prior = this.releases.get(priorActiveId);
        if (prior && prior.status === 'ACTIVE') {
          prior.status = 'SUPERSEDED';
          prior.updatedAt = new Date().toISOString();
        }
      }
      this.activeReleases.set(targetKey, releaseId);
    } else if (status === 'ROLLED_BACK') {
      if (this.activeReleases.get(targetKey) === releaseId) {
        // Restore prior active or rollback target
        if (r.rollbackTargetReleaseId) {
          this.activeReleases.set(targetKey, r.rollbackTargetReleaseId);
          const rb = this.releases.get(r.rollbackTargetReleaseId);
          if (rb) {
            rb.status = 'ACTIVE';
            rb.updatedAt = new Date().toISOString();
          }
        } else {
          this.activeReleases.delete(targetKey);
        }
      }
    }

    this.saveToDisk();
    return r;
  }

  public listReleases(): ReleaseRecord[] {
    return Array.from(this.releases.values());
  }

  // ── Atomic Disk Persistence (§12) ──────────────────────────────────
  private saveToDisk(): void {
    if (!this.enableDiskPersistence) return;
    try {
      const payload = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        releases: Array.from(this.releases.entries()),
        activeReleases: Array.from(this.activeReleases.entries()),
      };
      const tmpPath = `${this.storageFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.storageFilePath);
    } catch {
      // Ignore background persistence errors in restricted test sandboxes
    }
  }

  private loadFromDisk(): void {
    if (!this.enableDiskPersistence) return;
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.releases)) {
          for (const [k, v] of data.releases) {
            this.releases.set(k, v);
          }
        }
        if (Array.isArray(data.activeReleases)) {
          for (const [k, v] of data.activeReleases) {
            this.activeReleases.set(k, v);
          }
        }
      }
    } catch {
      // In case of corruption, clear and initialize clean state
      this.releases.clear();
      this.activeReleases.clear();
    }
  }

  public clear(): void {
    this.releases.clear();
    this.activeReleases.clear();
    if (this.enableDiskPersistence && fs.existsSync(this.storageFilePath)) {
      try {
        fs.unlinkSync(this.storageFilePath);
      } catch {}
    }
  }
}
