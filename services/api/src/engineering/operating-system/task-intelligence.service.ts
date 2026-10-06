// ==========================================================
// services/api/src/engineering/operating-system/task-intelligence.service.ts
// Phase 16: Task Intelligence, Decomposition, Acceptance Criteria & Planning
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { ProjectKnowledgeService } from './project-knowledge.service.js';
import { EngineeringMemoryService } from './engineering-memory.service.js';
import type {
  EngineeringDomain,
  EngineeringPlanDetail,
  ProjectProfile,
  WorkRequestPriority,
  WorkRequestType,
} from './engineering-os.types.js';

export interface TaskInterpretationResult {
  isAmbiguous: boolean;
  needsClarification: boolean;
  clarificationQuestions?: string[];
  projectProfile: ProjectProfile;
  type: WorkRequestType;
  priority: WorkRequestPriority;
  domain: EngineeringDomain;
  assignedAgent: string;
  executor: 'ANTIGRAVITY' | 'GIT_WORKTREE';
  plan: EngineeringPlanDetail;
}

@Injectable()
export class TaskIntelligenceService {
  private readonly logger = new StructuredLogger('TaskIntelligenceService');
  private readonly projectKnowledge: ProjectKnowledgeService;
  private readonly memory: EngineeringMemoryService;

  constructor(
    @Optional() projectKnowledge?: ProjectKnowledgeService,
    @Optional() memory?: EngineeringMemoryService
  ) {
    this.projectKnowledge = projectKnowledge || new ProjectKnowledgeService();
    this.memory = memory || new EngineeringMemoryService();
  }

  /**
   * Interpret and decompose raw inbound work request (§9, §10, §11)
   */
  public interpretWorkRequest(rawText: string): TaskInterpretationResult {
    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();

    this.logger.info('interpretWorkRequest', `Analyzing raw instruction: "${trimmed}"`);

    // 1. Detect completely unresolvable / meaningless request (§10)
    // E.g. "perbaiki yang itu", "kerjakan ini", "bantu saya", single words without context
    const isOverlyVague =
      trimmed.length < 5 ||
      (trimmed.split(/\s+/).length <= 3 &&
        (lower.includes('yang itu') ||
          lower.includes('yang kemarin') ||
          lower.includes('rusak') ||
          lower.includes('error') ||
          lower.includes('bantu') ||
          lower === 'perbaiki' ||
          lower === 'kerjakan'));

    if (isOverlyVague && !lower.includes('simmaci') && !lower.includes('calc') && !lower.includes('auth')) {
      const defaultProject = this.projectKnowledge.resolveProject('simmaci');
      return {
        isAmbiguous: true,
        needsClarification: true,
        clarificationQuestions: [
          'Project mana yang mengalami kendala atau membutuhkan perubahan?',
          'Komponen atau file apa yang terlibat (misal: login, export, scoring)?',
          'Apa pesan error atau gejala yang diharapkan diperbaiki?',
        ],
        projectProfile: defaultProject,
        type: 'UNKNOWN',
        priority: 'MEDIUM',
        domain: 'BACKEND',
        assignedAgent: 'Farhan Hakim (BE Engineer)',
        executor: 'ANTIGRAVITY',
        plan: {
          problem: 'Permintaan pekerjaan belum spesifik dan membutuhkan klarifikasi',
          likelyRootCause: 'UNKNOWN: Informasi tidak mencukupi untuk investigasi mandiri',
          filesLikelyInvolved: [],
          testsToRun: [],
          constraints: ['Do not make autonomous modifications without clear scope'],
          acceptanceCriteria: ['Clarify target project and reproduction steps with requester'],
          risk: 'LOW',
          approvalRequired: false,
          agentRole: 'AI Lead Engineer',
        },
      };
    }

    // 2. Resolve target project (§6)
    const projectProfile = this.projectKnowledge.resolveProject(trimmed);

    // 3. Classify Request Type (§5)
    let type: WorkRequestType = 'FEATURE';
    if (
      lower.includes('error') ||
      lower.includes('bug') ||
      lower.includes('fail') ||
      lower.includes('500') ||
      lower.includes('gagal') ||
      lower.includes('perbaiki') ||
      lower.includes('fix')
    ) {
      type = 'BUG';
    } else if (lower.includes('test') || lower.includes('regression') || lower.includes('uji')) {
      type = 'TEST';
    } else if (
      lower.includes('security') ||
      lower.includes('keamanan') ||
      lower.includes('audit') ||
      lower.includes('injection') ||
      lower.includes('vulnerab')
    ) {
      type = 'SECURITY';
    } else if (lower.includes('refactor') || lower.includes('rapikan') || lower.includes('clean')) {
      type = 'REFACTOR';
    } else if (lower.includes('dependency') || lower.includes('update') || lower.includes('upgrade')) {
      type = 'MAINTENANCE';
    }

    // 4. Classify Domain & Assign Agent (§7 & §8)
    let domain: EngineeringDomain = 'BACKEND';
    let assignedAgent = 'Farhan Hakim (BE Engineer)';

    if (
      lower.includes('ui') ||
      lower.includes('frontend') ||
      lower.includes('tampilan') ||
      lower.includes('css') ||
      lower.includes('halaman') ||
      lower.includes('komponen') ||
      lower.includes('tombol')
    ) {
      domain = 'FRONTEND';
      assignedAgent = 'Aisyah Putri (FE Engineer)';
    } else if (
      type === 'TEST' ||
      lower.includes('regression') ||
      lower.includes('test suite') ||
      lower.includes('qa')
    ) {
      domain = 'QA';
      assignedAgent = 'Maya Lestari (QA Engineer)';
    } else if (
      type === 'SECURITY' ||
      lower.includes('auth audit') ||
      lower.includes('penetration') ||
      lower.includes('leak')
    ) {
      domain = 'SECURITY';
      assignedAgent = 'Tariq Al-Mansoor (Security Engineer)';
    } else if (
      lower.includes('docker') ||
      lower.includes('deploy') ||
      lower.includes('ci/cd') ||
      lower.includes('pipeline') ||
      lower.includes('build failed')
    ) {
      domain = 'DEVOPS';
      assignedAgent = 'Budi Santoso (DevOps Engineer)';
    }

    // 5. Evaluate Priority
    let priority: WorkRequestPriority = 'MEDIUM';
    if (
      lower.includes('critical') ||
      lower.includes('darurat') ||
      lower.includes('production down') ||
      lower.includes('urgent')
    ) {
      priority = 'CRITICAL';
    } else if (type === 'BUG' || type === 'SECURITY' || lower.includes('login') || lower.includes('500')) {
      priority = 'HIGH';
    }

    // 6. Consult Engineering Memory for Past Gotchas & Context (§25 & §28)
    const relevantMemories = this.memory.findRelevantContext(projectProfile.slug, trimmed, 2);
    const memoryHints = relevantMemories.map((m) => m.content).join(' ');

    // 7. Formulate Engineering Plan & Acceptance Criteria (§9, §10, §11)
    const plan = this.generatePlan(trimmed, projectProfile, type, domain, assignedAgent, memoryHints);

    return {
      isAmbiguous: false,
      needsClarification: false,
      projectProfile,
      type,
      priority,
      domain,
      assignedAgent,
      executor: 'ANTIGRAVITY',
      plan,
    };
  }

  private generatePlan(
    rawText: string,
    project: ProjectProfile,
    type: WorkRequestType,
    domain: EngineeringDomain,
    agent: string,
    memoryHints: string
  ): EngineeringPlanDetail {
    const lower = rawText.toLowerCase();

    // ── Scenario A: SIMMACI / Authentication issues ──
    if (lower.includes('login') || lower.includes('auth') || lower.includes('500')) {
      return {
        problem: `Login defect in ${project.name}: Authentication or session verification failure under target condition`,
        likelyRootCause:
          memoryHints.includes('refreshToken') || lower.includes('update')
            ? 'AuthService refreshToken() or session validation fails to persist state, returning null session'
            : 'Uncaught authentication exception during credential verification',
        filesLikelyInvolved: ['src/auth.service.js', 'test/auth.test.js'],
        testsToRun: [project.testCommand || 'node --test test/auth.test.js'],
        constraints: [
          'Respect worktree isolation',
          'Do not modify environment files or credentials',
          'Preserve backwards compatibility for existing user sessions',
        ],
        acceptanceCriteria: [
          '1. Login and session refresh succeed under failing scenario',
          '2. Existing authentication behavior preserved without regressions',
          '3. Automated test suite passes cleanly with zero errors',
          '4. No unrelated files or secrets modified',
          '5. Zero security regression introduced',
        ],
        risk: 'LOW',
        approvalRequired: true,
        agentRole: agent,
      };
    }

    // ── Scenario B: Calculator / Mathematical defect ──
    if (lower.includes('calc') || lower.includes('persen') || lower.includes('percentage') || lower.includes('bagi') || lower.includes('divide')) {
      const isPercentage = lower.includes('persen') || lower.includes('percentage');
      return {
        problem: isPercentage
          ? `Percentage calculation defect in ${project.name}: Ratio scaling error`
          : `Division calculation defect in ${project.name}: Division by zero crash`,
        likelyRootCause: isPercentage
          ? 'Calculator percentage() missing 100 multiplier or zero total guard'
          : 'Calculator divide() does not check for zero denominator before division',
        filesLikelyInvolved: ['src/calculator.js', 'test/calculator.test.js'],
        testsToRun: [project.testCommand || 'node --test test/calculator.test.js'],
        constraints: [
          'Respect worktree isolation',
          'Preserve existing arithmetic methods (add, subtract, multiply)',
        ],
        acceptanceCriteria: [
          '1. Target arithmetic operation executes with mathematically correct output',
          '2. Zero-division and boundary cases handled safely without uncaught exceptions',
          '3. Test suite passes with 100% assertions green',
          '4. No unrelated utility files modified',
        ],
        risk: 'LOW',
        approvalRequired: true,
        agentRole: agent,
      };
    }

    // ── Scenario C: General Feature / Export / Reporting ──
    if (type === 'FEATURE' || lower.includes('export') || lower.includes('endpoint') || lower.includes('tambah')) {
      return {
        problem: `Feature implementation in ${project.name}: "${rawText}"`,
        likelyRootCause: 'New capability requested; requires modular implementation and test suite coverage',
        filesLikelyInvolved: ['src/**'],
        testsToRun: [project.testCommand || 'npm test'],
        constraints: [
          'Respect worktree isolation',
          'Ensure memory-efficient streaming for large exports',
          'Adhere to project architecture conventions',
        ],
        acceptanceCriteria: [
          '1. Requested feature operates correctly according to specification',
          '2. New or updated automated tests verify the feature functionality',
          '3. Zero regressions in existing baseline test suite',
          '4. Clean git diff restricted to feature scope',
        ],
        risk: 'MEDIUM',
        approvalRequired: true,
        agentRole: agent,
      };
    }

    // ── Scenario D: Generic Fallback Quality Plan ──
    return {
      problem: `Engineering task for ${project.name}: "${rawText}"`,
      likelyRootCause: 'Standard software modification workflow',
      filesLikelyInvolved: project.allowedDirectories,
      testsToRun: [project.testCommand || 'npm test'],
      constraints: project.knownConstraints,
      acceptanceCriteria: [
        '1. Functional requirements satisfied',
        '2. Automated tests pass with zero failures',
        '3. Zero credential or configuration leaks',
        '4. Code changes verified in isolated worktree',
      ],
      risk: 'LOW',
      approvalRequired: true,
      agentRole: agent,
    };
  }
}
