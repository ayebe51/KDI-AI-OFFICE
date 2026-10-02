import { Injectable, Logger } from '@nestjs/common';
import {
  ImprovementProposal,
  ImprovementProposalStatus,
  ChangeGovernanceTier,
  ChangeRecord,
} from '@kdi/types';

@Injectable()
export class GovernedImprovementService {
  private readonly logger = new Logger(GovernedImprovementService.name);

  private readonly proposals = new Map<string, ImprovementProposal>();
  private readonly changeRecords = new Map<string, ChangeRecord>();

  // Protected security boundaries that AI is forbidden from self-modifying autonomously (Section 26)
  private readonly FORBIDDEN_SELF_MODIFICATION_TARGETS = [
    'authorization',
    'security_policy',
    'secret_sanitizer',
    'autonomy_boundary',
    'approval_engine',
    'production_credentials',
    'backup_policy',
    'disaster_recovery',
    'core_database_schema',
    'firewall',
    'owner_identity',
  ];

  constructor() {
    this.seedBaselineProposals();
  }

  // ==========================================================
  // Improvement Proposal Lifecycle (Section 24, 50)
  // ==========================================================

  createProposal(
    params: Omit<ImprovementProposal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'governanceTier'> & {
      governanceTier?: ChangeGovernanceTier;
    }
  ): ImprovementProposal {
    const id = `PROP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Check if proposal affects protected security boundaries
    const touchesForbiddenBoundary = params.affectedSystems.some((sys) =>
      this.FORBIDDEN_SELF_MODIFICATION_TARGETS.some((target) => sys.toLowerCase().includes(target))
    );

    const governanceTier: ChangeGovernanceTier = touchesForbiddenBoundary ? 'CRITICAL' : params.risk;

    const proposal: ImprovementProposal = {
      ...params,
      id,
      governanceTier,
      risk: governanceTier,
      status: 'PROPOSED',
      createdAt: now,
      updatedAt: now,
    };

    this.proposals.set(id, proposal);
    this.logger.log(`Improvement proposal created: ${id} [${params.title}] Tier: ${governanceTier}`);
    return proposal;
  }

  getProposal(id: string): ImprovementProposal | undefined {
    return this.proposals.get(id);
  }

  getAllProposals(): ImprovementProposal[] {
    return Array.from(this.proposals.values());
  }

  getProposalsByStatus(status: ImprovementProposalStatus): ImprovementProposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.status === status);
  }

  // ==========================================================
  // Governance & Self-Modification Boundary Guard (Section 25, 26)
  // ==========================================================

  evaluateSelfModificationSafety(proposalId: string): {
    isPermittedAutonomous: boolean;
    reason: string;
    governanceTier: ChangeGovernanceTier;
  } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} tidak ditemukan.`);
    }

    const touchesForbidden = proposal.affectedSystems.some((sys) =>
      this.FORBIDDEN_SELF_MODIFICATION_TARGETS.some((target) => sys.toLowerCase().includes(target))
    );

    if (touchesForbidden || proposal.governanceTier === 'CRITICAL') {
      return {
        isPermittedAutonomous: false,
        reason: 'PERUBAHAN DIBLOKIR: Proposal menyentuh batas keamanan, otorisasi, atau kontrol kedaulatan inti. Wajib persetujuan eksplisit Human Sovereign Owner (Level 4).',
        governanceTier: 'CRITICAL',
      };
    }

    if (proposal.governanceTier === 'HIGH_RISK') {
      return {
        isPermittedAutonomous: false,
        reason: 'PERUBAHAN HIGH-RISK: Membutuhkan persetujuan verifikasi dan peninjauan arsitektur sebelum eksperimen.',
        governanceTier: 'HIGH_RISK',
      };
    }

    if (proposal.governanceTier === 'MEDIUM_RISK') {
      return {
        isPermittedAutonomous: true,
        reason: 'PERUBAHAN MEDIUM-RISK: Diizinkan berjalan dalam sandbox eksperimen terkontrol dengan metrik baseline.',
        governanceTier: 'MEDIUM_RISK',
      };
    }

    return {
      isPermittedAutonomous: true,
      reason: 'PERUBAHAN LOW-RISK: Diizinkan otomatis di bawah batas kebijakan (Level 1-2 Autonomy).',
      governanceTier: 'LOW_RISK',
    };
  }

  transitionStatus(proposalId: string, targetStatus: ImprovementProposalStatus, actor = 'SYSTEM'): ImprovementProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} tidak ditemukan.`);
    }

    // Enforce governance approval for sensitive changes
    if (targetStatus === 'APPROVED' || targetStatus === 'EXPERIMENTING') {
      const safety = this.evaluateSelfModificationSafety(proposalId);
      if (!safety.isPermittedAutonomous && actor !== 'SOVEREIGN_OWNER') {
        throw new Error(`Transisi status ke ${targetStatus} gagal: ${safety.reason}`);
      }
    }

    proposal.status = targetStatus;
    proposal.updatedAt = new Date().toISOString();
    if (targetStatus === 'APPROVED') {
      proposal.approvedBy = actor;
    }

    this.logger.log(`Proposal ${proposalId} transitioned to ${targetStatus} by ${actor}`);
    return proposal;
  }

  // ==========================================================
  // Rollback Engine (Section 36, 37)
  // ==========================================================

  triggerRollback(proposalId: string, reason: string): { success: boolean; rollbackRecordId: string; message: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} tidak ditemukan.`);
    }

    proposal.status = 'ROLLED_BACK';
    proposal.updatedAt = new Date().toISOString();

    const changeRec = Array.from(this.changeRecords.values()).find((c) => c.proposalId === proposalId);
    if (changeRec) {
      changeRec.status = 'ROLLED_BACK';
    }

    const rollbackRecordId = `RBK-${Date.now()}`;
    this.logger.warn(`Rollback executed for proposal ${proposalId}. Reason: ${reason}`);

    return {
      success: true,
      rollbackRecordId,
      message: `Rollback berhasil dieksekusi berdasarkan rencana: ${proposal.rollbackPlan}. Status dikembalikan ke baseline.`,
    };
  }

  recordChange(record: Omit<ChangeRecord, 'id' | 'appliedAt'>): ChangeRecord {
    const id = `CHG-${Date.now()}`;
    const fullRecord: ChangeRecord = {
      ...record,
      id,
      appliedAt: new Date().toISOString(),
    };
    this.changeRecords.set(id, fullRecord);
    return fullRecord;
  }

  getAllChangeRecords(): ChangeRecord[] {
    return Array.from(this.changeRecords.values());
  }

  private seedBaselineProposals(): void {
    // Seed 3 Improvement Proposals (matching Section 58)
    const p1 = this.createProposal({
      title: 'Pre-Commit Automated Linting on Worktree Dispatch',
      description: 'Menjalankan linter lokal di Git worktree sebelum dispatch ke proses review/test QA.',
      problem: 'Rework rate sebesar 12% disebabkan oleh formatting error sepele yang membuang waktu QA.',
      evidence: ['pg://tasks?status=REWORK&count=8', 'pg://qa_reviews?defect=linting'],
      hypothesis: 'Pre-commit linter menurunkan rework rate sebesar 8% dan menghemat token evaluasi.',
      expectedBenefit: 'Pengurangan rework sebesar 8% dan waktu tunggu QA turun 11%.',
      risk: 'LOW_RISK',
      affectedSystems: ['Git Worktree', 'Antigravity Runtime', 'QA Pipeline'],
      proposedChange: 'Tambahkan hook npm run lint --fix pada worktree initialization pipeline.',
      validationPlan: 'Jalankan 10 tugas engineering dan ukur first-pass verification rate.',
      rollbackPlan: 'Hapus flag pre-commit linter dari config runtime.',
      confidence: 0.96,
      governanceTier: 'LOW_RISK',
    });
    // Set p1 as VALIDATED (matching Section 58: 1 validated improvement)
    p1.status = 'VALIDATED';

    const p2 = this.createProposal({
      title: 'Streaming Chunk Processor for Large Diffs',
      description: 'Routing muatan diff > 1500 baris ke worker streaming khusus guna mencegah timeout provider.',
      problem: 'Gemini Flash mengalami timeout pada 3 tugas audit kode berskala besar.',
      evidence: ['pg://incidents?signature=PROVIDER_TIMEOUT&count=3'],
      hypothesis: 'Streaming chunking mengeliminasi timeout tanpa degradasi kualitas peninjauan.',
      expectedBenefit: 'Zero timeout failure rate pada tugas audit berskala besar.',
      risk: 'MEDIUM_RISK',
      affectedSystems: ['AI Router', 'Audit Service'],
      proposedChange: 'Update routing policy pada LLMService untuk diff > 1500 baris.',
      validationPlan: 'Eksperimen 10 sampel diff besar dan ukur tingkat kelulusan.',
      rollbackPlan: 'Kembalikan routing ke model pro single-pass.',
      confidence: 0.92,
      governanceTier: 'MEDIUM_RISK',
    });
    p2.status = 'UNDER_REVIEW';

    const p3 = this.createProposal({
      title: 'Automated Weekly PostgreSQL Backup Verification',
      description: 'Otomatisasi verifikasi restore snapshot backup mingguan tanpa intervensi manual.',
      problem: 'Ilham menjalankan backup audit secara manual setiap akhir pekan (3.5 jam/bulan).',
      evidence: ['pg://task_history?type=MANUAL_BACKUP_AUDIT&frequency=weekly'],
      hypothesis: 'Otomatisasi cron job terisolasi menghemat waktu DevOps dan memverifikasi integritas dump.',
      expectedBenefit: 'Penghematan 3.5 jam waktu engineering per bulan dengan zero human delay.',
      risk: 'MEDIUM_RISK',
      affectedSystems: ['PostgreSQL', 'Docker Backup Runner', 'Cron Queue'],
      proposedChange: 'Buat cron task mingguan di Redis Queue untuk memverifikasi pg_restore.',
      validationPlan: 'Jalankan 2 simulasi dry-run restore di isolated test container.',
      rollbackPlan: 'Nonaktifkan cron job dan kembalikan ke jadwal manual.',
      confidence: 0.98,
      governanceTier: 'MEDIUM_RISK',
    });
    p3.status = 'PROPOSED';
  }
}
