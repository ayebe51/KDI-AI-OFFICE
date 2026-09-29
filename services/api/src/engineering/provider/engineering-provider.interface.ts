// ==========================================================
// services/api/src/engineering/provider/engineering-provider.interface.ts
// Canonical Engineering Provider Abstraction Interface
// ==========================================================

import type {
  EngineeringProviderType,
  EngineeringProviderHealth,
  EngineeringSession,
  CreateEngineeringSessionRequest,
  EngineeringExecutionContext,
  EngineeringResult,
  EngineeringUsage,
  CanonicalTask,
  EngineeringTask,
} from '@kdi/types';

export interface EngineeringProvider {
  readonly providerType: EngineeringProviderType;

  /**
   * Initialize provider runtime, discover binaries/SDK, configure default environments
   */
  initialize(): Promise<void>;

  /**
   * Health and capability discovery probe
   */
  healthCheck(): Promise<EngineeringProviderHealth>;

  /**
   * Create an isolated engineering session
   */
  createSession(request: CreateEngineeringSessionRequest): Promise<EngineeringSession>;

  /**
   * Execute an engineering task within the allocated workspace
   */
  executeTask(
    task: CanonicalTask | EngineeringTask,
    context: EngineeringExecutionContext,
    signal?: AbortSignal
  ): Promise<EngineeringResult>;

  /**
   * Cancel an active session or execution safely
   */
  cancelExecution(sessionId: string, reason?: string): Promise<boolean>;

  /**
   * Resume a paused or suspended execution
   */
  resumeExecution(sessionId: string): Promise<boolean>;

  /**
   * Collect final result and structured evidence
   */
  collectResult(sessionId: string): Promise<EngineeringResult>;

  /**
   * Collect git diff from the session workspace
   */
  collectDiff(sessionId: string): Promise<string>;

  /**
   * Collect token usage, latency, and tool execution accounting
   */
  collectUsage(sessionId: string): Promise<EngineeringUsage>;

  /**
   * Gracefully close and teardown the session
   */
  closeSession(sessionId: string): Promise<void>;
}
