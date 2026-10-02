// ==========================================================
// services/api/src/organization/workforce-intelligence.service.ts
// Phase 13: Contextualized Agent Performance & Workforce Intelligence
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  AgentRole,
  AgentPerformanceIndicator,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { CapacityEngineService } from './capacity-engine.service.js';

@Injectable()
export class WorkforceIntelligenceService {
  private readonly logger = new StructuredLogger('WorkforceIntelligenceService');

  private readonly indicators = new Map<string, AgentPerformanceIndicator>();

  constructor(@Optional() private readonly capacityEngine?: CapacityEngineService) {
    this.seedPerformanceIndicators();
  }

  private seedPerformanceIndicators() {
    const agents: Array<{
      id: string;
      name: string;
      role: AgentRole;
      completed: number;
      reliability: number;
      passRate: number;
      cycleTime: number;
      rework: number;
      costRatio: number;
      escalation: number;
      mix: { trivial: number; moderate: number; complex: number; critical: number };
      summary: string;
    }> = [
      {
        id: 'AGT-ENG-001',
        name: 'Farhan',
        role: 'BACKEND_ENGINEER',
        completed: 48,
        reliability: 96,
        passRate: 98,
        cycleTime: 120_000,
        rework: 4,
        costRatio: 0.12,
        escalation: 2,
        mix: { trivial: 5, moderate: 25, complex: 15, critical: 3 },
        summary: 'Tinggi keandalan pada tugas backend kompleks (SIMMACI connection pool, database tuning). Tingkat rework sangat rendah.',
      },
      {
        id: 'AGT-ENG-002',
        name: 'Rian',
        role: 'SOFTWARE_ENGINEER',
        completed: 52,
        reliability: 94,
        passRate: 95,
        cycleTime: 95_000,
        rework: 6,
        costRatio: 0.10,
        escalation: 3,
        mix: { trivial: 10, moderate: 30, complex: 10, critical: 2 },
        summary: 'Throughput tinggi pada software engineering umum dan refactoring. Pass rate verifikasi konsisten di atas 95%.',
      },
      {
        id: 'AGT-ARC-001',
        name: 'Ahmad',
        role: 'SYSTEM_ARCHITECT',
        completed: 24,
        reliability: 98,
        passRate: 100,
        cycleTime: 240_000,
        rework: 2,
        costRatio: 0.18,
        escalation: 1,
        mix: { trivial: 0, moderate: 8, complex: 12, critical: 4 },
        summary: 'Fokus pada evaluasi desain berisiko tinggi dan ADR. Beban kerja lebih rendah dalam kuantitas namun berbobot kritis.',
      },
      {
        id: 'AGT-QA-001',
        name: 'Nadia',
        role: 'QA_ENGINEER',
        completed: 65,
        reliability: 99,
        passRate: 99,
        cycleTime: 85_000,
        rework: 1,
        costRatio: 0.08,
        escalation: 4,
        mix: { trivial: 15, moderate: 35, complex: 12, critical: 3 },
        summary: 'Verifikator utama sistem. Beroperasi mendekati kapasitas puncak dengan throughput tinggi dan presisi verifikasi prima.',
      },
      {
        id: 'AGT-SEC-001',
        name: 'Ilham',
        role: 'SECURITY_ENGINEER',
        completed: 30,
        reliability: 99,
        passRate: 100,
        cycleTime: 110_000,
        rework: 1,
        costRatio: 0.15,
        escalation: 2,
        mix: { trivial: 2, moderate: 12, complex: 12, critical: 4 },
        summary: 'Spesialis batas keamanan, sanitasi rahasia, dan penangkapan prompt injection. 100% deteksi pada skenario uji penetrasi.',
      },
      {
        id: 'AGT-OPS-001',
        name: 'Maya',
        role: 'DEVOPS_ENGINEER',
        completed: 42,
        reliability: 95,
        passRate: 96,
        cycleTime: 130_000,
        rework: 5,
        costRatio: 0.14,
        escalation: 3,
        mix: { trivial: 5, moderate: 22, complex: 12, critical: 3 },
        summary: 'Manajemen infrastruktur PostgreSQL, Redis, Neo4j, serta otomatisasi isolated git worktree deployment.',
      },
      {
        id: 'AGT-PM-001',
        name: 'Naya',
        role: 'PRODUCT_MANAGER',
        completed: 28,
        reliability: 93,
        passRate: 96,
        cycleTime: 160_000,
        rework: 7,
        costRatio: 0.11,
        escalation: 2,
        mix: { trivial: 4, moderate: 16, complex: 8, critical: 0 },
        summary: 'Penyelarasan objective, manajemen backlog, dan pemantauan portfolio SIMMACI serta Koneksi Santri.',
      },
      {
        id: 'AGT-DOC-001',
        name: 'Tari',
        role: 'TECHNICAL_WRITER',
        completed: 35,
        reliability: 97,
        passRate: 99,
        cycleTime: 75_000,
        rework: 3,
        costRatio: 0.06,
        escalation: 0,
        mix: { trivial: 15, moderate: 15, complex: 5, critical: 0 },
        summary: 'Dokumentasi arsitektur, laporan pengujian, dan pemeliharaan knowledge base GraphRAG.',
      },
      {
        id: 'AGT-MGR-001',
        name: 'KDI Manager',
        role: 'AI_MANAGER',
        completed: 40,
        reliability: 98,
        passRate: 98,
        cycleTime: 150_000,
        rework: 2,
        costRatio: 0.16,
        escalation: 5,
        mix: { trivial: 2, moderate: 18, complex: 15, critical: 5 },
        summary: 'Koordinasi swarm multi-agent, evaluasi dekomposisi task, dan orkestrasi perintah Owner.',
      },
    ];

    for (const a of agents) {
      this.indicators.set(a.id, {
        agentId: a.id,
        agentName: a.name,
        role: a.role,
        completionReliability: a.reliability,
        verificationPassRate: a.passRate,
        averageCycleTimeMs: a.cycleTime,
        reworkFrequency: a.rework,
        costEfficiencyRatio: a.costRatio,
        escalationFrequency: a.escalation,
        contextualFactors: {
          taskDifficultyMix: a.mix,
          highRiskRatio: Number((a.mix.critical / (a.completed || 1)).toFixed(2)),
          providerConstraintsEncountered: 0,
        },
        summaryEvaluation: a.summary,
      });
    }
  }

  public getAllIndicators(): AgentPerformanceIndicator[] {
    return Array.from(this.indicators.values());
  }

  public getIndicator(agentId: string): AgentPerformanceIndicator | undefined {
    return this.indicators.get(agentId);
  }

  /**
   * Explains performance contextualized by difficulty and risk
   * Section 11: Non-gamified factual performance description
   */
  public getContextualPerformanceReport(agentId: string): string {
    const p = this.indicators.get(agentId);
    if (!p) return `Agent ${agentId} tidak ditemukan.`;

    const diff = p.contextualFactors.taskDifficultyMix;
    return (
      `📊 *INDIKATOR KINERJA KONTEKSTUAL: ${p.agentName} (${p.role})*\n\n` +
      `• Keandalan Penyelesaian: ${p.completionReliability}%\n` +
      `• Verifikasi Lolos (Pass Rate): ${p.verificationPassRate}%\n` +
      `• Rata-rata Siklus Waktu: ${(p.averageCycleTimeMs / 1000).toFixed(1)} detik\n` +
      `• Frekuensi Rework: ${p.reworkFrequency}%\n` +
      `• Efisiensi Biaya per Poin: $${p.costEfficiencyRatio.toFixed(2)} USD\n` +
      `• Frekuensi Eskalasi: ${p.escalationFrequency} kali\n\n` +
      `*Distribusi Kesulitan Tugas:*\n` +
      `  - Trivial: ${diff.trivial} | Moderat: ${diff.moderate} | Kompleks: ${diff.complex} | Kritis: ${diff.critical}\n\n` +
      `*Catatan Evaluasi:*\n${p.summaryEvaluation}`
    );
  }
}
