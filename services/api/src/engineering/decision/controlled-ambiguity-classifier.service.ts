// ==========================================================
// services/api/src/engineering/decision/controlled-ambiguity-classifier.service.ts
// Phase 22: Controlled Ambiguity Classification & Evidence-Based Inference Engine (§4, §9, §10, §11)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  AmbiguityClass,
  DecisionAction,
  DecisionRecord,
  DecisionRiskLevel,
  EvidenceItem,
  EvidenceType,
  ReversibilityLevel,
} from './decision.types.js';
import { EVIDENCE_PRIORITY_WEIGHTS } from './decision.types.js';

export interface RepositoryContextClues {
  framework?: string;
  architectureNotes?: string;
  knownConstraints?: string[];
  codeConventions?: string[];
  existingPatterns?: string[];
  existingTests?: string[];
  documentationNotes?: string[];
  projectPolicies?: string[];
}

export interface AmbiguityEvaluationInput {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  acceptanceCriteria: string[];
  constraints?: string[];
  contextClues?: RepositoryContextClues;
  providedEvidence?: EvidenceItem[];
}

@Injectable()
export class ControlledAmbiguityClassifierService {
  private readonly logger = new StructuredLogger('ControlledAmbiguityClassifierService');

  // Hard safety stop keywords & patterns (Class D) (§4, §18)
  private readonly CLASS_D_PATTERNS = [
    /\b(production\s+deploy|deploy\s+to\s+production|deploy\s+prod)\b/i,
    /\b(bypass\s+approval|skip\s+approval|auto-approve)\b/i,
    /\b(drop\s+(database|schema|table)|truncate\s+table)\b/i,
    /\bdelete\b.*?\b(all|critical|production|obsolete|data|tables?|databases?|records?)\b/i,
    /\bpurge\b.*?\b(data|table|database)\b/i,
    /\b(change\s+credentials?|update\s+secret|rotate\s+prod\s+key|id_rsa)\b/i,
    /\b(grant\s+admin|escalate\s+permission|chmod\s+777|sudo|su\s+root)\b/i,
    /\b(disable\s+(audit|logging|security\s+control|waf))\b/i,
    /\b(overwrite\s+master\s+branch|force\s+push\s+(main|master|prod))\b/i,
  ];

  // Business / Risk / Breaking change patterns (Class C) (§4)
  private readonly CLASS_C_PATTERNS = [
    /\b(pricing|billing|monetization|subscription\s+tier|charge\s+customer)\b/i,
    /\b(breaking\s+change|deprecate\s+public\s+api|change\s+api\s+contract)\b/i,
    /\b(database\s+migration|alter\s+column|schema\s+mutation)\b/i,
    /\b(change\s+business\s+rule|refund\s+policy|discount\s+rate)\b/i,
    /\b(external\s+webhook|third-party\s+payment|external\s+integration)\b/i,
    /\b(user\s+permission\s+role|rbac\s+policy|access\s+control\s+rule)\b/i,
  ];

  // Safe default with strong evidence patterns (Class B) (§4)
  private readonly CLASS_B_PATTERNS = [
    /\b(add\s+validation|validate\s+input|sanitize\s+input|scrub\s+payload)\b/i,
    /\b(error\s+handling|exception\s+format|descriptive\s+error)\b/i,
    /\b(csv\s+export|serialize|json\s+serialization|rfc-4180)\b/i,
    /\b(timeout\s+threshold|health\s+check\s+probe|heartbeat\s+sla)\b/i,
    /\b(deterministic\s+mock|seed\s+random|mock\s+fixture)\b/i,
    /\b(session\s+token\s+refresh|token\s+persistence)\b/i,
  ];

  // Safe to infer low-risk conventions (Class A) (§4)
  private readonly CLASS_A_PATTERNS = [
    /\b(naming|formatting|format\s+user|iso\s+format|ui\s+spacing|indentation|css\s+spacing|test\s+naming|file\s+location)\b/i,
  ];

  /**
   * Main Ambiguity Classification & Decision Method (§4, §8, §9)
   */
  public classifyAmbiguity(input: AmbiguityEvaluationInput): DecisionRecord {
    const ambiguityId = `amb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullText = [
      input.taskTitle,
      input.taskDescription,
      ...(input.acceptanceCriteria || []),
      ...(input.constraints || []),
    ].join(' ');

    this.logger.info(
      'classifyAmbiguity',
      `[${input.taskId}] Evaluating ambiguity for: "${input.taskTitle}"`
    );

    // ── 1. Gather & Weight Evidence (§10) ──────────────────────────
    const evidenceItems: EvidenceItem[] = [
      ...(input.providedEvidence || []),
      ...this.extractEvidenceFromContext(input),
    ];

    // Sort evidence by priority hierarchy (§10)
    evidenceItems.sort(
      (a, b) =>
        (EVIDENCE_PRIORITY_WEIGHTS[b.type] ?? 0) - (EVIDENCE_PRIORITY_WEIGHTS[a.type] ?? 0)
    );

    // ── 2. Check Contradiction Rule (§11) ─────────────────────────
    const contradiction = this.detectEvidenceContradictions(evidenceItems, fullText);
    if (contradiction.hasContradiction) {
      this.logger.warn(
        'classifyAmbiguity',
        `[${input.taskId}] Contradiction detected: ${contradiction.reason}. DO NOT GUESS (§11).`
      );

      // Elevated to Class C or Class D
      const isDangerous = this.isDangerousOrSafetyCritical(fullText);
      const classification: AmbiguityClass = isDangerous ? 'D' : 'C';
      const risk: DecisionRiskLevel = isDangerous ? 'CRITICAL' : 'HIGH';
      const decision: DecisionAction = isDangerous ? 'HARD_STOP' : 'ASK_HUMAN';

      return {
        ambiguityId,
        classification,
        evidence: evidenceItems.map((e) => `[${e.type}] ${e.statement}`),
        evidenceItems,
        confidence: 0.3,
        reversibility: 'LOW',
        risk,
        decision,
        contradictionDetected: true,
        contradictionDetails: contradiction.reason,
        reason: `Contradictory evidence detected: ${contradiction.reason}. Strictly requires human confirmation (§11).`,
      };
    }

    // ── 3. Check CLASS D — Hard Safety Stop (§4, §18) ──────────────
    for (const pattern of this.CLASS_D_PATTERNS) {
      if (pattern.test(fullText)) {
        this.logger.warn(
          'classifyAmbiguity',
          `[${input.taskId}] Class D triggered: matches safety stop pattern "${pattern.source}"`
        );

        return {
          ambiguityId,
          classification: 'D',
          evidence: evidenceItems.map((e) => `[${e.type}] ${e.statement}`),
          evidenceItems,
          confidence: 0.99, // Note: Section 9 - confidence 0.99 does NOT grant permission!
          reversibility: 'LOW',
          risk: 'CRITICAL',
          decision: 'HARD_STOP',
          reason: `Operation matches Class D safety stop: production deploy, credential change, or destructive action. Cannot be autonomously decided.`,
        };
      }
    }

    // ── 4. Check CLASS C — Human Confirmation Required (§4) ────────
    for (const pattern of this.CLASS_C_PATTERNS) {
      if (pattern.test(fullText)) {
        this.logger.info(
          'classifyAmbiguity',
          `[${input.taskId}] Class C triggered: matches business / breaking change pattern "${pattern.source}"`
        );

        return {
          ambiguityId,
          classification: 'C',
          evidence: evidenceItems.map((e) => `[${e.type}] ${e.statement}`),
          evidenceItems,
          confidence: 0.65,
          reversibility: 'MEDIUM',
          risk: 'HIGH',
          decision: 'ASK_HUMAN',
          reason: `Operation affects business semantics, externally visible contracts, or data mutations. Requires explicit human confirmation.`,
        };
      }
    }

    // ── 5. Check CLASS A — Safe to Infer (Low risk, naming, formatting, conventions) (§4) ──
    const matchesClassAPattern = this.CLASS_A_PATTERNS.some((p) => p.test(fullText));
    if (matchesClassAPattern) {
      const topConvention = evidenceItems.find((e) => e.type === 'CODE_CONVENTIONS');
      const assumptionText = topConvention
        ? `Adopted project code convention: "${topConvention.statement}"`
        : `Inferred engineering convention from dominant repository patterns with zero external side effects.`;

      this.logger.info(
        'classifyAmbiguity',
        `[${input.taskId}] Class A safe to infer: ${assumptionText}`
      );

      return {
        ambiguityId,
        classification: 'A',
        assumption: assumptionText,
        evidence: evidenceItems.map((e) => `[${e.type}] ${e.statement}`),
        evidenceItems,
        confidence: 0.95,
        reversibility: 'HIGH',
        risk: 'LOW',
        decision: 'INFER',
        reason: `Class A low-risk reversible detail (naming, formatting, or UI spacing). Safe to infer without human clarification.`,
      };
    }

    // ── 6. Check CLASS B — Safe Default with Strong Evidence (§4) ──
    const hasStrongRepoEvidence = evidenceItems.some(
      (e) =>
        e.type === 'EXISTING_ARCHITECTURE' ||
        e.type === 'CODE_CONVENTIONS' ||
        e.type === 'EXISTING_TESTS' ||
        e.type === 'HUMAN_APPROVED_POLICY'
    );

    const matchesClassBPattern = this.CLASS_B_PATTERNS.some((p) => p.test(fullText));

    if (matchesClassBPattern || (hasStrongRepoEvidence && this.hasEngineeringAmbiguity(fullText))) {
      const topEvidence = evidenceItems.find(
        (e) =>
          e.type === 'HUMAN_APPROVED_POLICY' ||
          e.type === 'EXISTING_ARCHITECTURE' ||
          e.type === 'CODE_CONVENTIONS' ||
          e.type === 'EXISTING_TESTS'
      );

      const assumptionText = topEvidence
        ? `Adopted established repository standard based on ${topEvidence.type.toLowerCase()}: "${topEvidence.statement}"`
        : `Applied safe engineering default adhering to project conventions and test specifications.`;

      this.logger.info(
        'classifyAmbiguity',
        `[${input.taskId}] Class B inferable: ${assumptionText}`
      );

      return {
        ambiguityId,
        classification: 'B',
        assumption: assumptionText,
        evidence: evidenceItems.map((e) => `[${e.type}] ${e.statement}`),
        evidenceItems,
        confidence: 0.88,
        reversibility: 'HIGH',
        risk: 'LOW',
        decision: 'PROCEED_WITH_DEFAULT',
        reason: `Safe default with strong repository evidence. Clarification avoided.`,
      };
    }

    // ── 6. Check CLASS A — Safe to Infer (§4) ───────────────────────
    // Low risk, reversible, naming, formatting, UI spacing, convention file location
    const assumptionText = `Inferred engineering convention from dominant repository patterns with zero external side effects.`;

    this.logger.info(
      'classifyAmbiguity',
      `[${input.taskId}] Class A safe to infer: ${assumptionText}`
    );

    return {
      ambiguityId,
      classification: 'A',
      assumption: assumptionText,
      evidence: evidenceItems.map((e) => `[${e.type}] ${e.statement}`),
      evidenceItems,
      confidence: 0.95,
      reversibility: 'HIGH',
      risk: 'LOW',
      decision: 'INFER',
      reason: `Class A low-risk reversible detail. Safe to infer without human clarification.`,
    };
  }

  /**
   * Extract evidence items from task definition and repository context (§10)
   */
  private extractEvidenceFromContext(input: AmbiguityEvaluationInput): EvidenceItem[] {
    const items: EvidenceItem[] = [];

    // 1. Explicit task instruction
    if (input.acceptanceCriteria && input.acceptanceCriteria.length > 0) {
      items.push({
        type: 'EXPLICIT_TASK_INSTRUCTION',
        source: 'acceptanceCriteria',
        statement: input.acceptanceCriteria.join('; '),
        weight: EVIDENCE_PRIORITY_WEIGHTS.EXPLICIT_TASK_INSTRUCTION,
      });
    }

    // 2. Human approved policy
    if (input.contextClues?.projectPolicies?.length) {
      for (const pol of input.contextClues.projectPolicies) {
        items.push({
          type: 'HUMAN_APPROVED_POLICY',
          source: 'projectPolicies',
          statement: pol,
          weight: EVIDENCE_PRIORITY_WEIGHTS.HUMAN_APPROVED_POLICY,
        });
      }
    }

    // 3. Existing architecture
    if (input.contextClues?.architectureNotes) {
      items.push({
        type: 'EXISTING_ARCHITECTURE',
        source: 'architectureNotes',
        statement: input.contextClues.architectureNotes,
        weight: EVIDENCE_PRIORITY_WEIGHTS.EXISTING_ARCHITECTURE,
      });
    }

    // 4. Code conventions
    if (input.contextClues?.codeConventions?.length) {
      for (const conv of input.contextClues.codeConventions) {
        items.push({
          type: 'CODE_CONVENTIONS',
          source: 'codeConventions',
          statement: conv,
          weight: EVIDENCE_PRIORITY_WEIGHTS.CODE_CONVENTIONS,
        });
      }
    }

    // 5. Existing tests
    if (input.contextClues?.existingTests?.length) {
      items.push({
        type: 'EXISTING_TESTS',
        source: 'existingTests',
        statement: `Found ${input.contextClues.existingTests.length} existing test suites (${input.contextClues.existingTests.slice(0, 3).join(', ')})`,
        weight: EVIDENCE_PRIORITY_WEIGHTS.EXISTING_TESTS,
      });
    }

    // 6. Neighboring implementations / patterns
    if (input.contextClues?.existingPatterns?.length) {
      for (const pat of input.contextClues.existingPatterns) {
        items.push({
          type: 'NEIGHBORING_IMPLEMENTATIONS',
          source: 'existingPatterns',
          statement: pat,
          weight: EVIDENCE_PRIORITY_WEIGHTS.NEIGHBORING_IMPLEMENTATIONS,
        });
      }
    }

    // 7. Project documentation
    if (input.contextClues?.documentationNotes?.length) {
      for (const doc of input.contextClues.documentationNotes) {
        items.push({
          type: 'PROJECT_DOCUMENTATION',
          source: 'documentationNotes',
          statement: doc,
          weight: EVIDENCE_PRIORITY_WEIGHTS.PROJECT_DOCUMENTATION,
        });
      }
    }

    // 8. Safe engineering default
    items.push({
      type: 'SAFE_ENGINEERING_DEFAULT',
      source: 'frameworkStandards',
      statement: `Maintain backward compatibility, fail closed on unknown inputs, use deterministic tests`,
      weight: EVIDENCE_PRIORITY_WEIGHTS.SAFE_ENGINEERING_DEFAULT,
    });

    return items;
  }

  /**
   * Detect contradictions across evidence sources (§11)
   */
  private detectEvidenceContradictions(
    evidenceItems: EvidenceItem[],
    taskText: string
  ): { hasContradiction: boolean; reason?: string } {
    const textLower = taskText.toLowerCase();

    // Contradiction 1: Task text demands conflicting behavior
    if (
      (textLower.includes('must throw') && textLower.includes('never throw')) ||
      (textLower.includes('require auth') && textLower.includes('allow unauthenticated')) ||
      (textLower.includes('retain data') && textLower.includes('purge all data'))
    ) {
      return {
        hasContradiction: true,
        reason: 'Task description contains mutually exclusive instructions.',
      };
    }

    // Contradiction 2: Documentation contradicts tests or policy
    const docItem = evidenceItems.find((e) => e.type === 'PROJECT_DOCUMENTATION');
    const testItem = evidenceItems.find((e) => e.type === 'EXISTING_TESTS');
    const policyItem = evidenceItems.find((e) => e.type === 'HUMAN_APPROVED_POLICY');

    if (docItem && testItem) {
      const docLower = docItem.statement.toLowerCase();
      const testLower = testItem.statement.toLowerCase();
      if (
        (docLower.includes('strict') && testLower.includes('permissive')) ||
        (docLower.includes('deprecated') && testLower.includes('required'))
      ) {
        return {
          hasContradiction: true,
          reason: `Documentation ("${docItem.statement}") directly contradicts test suite expectations ("${testItem.statement}").`,
        };
      }
    }

    if (policyItem && docItem) {
      const polLower = policyItem.statement.toLowerCase();
      const docLower = docItem.statement.toLowerCase();
      if (polLower.includes('forbidden') && docLower.includes('allowed')) {
        return {
          hasContradiction: true,
          reason: `Project policy ("${policyItem.statement}") forbids what documentation describes as allowed.`,
        };
      }
    }

    return { hasContradiction: false };
  }

  private hasEngineeringAmbiguity(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('mungkin') ||
      lower.includes('optional') ||
      lower.includes('atau') ||
      lower.includes('either') ||
      lower.includes('or') ||
      lower.includes('undecided') ||
      lower.includes('appropriate') ||
      lower.includes('suitable')
    );
  }

  private isDangerousOrSafetyCritical(text: string): boolean {
    return this.CLASS_D_PATTERNS.some((p) => p.test(text));
  }
}
