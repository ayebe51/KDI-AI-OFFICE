// ==========================================================
// services/api/src/engineering/host/host.types.ts
// Native Windows Execution Host & Control Plane Channel Types
// ==========================================================

export type HostStatus = 'ONLINE' | 'OFFLINE' | 'STALE' | 'BUSY' | 'DRAINING';

export type ExecutorReadiness = 'READY' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'BUSY';

export interface HostMetrics {
  cpuLoadPercent?: number;
  memoryAvailableMb?: number;
  memoryTotalMb?: number;
  diskAvailableGb?: number;
  activeProcessesCount?: number;
}

export interface WindowsHostRegistration {
  hostId: string;
  hostname: string;
  platform: 'win32' | 'linux' | 'darwin';
  architecture: string;
  antigravityVersion: string;
  agyPath: string;
  gitVersion: string;
  nodeVersion: string;
  availableRuntimes: string[];
  status: HostStatus;
  executorStatus: ExecutorReadiness;
  lastHeartbeat: number;
  maxConcurrentTasks: number;
  activeTasksCount: number;
  capabilities: string[];
  registeredAt: number;
  metadata?: Record<string, unknown>;
}

export interface HostHeartbeat {
  hostId: string;
  status: HostStatus;
  executorStatus: ExecutorReadiness;
  activeTasks: string[];
  timestamp: number;
  metrics?: HostMetrics;
}

export interface ExecutionRequestPayload {
  requestId: string;
  taskId: string;
  project: string; // e.g. 'SIMMACI', 'ILMORA', 'KDI'
  repository: string; // logical repository identifier
  branch: string;
  targetBranch?: string;
  role: string;
  executor: 'ANTIGRAVITY' | 'GIT_WORKTREE' | 'CODING_WORKER';
  prompt: string;
  acceptanceCriteria: string[];
  constraints: string[];
  timeoutMs: number;
  timestamp: number;
  nonce: string;
  authSignature?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionVerificationReport {
  gitStatusClean: boolean;
  testsVerified: boolean;
  buildVerified: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testOutput?: string;
  diffSummary?: string;
}

export interface ExecutionResponsePayload {
  requestId: string;
  taskId: string;
  hostId: string;
  status: 'COMPLETED' | 'FAILED' | 'REJECTED' | 'TIMEOUT' | 'AUTH_REQUIRED' | 'BLOCKED';
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  changedFiles: string[];
  diff?: string;
  verification: ExecutionVerificationReport;
  reviewResult?: {
    approved: boolean;
    score: number;
    summary: string;
    issues: string[];
  };
  commitHash?: string;
  durationMs: number;
  error?: string;
  timestamp: number;
}

export interface ProjectHostMapping {
  projectSlug: string;
  hostId: string;
  isPrimary: boolean;
  fallbackHostId?: string;
  assignedAt: number;
}

export interface DeploymentRollbackSnapshot {
  snapshotId: string;
  gitSha: string;
  timestamp: number;
  description: string;
  activeHosts: WindowsHostRegistration[];
  projectMappings: ProjectHostMapping[];
  configSummary: Record<string, string>;
}
