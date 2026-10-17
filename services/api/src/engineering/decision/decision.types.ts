// ==========================================================
// services/api/src/engineering/decision/decision.types.ts
// Phase 22: Controlled Clarification Elimination & Assumption-First Execution Types
// ==========================================================

export type AmbiguityClass = 'A' | 'B' | 'C' | 'D';

export type ReversibilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type DecisionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DecisionAction = 'INFER' | 'PROCEED_WITH_DEFAULT' | 'ASK_HUMAN' | 'HARD_STOP';

export type AssumptionStatus = 'ACTIVE' | 'CONFIRMED' | 'INVALIDATED';

export type ClarificationMode = 'MINIMAL_SAFE';

/**
 * Section 10: Evidence Hierarchy Priority
 * 1. Explicit task instruction (100)
 * 2. Human-approved project policy (90)
 * 3. Existing project architecture (80)
 * 4. Existing code conventions (70)
 * 5. Existing tests (60)
 * 6. Existing neighboring implementations (50)
 * 7. Project documentation (40)
 * 8. Safe engineering default (30)
 * 9. Model intuition (10 - DILARANG override stronger evidence)
 */
export type EvidenceType =
  | 'EXPLICIT_TASK_INSTRUCTION'
  | 'HUMAN_APPROVED_POLICY'
  | 'EXISTING_ARCHITECTURE'
  | 'CODE_CONVENTIONS'
  | 'EXISTING_TESTS'
  | 'NEIGHBORING_IMPLEMENTATIONS'
  | 'PROJECT_DOCUMENTATION'
  | 'SAFE_ENGINEERING_DEFAULT'
  | 'MODEL_INTUITION';

export interface EvidenceItem {
  type: EvidenceType;
  source: string;
  statement: string;
  weight: number;
}

export const EVIDENCE_PRIORITY_WEIGHTS: Record<EvidenceType, number> = {
  EXPLICIT_TASK_INSTRUCTION: 100,
  HUMAN_APPROVED_POLICY: 90,
  EXISTING_ARCHITECTURE: 80,
  CODE_CONVENTIONS: 70,
  EXISTING_TESTS: 60,
  NEIGHBORING_IMPLEMENTATIONS: 50,
  PROJECT_DOCUMENTATION: 40,
  SAFE_ENGINEERING_DEFAULT: 30,
  MODEL_INTUITION: 10,
};

/**
 * Section 8: Required Decision Object
 */
export interface DecisionRecord {
  ambiguityId: string;
  classification: AmbiguityClass;
  assumption?: string;
  evidence?: string[];
  evidenceItems?: EvidenceItem[];
  confidence: number;
  reversibility: ReversibilityLevel;
  risk: DecisionRiskLevel;
  decision: DecisionAction;
  affectedScope?: string[];
  contradictionDetected?: boolean;
  contradictionDetails?: string;
  reason?: string;
}

/**
 * Section 3 & 16: Machine-readable Assumption Ledger Record
 */
export interface AssumptionRecord {
  assumptionId: string;
  taskId: string;
  ambiguityId: string;
  decision: DecisionAction;
  assumption: string;
  evidence: string[];
  confidence: number;
  risk: DecisionRiskLevel;
  reversibility: ReversibilityLevel;
  timestamp: string;
  result: AssumptionStatus;
  invalidationReason?: string;
  verifiedAt?: string;
}

/**
 * Section 15: Structured Clarification Decision Prompt
 */
export interface ClarificationOption {
  key: string;
  label: string;
  description: string;
  impact?: string;
}

export interface StructuredClarificationPrompt {
  decision: string;
  impact: string;
  evidence: string[];
  safeOptions: ClarificationOption[];
  recommendedOption: string;
  riskIfWrong: string;
  approvalRequiredBecause: string;
  formattedPrompt: string;
}

/**
 * Section 12: Partial Execution Plan
 */
export interface TaskSegment {
  segmentId: string;
  description: string;
  isSafe: boolean;
  classification: AmbiguityClass;
  canExecuteBeforeClarification: boolean;
  requiresHumanApproval: boolean;
  action: DecisionAction;
}

export interface PartialExecutionPlan {
  taskId: string;
  safeSegments: TaskSegment[];
  gatedSegments: TaskSegment[];
  canProceedPartially: boolean;
  haltReason?: string;
}

/**
 * Section 17 & 22: Failure Taxonomy & Quality Metrics
 */
export type ClarificationOutcome =
  | 'CLARIFICATION_AVOIDED_CORRECTLY'
  | 'CLARIFICATION_REQUIRED_CORRECTLY'
  | 'UNNECESSARY_CLARIFICATION'
  | 'INCORRECT_ASSUMPTION'
  | 'UNAUTHORIZED_ACTION'
  | 'SAFETY_BOUNDARY_VIOLATION'
  | 'VERIFICATION_FAILURE';

export interface Phase22Metrics {
  tasksTotal: number;
  tasksCompleted: number;
  clarificationsTotal: number;
  unnecessaryClarifications: number;
  requiredClarifications: number;
  clarificationsAvoided: number;
  incorrectAssumptions: number;
  assumptionAccuracy: number;
  repairAttempts: number;
  humanInterventions: number;
  unsafeActions: number;
  safetyViolations: number;
  unauthorizedActions: number;
  approvalBypassAttempts: number;
  verificationFailures: number;
  taskSuccessRate: number;
  clarificationReductionRate: number;
  unsafeAutonomyRate: number;
}
