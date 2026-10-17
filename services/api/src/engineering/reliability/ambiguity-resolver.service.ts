// ==========================================================
// services/api/src/engineering/reliability/ambiguity-resolver.service.ts
// Phase 19 & Phase 22: Ambiguity Classification, Context Inference & Controlled Clarification
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  AmbiguityCategory,
  AmbiguityClassificationResult,
} from './reliability.types.js';
import {
  ControlledAmbiguityClassifierService,
  type AmbiguityEvaluationInput,
} from '../decision/controlled-ambiguity-classifier.service.js';
import {
  AssumptionLedgerService,
} from '../decision/assumption-ledger.service.js';
import {
  ClarificationPolicyEngine,
} from '../decision/clarification-policy.engine.js';
import {
  PartialExecutionCoordinator,
} from '../decision/partial-execution.coordinator.js';
import type {
  DecisionRecord,
  AssumptionRecord,
  StructuredClarificationPrompt,
} from '../decision/decision.types.js';

export interface ProjectContextClues {
  framework: string;
  architectureNotes?: string;
  knownConstraints?: string[];
  recurringBugs?: string[];
  existingPatterns?: string[];
}

export interface Phase22TaskEvaluationResult {
  decisionRecord: DecisionRecord;
  assumptionRecord?: AssumptionRecord;
  shouldAskClarification: boolean;
  isHardStop: boolean;
  structuredPrompt?: StructuredClarificationPrompt;
}

@Injectable()
export class AmbiguityResolverService {
  private readonly logger = new StructuredLogger('AmbiguityResolverService');

  public readonly classifier: ControlledAmbiguityClassifierService;
  public readonly ledger: AssumptionLedgerService;
  public readonly policy: ClarificationPolicyEngine;
  public readonly partialCoordinator: PartialExecutionCoordinator;

  constructor(
    @Optional() classifier?: ControlledAmbiguityClassifierService,
    @Optional() ledger?: AssumptionLedgerService,
    @Optional() policy?: ClarificationPolicyEngine,
    @Optional() partialCoordinator?: PartialExecutionCoordinator
  ) {
    this.classifier = classifier || new ControlledAmbiguityClassifierService();
    this.ledger = ledger || new AssumptionLedgerService();
    this.policy = policy || new ClarificationPolicyEngine();
    this.partialCoordinator = partialCoordinator || new PartialExecutionCoordinator();
  }

  /**
   * Phase 22 Evaluator: Classify ambiguity, manage Assumption Ledger, and enforce MINIMAL_SAFE clarification policy
   */
  public evaluatePhase22Task(input: AmbiguityEvaluationInput): Phase22TaskEvaluationResult {
    const decisionRecord = this.classifier.classifyAmbiguity(input);
    const shouldAskClarification = this.policy.shouldAskClarification(decisionRecord);
    const isHardStop = decisionRecord.classification === 'D';

    let assumptionRecord: AssumptionRecord | undefined;
    let structuredPrompt: StructuredClarificationPrompt | undefined;

    // Class A or B: Do not ask clarification, create assumption in ledger (§3, §4)
    if (!shouldAskClarification && decisionRecord.assumption) {
      assumptionRecord = this.ledger.recordAssumption({
        taskId: input.taskId,
        ambiguityId: decisionRecord.ambiguityId,
        decision: decisionRecord.decision,
        assumption: decisionRecord.assumption,
        evidence: decisionRecord.evidence || [],
        confidence: decisionRecord.confidence,
        risk: decisionRecord.risk,
        reversibility: decisionRecord.reversibility,
      });
    }

    // Class C or D: Must format structured question (§15)
    if (shouldAskClarification) {
      structuredPrompt = this.policy.formatStructuredClarificationPrompt(
        decisionRecord,
        input.taskTitle
      );
    }

    return {
      decisionRecord,
      assumptionRecord,
      shouldAskClarification,
      isHardStop,
      structuredPrompt,
    };
  }

  /**
   * Phase 19 Backward Compatibility: Classify and resolve task ambiguity
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
