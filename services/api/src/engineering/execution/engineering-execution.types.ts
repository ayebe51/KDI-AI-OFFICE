// ==========================================================
// services/api/src/engineering/execution/engineering-execution.types.ts
// Phase 15.2: Engineering Task Execution Contract & State Machine
// ==========================================================

export type EngineeringExecutionStatus =
  // Lifecycle states (§6)
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'WORKSPACE_PREPARED'
  | 'REPOSITORY_INSPECTED'
  | 'EXECUTOR_STARTED'
  | 'IMPLEMENTING'
  | 'TESTING'
  | 'DIFF_COLLECTED'
  | 'ENGINEERING_REVIEW'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'COMMITTED'
  | 'MERGED'
  | 'READY_FOR_DEPLOY'
  // Phase 15.4 Antigravity execution states (§13)
  | 'ANTIGRAVITY_RUNNING'
  | 'ANTIGRAVITY_COMPLETED'
  | 'ANTIGRAVITY_FAILED'
  | 'ANTIGRAVITY_TIMEOUT'
  | 'ANTIGRAVITY_UNAVAILABLE'
  | 'ANTIGRAVITY_AUTH_REQUIRED'
  | 'ANTIGRAVITY_PERMISSION_BLOCKED'
  // Failure / Terminal states (§6)
  | 'EXECUTOR_UNAVAILABLE'
  | 'WORKSPACE_ERROR'
  | 'EXECUTION_TIMEOUT'
  | 'COMMAND_FAILED'
  | 'TEST_FAILED'
  | 'REVIEW_FAILED'
  | 'APPROVAL_REJECTED'
  | 'MERGE_FAILED'
  | 'DEPLOY_FAILED'
  | 'BLOCKED'
  | 'CANCELLED';

export type CommandSecurityCategory = 'SAFE' | 'RESTRICTED' | 'DANGEROUS' | 'FORBIDDEN';

export type CommandSecurityAction =
  | 'ALLOW'
  | 'ELEVATED_VERIFY'
  | 'HUMAN_APPROVAL_REQUIRED'
  | 'DENY';

export interface CommandSecurityDecision {
  command: string;
  category: CommandSecurityCategory;
  action: CommandSecurityAction;
  reason?: string;
}

export interface EngineeringTaskContext {
  taskId: string;
  project: string;
  repository: string;
  repositoryPath: string;
  taskType: 'BUG' | 'FEATURE' | 'TEST' | 'REFACTOR' | 'SECURITY' | 'DEPLOYMENT' | string;
  domain: 'BACKEND' | 'FRONTEND' | 'QA' | 'DEVOPS' | 'SECURITY' | string;
  agent: string;
  agentName: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  constraints: string[];
  branch: string;
  worktree?: string;
  executor: 'ANTIGRAVITY' | 'GIT_WORKTREE' | 'MOCK' | string;
  timeout: number; // in ms
  environment: Record<string, string>;
  requestedBy: string;
  // Phase 15.3 extensions
  maxAttempts?: number;
  doNotChange?: string[];
  targetedFiles?: string[];
}

export interface TaskDecompositionPlan {
  problem: string;
  likelyRootCause: string;
  filesToInspect: string[];
  filesExpectedToChange: string[];
  implementationStrategy: string;
  testsToRun: string[];
  acceptanceCriteria: string[];
  risksAndConstraints: string[];
  agentRole: string;
}

export interface AcceptanceCriterionResult {
  criterion: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  evidence: string;
}

export interface RepositoryInspection {
  isGitRepo: boolean;
  repoPath: string;
  defaultBranch: string;
  currentBranch: string;
  cleanWorkingTree: boolean;
  packageJsonFound: boolean;
  testScriptFound: boolean;
  buildScriptFound: boolean;
  detectedFrameworks: string[];
  totalFiles: number;
  // Phase 15.3: Genuine repository properties (§6)
  packageManager?: string;
  language?: string;
  framework?: string;
  testFramework?: string;
  buildSystem?: string;
  relevantModules?: string[];
  entryPoints?: string[];
  existingTests?: string[];
  configFiles?: string[];
}

export interface WorkspaceInfo {
  workspaceId: string;
  taskId: string;
  baseRepoPath: string;
  worktreePath: string;
  branch: string;
  isWorktree: boolean;
  createdAt: string;
}

export interface ExecutionAttempt {
  attemptNumber: number;
  status: EngineeringExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  changedFiles: string[];
  diffSummary: string;
  tests: {
    run: number;
    passed: number;
    failed: number;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
    details?: string;
  };
  build: {
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
    details?: string;
  };
  reviewResult?: EngineeringReviewResult;
  commit?: string;
  error?: string;
  rawLogs: string[];
  commandsExecuted?: string[];
  decomposition?: TaskDecompositionPlan;
}

export interface EngineeringReviewResult {
  passed: boolean;
  reviewer: string;
  feedback: string;
  satisfiedCriteria: string[];
  pendingCriteria: string[];
  potentialRegressions: string[];
  securityConcerns: string[];
  reviewedAt: string;
  acceptanceCriteriaResults?: AcceptanceCriterionResult[];
  changedFileAssessment?: string;
  securityAssessment?: string;
  scopeAssessment?: string;
}

export interface EngineeringExecutionResult {
  taskId: string;
  project: string;
  executor: string;
  status: EngineeringExecutionStatus;
  branch: string;
  worktreePath: string;
  exitCode?: number;
  changedFiles: string[];
  diffSummary: string;
  tests: {
    run: number;
    passed: number;
    failed: number;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
  };
  build: {
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
  };
  commit?: string;
  durationMs: number;
  error?: string;
  attempts: ExecutionAttempt[];
  currentAttempt: ExecutionAttempt;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AntigravityDiscoveryResult {
  available: boolean;
  executablePath?: string;
  version?: string;
  os: string;
  authenticated: boolean;
  authMethod?: string;
  headlessCapable: boolean;
  structuredOutputSupported: boolean;
  supportedOutputFormats: string[];
  scopedPermissionsSupported: boolean;
  projectContextSupported: boolean;
  status:
    | 'READY'
    | 'ANTIGRAVITY_UNAVAILABLE'
    | 'ANTIGRAVITY_AUTH_REQUIRED'
    | 'ANTIGRAVITY_PERMISSION_BLOCKED';
  diagnostics: string;
}

export interface AntigravityExecutionResult {
  status:
    | 'ANTIGRAVITY_COMPLETED'
    | 'ANTIGRAVITY_FAILED'
    | 'ANTIGRAVITY_TIMEOUT'
    | 'ANTIGRAVITY_UNAVAILABLE'
    | 'ANTIGRAVITY_AUTH_REQUIRED'
    | 'ANTIGRAVITY_PERMISSION_BLOCKED';
  exitCode: number;
  stdout: string;
  stderr: string;
  response?: string;
  durationMs: number;
  changedFiles: string[];
  testStatus?: 'PASSED' | 'FAILED' | 'SKIPPED';
  error?: string;
  conversationId?: string;
  rootCause?: string;
  summary?: string;
}

export interface EngineeringExecutionHost {
  hostId: string;
  platform: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  capabilities: string[];
  availableExecutors: string[];
  health: {
    cpuPercent?: number;
    memoryAvailableMb?: number;
    lastHeartbeat: string;
  };
}

