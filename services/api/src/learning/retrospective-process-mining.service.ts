import { Injectable, Logger } from '@nestjs/common';
import { ProcessMiningTrace, PlanningEvaluation } from '@kdi/types';

export interface TaskRetrospectiveAnalysis {
  taskId: string;
  title: string;
  whatHappened: string;
  whatWasExpected: string;
  whatWorked: string[];
  whatFailed: string[];
  whereWasFriction: string[];
  whatRepeated: string[];
  whatShouldChange: string[];
  evidenceData: Record<string, unknown>;
  retrospectiveTimestamp: string;
}

@Injectable()
export class RetrospectiveProcessMiningService {
  private readonly logger = new Logger(RetrospectiveProcessMiningService.name);

  private readonly processTraces = new Map<string, ProcessMiningTrace>();
  private readonly planningEvaluations = new Map<string, PlanningEvaluation>();
  private readonly retrospectives = new Map<string, TaskRetrospectiveAnalysis>();

  constructor() {
    this.seedBaselineProcessMining();
  }

  // ==========================================================
  // Experience Replay & Retrospective Engine (Section 6)
  // ==========================================================

  conductRetrospective(params: {
    taskId: string;
    title: string;
    plannedDurationMs: number;
    actualDurationMs: number;
    retryCount: number;
    reworkRequired: boolean;
    toolsUsed: string[];
    verificationPassed: boolean;
    humanInterventionCount: number;
    provider: string;
    costUsd: number;
  }): TaskRetrospectiveAnalysis {
    const whatWorked: string[] = [];
    const whatFailed: string[] = [];
    const friction: string[] = [];
    const shouldChange: string[] = [];
    const repeated: string[] = [];

    if (params.verificationPassed && params.retryCount === 0) {
      whatWorked.push('Verifikasi berhasil pada percobaan pertama (First-pass pass rate 100%)');
    } else {
      whatFailed.push(`Mengalami ${params.retryCount} kegagalan verifikasi/retry sebelum selesai`);
    }

    if (params.toolsUsed.length > 0) {
      whatWorked.push(`Penggunaan ${params.toolsUsed.length} tool terintegrasi (${params.toolsUsed.join(', ')})`);
    }

    if (params.reworkRequired) {
      friction.push('Terjadi siklus rework setelah pengujian inisial');
      shouldChange.push('Tingkatkan cakupan linter/unit test lokal sebelum proses review');
      repeated.push('Pola rework berulang pada komponen backend/API');
    }

    if (params.actualDurationMs >= params.plannedDurationMs * 1.25) {
      friction.push(`Durasi eksekusi aktual (${Math.round(params.actualDurationMs / 60000)}m) melampaui estimasi awal (${Math.round(params.plannedDurationMs / 60000)}m)`);
      shouldChange.push('Kalibrasi bobot estimasi effort untuk tugas dengan kompleksitas serupa');
    }

    if (params.humanInterventionCount > 0) {
      friction.push(`Terdapat ${params.humanInterventionCount} eskalasi manual ke human owner`);
      if (params.humanInterventionCount > 2) {
        shouldChange.push('Tinjau ulang definisi izin Level 3/4 agar tidak memicu eskalasi berlebih');
      }
    }

    const retro: TaskRetrospectiveAnalysis = {
      taskId: params.taskId,
      title: params.title,
      whatHappened: `Tugas dieksekusi menggunakan provider ${params.provider} dengan total biaya $${params.costUsd.toFixed(4)}.`,
      whatWasExpected: `Penyelesaian dalam ${Math.round(params.plannedDurationMs / 60000)}m tanpa eskalasi dan lolos verifikasi langsung.`,
      whatWorked,
      whatFailed,
      whereWasFriction: friction.length > 0 ? friction : ['Tidak terdeteksi friksi operasional yang signifikan.'],
      whatRepeated: repeated,
      whatShouldChange: shouldChange.length > 0 ? shouldChange : ['Pertahankan alur kerja dan konfigurasi saat ini.'],
      evidenceData: {
        actualDurationMs: params.actualDurationMs,
        plannedDurationMs: params.plannedDurationMs,
        retryCount: params.retryCount,
        reworkRequired: params.reworkRequired,
        humanInterventionCount: params.humanInterventionCount,
        costUsd: params.costUsd,
      },
      retrospectiveTimestamp: new Date().toISOString(),
    };

    this.retrospectives.set(params.taskId, retro);
    return retro;
  }

  getRetrospective(taskId: string): TaskRetrospectiveAnalysis | undefined {
    return this.retrospectives.get(taskId);
  }

  // ==========================================================
  // Process Mining & Workflow Friction Detection (Section 7)
  // ==========================================================

  recordProcessTrace(trace: ProcessMiningTrace): void {
    this.processTraces.set(trace.taskId, trace);
  }

  analyzeProcessTrace(taskId: string): {
    trace: ProcessMiningTrace;
    hasLoopFriction: boolean;
    hasExcessiveWaiting: boolean;
    hasReworkHotspot: boolean;
    bottleneckStates: string[];
    recommendations: string[];
  } {
    const trace = this.processTraces.get(taskId) || {
      traceId: `trc_${taskId}`,
      taskId,
      transitions: [],
      loopCount: 0,
      waitingDurationMs: 0,
      reworkCount: 0,
      detectedFriction: [],
    };

    const hasLoopFriction = trace.loopCount >= 2;
    const hasExcessiveWaiting = trace.waitingDurationMs > 300000; // > 5 minutes
    const hasReworkHotspot = trace.reworkCount >= 1;

    const bottleneckStates: string[] = [];
    const recommendations: string[] = [];

    // Analyze transitions for state durations
    trace.transitions.forEach((t) => {
      if (t.durationMs > 180000 && !bottleneckStates.includes(t.fromState)) {
        bottleneckStates.push(t.fromState);
      }
    });

    if (hasLoopFriction) {
      recommendations.push('Deteksi loop berulang: Tambahkan circuit breaker untuk mencegah osilasi status eksekusi.');
    }
    if (hasExcessiveWaiting) {
      recommendations.push('Waktu tunggu antrean tinggi: Perluas slot konkurensi atau alokasikan pekerja cadangan.');
    }
    if (hasReworkHotspot) {
      recommendations.push('Hotspot rework: Terapkan peninjauan kode otomatis sebelum masuk tahap QA.');
    }

    return {
      trace,
      hasLoopFriction,
      hasExcessiveWaiting,
      hasReworkHotspot,
      bottleneckStates,
      recommendations,
    };
  }

  getAllProcessTraces(): ProcessMiningTrace[] {
    return Array.from(this.processTraces.values());
  }

  // ==========================================================
  // Planning Learning & Evaluation (Section 8)
  // ==========================================================

  evaluatePlanning(params: {
    taskId: string;
    plannedScope: string[];
    actualScope: string[];
    plannedStepsCount: number;
    actualStepsCount: number;
    plannedEffortHours: number;
    actualEffortHours: number;
  }): PlanningEvaluation {
    const defects: string[] = [];

    // Step variance
    const stepDiff = Math.abs(params.actualStepsCount - params.plannedStepsCount);
    if (params.actualStepsCount > params.plannedStepsCount * 1.5) {
      defects.push(`Underestimated step decomposition (Direncanakan ${params.plannedStepsCount}, aktual ${params.actualStepsCount})`);
    } else if (params.actualStepsCount < params.plannedStepsCount * 0.5) {
      defects.push(`Over-decomposition: Langkah riil jauh lebih ringkas dari rencana`);
    }

    // Effort variance
    const effortRatio = params.actualEffortHours / Math.max(0.1, params.plannedEffortHours);
    if (effortRatio > 1.4) {
      defects.push(`Underestimated effort: Waktu riil (${params.actualEffortHours}h) melampaui estimasi (${params.plannedEffortHours}h)`);
    } else if (effortRatio < 0.6) {
      defects.push(`Overestimated effort: Waktu riil (${params.actualEffortHours}h) jauh di bawah estimasi (${params.plannedEffortHours}h)`);
    }

    // Scope coverage
    const missingScope = params.actualScope.filter((s) => !params.plannedScope.includes(s));
    if (missingScope.length > 0) {
      defects.push(`Missing scope dependencies terdeteksi selama eksekusi: ${missingScope.join(', ')}`);
    }

    // Calculate accuracy score (0-100)
    let score = 100;
    score -= stepDiff * 5;
    score -= Math.abs(effortRatio - 1.0) * 40;
    score -= missingScope.length * 15;
    const accuracyScore = Math.max(20, Math.min(100, Math.round(score)));

    const evalRecord: PlanningEvaluation = {
      taskId: params.taskId,
      plannedScope: params.plannedScope,
      actualScope: params.actualScope,
      plannedStepsCount: params.plannedStepsCount,
      actualStepsCount: params.actualStepsCount,
      plannedEffortHours: params.plannedEffortHours,
      actualEffortHours: params.actualEffortHours,
      accuracyScore,
      planningDefects: defects,
    };

    this.planningEvaluations.set(params.taskId, evalRecord);
    return evalRecord;
  }

  getPlanningEvaluation(taskId: string): PlanningEvaluation | undefined {
    return this.planningEvaluations.get(taskId);
  }

  private seedBaselineProcessMining(): void {
    // Seed sample trace showing QA bottleneck and rework
    this.recordProcessTrace({
      traceId: 'trc_simmaci_patch_001',
      taskId: 'tsk_simmaci_patch_001',
      transitions: [
        { fromState: 'CREATED', toState: 'PLANNING', durationMs: 1200, timestamp: '2026-10-01T08:00:00Z' },
        { fromState: 'PLANNING', toState: 'ASSIGNED', durationMs: 5400, timestamp: '2026-10-01T08:00:05Z' },
        { fromState: 'ASSIGNED', toState: 'WAITING', durationMs: 420000, timestamp: '2026-10-01T08:07:05Z' }, // 7m waiting
        { fromState: 'WAITING', toState: 'EXECUTION', durationMs: 720000, timestamp: '2026-10-01T08:19:05Z' }, // 12m execution
        { fromState: 'EXECUTION', toState: 'TESTING', durationMs: 180000, timestamp: '2026-10-01T08:22:05Z' },
        { fromState: 'TESTING', toState: 'REWORK', durationMs: 300000, timestamp: '2026-10-01T08:27:05Z' }, // Rework
        { fromState: 'REWORK', toState: 'TESTING', durationMs: 120000, timestamp: '2026-10-01T08:29:05Z' },
        { fromState: 'TESTING', toState: 'COMPLETED', durationMs: 30000, timestamp: '2026-10-01T08:29:35Z' },
      ],
      loopCount: 1,
      waitingDurationMs: 420000,
      reworkCount: 1,
      detectedFriction: ['Antrean tunggu QA lama (7m)', 'Terjadi 1 siklus rework pengujian'],
    });

    // Seed planning evaluation
    this.evaluatePlanning({
      taskId: 'tsk_simmaci_patch_001',
      plannedScope: ['Connection Pool Tuning', 'Health Check API'],
      actualScope: ['Connection Pool Tuning', 'Health Check API', 'Redis Session Cache Invalidation'],
      plannedStepsCount: 3,
      actualStepsCount: 4,
      plannedEffortHours: 2.0,
      actualEffortHours: 2.8,
    });
  }
}
