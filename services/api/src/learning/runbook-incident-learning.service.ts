import { Injectable, Logger } from '@nestjs/common';
import {
  KnowledgeLifecycle,
  KnowledgeLifecycleState,
  RunbookOptimizationCandidate,
  IncidentLearningRecord,
} from '@kdi/types';

@Injectable()
export class RunbookIncidentLearningService {
  private readonly logger = new Logger(RunbookIncidentLearningService.name);

  private readonly runbookCandidates = new Map<string, RunbookOptimizationCandidate>();
  private readonly incidentRecords = new Map<string, IncidentLearningRecord>();
  private readonly knowledgeItems = new Map<string, KnowledgeLifecycle>();

  constructor() {
    this.seedBaselineRunbookAndIncidentData();
  }

  // ==========================================================
  // Runbook Learning (Section 13)
  // ==========================================================

  proposeRunbookOptimization(candidate: RunbookOptimizationCandidate): void {
    this.runbookCandidates.set(candidate.runbookId, candidate);
    this.logger.log(`Runbook optimization proposed for ${candidate.runbookId}: ${candidate.reason}`);
  }

  getRunbookCandidates(): RunbookOptimizationCandidate[] {
    return Array.from(this.runbookCandidates.values());
  }

  approveRunbookOptimization(runbookId: string): RunbookOptimizationCandidate | undefined {
    const candidate = this.runbookCandidates.get(runbookId);
    if (candidate) {
      candidate.status = 'APPROVED';
      this.logger.log(`Runbook ${runbookId} update approved by governance.`);
    }
    return candidate;
  }

  // ==========================================================
  // Incident Learning & Family Clustering (Section 14)
  // ==========================================================

  recordIncidentLearning(record: IncidentLearningRecord): void {
    this.incidentRecords.set(record.incidentId, record);
  }

  getIncidentRecords(): IncidentLearningRecord[] {
    return Array.from(this.incidentRecords.values());
  }

  detectIncidentFamilies(): Array<{ familyName: string; incidentCount: number; incidents: IncidentLearningRecord[]; recommendedAction: string }> {
    const families = new Map<string, IncidentLearningRecord[]>();

    this.incidentRecords.forEach((rec) => {
      const existing = families.get(rec.incidentFamily) || [];
      existing.push(rec);
      families.set(rec.incidentFamily, existing);
    });

    const result: Array<{ familyName: string; incidentCount: number; incidents: IncidentLearningRecord[]; recommendedAction: string }> = [];

    families.forEach((incidents, familyName) => {
      if (incidents.length >= 2) {
        result.push({
          familyName,
          incidentCount: incidents.length,
          incidents,
          recommendedAction: `Cluster insiden terdeteksi (${incidents.length} kasus berakar sama). Bentuk Improvement Proposal preventif untuk subsistem ${familyName}.`,
        });
      }
    });

    return result;
  }

  // ==========================================================
  // Knowledge Decay & Freshness Lifecycle (Section 18, 19)
  // ==========================================================

  registerKnowledgeItem(item: KnowledgeLifecycle): void {
    this.knowledgeItems.set(item.knowledgeId, item);
  }

  getKnowledgeItems(): KnowledgeLifecycle[] {
    return Array.from(this.knowledgeItems.values());
  }

  auditKnowledgeDecay(currentDateIso = new Date().toISOString()): {
    staleItems: KnowledgeLifecycle[];
    activeItems: KnowledgeLifecycle[];
    underReviewItems: KnowledgeLifecycle[];
  } {
    const now = new Date(currentDateIso).getTime();
    const staleItems: KnowledgeLifecycle[] = [];
    const activeItems: KnowledgeLifecycle[] = [];
    const underReviewItems: KnowledgeLifecycle[] = [];

    this.knowledgeItems.forEach((item) => {
      const validatedTime = new Date(item.validatedAt).getTime();
      const ageDays = (now - validatedTime) / (1000 * 60 * 60 * 24);

      if (ageDays > item.staleThresholdDays) {
        item.state = 'STALE';
        item.reviewRequired = true;
        item.notes = `Divalidasi ${Math.round(ageDays)} hari yang lalu (ambang batas: ${item.staleThresholdDays} hari). Perlu peninjauan ulang terhadap codebase aktif.`;
        staleItems.push(item);
      } else if (item.state === 'UNDER_REVIEW') {
        underReviewItems.push(item);
      } else {
        item.state = 'ACTIVE';
        activeItems.push(item);
      }
    });

    return { staleItems, activeItems, underReviewItems };
  }

  private seedBaselineRunbookAndIncidentData(): void {
    // Seed runbook optimization candidate (Section 13)
    this.proposeRunbookOptimization({
      runbookId: 'RB-OPS-REDIS-001',
      title: 'Prosedur Pemulihan Redis Cache',
      currentStepsCount: 6,
      proposedStepsCount: 5,
      obsoleteStepIndices: [4],
      reason: 'Langkah 4 (manual ping check) redundan karena health check otomatis gateway sudah melakukan verifikasi socket.',
      status: 'PROPOSED',
    });

    // Seed incidents for clustering
    this.recordIncidentLearning({
      incidentId: 'INC-2026-09-001',
      rootCause: 'PostgreSQL idle connection pool timeout',
      contributingFactors: ['High concurrent queries during payroll sync', 'No active pool keepalive'],
      recoveryWeaknesses: ['Manual service restart was required'],
      incidentFamily: 'DATABASE_CONNECTION_POOL',
      preventiveAction: 'Terapkan PgBouncer connection pooling dan keepalive 30s.',
      createdAt: '2026-09-14T08:00:00Z',
    });

    this.recordIncidentLearning({
      incidentId: 'INC-2026-09-002',
      rootCause: 'PostgreSQL idle client timeout during heavy transaction',
      contributingFactors: ['Unindexed large join in SIMMACI reports'],
      recoveryWeaknesses: ['Worker threads exhausted waiting on connection'],
      incidentFamily: 'DATABASE_CONNECTION_POOL',
      preventiveAction: 'Tambah composite index pada tabel log absensi dan batasi max lifetime connection.',
      createdAt: '2026-09-28T14:30:00Z',
    });

    // Seed knowledge items for decay audit (Section 19)
    this.registerKnowledgeItem({
      knowledgeId: 'KNW-DEP-001',
      title: 'Deployment Procedure v1 (Worktree & Docker)',
      state: 'STALE',
      createdAt: '2026-05-01T00:00:00Z',
      validatedAt: '2026-05-15T00:00:00Z', // > 120 days ago
      lastUsedAt: '2026-06-01T00:00:00Z',
      staleThresholdDays: 90,
      reviewRequired: true,
      notes: 'Dokumentasi belum diperbarui sejak migrasi ke isolasi Git worktree Phase 9.',
    });

    this.registerKnowledgeItem({
      knowledgeId: 'KNW-SEC-001',
      title: 'Secret Sanitization & Masking Policy v2',
      state: 'ACTIVE',
      createdAt: '2026-09-15T00:00:00Z',
      validatedAt: '2026-09-25T00:00:00Z',
      lastUsedAt: '2026-10-01T00:00:00Z',
      staleThresholdDays: 60,
      reviewRequired: false,
    });
  }
}
