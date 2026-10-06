// ==========================================================
// services/api/src/engineering/manager/engineering-manager.types.ts
// Phase 17: AI Engineering Manager & Multi-Project Operations Types
// ==========================================================

export type ProjectPriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ProjectHealthStatus = 'HEALTHY' | 'AT_RISK' | 'BLOCKED';

export interface ProjectPriorityRecord {
  level: ProjectPriorityLevel;
  reason: string;
  setBy: string;
  updatedAt: string;
}

export interface ProjectHealthSignals {
  activeTasks: number;
  queuedTasks: number;
  blockedTasks: number;
  failedTasks: number;
  repeatedFailures: number;
  pendingApprovals: number;
  healthScore: number; // 0 - 100 deterministic
  lastActivityAt: string;
}

export interface ManagedProject {
  projectId: string;
  name: string;
  slug: string;
  repositoryPath: string;
  defaultBranch: string;
  framework: string;
  language: string;
  testCommand: string;
  buildCommand?: string;
  priority: ProjectPriorityRecord;
  health: ProjectHealthStatus;
  signals: ProjectHealthSignals;
  assignedLeadAgent: string;
  techStack: string[];
  knownConstraints: string[];
  recurringBugs: string[];
  architectureNotes: string;
}

export interface PortfolioSummary {
  totalProjects: number;
  projects: ManagedProject[];
  totalActiveTasks: number;
  totalQueuedTasks: number;
  totalBlockedTasks: number;
  totalAwaitingApproval: number;
  criticalProjectsCount: number;
  portfolioHealth: ProjectHealthStatus;
  topPriorityTaskTitle?: string;
}

export interface PriorityScoreBreakdown {
  projectPriorityWeight: number; // CRITICAL: 30, HIGH: 20, MEDIUM: 10, LOW: 0
  taskSeverityWeight: number;    // CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5
  technicalUrgencyWeight: number;// Blocker/Crash: 25, Bug: 15, Feature: 10, Refactor: 5
  dependencyDepthWeight: number; // blocks N tasks: N * 10 (max 30)
  deadlineUrgencyWeight: number; // overdue: 25, <24h: 15, <48h: 5
  penaltyBlockedByDependency: number; // -50 if blocked
}

export interface TaskPriorityScore {
  taskId: string;
  totalScore: number;
  breakdown: PriorityScoreBreakdown;
  reason: string;
  calculatedAt: string;
  decisionSource: 'RULE_ENGINE' | 'AI';
}

export type QueueTaskStatus =
  | 'QUEUED'
  | 'BLOCKED_BY_DEPENDENCY'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface QueuedEngineeringTask {
  taskId: string;
  projectSlug: string;
  title: string;
  description: string;
  domain: 'BACKEND' | 'FRONTEND' | 'QA' | 'SECURITY' | 'DEVOPS' | 'FULLSTACK';
  agentRole: string;
  assignedAgentName?: string;
  priorityScore: TaskPriorityScore;
  dependencies: string[]; // task IDs that must complete first
  dependents: string[];   // task IDs blocked by this task
  status: QueueTaskStatus;
  executor: string;
  scopeLockKey?: string;
  notBefore?: string;
  deadline?: string;
  enqueuedAt: string;
  startedAt?: string;
  completedAt?: string;
  attemptsCount: number;
}

export interface DependencyNode {
  taskId: string;
  projectSlug: string;
  status: QueueTaskStatus;
  dependencies: string[];
  dependents: string[];
}

export interface DependencyGraphValidation {
  valid: boolean;
  cycleDetected: boolean;
  cyclePath?: string[];
  topologicalOrder: string[];
}

export interface DependencyCheckResult {
  taskId: string;
  isReady: boolean;
  unresolvedDependencies: string[];
  reason: string;
}

export type AgentAvailabilityStatus = 'AVAILABLE' | 'NEAR_CAPACITY' | 'OVERLOADED' | 'OFFLINE';

export interface AgentCapacityProfile {
  agentId: string;
  name: string;
  role: string;
  maxConcurrentTasks: number;
  preferredDomains: string[];
  activeTaskIds: string[];
  queuedTaskIds: string[];
  utilizationPercentage: number;
  availabilityStatus: AgentAvailabilityStatus;
}

export interface WorkforceWorkloadSummary {
  totalAgents: number;
  activeAgentsCount: number;
  totalActiveTasks: number;
  averageUtilization: number;
  agents: AgentCapacityProfile[];
}

export interface AgentAssignmentRecommendation {
  taskId: string;
  recommendedAgentId: string;
  agentName: string;
  agentRole: string;
  matchScore: number;
  reason: string;
  decisionSource: 'RULE_ENGINE' | 'AI';
}

export interface ScopeLock {
  lockKey: string;
  lockedByTaskId: string;
  projectSlug: string;
  acquiredAt: string;
  expiresAt: string;
  reason: string;
}

export interface LockAcquireResult {
  acquired: boolean;
  lockKey: string;
  conflictingTaskId?: string;
  reason: string;
}

export type BlockerType =
  | 'DEPENDENCY_BLOCKED'
  | 'AGENT_UNAVAILABLE'
  | 'EXECUTOR_UNAVAILABLE'
  | 'REPEATED_FAILURE'
  | 'APPROVAL_PENDING'
  | 'RESOURCE_LOCKED'
  | 'ENVIRONMENT_ERROR';

export type BlockerSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface BlockerRecord {
  id: string;
  type: BlockerType;
  severity: BlockerSeverity;
  projectSlug: string;
  affectedTaskIds: string[];
  reason: string;
  suggestedResolution: string;
  detectedAt: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ESCALATED';
}

export interface ManagerDecisionRecord {
  id: string;
  decisionType:
    | 'ASSIGNMENT'
    | 'PRIORITIZATION'
    | 'REORDER_QUEUE'
    | 'BLOCKER_ESCALATION'
    | 'UNBLOCK_DEPENDENCY'
    | 'RESOURCE_LOCK';
  decisionSource: 'RULE_ENGINE' | 'AI';
  reason: string;
  evidence: Record<string, any>;
  affectedTaskIds: string[];
  actor: string;
  timestamp: string;
}

export interface HumanAttentionItem {
  id: string;
  type:
    | 'APPROVAL_REQUIRED'
    | 'REPEATED_FAILURE'
    | 'CRITICAL_BLOCKER'
    | 'STRATEGIC_AMBIGUITY'
    | 'RESOURCE_SHORTAGE';
  projectSlug: string;
  taskId?: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  actionPrompt: string;
}

export interface EngineeringDailyBrief {
  generatedAt: string;
  whatHappened: string[];
  whatIsAtRisk: string[];
  whatNeedsHumanAttention: string[];
  suggestedPriority: string[];
  portfolioHealth: ProjectHealthStatus;
}

export interface RealWorldTaskMetricRecord {
  taskId: string;
  projectSlug: string;
  durationMs: number;
  attemptsCount: number;
  status: string;
  requiredClarification: boolean;
  requiredManualRepair: boolean;
  requiredApproval: boolean;
  autonomousCompletion: boolean;
  completedAt: string;
}

export interface EngineeringManagerMetrics {
  totalTasksProcessed: number;
  completionRate: number; // 0 - 100%
  failureRate: number;    // 0 - 100%
  averageExecutionDurationMs: number;
  averageAttemptsPerTask: number;
  tasksCompletedWithoutIntervention: number;
  humanInterventionRate: number; // 0 - 100%
  agentUtilizationRate: number;  // 0 - 100%
}

export * from './benchmark.types.js';

