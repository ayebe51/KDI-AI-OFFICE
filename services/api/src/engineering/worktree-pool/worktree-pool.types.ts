// ==========================================================
// services/api/src/engineering/worktree-pool/worktree-pool.types.ts
// Phase 23: Pre-Warmed Worktree Pool, Storage Health & Runner Optimization Types (§5–§16)
// ==========================================================

export type PooledWorktreeState =
  | 'IDLE'
  | 'CLAIMED'
  | 'RESETTING'
  | 'READY'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SANITIZING'
  | 'QUARANTINED';

export type WorktreeIntegrityStatus = 'CLEAN' | 'DIRTY' | 'SUSPECT' | 'QUARANTINED';

export type StorageHealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';

/**
 * Section 10: Cache Taxonomy
 */
export type CacheCategory =
  | 'SAFE_SHARED_CACHE'
  | 'TASK_SCOPED_CACHE'
  | 'WORKTREE_SCOPED_CACHE'
  | 'NON_SHAREABLE_STATE';

/**
 * Section 15: Failure Recovery Classes
 */
export type ExecutionFailureClass =
  | 'WORKTREE_CREATE_FAILURE'
  | 'WORKTREE_RESET_FAILURE'
  | 'WORKTREE_LOCK_FAILURE'
  | 'PROCESS_START_FAILURE'
  | 'PROCESS_TIMEOUT'
  | 'TEST_RUNNER_FAILURE'
  | 'CLEANUP_FAILURE'
  | 'STORAGE_CRITICAL'
  | 'STALE_LEASE'
  | 'UNKNOWN_STATE';

/**
 * Section 16: Telemetry Event Names
 */
export type WorktreePoolEventType =
  | 'WORKTREE_POOL_CLAIM'
  | 'WORKTREE_POOL_WAIT'
  | 'WORKTREE_RESET_START'
  | 'WORKTREE_RESET_END'
  | 'PROCESS_START'
  | 'PROCESS_READY'
  | 'TEST_RUN_START'
  | 'TEST_RUN_END'
  | 'WORKTREE_SANITIZE'
  | 'WORKTREE_RELEASE'
  | 'WORKTREE_QUARANTINE';

export interface WorktreePoolTelemetryEvent {
  eventId: string;
  type: WorktreePoolEventType;
  taskId: string;
  projectId: string;
  worktreeId: string;
  timestamp: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'QUARANTINED';
  metadata?: Record<string, unknown>;
}

export interface PooledWorktree {
  worktreeId: string;
  worktreePath: string;
  baseRepoPath: string;
  state: PooledWorktreeState;
  integrityStatus: WorktreeIntegrityStatus;
  currentTaskId?: string;
  leaseId?: string;
  cleanRef: string;
  currentBranch?: string;
  createdAt: number;
  claimedAt?: number;
  releasedAt?: number;
  lastResetAt?: number;
  quarantineReason?: string;
  stats: {
    totalClaims: number;
    successfulResets: number;
    failedResets: number;
  };
}

export interface WorktreePoolConfig {
  poolSize: number;
  baseStorageDir: string;
  enablePreWarming: boolean;
  resetTimeoutMs: number;
  leaseTimeoutMs: number;
  quarantineOnDirty: boolean;
  storageWarningThresholdMb: number;
  storageCriticalThresholdMb: number;
}

export interface WorktreeClaimResult {
  success: boolean;
  worktree?: PooledWorktree;
  poolHit: boolean;
  waitDurationMs: number;
  error?: string;
}

export interface WorktreeResetResult {
  success: boolean;
  clean: boolean;
  durationMs: number;
  untrackedFilesRemoved: string[];
  quarantined: boolean;
  reason?: string;
}

export interface StorageHealthReport {
  status: StorageHealthStatus;
  totalDiskMb: number;
  freeDiskMb: number;
  usedDiskMb: number;
  monitoredPaths: string[];
  criticalThresholdMb: number;
  warningThresholdMb: number;
  isAllocationBlocked: boolean;
  timestamp: string;
}

export interface Phase23MetricsScorecard {
  baselineMachineCycleMs: number;
  optimizedMachineCycleMs: number;
  overallImprovementPct: number;
  worktreeOverheadBeforeMs: number;
  worktreeOverheadAfterMs: number;
  processStartupBeforeMs: number;
  processStartupAfterMs: number;
  testStartupBeforeMs: number;
  testStartupAfterMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  poolHitRatePct: number;
  poolMissRatePct: number;
  quarantineCount: number;
  recoverySuccessRatePct: number;
  crossTaskContaminationCount: number;
  secretLeakageCount: number;
  safetyViolationsCount: number;
  approvalBypassesCount: number;
  regressionsCount: number;
}
