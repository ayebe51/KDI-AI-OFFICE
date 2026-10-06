// ==========================================================
// services/api/src/engineering/operating-system/engineering-os.types.ts
// Phase 16: KDI AI Engineering Operating System Domain Types
// ==========================================================

import type { EngineeringExecutionStatus } from '../execution/engineering-execution.types.js';

export type WorkRequestType =
  | 'BUG'
  | 'FEATURE'
  | 'TEST'
  | 'SECURITY'
  | 'REFACTOR'
  | 'MAINTENANCE'
  | 'UNKNOWN';

export type WorkRequestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EngineeringDomain =
  | 'BACKEND'
  | 'FRONTEND'
  | 'QA'
  | 'SECURITY'
  | 'DEVOPS'
  | 'FULLSTACK';

export type WorkRequestStatus =
  | 'RECEIVED'
  | 'UNDERSTOOD'
  | 'PLANNED'
  | 'DELEGATED'
  | 'EXECUTING'
  | 'TESTING'
  | 'REVIEWING'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'APPROVAL_INVALIDATED'
  | 'COMMITTED'
  | 'READY_FOR_DEPLOY'
  | 'FAILED'
  | 'BLOCKED'
  | 'NEEDS_CLARIFICATION'
  | 'CANCELLED';

export interface ProjectProfile {
  projectId: string;
  name: string;
  slug: string;
  repositoryPath: string;
  defaultBranch: string;
  framework: string;
  language: string;
  testCommand: string;
  buildCommand?: string;
  architectureNotes: string;
  knownConstraints: string[];
  recurringBugs: string[];
  assignedLeadAgent: string;
  allowedDirectories: string[];
  environment?: Record<string, string>;
}

export interface EngineeringPlanDetail {
  problem: string;
  likelyRootCause: string;
  filesLikelyInvolved: string[];
  testsToRun: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  approvalRequired: boolean;
  agentRole: string;
}

export interface WorkRequest {
  id: string;
  requester: string;
  project: string;
  repositoryPath: string;
  description: string;
  type: WorkRequestType;
  priority: WorkRequestPriority;
  domain: EngineeringDomain;
  assignedAgent: string;
  executor: 'ANTIGRAVITY' | 'GIT_WORKTREE';
  acceptanceCriteria: string[];
  status: WorkRequestStatus;
  autonomyLevel: number; // Level 1 - 4
  plan?: EngineeringPlanDetail;
  taskId?: string;
  dependsOn?: string[];
  clarificationQuestions?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MultiAgentHandoffRecord {
  handoffId: string;
  taskId: string;
  fromAgent: string;
  toAgent: string;
  step: 'IMPLEMENTATION' | 'QA_VERIFICATION' | 'SECURITY_AUDIT' | 'APPROVAL_REVIEW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  timestamp: string;
}

export interface EngineeringMemoryEntry {
  entryId: string;
  project: string;
  topic: 'BUG_PATTERN' | 'ARCHITECTURE_NOTE' | 'GOTCHA' | 'COMMAND';
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface TokenUsageMetric {
  requestId: string;
  agent: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cacheHit: boolean;
  estimatedCostUsd: number;
  timestamp: string;
}

export interface EngineeringAttentionItem {
  id: string;
  type: 'APPROVAL_PENDING' | 'TASK_FAILED' | 'TASK_BLOCKED' | 'REGRESSION_ALERT' | 'CLARIFICATION_NEEDED';
  project: string;
  title: string;
  summary: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  actionPrompt: string;
  taskId?: string;
}

export interface EngineeringAttentionSummary {
  items: EngineeringAttentionItem[];
  totalActionRequired: number;
  awaitingApprovalCount: number;
  failedTasksCount: number;
  blockedTasksCount: number;
  timestamp: string;
}

export interface EngineeringAnalyticsData {
  tasksCompleted: number;
  taskSuccessRate: number;
  averageAttempts: number;
  testFailureRate: number;
  averageExecutionTimeMs: number;
  approvalWaitingTimeMs: number;
  antigravityExecutionsCount: number;
  tokenMetrics: {
    totalRequests: number;
    promptTokens: number;
    completionTokens: number;
    cacheHits: number;
    cacheMisses: number;
    estimatedCostUsd: number;
  };
}

export interface EngineeringHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'ATTENTION_REQUIRED';
  backlogCount: number;
  failedTaskCount: number;
  staleTaskCount: number;
  pendingApprovalsCount: number;
  executorStatus: Record<string, string>;
  briefing: string;
  timestamp: string;
}
