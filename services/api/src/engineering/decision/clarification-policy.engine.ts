// ==========================================================
// services/api/src/engineering/decision/clarification-policy.engine.ts
// Phase 22: Minimal-Safe Clarification Policy & Structured Decision Prompt (§5, §14, §15)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  ClarificationMode,
  ClarificationOption,
  DecisionRecord,
  StructuredClarificationPrompt,
} from './decision.types.js';

@Injectable()
export class ClarificationPolicyEngine {
  private readonly logger = new StructuredLogger('ClarificationPolicyEngine');

  // Enforced policy: MINIMAL_SAFE (§14)
  public readonly mode: ClarificationMode = 'MINIMAL_SAFE';

  /**
   * Evaluate whether human clarification is permitted and mandatory (§5)
   */
  public shouldAskClarification(decision: DecisionRecord): boolean {
    // Class A: Safe to Infer -> NEVER ASK (§4, §5)
    if (decision.classification === 'A') {
      return false;
    }

    // Class B: Safe Default with Evidence -> NEVER ASK (§4, §5) unless contradiction
    if (decision.classification === 'B' && !decision.contradictionDetected) {
      return false;
    }

    // Class D: Hard Safety Stop -> Stop, no guessing, requires approval / manual escalation
    if (decision.classification === 'D') {
      return true;
    }

    // Class C: Human Confirmation Required -> ASK
    if (decision.classification === 'C') {
      return true;
    }

    // If contradiction detected -> MUST ASK (§11)
    if (decision.contradictionDetected) {
      return true;
    }

    return false;
  }

  /**
   * Format structured, high-quality decision prompt (§15)
   * Strictly prohibits open-ended questions like "What should I do?"
   */
  public formatStructuredClarificationPrompt(
    decision: DecisionRecord,
    topic: string,
    options?: ClarificationOption[],
    recommendedOptionKey?: string
  ): StructuredClarificationPrompt {
    const defaultOptions: ClarificationOption[] = options || [
      {
        key: 'A',
        label: 'Strict Backward-Compatible Policy',
        description: 'Maintain existing strict validation. Reject ambiguous inputs and preserve legacy contracts.',
        impact: 'Zero regression risk, preserves established security boundaries.',
      },
      {
        key: 'B',
        label: 'Permissive Standard Default',
        description: 'Adopt modern standard default value when parameter is omitted or ambiguous.',
        impact: 'More resilient user experience, potential subtle schema variation.',
      },
    ];

    const recommended = recommendedOptionKey || defaultOptions[0].key;
    const recommendedObj = defaultOptions.find((o) => o.key === recommended) || defaultOptions[0];

    const evidenceList =
      decision.evidence && decision.evidence.length > 0
        ? decision.evidence.slice(0, 4)
        : ['Repository convention analysis', 'Existing test suite baseline'];

    const impact =
      decision.classification === 'D'
        ? 'Targeted action touches safety-critical boundary (production deploy, secrets, or data mutation).'
        : decision.classification === 'C'
        ? 'Decision affects externally visible behavior, permissions, or business semantics.'
        : 'Decision resolves conflicting engineering directives.';

    const riskIfWrong =
      decision.risk === 'CRITICAL'
        ? 'Irreversible system disruption, data loss, or security violation.'
        : decision.risk === 'HIGH'
        ? 'Breaking contract change, user-visible bug, or failed deployment.'
        : 'Minor schema inconsistency requiring code repair.';

    const approvalRequiredBecause =
      decision.classification === 'D'
        ? 'Class D invariants strictly prohibit autonomous execution of safety-critical actions (§4, §18).'
        : decision.contradictionDetected
        ? 'Contradictory evidence detected in repository sources; guessing is forbidden (§11).'
        : 'Class C policy requires human confirmation before modifying business or permission boundaries (§4).';

    const safeOptionsFormatted = defaultOptions
      .map((o) => `  ${o.key}. ${o.label}: ${o.description}${o.impact ? ` (Impact: ${o.impact})` : ''}`)
      .join('\n');

    const formattedPrompt = [
      `The task is blocked by one decision.`,
      ``,
      `Decision:`,
      `${topic}`,
      ``,
      `Why it matters:`,
      `${impact}`,
      ``,
      `Evidence:`,
      ...evidenceList.map((e) => `- ${e}`),
      ``,
      `Safe options:`,
      safeOptionsFormatted,
      ``,
      `Recommended:`,
      `Option ${recommendedObj.key} (${recommendedObj.label})`,
      ``,
      `Risk if wrong:`,
      `${riskIfWrong}`,
      ``,
      `Approval required because:`,
      `${approvalRequiredBecause}`,
    ].join('\n');

    this.logger.info(
      'formatStructuredClarificationPrompt',
      `Formatted structured prompt for ambiguity ${decision.ambiguityId} (Recommended: ${recommendedObj.key})`
    );

    return {
      decision: topic,
      impact,
      evidence: evidenceList,
      safeOptions: defaultOptions,
      recommendedOption: `Option ${recommendedObj.key}: ${recommendedObj.label}`,
      riskIfWrong,
      approvalRequiredBecause,
      formattedPrompt,
    };
  }
}
