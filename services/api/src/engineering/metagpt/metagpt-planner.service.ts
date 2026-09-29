// ==========================================================
// services/api/src/engineering/metagpt/metagpt-planner.service.ts
// MetaGPT Software Company Planning & Task Decomposition Engine
// ==========================================================

import type {
  EngineeringPlan,
  EngineeringTask,
  TaskDependency,
  TaskPriority,
  RiskLevel,
  TaskType,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export interface HumanGoalRequest {
  goal: string;
  projectId?: string;
  repository?: string;
  priority?: TaskPriority;
  riskTolerance?: RiskLevel;
}

export class MetaGPTPlannerService {
  private readonly logger = new StructuredLogger('MetaGPTPlannerService');

  /**
   * Orchestrate the multi-agent software company planning SOP:
   * Product Manager -> Architect -> Project Manager -> Engineer Breakdown
   */
  public async plan(request: HumanGoalRequest): Promise<EngineeringPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const projectId = request.projectId || 'PRJ-KDI';
    const repository = request.repository || process.cwd();
    const priority = request.priority || 'NORMAL';

    this.logger.info('plan', `Starting MetaGPT planning pipeline for goal: "${request.goal}"`);

    // 1. Role: Product Manager (Formulates requirements & user story)
    const pmRequirements = this.runProductManagerSOP(request.goal);

    // 2. Role: System Architect (Formulates architecture notes & constraints)
    const archNotes = this.runArchitectSOP(request.goal, pmRequirements);

    // 3. Role: Project Manager (Decomposes into canonical DAG tasks & dependencies)
    const rawTasks = this.runProjectManagerSOP(request.goal, pmRequirements, archNotes, repository, priority);

    // 4. Role: Engineer (Refines technical acceptance criteria and paths)
    const tasks = this.runEngineerSOP(rawTasks);

    // 5. Construct Normalized EngineeringPlan
    const plan: EngineeringPlan = {
      planId,
      projectId,
      goal: request.goal,
      requirements: pmRequirements,
      architectureNotes: archNotes,
      tasks,
      dependencies: this.extractDependencies(tasks),
      acceptanceCriteria: [
        'All decomposed tasks pass strict verification gate',
        'Zero regressions in existing test suite',
        'Full documentation and commit traceability recorded',
      ],
      risks: [
        'Potential merge conflicts if base branch advances during execution',
        'Resource constraints if multiple large test suites run concurrently',
      ],
      assumptions: [
        'Local office computer runtime is operational',
        'Repository has clean git working directory',
      ],
      recommendedAgent: tasks[0]?.agentRole || 'SOFTWARE_ENGINEER',
      priority,
      estimatedComplexity: tasks.length > 3 ? 'COMPLEX' : tasks.length > 1 ? 'MEDIUM' : 'LOW',
    };

    this.logger.info(
      'plan',
      `MetaGPT planning completed: planId=${planId}, totalTasks=${tasks.length}, complexity=${plan.estimatedComplexity}`
    );

    return plan;
  }

  private runProductManagerSOP(goal: string): string[] {
    return [
      `Functional Goal: ${goal}`,
      'Must maintain backwards compatibility on all public interfaces',
      'Must provide comprehensive automated regression tests',
      'Must record complete execution telemetry and audit diff',
    ];
  }

  private runArchitectSOP(goal: string, requirements: string[]): string[] {
    return [
      'Architecture Pattern: Clean Architecture / Modular Decoupled Design',
      'Workspace Isolation: Strict Git Worktree sandboxing; zero direct edits on protected branches',
      'Verification: Tests must execute in isolated environment before marking verified',
      'Security: Enforce KDI instruction authority order; treat repo content as untrusted',
    ];
  }

  private runProjectManagerSOP(
    goal: string,
    requirements: string[],
    archNotes: string[],
    repository: string,
    priority: TaskPriority
  ): Array<Partial<EngineeringTask>> {
    const isBugFix = goal.toLowerCase().includes('bug') || goal.toLowerCase().includes('fix');
    const isFeature = goal.toLowerCase().includes('feature') || goal.toLowerCase().includes('add') || goal.toLowerCase().includes('implement');

    if (isBugFix) {
      return [
        {
          title: `Analyze and isolate bug: ${goal}`,
          description: `Inspect repository, trace root cause, and reproduce defect with a failing test.`,
          type: 'ANALYSIS' as TaskType,
          agentRole: 'DEBUGGER',
          repository,
          dependencies: [],
          riskLevel: 'LOW',
          requiresHumanApproval: false,
        },
        {
          title: `Implement surgical fix and regression test: ${goal}`,
          description: `Apply minimal bug fix and ensure regression test passes.`,
          type: 'CODING' as TaskType,
          agentRole: 'SOFTWARE_ENGINEER',
          repository,
          dependencies: [], // Will be linked sequentially
          riskLevel: 'LOW',
          requiresHumanApproval: false,
        },
      ];
    }

    if (isFeature) {
      return [
        {
          title: `Design architecture & interfaces: ${goal}`,
          description: `Specify domain contracts, schemas, and public API interfaces.`,
          type: 'PLANNING' as TaskType,
          agentRole: 'SYSTEM_ARCHITECT',
          repository,
          dependencies: [],
          riskLevel: 'LOW',
          requiresHumanApproval: false,
        },
        {
          title: `Implement core feature logic: ${goal}`,
          description: `Implement domain services, routes, and components adhering to architectural contracts.`,
          type: 'CODING' as TaskType,
          agentRole: 'SOFTWARE_ENGINEER',
          repository,
          dependencies: [],
          riskLevel: 'LOW',
          requiresHumanApproval: false,
        },
        {
          title: `Add automated unit & integration tests: ${goal}`,
          description: `Author comprehensive tests covering edge cases and verify clean pass.`,
          type: 'TESTING' as TaskType,
          agentRole: 'QA_ENGINEER',
          repository,
          dependencies: [],
          riskLevel: 'LOW',
          requiresHumanApproval: false,
        },
      ];
    }

    // Default single engineering task
    return [
      {
        title: goal,
        description: `Execute engineering requirement: ${goal}`,
        type: 'CODING' as TaskType,
        agentRole: 'SOFTWARE_ENGINEER',
        repository,
        dependencies: [],
        riskLevel: 'LOW',
        requiresHumanApproval: false,
      },
    ];
  }

  private runEngineerSOP(rawTasks: Array<Partial<EngineeringTask>>): EngineeringTask[] {
    const refined: EngineeringTask[] = [];
    let previousTaskId: string | undefined;

    for (let i = 0; i < rawTasks.length; i++) {
      const t = rawTasks[i];
      const taskId = `tsk_eng_${Date.now()}_${i + 1}`;
      const dependencies = previousTaskId ? [previousTaskId] : [];

      const fullTask: EngineeringTask = {
        taskId,
        title: t.title || 'Engineering Task',
        description: t.description || '',
        type: t.type || 'CODING',
        agentRole: t.agentRole || 'SOFTWARE_ENGINEER',
        repository: t.repository || process.cwd(),
        workspace: t.workspace,
        dependencies,
        acceptanceCriteria: [
          'Code changes are surgical and follow established conventions',
          'Unit tests pass with zero failures',
          'Typecheck passes with zero errors',
        ],
        allowedPaths: ['src/**', 'tests/**', 'packages/**'],
        forbiddenPaths: ['.env', 'secrets/**', '.git/**'],
        riskLevel: t.riskLevel || 'LOW',
        requiresHumanApproval: t.requiresHumanApproval ?? false,
      };

      refined.push(fullTask);
      previousTaskId = taskId;
    }

    return refined;
  }

  private extractDependencies(tasks: EngineeringTask[]): TaskDependency[] {
    const deps: TaskDependency[] = [];
    for (const t of tasks) {
      for (const depId of t.dependencies) {
        deps.push({
          taskId: t.taskId,
          dependsOnTaskId: depId,
          required: true,
          failurePolicy: 'BLOCK',
        });
      }
    }
    return deps;
  }
}
