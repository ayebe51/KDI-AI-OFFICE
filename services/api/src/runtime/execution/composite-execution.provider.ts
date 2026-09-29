// ==========================================================
// services/api/src/runtime/execution/composite-execution.provider.ts
// Composite Execution Provider Routing Between Direct LLM & Antigravity
// ==========================================================

import type { CanonicalTask, AgentDefinition, TaskResult } from '@kdi/types';
import type { ExecutionProvider } from './execution-provider.interface.js';
import type { LLMExecutionProvider } from './llm-execution.provider.js';
import type { AntigravityEngineeringProvider } from '../../engineering/provider/antigravity.provider.js';
import { StructuredLogger } from '@kdi/shared';

export class CompositeExecutionProvider implements ExecutionProvider {
  public readonly providerType = 'ANTIGRAVITY' as const;
  private readonly logger = new StructuredLogger('CompositeExecutionProvider');

  constructor(
    private readonly llmProvider: LLMExecutionProvider,
    private readonly antigravityProvider: AntigravityEngineeringProvider
  ) {}

  /**
   * Intelligently routes tasks based on capabilities:
   * - CODING, TESTING, or tasks requiring code/file manipulation -> Antigravity Engineering Provider
   * - ANALYSIS, CLASSIFICATION, FAST, REASONING -> Direct LLM Provider
   */
  public async execute(
    task: CanonicalTask,
    agent: AgentDefinition,
    signal?: AbortSignal
  ): Promise<TaskResult> {
    const isEngineeringTask =
      task.taskType === 'CODING' ||
      task.requiredSkills.includes('coding') ||
      task.requiredSkills.includes('bug-fixing') ||
      task.requiredSkills.includes('refactoring') ||
      task.requiredCapabilities.includes('CODE');

    if (isEngineeringTask) {
      this.logger.info(
        'execute',
        `Routing task ${task.taskId} (${task.taskType}) to Antigravity Engineering Provider`
      );
      return this.antigravityProvider.execute(task, agent, signal);
    }

    this.logger.info(
      'execute',
      `Routing task ${task.taskId} (${task.taskType}) to Direct LLM Provider`
    );
    return this.llmProvider.execute(task, agent, signal);
  }
}
