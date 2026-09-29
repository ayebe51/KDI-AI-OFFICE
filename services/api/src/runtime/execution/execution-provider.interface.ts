// ==========================================================
// services/api/src/runtime/execution/execution-provider.interface.ts
// Pluggable Execution Provider Interface (Ready for Future OpenCode)
// ==========================================================

import type { CanonicalTask, AgentDefinition, TaskResult, EngineeringProviderType } from '@kdi/types';

export interface ExecutionProvider {
  readonly providerType: 'LLM' | 'OPENCODE' | 'TOOL' | 'ANTIGRAVITY' | EngineeringProviderType;

  execute(
    task: CanonicalTask,
    agent: AgentDefinition,
    signal?: AbortSignal
  ): Promise<TaskResult>;
}
