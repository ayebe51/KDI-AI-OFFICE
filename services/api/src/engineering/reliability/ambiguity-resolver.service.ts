// ==========================================================
// services/api/src/engineering/reliability/ambiguity-resolver.service.ts
// Phase 19: Ambiguity Classification, Context Inference & Actionable Clarification (§17–§21)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  AmbiguityCategory,
  AmbiguityClassificationResult,
} from './reliability.types.js';

export interface ProjectContextClues {
  framework: string;
  architectureNotes?: string;
  knownConstraints?: string[];
  recurringBugs?: string[];
  existingPatterns?: string[];
}

@Injectable()
export class AmbiguityResolverService {
  private readonly logger = new StructuredLogger('AmbiguityResolverService');

  /**
   * Classify and resolve task ambiguity (§17, §18, §19):
   * Distinguishes technical ambiguity (auto-inferable) from business/security ambiguity (needs clarification).
   */
  public analyzeAmbiguity(
    taskDescription: string,
    acceptanceCriteria: string[],
    projectClues?: ProjectContextClues
  ): AmbiguityClassificationResult {
    const textLower = (taskDescription + ' ' + acceptanceCriteria.join(' ')).toLowerCase();

    // 1. Detect Category (§19)
    let category: AmbiguityCategory = 'TECHNICAL';
    if (textLower.includes('pricing') || textLower.includes('monetization') || textLower.includes('billing rule') || textLower.includes('tier')) {
      category = 'BUSINESS';
    } else if (textLower.includes('permission') || textLower.includes('secret') || textLower.includes('token scope') || textLower.includes('credential')) {
      category = 'SECURITY';
    } else if (textLower.includes('color') || textLower.includes('theme') || textLower.includes('layout shift') || textLower.includes('typography')) {
      category = 'UI_UX';
    } else if (textLower.includes('docker') || textLower.includes('port') || textLower.includes('cluster') || textLower.includes('redis')) {
      category = 'ENVIRONMENT';
    } else if (textLower.includes('should it') || textLower.includes('either') || textLower.includes('or maybe') || textLower.includes('unspecified')) {
      category = 'REQUIREMENT';
    }

    // 2. Determine if ambiguous
    const hasAmbiguityMarkers =
      textLower.includes('mungkin') ||
      textLower.includes('optional') ||
      textLower.includes('atau') ||
      textLower.includes('either') ||
      textLower.includes('undecided') ||
      acceptanceCriteria.length === 0;

    if (!hasAmbiguityMarkers) {
      return {
        category,
        isAmbiguous: false,
        canAutoInfer: true,
        inferredInterpretation: 'Requirements and acceptance criteria are unambiguous.',
      };
    }

    // 3. Technical vs Business inference (§17)
    if (category === 'TECHNICAL' || category === 'ENVIRONMENT' || category === 'UI_UX') {
      // Auto-infer from existing conventions (§17 & §20)
      const inferredPattern = projectClues?.knownConstraints?.[0] || 'Follow existing framework conventions';
      const inferred = `Inferred technical pattern: ${inferredPattern}. Maintain backward compatibility and fail closed.`;

      this.logger.info(
        'analyzeAmbiguity',
        `Auto-inferred technical ambiguity for task: ${inferred}`
      );

      return {
        category,
        isAmbiguous: true,
        canAutoInfer: true,
        inferredInterpretation: inferred,
        inferenceEvidence: `Reused project knowledge constraint: "${inferredPattern}"`,
      };
    }

    // 4. Business or Security Ambiguity -> Format Actionable Clarification (§18)
    const options = [
      {
        label: 'Opsi A. Maintain Existing Strict Behavior',
        description: 'Keep current validation and reject ambiguous inputs with 400 Bad Request.',
        impact: 'Zero security regression, preserves legacy contract.',
      },
      {
        label: 'Opsi B. Introduce Permissive Fallback',
        description: 'Allow fallback default value when parameter is omitted.',
        impact: 'More forgiving user experience, potential subtle schema variation.',
      },
    ];

    const clarificationPrompt = this.formatActionableQuestion(
      taskDescription,
      options
    );

    this.logger.info(
      'analyzeAmbiguity',
      `Identified ${category} ambiguity requiring human clarification: ${options[0].label} vs ${options[1].label}`
    );

    return {
      category,
      isAmbiguous: true,
      canAutoInfer: false,
      clarificationPrompt,
      options,
    };
  }

  /**
   * Actionable Clarification Question Formatter (§18):
   * Strictly formats distinct multiple-choice options with impact.
   */
  public formatActionableQuestion(
    topic: string,
    options: Array<{ label: string; description: string; impact: string }>
  ): string {
    const optsStr = options
      .map(
        (o) =>
          `• *${o.label}*:\n  ${o.description}\n  _Impact: ${o.impact}_`
      )
      .join('\n\n');

    return (
      `❓ *KLARIFIKASI DIBUTUHKAN [Actionable Options]*\n\n` +
      `Task terkait: "${topic.slice(0, 100)}..."\n\n` +
      `Terdapat 2 opsi interpretasi yang valid:\n\n` +
      `${optsStr}\n\n` +
      `Silakan pilih opsi *A* atau *B* untuk melanjutkan eksekusi otonom.`
    );
  }
}
