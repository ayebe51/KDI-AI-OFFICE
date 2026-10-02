// ==========================================================
// services/api/src/organization/lessons-learned.service.ts
// Phase 13: Organizational Memory, Lessons-Learned & Recurring Work
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  OrganizationalMemoryItem,
  LessonLearnedRecord,
  AutomationCandidate,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

@Injectable()
export class LessonsLearnedService {
  private readonly logger = new StructuredLogger('LessonsLearnedService');

  private readonly memoryItems = new Map<string, OrganizationalMemoryItem>();
  private readonly lessonsLearned = new Map<string, LessonLearnedRecord>();
  private readonly automationCandidates = new Map<string, AutomationCandidate>();

  constructor() {
    this.seedMemoryItems();
    this.seedLessonsLearned();
    this.detectRecurringWork();
  }

  private seedMemoryItems() {
    const items: OrganizationalMemoryItem[] = [
      {
        id: 'mem_001',
        category: 'ARCHITECTURAL_DECISION',
        title: 'Isolasi Eksekusi Worktree Git untuk Antigravity Agent',
        summary: 'Semua perubahan kode oleh agent dilakukan pada isolated git worktree terpisah untuk mencegah konflik pada branch utama.',
        content: 'Mekanisme worktree memastikan workspace bersih, atomic checkout, dan pembatalan tanpa efek samping jika pengujian gagal.',
        provenance: 'Task #tsk_pilot_A & Phase 4 Engineering Architecture',
        source: 'EngineeringService.executeInWorktree',
        confidence: 0.98,
        scope: 'GLOBAL',
        visibility: 'INTERNAL',
        promotedAt: '2026-09-28T10:00:00Z',
      },
      {
        id: 'mem_002',
        category: 'VALIDATED_SOLUTION',
        title: 'Redis Exponential Backoff Retry untuk AuthService Transient Outages',
        summary: 'Koneksi ke Redis pool dilengkapi jittered exponential retry (3 attempt, backoff 100ms, 300ms, 900ms).',
        content: 'Mencegah thundering herd problem saat instance Redis berotasi atau mengalami lonjakan koneksi sementara.',
        provenance: 'SIMMACI Auth Hardening Task #tsk_01J9X8A1B2C3',
        source: 'services/api/src/auth/auth.service.ts',
        confidence: 0.95,
        scope: 'PROJECT_SPECIFIC',
        projectId: 'prj_01J9X8SIMMACI',
        visibility: 'INTERNAL',
        promotedAt: '2026-09-30T14:30:00Z',
      },
      {
        id: 'mem_003',
        category: 'IMPORTANT_CONSTRAINT',
        title: 'Zero Self-Modification Policy untuk Autonomous Agents',
        summary: 'Agent AI secara eksplisit dilarang memodifikasi batas kebijakan otonomi atau menyetujui aksinya sendiri.',
        content: 'Tindakan yang menaikkan permission atau merubah file security di-hard block oleh policy engine Level 4.',
        provenance: 'Autonomy Policy Gate #POL-004 & Security Audit',
        source: 'AutonomyService.evaluatePolicy',
        confidence: 1.0,
        scope: 'GLOBAL',
        visibility: 'INTERNAL',
        promotedAt: '2026-09-25T08:00:00Z',
      },
    ];

    for (const item of items) {
      this.memoryItems.set(item.id, item);
    }
  }

  private seedLessonsLearned() {
    const lessons: LessonLearnedRecord[] = [
      {
        id: 'lsn_001',
        taskId: 'tsk_01J9X8A1B2C3',
        title: 'Penanganan Null Profile pada Pickup Delivery Service',
        attempted: 'Patching null check pada PickupService.ts:L48 untuk menangani order tanpa alamat pengiriman fisik.',
        worked: 'Optional chaining dan safe fallback ke default pickup address.',
        failed: 'Eksekusi awal tanpa pengecekan tipe nested property menyebabkan runtime TypeError pada edge case barang digital.',
        rootCause: 'Data legacy di database SIMMACI memiliki kolom pickup_address bernilai NULL untuk item non-fisik.',
        shouldRepeat: 'Selalu lakukan audit schema migration dan uji nullability kolom sebelum deploy logic baru.',
        shouldAvoid: 'Asumsi bahwa profile pengguna selalu lengkap pada relasi order lama.',
        systemKnowledgeChanges: 'Menambahkan fixture database untuk skenario order non-fisik di regression test suite.',
        distinctions: {
          facts: [
            'Null pointer exception terjadi 4 kali pada 28 September 2026',
            'Patch git commit 4b2f1a menyelesaikan exception pada 100% test case',
          ],
          observations: [
            'Sebagian besar pesanan bermasalah berasal dari modul santri baru',
          ],
          hypotheses: [
            'Alur registrasi santri baru belum mewajibkan alamat pickup jika mengambil buku di koperasi',
          ],
          recommendations: [
            'Tambahkan validasi form front-end dan default value di level DTO backend',
          ],
        },
        validated: true,
        recordedAt: '2026-09-30T16:00:00Z',
      },
    ];

    for (const l of lessons) {
      this.lessonsLearned.set(l.id, l);
    }
  }

  /**
   * Section 21: Recurring Work Detection
   * Identifies repetitive patterns and proposes candidates for automation
   */
  public detectRecurringWork(): AutomationCandidate[] {
    const candidates: AutomationCandidate[] = [
      {
        id: 'auto_001',
        patternName: 'Daily PostgreSQL & Redis Snapshot Verification',
        frequency: 'DAILY (Setiap Pukul 02:00 WIB)',
        occurrenceCount: 28,
        estimatedEffortHoursSaved: 3.5,
        currentManualSteps: [
          'Jalankan pg_dump snapshot',
          'Hitung SHA256 checksum backup',
          'Validasi integritas restore pada test container',
        ],
        proposedAutomation: 'Otomatisasikan via Cron Autonomy Rule Level 2 dengan verifikasi checksum otomatis dan alert jika RPO > 15 menit.',
        riskLevel: 'LOW',
        status: 'PROPOSED',
        detectedAt: new Date().toISOString(),
      },
      {
        id: 'auto_002',
        patternName: 'Weekly Dependency Vulnerability Scan (npm audit & CVE check)',
        frequency: 'WEEKLY (Setiap Senin 06:00 WIB)',
        occurrenceCount: 8,
        estimatedEffortHoursSaved: 2.0,
        currentManualSteps: [
          'Jalankan npm audit di semua monorepo workspaces',
          'Klasifikasikan temuan CVE low/medium/high',
          'Buat tiket perbaikan jika ada paket vulnerable',
        ],
        proposedAutomation: 'Integrasikan ke runbook terjadwal Maya (DevOps) untuk auto-generate PR non-breaking updates.',
        riskLevel: 'LOW',
        status: 'PROPOSED',
        detectedAt: new Date().toISOString(),
      },
    ];

    for (const c of candidates) {
      this.automationCandidates.set(c.id, c);
    }
    return candidates;
  }

  public getAllMemoryItems(): OrganizationalMemoryItem[] {
    return Array.from(this.memoryItems.values());
  }

  public getAllLessons(): LessonLearnedRecord[] {
    return Array.from(this.lessonsLearned.values());
  }

  public getAutomationCandidates(): AutomationCandidate[] {
    return Array.from(this.automationCandidates.values());
  }

  public promoteToMemory(item: Omit<OrganizationalMemoryItem, 'id' | 'promotedAt'>): OrganizationalMemoryItem {
    const id = `mem_${Date.now()}`;
    const newItem: OrganizationalMemoryItem = {
      id,
      ...item,
      promotedAt: new Date().toISOString(),
    };
    this.memoryItems.set(id, newItem);
    this.logger.info('promoteToMemory', `Promoted new memory item: ${id} ("${newItem.title}")`);
    return newItem;
  }

  public recordLesson(lesson: Omit<LessonLearnedRecord, 'id' | 'recordedAt'>): LessonLearnedRecord {
    const id = `lsn_${Date.now()}`;
    const newLesson: LessonLearnedRecord = {
      id,
      ...lesson,
      recordedAt: new Date().toISOString(),
    };
    this.lessonsLearned.set(id, newLesson);
    this.logger.info('recordLesson', `Recorded new validated lesson learned: ${id} ("${newLesson.title}")`);
    return newLesson;
  }
}
