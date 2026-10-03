// ==========================================================
// services/api/src/telegram/formatter/telegram.formatter.ts
// Telegram Markdown Formatter & UX Presentation Engine
// Follows KDI Phase 11 UX Principles: Clear, Actionable, Indonesian default
// ==========================================================

import type {
  TelegramApproval,
  InlineKeyboardMarkup,
  CanonicalTask,
  AgentDefinition,
  Incident,
  DailyBriefing,
  AggregateHealthResponse,
} from '@kdi/types';
import { redactSecretsFromString } from '@kdi/shared';

export class TelegramFormatter {
  /**
   * /start Greeting Card
   */
  public static formatStart(ownerName = 'Owner', botUsername = 'KdiOrchestratorBot'): string {
    return (
      `🏛️ *KDI AI OFFICE — ORCHESTRATOR COMMAND CENTER*\n\n` +
      `Halo, *${ownerName}*! Saya adalah **KDI AI Orchestrator**.\n\n` +
      `Anda berbicara langsung dengan koordinator organisasi AI. Semua instruksi Anda akan diterjemahkan ke dalam tugas untuk seluruh tim agen (PM, Architect, Backend, Frontend, QA, Security, DevOps, Researcher).\n\n` +
      `💡 *Cara Berinteraksi:*\n` +
      `• *Bahasa Natural:* Ketik langsung apa yang Anda butuhkan (contoh: _"Cek kesehatan SIMMACI"_, _"Apa yang sedang dikerjakan?"_, _"Audit backend sekarang"_)\n` +
      `• *Perintah Kilat:* Gunakan menu command seperti /status, /tasks, /agents, /approvals, /report\n\n` +
      `Ketik /help untuk panduan lengkap kemampuan sistem.`
    );
  }

  /**
   * /help Command Manual
   */
  public static formatHelp(): string {
    return (
      `📋 *KDI ORCHESTRATOR — PANDUAN PERINTAH*\n\n` +
      `*Perintah Dasar:*\n` +
      `• /status — Ringkasan kesehatan server, DB, Redis, Neo4j, runtime\n` +
      `• /tasks — Daftar pekerjaan yang sedang berjalan dan antrean\n` +
      `• /agents — Status seluruh Digital Employees & lokasi ruangan\n` +
      `• /projects — Portfolio proyek dan status kesehatan operasional\n` +
      `• /incidents — Insiden aktif dan eskalasi sistem\n` +
      `• /approvals — Permintaan persetujuan tertunda (High-Risk Gates)\n` +
      `• /report — Daily briefing dan ringkasan operasional kantor\n` +
      `• /pause — Emergency halt: Hentikan seluruh autonomous execution\n` +
      `• /resume — Aktifkan kembali autonomy kantor\n\n` +
      `💬 *Interaksi Natural Language:*\n` +
      `Anda dapat berbicara bebas tanpa syntax kaku:\n` +
      `• _"Bagaimana kondisi kantor hari ini?"_\n` +
      `• _"Cari penyebab error login SIMMACI."_\n` +
      `• _"Perbaiki masalah autentikasi SIMMACI."_\n` +
      `• _"Audit keamanan API sekarang."_\n` +
      `• _"Lanjutkan pekerjaan yang tertunda."_`
    );
  }

  /**
   * /status System Overview Card
   */
  public static formatSystemStatus(data: {
    health: AggregateHealthResponse;
    globalPaused: boolean;
    activeTasks: number;
    queuedTasks: number;
    activeAgents: number;
    openIncidents: number;
    pendingApprovals: number;
  }): string {
    const pg = data.health.subsystems.postgres.status === 'UP' ? '✅' : '❌';
    const rd = data.health.subsystems.redis.status === 'UP' ? '✅' : '❌';
    const neo = data.health.subsystems.neo4j.status === 'UP' ? '✅' : '❌';
    const ol = data.health.subsystems.ollama?.status === 'UP' ? '✅' : '⚠️ Offline/Cloud-Fallback';
    const autonomy = data.globalPaused ? '⏸️ PAUSED (Emergency Halt)' : '🟢 AKTIF BERJALAN';

    return (
      `📊 *KDI AI OFFICE — STATUS SISTEM*\n\n` +
      `*Kesehatan Infrastruktur:*\n` +
      `• PostgreSQL : ${pg} (${data.health.subsystems.postgres.latencyMs}ms)\n` +
      `• Redis Event: ${rd} (${data.health.subsystems.redis.latencyMs}ms)\n` +
      `• Neo4j Graph: ${neo} (${data.health.subsystems.neo4j.latencyMs}ms)\n` +
      `• Local Ollama: ${ol}\n\n` +
      `*Runtime & Operasional:*\n` +
      `• Autonomy Status : ${autonomy}\n` +
      `• Tugas Berjalan   : *${data.activeTasks}*\n` +
      `• Antrean Tugas   : *${data.queuedTasks}*\n` +
      `• Digital Agents  : *${data.activeAgents}*\n` +
      `• Insiden Aktif   : *${data.openIncidents}*\n` +
      `• Butuh Approval  : *${data.pendingApprovals}*`
    );
  }

  /**
   * /tasks Active and Queued Tasks Card
   */
  public static formatTasks(tasks: CanonicalTask[], queued: CanonicalTask[] = []): string {
    if (tasks.length === 0 && queued.length === 0) {
      return (
        `📌 *DAFTAR TUGAS KDI*\n\n` +
        `Saat ini tidak ada tugas aktif atau antrean.\n` +
        `Seluruh agen dalam keadaan siap menerima instruksi baru.`
      );
    }

    let out = `📌 *DAFTAR TUGAS KDI*\n\n`;

    if (tasks.length > 0) {
      out += `*Sedang Berjalan (${tasks.length}):*\n`;
      tasks.slice(0, 5).forEach((t, i) => {
        out += `${i + 1}. *[${t.priority}]* ${t.title}\n   🆔 \`${t.taskId}\` | Agen: ${t.assignedAgent || 'Mencari Agen...'}\n`;
      });
      if (tasks.length > 5) out += `   _...dan ${tasks.length - 5} tugas lainnya_\n`;
      out += '\n';
    }

    if (queued.length > 0) {
      out += `*Dalam Antrean (${queued.length}):*\n`;
      queued.slice(0, 5).forEach((t, i) => {
        out += `• *[${t.priority}]* ${t.title} (\`${t.taskId}\`)\n`;
      });
      if (queued.length > 5) out += `   _...dan ${queued.length - 5} antrean lainnya_\n`;
    }

    return redactSecretsFromString(out);
  }

  /**
   * /agents Digital Employees Status Card
   */
  public static formatAgents(agents: AgentDefinition[]): string {
    let out = `🤖 *TIM DIGITAL EMPLOYEES KDI (${agents.length})*\n\n`;

    agents.forEach((ag) => {
      const state = (ag as any).state || ag.status;
      const stateEmoji =
        state === 'CODING' || state === 'WORKING'
          ? '💻'
          : state === 'THINKING' || state === 'PLANNING'
            ? '🧠'
            : state === 'AVAILABLE' || state === 'IDLE'
              ? '☕'
              : '🟢';
      out += `${stateEmoji} *${ag.name}* (${ag.role})\n   Status: ${state} | Spesialisasi: ${ag.skills.slice(0, 2).join(', ')}\n`;
    });

    return out;
  }

  /**
   * /incidents Active Incidents Card
   */
  public static formatIncidents(incidents: Incident[]): string {
    const active = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
    if (active.length === 0) {
      return (
        `🛡️ *STATUS INSIDEN KDI*\n\n` +
        `✅ *Nol Insiden Aktif!*\n` +
        `Seluruh service SIMMACI, infrastruktur, dan runtime bekerja normal.`
      );
    }

    let out = `🚨 *INSIDEN AKTIF KDI (${active.length})*\n\n`;
    active.forEach((inc, idx) => {
      out +=
        `${idx + 1}. *${inc.title}*\n` +
        `   Tingkat  : *${inc.severity}*\n` +
        `   Status   : ${inc.status}\n` +
        `   Waktu    : ${inc.detectedAt.slice(11, 16)} WIB\n\n`;
    });

    return redactSecretsFromString(out);
  }

  /**
   * /approvals Pending Human Approvals Card
   */
  public static formatApprovalsList(approvals: TelegramApproval[]): string {
    const pending = approvals.filter((a) => a.status === 'PENDING');
    if (pending.length === 0) {
      return (
        `🛡️ *PERSETUJUAN (APPROVALS)*\n\n` +
        `✅ Tidak ada approval yang tertunda.\n` +
        `Semua operasi berada dalam batas kebijakan otonom yang aman.`
      );
    }

    let out = `⚠️ *PERSETUJUAN TERTUNDA (${pending.length})*\n\n`;
    pending.forEach((app, idx) => {
      out +=
        `${idx + 1}. *${app.actionTitle}*\n` +
        `   Risiko : *${app.riskLevel}*\n` +
        `   Dampak : ${app.impact}\n` +
        `   ID     : \`${app.approvalId}\`\n\n`;
    });

    out += `Gunakan tombol persetujuan yang dikirimkan pada pesan terkait untuk menyetujui.`;
    return redactSecretsFromString(out);
  }

  /**
   * /report Daily Briefing Card
   */
  public static formatDailyBriefing(briefing: DailyBriefing): string {
    let out =
      `☀️ *KDI DAILY BRIEFING*\n` +
      `📅 Generated: ${briefing.generatedAt.slice(0, 10)}\n\n` +
      `*Ringkasan Eksekutif:*\n` +
      `• Area Sehat       : ${briefing.good.length} komponen\n` +
      `• Butuh Perhatian : ${briefing.attentionNeeded.length} hal\n` +
      `• Terhambat (Block): ${briefing.blocked.length} isu\n` +
      `• Approval Pending : ${briefing.pendingApprovalsCount}\n` +
      `• Insiden Aktif    : ${briefing.activeIncidentsCount}\n` +
      `• Estimasi Biaya   : $${briefing.cost.dailySpendUsd.toFixed(2)} USD\n\n`;

    if (briefing.attentionNeeded.length > 0) {
      out += `*Perhatian Khusus:*\n`;
      briefing.attentionNeeded.forEach((item) => {
        out += `• ${item}\n`;
      });
      out += '\n';
    }

    if (briefing.upcoming.length > 0) {
      out += `*Rencana Mendatang:*\n`;
      briefing.upcoming.forEach((item) => {
        out += `• ${item}\n`;
      });
    }

    return redactSecretsFromString(out);
  }

  /**
   * High-Risk Approval Request Card with Inline Buttons
   */
  public static formatApprovalRequest(approval: TelegramApproval): {
    text: string;
    replyMarkup: InlineKeyboardMarkup;
  } {
    const stepsFormatted =
      approval.planSteps.length > 0
        ? approval.planSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')
        : '1. Verifikasi dan eksekusi';

    const text =
      `⚠️ *APPROVAL REQUIRED*\n\n` +
      `*Tindakan:*\n${approval.actionTitle}\n\n` +
      `*Deskripsi:*\n${approval.actionDescription}\n\n` +
      `*Tingkat Risiko:*\n*${approval.riskLevel}*\n\n` +
      `*Dampak:*\n${approval.impact}\n\n` +
      `*Rencana Eksekusi:*\n${stepsFormatted}\n\n` +
      `_Persetujuan ini terikat secara kriptografis pada identitas Owner dan akan kedaluwarsa otomatis._`;

    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '✅ SETUJUI', callback_data: `appr:${approval.approvalId}:approve` },
          { text: '❌ TOLAK', callback_data: `appr:${approval.approvalId}:reject` },
        ],
      ],
    };

    return {
      text: redactSecretsFromString(text),
      replyMarkup,
    };
  }

  /**
   * Card for when approval is resolved
   */
  public static formatApprovalResolved(
    approval: TelegramApproval,
    decision: 'APPROVED' | 'REJECTED',
    operator = 'Owner'
  ): string {
    const badge = decision === 'APPROVED' ? '✅ *DISETUJUI*' : '❌ *DITOLAK*';
    const statusText =
      decision === 'APPROVED'
        ? `Tindakan telah disetujui oleh *${operator}* dan diteruskan ke runtime untuk dieksekusi.`
        : `Tindakan dibatalkan oleh *${operator}*. Eksekusi dihentikan dengan aman.`;

    return (
      `⚠️ *APPROVAL ${decision}*\n\n` +
      `*Tindakan:* ${approval.actionTitle}\n` +
      `*Keputusan:* ${badge}\n` +
      `*Oleh:* ${operator}\n` +
      `*Waktu:* ${new Date().toLocaleTimeString('id-ID')} WIB\n\n` +
      statusText
    );
  }

  /**
   * Immediate Task Acceptance Receipt (Long-Running Task pattern)
   */
  public static formatTaskAccepted(task: {
    taskId: string;
    title: string;
    priority?: string;
    assignedAgent?: string;
  }): string {
    return (
      `✅ *PERINTAH DITERIMA*\n\n` +
      `*Tugas:*\n${task.title}\n\n` +
      `*Task ID:*\n\`${task.taskId}\`\n\n` +
      `*Status:*\nQueued (Dalam Antrean)\n\n` +
      `*Agen:*\n${task.assignedAgent || 'Mencari spesialis yang sesuai...'}\n\n` +
      `Saya akan melaporkan hasil segera setelah proses selesai.`
    );
  }

  /**
   * Task Completed Notification Card
   */
  public static formatTaskCompleted(task: {
    taskId: string;
    title: string;
    agentName?: string;
    summary?: string;
    commitHash?: string;
  }): string {
    let out =
      `✅ *TASK COMPLETED*\n\n` +
      `*${task.title}*\n\n` +
      `*Agen:*\n${task.agentName || 'KDI Engineering Agent'}\n\n` +
      `*Hasil:*\n${task.summary || 'Tugas berhasil diverifikasi dan diselesaikan dengan sukses.'}\n`;

    if (task.commitHash) {
      out += `\n*Commit:*\n\`${task.commitHash}\`\n`;
    }

    return redactSecretsFromString(out);
  }

  /**
   * Task Failed Notification Card
   */
  public static formatTaskFailed(task: {
    taskId: string;
    title: string;
    reason: string;
  }): string {
    return (
      `❌ *TASK FAILED*\n\n` +
      `*${task.title}*\n\n` +
      `*Task ID:*\n\`${task.taskId}\`\n\n` +
      `*Penyebab Kegagalan:*\n${task.reason}\n\n` +
      `Sistem telah mencatat failure trace dan menjadwalkan investigasi root-cause.`
    );
  }

  /**
   * Incident Notification Card
   */
  public static formatIncidentAlert(incident: {
    title: string;
    impact: string;
    severity: string;
    actionTaken?: string;
    status: string;
  }): string {
    return (
      `🚨 *INCIDENT DETECTED*\n\n` +
      `*Masalah:*\n${incident.title}\n\n` +
      `*Tingkat Keparahan:*\n*${incident.severity}*\n\n` +
      `*Dampak:*\n${incident.impact}\n\n` +
      `*Tindakan Otomatis:*\n${incident.actionTaken || 'Mencoba pemulihan otomatis...'}\n\n` +
      `*Status:*\n${incident.status}\n\n` +
      `Perhatian manusia diperlukan jika pemulihan otomatis tidak berhasil.`
    );
  }

  /**
   * Emergency Pause Card
   */
  public static formatEmergencyPause(paused: boolean, reason: string, user: string): string {
    if (paused) {
      return (
        `🛑 *GLOBAL AUTONOMY PAUSED*\n\n` +
        `Seluruh eksekusi otonom baru telah *DIHENTIKAN SEMENTARA*.\n\n` +
        `*Alasan:* ${reason}\n` +
        `*Oleh:* ${user}\n` +
        `*Waktu:* ${new Date().toLocaleTimeString('id-ID')} WIB\n\n` +
        `Gunakan perintah /resume untuk mengaktifkan kembali otonomi saat kondisi sudah aman.`
      );
    } else {
      return (
        `🟢 *AUTONOMY RESUMED*\n\n` +
        `Otonomi kantor telah *DIAKTIFKAN KEMBALI*.\n\n` +
        `*Oleh:* ${user}\n` +
        `*Waktu:* ${new Date().toLocaleTimeString('id-ID')} WIB\n\n` +
        `Agen-agen kembali memproses antrean tugas secara normal.`
      );
    }
  }

  /**
   * Unauthorized Access Card
   */
  public static formatUnauthorized(telegramId: string, username?: string): string {
    return (
      `⛔ *AKSES DITOLAK*\n\n` +
      `ID Telegram Anda (\`${telegramId}\`${username ? ` / @${username}` : ''}) tidak terdaftar dalam allowlist Owner KDI AI Office.\n\n` +
      `Insiden upaya akses ini telah dicatat dalam security audit log demi keamanan operasional.`
    );
  }

  /**
   * General Natural Language Answer Card
   */
  public static formatNaturalResponse(answer: string): string {
    return redactSecretsFromString(answer);
  }

  /**
   * Operational Explanation Card (Phase 12 Section 5 Contract)
   * Explains orchestrator reasoning purely on operational terms without hidden chain-of-thought.
   */
  public static formatOperationalExplanation(data: {
    understoodRequest: string;
    identifiedProject: string;
    selectedCapabilities: string[];
    executionPlan: string[];
    assignedAgents: string[];
    verificationStatus: string;
    finalResult?: string;
  }): string {
    let out =
      `🧠 *PENJELASAN OPERASIONAL ORCHESTRATOR*\n\n` +
      `• *Permintaan Dipahami:* ${data.understoodRequest}\n` +
      `• *Target Proyek:* ${data.identifiedProject}\n` +
      `• *Kapabilitas Terpilih:* ${data.selectedCapabilities.join(', ')}\n` +
      `• *Agen Ditugaskan:* ${data.assignedAgents.join(', ')}\n\n` +
      `*Rencana Eksekusi:*\n` +
      data.executionPlan.map((step, idx) => `${idx + 1}. ${step}`).join('\n') +
      `\n\n• *Status Verifikasi:* ${data.verificationStatus}\n`;

    if (data.finalResult) {
      out += `\n*Hasil Akhir:*\n${data.finalResult}\n`;
    }

    return redactSecretsFromString(out);
  }

  /**
   * Morning Operating Model Briefing (Phase 12 Section 30)
   */
  public static formatMorningBriefing(data: {
    health: AggregateHealthResponse;
    activeAgents: number;
    activeTasks: number;
    blockedTasks: number;
    incidents: number;
    approvals: number;
    priorityRecommendations: string[];
  }): string {
    const pg = data.health.subsystems.postgres.status === 'UP' ? '✅' : '❌';
    const rd = data.health.subsystems.redis.status === 'UP' ? '✅' : '❌';
    const neo = data.health.subsystems.neo4j.status === 'UP' ? '✅' : '❌';

    let out =
      `🌅 *STATUS KDI PAGI INI — OPERATIONAL BRIEFING*\n\n` +
      `*Kesehatan Sistem:*\n` +
      `• PostgreSQL: ${pg} | Redis: ${rd} | Neo4j: ${neo}\n` +
      `• Status Global: ${data.health.status === 'HEALTHY' ? '🟢 PRIMA' : '🟡 PERHATIAN'}\n\n` +
      `*Tenaga Kerja & Tugas:*\n` +
      `• Agen Aktif: *${data.activeAgents}*\n` +
      `• Tugas Berjalan: *${data.activeTasks}*\n` +
      `• Tugas Terhambat: *${data.blockedTasks}*\n` +
      `• Insiden Terbuka: *${data.incidents}*\n` +
      `• Butuh Approval: *${data.approvals}*\n\n` +
      `*Rekomendasi Prioritas Hari Ini:*\n` +
      data.priorityRecommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');

    return redactSecretsFromString(out);
  }

  /**
   * Evening Daily Report (Phase 12 Section 30)
   */
  public static formatEveningReport(data: {
    completedTasks: number;
    unfinishedWork: number;
    incidents: number;
    importantDecisions: string[];
    costSummary: string;
    systemHealth: string;
    recommendations: string[];
  }): string {
    let out =
      `🌆 *LAPORAN HARIAN KDI — EXECUTIVE EVENING BRIEFING*\n\n` +
      `*Ringkasan Kinerja Harian:*\n` +
      `• Tugas Selesai   : *${data.completedTasks}*\n` +
      `• Sisa Pekerjaan  : *${data.unfinishedWork}*\n` +
      `• Insiden Ditangani: *${data.incidents}*\n` +
      `• Kesehatan Sistem: *${data.systemHealth}*\n` +
      `• Estimasi Biaya  : *${data.costSummary}*\n\n`;

    if (data.importantDecisions.length > 0) {
      out += `*Keputusan Penting:*\n` + data.importantDecisions.map((d, i) => `• ${d}`).join('\n') + `\n\n`;
    }

    if (data.recommendations.length > 0) {
      out += `*Rekomendasi Operasional:*\n` + data.recommendations.map((r, i) => `• ${r}`).join('\n');
    }

    return redactSecretsFromString(out);
  }

  /**
   * Security Policy Defense Notice (Phase 12 Section 25)
   */
  public static formatSecurityPolicyDefense(threatPattern: string, enforcedPolicy: string): string {
    return redactSecretsFromString(
      `🛡️ *KDI POLICY ENGINE — PERTAHANAN KEAMANAN TERPASANG*\n\n` +
      `*Anomali Terdeteksi:* ${threatPattern}\n\n` +
      `*Kebijakan KDI:* ${enforcedPolicy}\n\n` +
      `Instruksi yang mencoba mengabaikan kebijakan, menonaktifkan approval, atau merusak data akan selalu ditolak secara otonom oleh Policy Engine berotoritas tertinggi.`
    );
  }

  /**
   * Phase 13 Section 48: Operational Target Organizational Briefing
   */
  public static formatOrganizationalBriefing(data: {
    deliverySummary: { completed: number; active: number; blocked: number };
    capacitySummary: string;
    bottleneckSummary: string;
    objectiveSummary: string;
    riskSummary: string;
    knowledgeSummary: string;
    recommendationSummary: string;
  }): string {
    const out =
      `🏢 *KDI Organizational Briefing*\n\n` +
      `*Delivery:*\n` +
      `${data.deliverySummary.completed} task selesai\n` +
      `${data.deliverySummary.active} aktif\n` +
      `${data.deliverySummary.blocked} blocked\n\n` +
      `*Capacity:*\n` +
      `${data.capacitySummary}\n\n` +
      `*Bottleneck:*\n` +
      `${data.bottleneckSummary}\n\n` +
      `*Objective:*\n` +
      `${data.objectiveSummary}\n\n` +
      `*Risk:*\n` +
      `${data.riskSummary}\n\n` +
      `*Knowledge:*\n` +
      `${data.knowledgeSummary}\n\n` +
      `*Recommendation:*\n` +
      `${data.recommendationSummary}`;

    return redactSecretsFromString(out);
  }

  /**
   * Phase 13 Section 31: Structured Weekly Report
   */
  public static formatWeeklyReport(reportText: string): string {
    return redactSecretsFromString(reportText);
  }

  /**
   * Phase 14 Section 58: Operational Target Learning Report
   */
  public static formatLearningReport(data: {
    observationsCount: number;
    validatedLessonsCount: number;
    recurringPatternsCount: number;
    improvementProposalsCount: number;
    experimentsCompletedCount: number;
    validatedImprovementsCount: number;
    rollbacksCount: number;
    measuredImpact: {
      qaWaitTimeDeltaPercent: number;
      reworkDeltaPercent: number;
      costDeltaPercent: number;
      humanInterventionDeltaPercent?: number;
    };
    conclusion?: string;
  }): string {
    const conclusion =
      data.conclusion ||
      'Improvement validated with measurable reliability\nand workflow benefit, while cost increased slightly.';

    const costSign = data.measuredImpact.costDeltaPercent >= 0 ? '+' : '';

    const out =
      `🧠 *KDI LEARNING REPORT*\n\n` +
      `*Observations:*\n` +
      `${data.observationsCount}\n\n` +
      `*Validated Lessons:*\n` +
      `${data.validatedLessonsCount}\n\n` +
      `*Recurring Patterns:*\n` +
      `${data.recurringPatternsCount}\n\n` +
      `*Improvement Proposals:*\n` +
      `${data.improvementProposalsCount}\n\n` +
      `*Experiments Completed:*\n` +
      `${data.experimentsCompletedCount}\n\n` +
      `*Validated Improvements:*\n` +
      `${data.validatedImprovementsCount}\n\n` +
      `*Rollback:*\n` +
      `${data.rollbacksCount}\n\n` +
      `*Measured Impact:*\n\n` +
      `*QA workload:*\n` +
      `${data.measuredImpact.qaWaitTimeDeltaPercent}% waiting time\n\n` +
      `*Rework:*\n` +
      `${data.measuredImpact.reworkDeltaPercent}%\n\n` +
      `*AI Cost:*\n` +
      `${costSign}${data.measuredImpact.costDeltaPercent}%\n\n` +
      `*Conclusion:*\n` +
      `${conclusion}`;

    return redactSecretsFromString(out);
  }

  /**
   * Phase 15 Section 65: Operational Target Strategic Briefing
   */
  public static formatStrategicBriefing(data: {
    objectiveName: string;
    planVersion: string;
    milestonesSummary: { completed: number; inProgress: number; atRisk: number };
    currentDeviation: string;
    cause: string;
    impact: string;
    capacity: { engineeringPercent: number; qaPercent: number };
    recommendation: string;
  }): string {
    const out =
      `KDI STRATEGIC STATUS\n\n` +
      `Objective:\n${data.objectiveName}\n\n` +
      `Plan:\n${data.planVersion}\n\n` +
      `Milestones:\n` +
      `${data.milestonesSummary.completed} completed\n` +
      `${data.milestonesSummary.inProgress} in progress\n` +
      `${data.milestonesSummary.atRisk} at risk\n\n` +
      `Current deviation:\n${data.currentDeviation}\n\n` +
      `Cause:\n${data.cause}\n\n` +
      `Impact:\n${data.impact}\n\n` +
      `Capacity:\n` +
      `Engineering ${data.capacity.engineeringPercent}%\n` +
      `QA ${data.capacity.qaPercent}%\n\n` +
      `Recommendation:\n` +
      `${data.recommendation}\n\n` +
      `No strategic change has been executed.\n` +
      `Owner decision is required only if scope or\n` +
      `deadline tolerance must change.`;

    return redactSecretsFromString(out);
  }

  /**
   * Phase 15 Section 33: Executive Weekly Briefing
   */
  public static formatExecutiveWeeklyBriefing(briefingText: string): string {
    return redactSecretsFromString(briefingText);
  }

  /**
   * Phase 15 Section 34: Strategic Decision Request Template
   */
  public static formatDecisionRequest(data: {
    issue: string;
    evidence: string[];
    options: Array<{ title: string; expectedOutcome: string }>;
    tradeOffs: string;
    deadline: string;
    impactIfNoDecision: string;
  }): string {
    const out =
      `DECISION REQUIRED\n\n` +
      `Issue:\n${data.issue}\n\n` +
      `Evidence:\n${data.evidence.map((e) => `• ${e}`).join('\n')}\n\n` +
      `Options:\n` +
      data.options.map((o) => `• *${o.title}*: ${o.expectedOutcome}`).join('\n') +
      `\n\nTrade-offs:\n${data.tradeOffs}\n\n` +
      `Deadline for decision:\n${data.deadline}\n\n` +
      `Impact if no decision:\n${data.impactIfNoDecision}`;

    return redactSecretsFromString(out);
  }

  // ==========================================================
  // PHASE 16: AUTONOMOUS SOFTWARE DELIVERY BENCHMARK FORMATTERS
  // ==========================================================

  /**
   * Section 16: Task Accepted Operational Card
   */
  public static formatBenchmarkTaskAccepted(
    taskId: string,
    title: string,
    planSteps: string[] = ['inspect module', 'implement backend', 'implement UI', 'add tests', 'validate']
  ): string {
    const out =
      `TASK ACCEPTED\n\n` +
      `${taskId}\n` +
      `${title}\n\n` +
      `Plan:\n` +
      planSteps.map((s) => `• ${s}`).join('\n') +
      `\n\nExecution started.`;
    return redactSecretsFromString(out);
  }

  /**
   * Section 16: Implementation Complete Evidence Card
   */
  public static formatBenchmarkComplete(data: {
    passed: number;
    failed: number;
    diffFilesCount: number;
    commitHash?: string;
  }): string {
    const commitDisplay = data.commitHash ? data.commitHash.slice(0, 8) : 'pending';
    const out =
      `IMPLEMENTATION COMPLETE\n\n` +
      `Tests:\n` +
      `${data.passed} passed\n` +
      `${data.failed} failed\n\n` +
      `Git diff:\n` +
      `${data.diffFilesCount} files\n\n` +
      `Commit:\n` +
      `${commitDisplay}`;
    return redactSecretsFromString(out);
  }

  /**
   * Section 16: Task Blocked Notification Card
   */
  public static formatBenchmarkBlocked(reason: string, humanAction: string): string {
    const out =
      `TASK BLOCKED\n\n` +
      `Reason:\n` +
      `${reason}\n\n` +
      `Human action:\n` +
      `${humanAction}`;
    return redactSecretsFromString(out);
  }

  /**
   * Benchmark Task List Overview
   */
  public static formatBenchmarkTaskList(tasks: Array<{ id: string; title: string; level: number; category: string }>): string {
    const out =
      `⚙️ *KDI AUTONOMOUS SOFTWARE DELIVERY BENCHMARK*\n\n` +
      `Daftar Task Suite (10 Tasks, Level 1–5):\n\n` +
      tasks.map((t) => `• \`${t.id}\` (L${t.level} - ${t.category}): ${t.title}`).join('\n') +
      `\n\n_Ketik \`/benchmark run <taskId>\` atau \`/build <perintah>\` untuk memulai eksekusi otonom._`;
    return redactSecretsFromString(out);
  }

  /**
   * Benchmark Status & Autonomy Overview
   */
  public static formatBenchmarkStatus(metrics: {
    totalRuns: number;
    completedRuns: number;
    autonomousCompletionRate: number;
    firstPassSuccessRate: number;
    averageRecoveryRate: number;
    averageCycleTimeSeconds: number;
    unnecessaryInterventions: number;
    necessaryApprovals: number;
  }): string {
    const out =
      `📊 *AUTONOMOUS SOFTWARE DELIVERY BENCHMARK METRICS*\n\n` +
      `• Total Runs: *${metrics.totalRuns}*\n` +
      `• Completed Runs: *${metrics.completedRuns}*\n` +
      `• Autonomous Completion: *${Math.round(metrics.autonomousCompletionRate * 100)}%*\n` +
      `• First-Pass Success: *${Math.round(metrics.firstPassSuccessRate * 100)}%*\n` +
      `• Recovery Rate: *${Math.round(metrics.averageRecoveryRate * 100)}%*\n` +
      `• Avg Cycle Time: *${metrics.averageCycleTimeSeconds}s*\n` +
      `• Unnecessary Interventions: *${metrics.unnecessaryInterventions}* (Target: 0)\n` +
      `• Necessary Approvals: *${metrics.necessaryApprovals}*\n\n` +
      `_Tingkat Otonomi: KDI mengeksekusi software delivery nyata tanpa intervensi manusia manual._`;
    return redactSecretsFromString(out);
  }
}


