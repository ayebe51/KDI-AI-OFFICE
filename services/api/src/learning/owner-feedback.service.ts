import { Injectable, Logger } from '@nestjs/common';
import {
  OwnerFeedback,
  OwnerFeedbackClassification,
  OwnerPreference,
} from '@kdi/types';

@Injectable()
export class OwnerFeedbackService {
  private readonly logger = new Logger(OwnerFeedbackService.name);

  private readonly feedbackRecords = new Map<string, OwnerFeedback>();
  private readonly preferences = new Map<string, OwnerPreference>();

  constructor() {
    this.seedBaselinePreferences();
  }

  // ==========================================================
  // Ingest & Classify Owner Feedback (Section 30)
  // ==========================================================

  ingestFeedback(params: {
    rawText: string;
    source?: 'TELEGRAM' | 'WEB' | 'API';
    messageId?: string;
    appliedToTaskId?: string;
  }): OwnerFeedback {
    const classification = this.classifyFeedback(params.rawText);
    const id = `FDB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const normalizedFeedback = this.normalizeFeedbackText(params.rawText, classification);

    const record: OwnerFeedback = {
      id,
      messageId: params.messageId,
      source: params.source || 'TELEGRAM',
      rawText: params.rawText,
      classification,
      normalizedFeedback,
      appliedTo: params.appliedToTaskId,
      createdAt: new Date().toISOString(),
    };

    this.feedbackRecords.set(id, record);
    this.logger.log(`Owner feedback ingested [${classification}]: "${params.rawText}"`);

    // If it expresses a clear preference, store it into preference memory
    if (classification === 'PREFERENCE') {
      this.recordPreferenceFromFeedback(record);
    }

    return record;
  }

  classifyFeedback(text: string): OwnerFeedbackClassification {
    const s = text.toLowerCase().trim();

    if (s.includes('bagus') || s.includes('mantap') || s.includes('oke lanjutkan') || s.includes('sip') || s.includes('approve') || s.includes('setuju')) {
      return 'APPROVAL';
    }
    if (s.includes('kurang tepat') || s.includes('salah') || s.includes('keliru') || s.includes('bukan begitu') || s.includes('koreksi')) {
      return 'CORRECTION';
    }
    if (s.includes('lebih suka') || s.includes('ringkas') || s.includes('singkat saja') || s.includes('detailkan') || s.includes('prefer')) {
      return 'PREFERENCE';
    }
    if (s.includes('jangan gunakan') || s.includes('dilarang') || s.includes('batasi') || s.includes('maksimal')) {
      return 'CONSTRAINT';
    }
    if (s.includes('pelajaran') || s.includes('ingat bahwa') || s.includes('catat bahwa') || s.includes('pengalaman')) {
      return 'LESSON';
    }
    if (s.includes('ubah kebijakan') || s.includes('ganti aturan') || s.includes('policy')) {
      return 'POLICY_REQUEST';
    }

    return 'CORRECTION';
  }

  normalizeFeedbackText(rawText: string, classification: OwnerFeedbackClassification): string {
    const trimmed = rawText.trim();
    switch (classification) {
      case 'APPROVAL':
        return `Owner menyetujui output/tindakan: "${trimmed}"`;
      case 'CORRECTION':
        return `Koreksi dari Owner: "${trimmed}"`;
      case 'PREFERENCE':
        return `Preferensi format/eksekusi dari Owner: "${trimmed}"`;
      case 'CONSTRAINT':
        return `Batasan operasional baru dari Owner: "${trimmed}"`;
      case 'LESSON':
        return `Pelajaran langsung dari Owner: "${trimmed}"`;
      case 'POLICY_REQUEST':
        return `Permintaan penyesuaian kebijakan dari Owner: "${trimmed}"`;
    }
  }

  getAllFeedback(): OwnerFeedback[] {
    return Array.from(this.feedbackRecords.values());
  }

  // ==========================================================
  // Owner Preference Memory (Section 31)
  // ==========================================================

  setPreference(pref: Omit<OwnerPreference, 'id' | 'recordedAt'>): OwnerPreference {
    const id = `PREF-${pref.key}`;
    const record: OwnerPreference = {
      ...pref,
      id,
      recordedAt: new Date().toISOString(),
    };
    this.preferences.set(pref.key, record);
    this.logger.log(`Owner preference stored: ${pref.key} = "${pref.preference}" [Scope: ${pref.scope}]`);
    return record;
  }

  getPreference(key: string): OwnerPreference | undefined {
    return this.preferences.get(key);
  }

  getAllPreferences(): OwnerPreference[] {
    return Array.from(this.preferences.values()).filter((p) => p.status === 'ACTIVE');
  }

  private recordPreferenceFromFeedback(feedback: OwnerFeedback): void {
    const s = feedback.rawText.toLowerCase();
    if (s.includes('ringkas') || s.includes('singkat')) {
      this.setPreference({
        key: 'REPORT_VERBOSITY',
        preference: 'Owner prefers concise and summarized reports.',
        scope: 'Telegram Daily & Weekly Reports',
        confidence: 0.95,
        source: feedback.rawText,
        status: 'ACTIVE',
      });
    }
  }

  private seedBaselinePreferences(): void {
    this.setPreference({
      key: 'REPORT_VERBOSITY',
      preference: 'Owner prefers concise, bulleted executive reports with explicit evidence.',
      scope: 'Telegram Daily Briefing & Learning Reports',
      confidence: 1.0,
      source: 'Initial Sovereign Directive',
      status: 'ACTIVE',
    });

    this.setPreference({
      key: 'AUTONOMY_COMMS',
      preference: 'Proactively notify for Level 3/4 decisions, but keep Level 1/2 silent.',
      scope: 'Telegram Notifications',
      confidence: 1.0,
      source: 'Initial Sovereign Directive',
      status: 'ACTIVE',
    });
  }
}
