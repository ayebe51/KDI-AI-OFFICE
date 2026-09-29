# Antigravity Provider Contract (`antigravity-provider-contract.md`)

## 1. Provider Interface

```typescript
export interface EngineeringProvider {
  readonly providerType: EngineeringProviderType;

  initialize(): Promise<void>;
  healthCheck(): Promise<EngineeringProviderHealth>;
  createSession(request: CreateEngineeringSessionRequest): Promise<EngineeringSession>;
  executeTask(
    task: CanonicalTask | EngineeringTask,
    context: EngineeringExecutionContext,
    signal?: AbortSignal
  ): Promise<EngineeringResult>;
  cancelExecution(sessionId: string, reason?: string): Promise<boolean>;
  resumeExecution(sessionId: string): Promise<boolean>;
  collectResult(sessionId: string): Promise<EngineeringResult>;
  collectDiff(sessionId: string): Promise<string>;
  collectUsage(sessionId: string): Promise<EngineeringUsage>;
  closeSession(sessionId: string): Promise<void>;
}
```

## 2. Capabilities Declaration
```typescript
capabilities: [
  'coding',
  'file_editing',
  'terminal_execution',
  'testing',
  'subagent',
  'mcp',
  'worktree_isolation',
  'verification_gate'
]
```

## 3. Error Model
- `AUTH_REQUIRED`: Provider requires API credentials or user authentication.
- `AUTH_INVALID`: Provided credentials failed validation.
- `AUTH_EXPIRED`: Session token expired.
- `AUTH_UNAVAILABLE`: Authentication server unreachable.
- `EXECUTION_ABORTED`: Process aborted via AbortSignal.
- `FAILED_VERIFICATION`: Code modifications failed automated test or compiler gate.

## 4. Usage Accounting
The provider captures non-fabricated accounting:
- `durationMs`: Wall-clock execution time in milliseconds.
- `inputTokens`: Actual tokens consumed (or marked unavailable).
- `outputTokens`: Actual tokens generated.
- `toolCallsCount`: Number of intercepted tool executions.
- Zero-fabrication rule: If cost metadata is not provided by the vendor, cost is reported as `$0.00` or `unavailable`, never estimated with ungrounded heuristics.
