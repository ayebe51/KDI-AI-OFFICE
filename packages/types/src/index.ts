// ==========================================================
// @kdi/types - Canonical Domain Type Definitions
// ==========================================================

export type AgentRole =
  | 'AI_MANAGER'
  | 'PRODUCT_MANAGER'
  | 'BUSINESS_ANALYST'
  | 'SYSTEM_ARCHITECT'
  | 'DATABASE_ARCHITECT'
  | 'FRONTEND_ENGINEER'
  | 'BACKEND_ENGINEER'
  | 'SOFTWARE_ENGINEER'
  | 'DEVOPS_ENGINEER'
  | 'QA_ENGINEER'
  | 'SECURITY_ENGINEER'
  | 'CODE_REVIEWER'
  | 'RESEARCHER'
  | 'TECHNICAL_WRITER'
  | 'FULLSTACK_ENGINEER'
  | 'DATABASE_ENGINEER'
  | 'TEST_ENGINEER'
  | 'DEBUGGER'
  | 'REFACTORING_ENGINEER'
  | 'DOCUMENTATION_ENGINEER';

export type AgentState =
  | 'OFFLINE'
  | 'IDLE'
  | 'WORKING'
  | 'THINKING'
  | 'PLANNING'
  | 'CODING'
  | 'DEBUGGING'
  | 'TESTING'
  | 'REVIEWING'
  | 'MEETING'
  | 'BREAK'
  | 'COFFEE'
  | 'LUNCH'
  | 'PRAYING'
  | 'READING'
  | 'TRAINING'
  | 'MOVING'
  | 'WAITING_APPROVAL'
  | 'ERROR'
  | 'COMPLETED';

export type TaskStatus =
  | 'PENDING'
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SalaryGrade =
  | 'GR-01' // Intern
  | 'GR-02' // Junior
  | 'GR-03' // Mid
  | 'GR-04' // Senior
  | 'GR-05' // Lead
  | 'GR-06' // Principal
  | 'GR-07' // Manager
  | 'GR-08'; // Director

export interface DigitalEmployee {
  agentId: string;
  name: string;
  role: AgentRole;
  department: string;
  grade: SalaryGrade;
  room: string;
  currentState: AgentState;
  currentTaskId?: string;
  currentActivity?: string;
  baseSalary: number;
}

export interface TaskRecord {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  riskLevel: RiskLevel;
  assignedAgent: AgentRole;
  workingBranch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubsystemHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface AggregateHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  subsystems: {
    postgres: SubsystemHealth;
    redis: SubsystemHealth;
    neo4j: SubsystemHealth;
    ollama?: SubsystemHealth;
  };
}

export interface WSEventEnvelope<T = unknown> {
  eventId: string;
  type: string;
  timestamp: string;
  channel: 'office:public' | 'portfolio:public' | 'office:events' | 'workforce:finance';
  data: T;
}

export interface AgentStatusChangedPayload {
  agentId: string;
  role: AgentRole;
  previousState: AgentState;
  currentState: AgentState;
  roomId: string;
  taskId?: string;
  activitySummary?: string;
}

// ==========================================================
// Phase 2: LLM Intelligence Layer Canonical Types
// ==========================================================

export type LLMProviderType = 'ollama' | 'gemini' | 'groq' | 'openrouter';

export type ModelCapability =
  | 'TEXT'
  | 'CODE'
  | 'REASONING'
  | 'TOOL_CALLING'
  | 'STRUCTURED_OUTPUT'
  | 'VISION'
  | 'LONG_CONTEXT'
  | 'FAST'
  | 'LOCAL'
  | 'PRIVATE';

export type PrivacyClass =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'SENSITIVE'
  | 'PRIVATE'
  | 'CONFIDENTIAL';

export type LLMErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'CONTEXT_TOO_LARGE'
  | 'TIMEOUT'
  | 'CONTENT_FILTERED'
  | 'PROVIDER_ERROR'
  | 'UNKNOWN_ERROR';

export type ProviderHealthState =
  | 'AVAILABLE'
  | 'DEGRADED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'AUTH_ERROR'
  | 'UNAVAILABLE'
  | 'DISABLED'
  | 'UNKNOWN';

export type BillingMode = 'FREE' | 'PAID' | 'UNKNOWN';

export type QuotaMode = 'LIMITED' | 'UNLIMITED' | 'UNKNOWN';

export interface ProviderInfo {
  provider: LLMProviderType;
  name: string;
  isLocal: boolean;
  defaultModel: string;
}

export interface ModelPricing {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  currency: 'USD';
  pricingSource: string;
  pricingVersion: string;
}

export interface ModelMetadata {
  provider: LLMProviderType;
  modelId: string;
  displayName: string;
  enabled: boolean;
  capabilities: ModelCapability[];
  contextLimit: number;
  maxOutputTokens: number;
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  reasoning: boolean;
  coding: boolean;
  vision: boolean;
  fast: boolean;
  local: boolean;
  private: boolean;
  billingMode: BillingMode;
  quotaMode: QuotaMode;
  pricing: ModelPricing;
  discoveryState: 'DISCOVERED' | 'CONFIGURED' | 'ENABLED' | 'DISABLED' | 'UNKNOWN';
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMBudgetPolicy {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxTotalTokens?: number;
}

export interface LLMFallbackPolicy {
  allowedFallbacks?: LLMProviderType[];
  maxAttempts?: number;
  deadlineMs?: number;
}

export interface LLMRequest {
  requestId: string;
  taskType: string;
  messages: LLMMessage[];
  systemInstruction?: string;
  context?: string;
  requiredCapabilities?: ModelCapability[];
  privacyClass: PrivacyClass;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  maxOutputTokens?: number;
  temperature?: number;
  stream?: boolean;
  preferredProvider?: LLMProviderType;
  preferredModel?: string;
  budgetPolicy?: LLMBudgetPolicy;
  fallbackPolicy?: LLMFallbackPolicy;
  tools?: LLMToolDefinition[];
  metadata?: Record<string, unknown>;
}

export interface LLMTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  thinkingTokens?: number;
  estimatedCostUsd: number;
}

export interface LLMResponse {
  requestId: string;
  provider: LLMProviderType;
  model: string;
  content: string;
  structuredOutput?: Record<string, unknown>;
  toolCalls?: LLMToolCall[];
  usage: LLMTokenUsage;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'unknown';
  fallbackUsed: boolean;
  visitedProviders: string[];
  routingReason?: string;
  metadata?: Record<string, unknown>;
}

export interface FallbackTarget {
  provider: LLMProviderType;
  model: string;
  trigger: string;
}

export interface RoutingDecision {
  selectedProvider: LLMProviderType;
  selectedModel: string;
  fallbackChain: FallbackTarget[];
  routingReason: string;
  estimatedCostUsd: number;
}

export interface ProviderQuotaStatus {
  requestsPerMinuteLimit?: number;
  requestsRemaining?: number;
  tokensPerMinuteLimit?: number;
  tokensRemaining?: number;
  resetAt?: string;
  source: 'provider' | 'response_header' | 'configuration' | 'inferred' | 'unknown';
}

export interface ProviderHealthStatus {
  provider: LLMProviderType;
  state: ProviderHealthState;
  latencyMs: number;
  message?: string;
  quota?: ProviderQuotaStatus;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
  cooldownUntil?: string;
}

export interface ProviderUsageStats {
  provider: LLMProviderType;
  model?: string;
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  averageLatencyMs: number;
  lastUsedAt?: string;
  lastError?: string;
}

// ==========================================================
// Phase 3: Agent Runtime & Task Orchestration Canonical Types
// ==========================================================

export type TaskState =
  | 'CREATED'
  | 'QUEUED'
  | 'PLANNING'
  | 'READY'
  | 'ASSIGNED'
  | 'RUNNING'
  | 'PAUSED'
  | 'WAITING_DEPENDENCY'
  | 'WAITING_APPROVAL'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'BLOCKED';

export type AgentRuntimeStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'IDLE'
  | 'RESERVED'
  | 'PLANNING'
  | 'WORKING'
  | 'WAITING'
  | 'WAITING_APPROVAL'
  | 'PAUSED'
  | 'ERROR'
  | 'COMPLETED'
  | 'DRAINING';

export type AgentAvailabilityStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'OFFLINE'
  | 'DRAINING'
  | 'ERROR';

export type AgentLifecycleState =
  | 'CREATED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DRAINING'
  | 'DISABLED';

export type TaskType =
  | 'ANALYSIS'
  | 'PLANNING'
  | 'RESEARCH'
  | 'DOCUMENTATION'
  | 'CLASSIFICATION'
  | 'REVIEW'
  | 'CODING'
  | 'TESTING'
  | 'SECURITY';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type DependencyFailurePolicy = 'BLOCK' | 'SKIP' | 'RETRY_DEPENDENCY' | 'ESCALATE';

export type SchedulerMode = 'IMMEDIATE' | 'SCHEDULED' | 'DEPENDENCY' | 'EVENT_TRIGGERED';

export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export type AgentSkill =
  | 'coding'
  | 'testing'
  | 'debugging'
  | 'research'
  | 'documentation'
  | 'architecture'
  | 'security'
  | 'review'
  | 'planning'
  | 'decomposition'
  | 'analysis'
  | 'code-analysis'
  | 'bug-fixing'
  | 'feature-development'
  | 'refactoring'
  | 'security-review'
  | 'code-review'
  | 'database-migration-review';

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  required: boolean;
  failurePolicy: DependencyFailurePolicy;
}

export interface TaskResult {
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  summary: string;
  outputs?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
  executionId: string;
  nextAction?: string;
}

export interface ExecutionRecord {
  executionId: string;
  taskId: string;
  attempt: number;
  agentId: string;
  model?: string;
  provider?: LLMProviderType;
  status: ExecutionStatus;
  startedAt: string;
  endedAt?: string;
  result?: TaskResult;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
}

export interface AgentSession {
  sessionId: string;
  agentId: string;
  taskId: string;
  projectId?: string;
  startedAt: string;
  endedAt?: string;
  status: ExecutionStatus;
  model?: string;
  provider?: LLMProviderType;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  estimatedCostUsd?: number;
  executionId: string;
}

export interface AgentDefinition {
  agentId: string;
  name: string;
  role: AgentRole;
  department: string;
  grade: SalaryGrade;
  status: AgentRuntimeStatus;
  availability: AgentAvailabilityStatus;
  lifecycle: AgentLifecycleState;
  skills: AgentSkill[];
  capabilities: ModelCapability[];
  tools: string[];
  permissions: string[];
  currentTaskId?: string;
  currentProjectId?: string;
  currentActivity?: string;
  modelPolicy?: {
    preferredProvider?: LLMProviderType;
    preferredModel?: string;
    maxCostPerTaskUsd?: number;
  };
  concurrencyLimit: number;
  currentRunningTasks: number;
  costCenter: string;
  room: string;
  baseSalary: number;
}

export interface CanonicalTask {
  taskId: string;
  projectId?: string;
  title: string;
  description: string;
  taskType: TaskType;
  priority: TaskPriority;
  riskLevel: RiskLevel;
  status: TaskState;
  requestedBy: string;
  assignedAgent?: string;
  requiredSkills: AgentSkill[];
  requiredCapabilities: ModelCapability[];
  dependencies: TaskDependency[];
  deadline?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  result?: TaskResult;
  failureReason?: string;
  approvalRequired: boolean;
  executionId?: string;
  context?: string;
  privacyClass?: PrivacyClass;
}

export interface AgentAssignmentResult {
  selectedAgent?: AgentDefinition;
  assignmentReason: string;
  rejectedAgents: Array<{ agentId: string; reason: string }>;
}

export interface WorkerHeartbeat {
  workerId: string;
  agentId?: string;
  currentTaskId?: string;
  lastSeen: string;
  status: 'ACTIVE' | 'IDLE' | 'STALE' | 'DEAD';
}

export interface RuntimeStatusSummary {
  activeWorkers: number;
  activeTasks: number;
  queuedTasks: number;
  dlqTasks: number;
  totalAgents: number;
  availableAgents: number;
  systemResourcePressure: {
    cpuUsagePercent: number;
    ramUsagePercent: number;
    isThrottled: boolean;
  };
}

// ==========================================================
// Phase 4: MetaGPT + Antigravity Engineering Integration Types
// ==========================================================

export type EngineeringProviderType =
  | 'antigravity'
  | 'antigravity-sdk'
  | 'antigravity-cli'
  | 'opencode'
  | 'mock';

export type EngineeringExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'IMPLEMENTED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'FAILED_VERIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'WAITING_APPROVAL';

export type EngineeringPhase =
  | 'UNDERSTAND'
  | 'INSPECT'
  | 'PLAN'
  | 'IMPLEMENT'
  | 'TEST'
  | 'VERIFY'
  | 'REPORT';

export type CommandCategory = 'READ_ONLY' | 'NORMAL_ENGINEERING' | 'HIGH_RISK';

export type CommandPermissionAction = 'ALLOW' | 'HUMAN_APPROVAL_REQUIRED' | 'DENY';

export interface CommandPolicyDecision {
  command: string;
  category: CommandCategory;
  action: CommandPermissionAction;
  reason?: string;
}

export interface EngineeringProviderHealth {
  provider: EngineeringProviderType;
  mode: 'sdk' | 'cli' | 'hybrid' | 'mock' | 'unavailable';
  status: 'AVAILABLE' | 'DEGRADED' | 'AUTH_REQUIRED' | 'AUTH_INVALID' | 'AUTH_EXPIRED' | 'UNAVAILABLE';
  latencyMs: number;
  message?: string;
  capabilities: string[];
  authenticated: boolean;
  cliAvailable: boolean;
  sdkAvailable: boolean;
  activeSessions: number;
}

export interface EngineeringSession {
  sessionId: string;
  taskId: string;
  executionId: string;
  agentId: string;
  provider: EngineeringProviderType;
  repository: string;
  branch: string;
  workspacePath: string;
  status: EngineeringExecutionStatus;
  startedAt: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEngineeringSessionRequest {
  taskId: string;
  executionId: string;
  agentId: string;
  repository: string;
  branch?: string;
  workspacePath?: string;
  provider?: EngineeringProviderType;
  metadata?: Record<string, unknown>;
}

export interface EngineeringExecutionContext {
  executionId: string;
  taskId: string;
  projectId: string;
  agentId: string;
  agentRole: AgentRole | string;
  repository: string;
  branch: string;
  workspace: string;
  goal: string;
  requirements: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  allowedPaths: string[];
  forbiddenPaths: string[];
  environment: Record<string, string>;
  securityPolicy: {
    allowWrite: boolean;
    allowTestExecution: boolean;
    requireApprovalForHighRisk: boolean;
    protectedBranches: string[];
  };
  relevantMemory?: string[];
}

export interface HumanGoalRequest {
  goal: string;
  projectId?: string;
  repository?: string;
  priority?: TaskPriority;
  riskTolerance?: RiskLevel;
}

export interface EngineeringTask {
  taskId: string;
  title: string;
  description: string;
  type: TaskType;
  agentRole: AgentRole | string;
  repository: string;
  workspace?: string;
  dependencies: string[];
  acceptanceCriteria: string[];
  allowedPaths: string[];
  forbiddenPaths: string[];
  riskLevel: RiskLevel;
  requiresHumanApproval: boolean;
  priority?: TaskPriority;
  context?: string;
}

export interface EngineeringPlan {
  planId: string;
  projectId: string;
  goal: string;
  requirements: string[];
  architectureNotes: string[];
  tasks: EngineeringTask[];
  dependencies: TaskDependency[];
  acceptanceCriteria: string[];
  risks: string[];
  assumptions: string[];
  recommendedAgent: string;
  priority: TaskPriority;
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'COMPLEX';
}

export interface VerificationEvidenceItem {
  type: 'TEST' | 'LINT' | 'TYPECHECK' | 'BUILD' | 'CRITERIA' | 'DIFF';
  command?: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  outputSnippet?: string;
  timestamp: string;
}

export interface EngineeringResult {
  executionId: string;
  status: EngineeringExecutionStatus;
  summary: string;
  filesChanged: string[];
  filesCreated: string[];
  filesDeleted: string[];
  diffSummary: string;
  testsRun: string[];
  testsPassed: string[];
  testsFailed: string[];
  buildStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
  lintStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
  typecheckStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
  securityFindings: string[];
  warnings: string[];
  blockers: string[];
  commitHash?: string;
  verificationEvidence: VerificationEvidenceItem[];
}

export type EngineeringEventType =
  | 'engineering.started'
  | 'engineering.session.created'
  | 'engineering.plan.started'
  | 'engineering.tool.started'
  | 'engineering.tool.completed'
  | 'engineering.file.changed'
  | 'engineering.test.started'
  | 'engineering.test.completed'
  | 'engineering.build.started'
  | 'engineering.build.completed'
  | 'engineering.permission.requested'
  | 'engineering.approval.required'
  | 'engineering.error'
  | 'engineering.completed'
  | 'engineering.failed'
  | 'engineering.canceled';

export interface EngineeringEvent {
  eventId: string;
  sessionId: string;
  executionId: string;
  taskId: string;
  agentId: string;
  type: EngineeringEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface EngineeringApprovalRequest {
  approvalId: string;
  executionId: string;
  taskId: string;
  agentId: string;
  command: string;
  riskLevel: RiskLevel;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface EngineeringUsage {
  durationMs: number;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  toolCallsCount: number;
}

export interface EngineeringSkillDefinition {
  skillId: string;
  name: string;
  description: string;
  purpose: string;
  whenToUse: string;
  workflow: string[];
  constraints: string[];
  validation: string[];
  outputFormat: string;
}

// ==========================================================
// Phase 5: Neo4j Graph Memory & GraphRAG Domain Types
// ==========================================================

export type GraphNodeType =
  | 'Person'
  | 'Agent'
  | 'Department'
  | 'Project'
  | 'Task'
  | 'Execution'
  | 'Repository'
  | 'Branch'
  | 'Workspace'
  | 'File'
  | 'Commit'
  | 'TestRun'
  | 'Artifact'
  | 'Decision'
  | 'Requirement'
  | 'Architecture'
  | 'Technology'
  | 'Skill'
  | 'Tool'
  | 'Provider'
  | 'Model'
  | 'Document'
  | 'Memory'
  | 'Issue'
  | 'Incident'
  | 'Policy'
  | 'Approval'
  | 'Event';

export type GraphRelationshipType =
  | 'OWNS'
  | 'HAS_TASK'
  | 'DEPENDS_ON'
  | 'ASSIGNED_TO'
  | 'EXECUTED'
  | 'HAS_SKILL'
  | 'FOR_TASK'
  | 'WORKED_ON'
  | 'USED_MODEL'
  | 'USED_PROVIDER'
  | 'USED_TOOL'
  | 'USED_WORKSPACE'
  | 'FOR_REPOSITORY'
  | 'HAS_BRANCH'
  | 'CONTAINS_COMMIT'
  | 'CHANGED'
  | 'PRODUCED'
  | 'PRODUCED_TEST'
  | 'USES'
  | 'IMPLEMENTS'
  | 'HAS_DECISION'
  | 'AFFECTS'
  | 'SUPERSEDED_BY'
  | 'RELATES_TO'
  | 'GENERATED'
  | 'ABOUT'
  | 'COLLABORATED_WITH'
  | 'CAUSED_BY'
  | 'RESOLVED_BY'
  | 'VERIFIED_BY'
  | 'HAS_EXPERIENCE_WITH'
  | 'SOLVED'
  | 'SUCCEEDED_ON';

export interface GraphNode {
  id: string;
  entityType: GraphNodeType;
  sourceSystem: string;
  sourceId: string;
  properties: Record<string, unknown>;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface GraphRelationship {
  id: string;
  type: GraphRelationshipType;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SubgraphResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export type MemoryScope = 'WORKING' | 'PROJECT' | 'ORGANIZATIONAL';
export type MemoryRetention = 'EPHEMERAL' | 'TASK' | 'PROJECT' | 'ORGANIZATIONAL' | 'HISTORICAL';
export type MemoryConfidence = 'VERIFIED' | 'SUPPORTED' | 'INFERRED' | 'UNVERIFIED' | 'STALE';
export type MemoryVisibility = 'PUBLIC' | 'INTERNAL' | 'PRIVATE' | 'CONFIDENTIAL';
export type MemoryLifecycleStatus = 'ACTIVE' | 'VERIFIED' | 'SUPERSEDED' | 'ARCHIVED' | 'INVALIDATED';

export interface MemoryProvenance {
  sourceType: string;
  sourceId: string;
  sourceTimestamp?: string;
  createdBy: string;
  lastVerifiedAt?: string;
}

export interface GraphMemoryItem {
  id: string;
  scope: MemoryScope;
  title: string;
  content: string;
  retention: MemoryRetention;
  confidence: MemoryConfidence;
  visibility: MemoryVisibility;
  lifecycle: MemoryLifecycleStatus;
  provenance: MemoryProvenance;
  validFrom?: string;
  validUntil?: string;
  embedding?: number[];
  tags: string[];
  projectId?: string;
  taskId?: string;
  agentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionNode {
  decisionId: string;
  projectId: string;
  title: string;
  context: string;
  decision: string;
  reason: string;
  alternatives: string[];
  status: 'PROPOSED' | 'ACCEPTED' | 'SUPERSEDED' | 'REJECTED';
  supersededBy?: string;
  confidence: MemoryConfidence;
  visibility: MemoryVisibility;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface FailurePatternNode {
  incidentId: string;
  projectId: string;
  title: string;
  rootCause: string;
  resolution: string;
  verifiedByTestRun?: string;
  recurrenceCount: number;
  createdAt: string;
}

export interface GraphRetrievalQuery {
  startNodeId?: string;
  maxHops?: number;
  relationshipTypes?: GraphRelationshipType[];
  targetEntityTypes?: GraphNodeType[];
  projectId?: string;
  taskId?: string;
  visibilityLevel?: MemoryVisibility;
  limit?: number;
}

export interface SemanticRetrievalQuery {
  query: string;
  queryVector?: number[];
  entityTypes?: GraphNodeType[];
  projectId?: string;
  topK?: number;
  minScore?: number;
  visibilityLevel?: MemoryVisibility;
}

export interface HybridRetrievalQuery {
  query: string;
  startNodeId?: string;
  maxHops?: number;
  entityTypes?: GraphNodeType[];
  projectId?: string;
  taskId?: string;
  topK?: number;
  alpha?: number; // 0 = full graph, 1 = full semantic, default 0.5
  visibilityLevel?: MemoryVisibility;
}

export interface HybridRetrievalResult {
  node: GraphNode;
  score: number;
  graphScore: number;
  semanticScore: number;
  path?: string[];
}

export interface GraphContextItem {
  id: string;
  sourceNodeId: string;
  sourceLabel: GraphNodeType;
  sourceType: string;
  title: string;
  content: string;
  confidence: MemoryConfidence;
  provenance: MemoryProvenance;
  score: number;
  visibility: MemoryVisibility;
}

export interface GraphContext {
  query: string;
  tokenBudget: number;
  estimatedTokens: number;
  entities: GraphNode[];
  relationships: GraphRelationship[];
  facts: string[];
  decisions: DecisionNode[];
  codeContext: string[];
  executionHistory: string[];
  citations: string[];
  warnings: string[];
  formattedContext: string;
}

export interface GraphRAGQuery {
  query: string;
  projectId?: string;
  taskId?: string;
  requestedBy?: string;
  userRole?: string;
  maxHops?: number;
  topK?: number;
  tokenBudget?: number;
  includeCodeContext?: boolean;
}

export interface GraphRAGSource {
  id: string;
  type: string;
  title: string;
  confidence: MemoryConfidence;
  snippet?: string;
}

export interface GraphRAGResult {
  query: string;
  answer: string;
  supportStatus: 'SUPPORTED' | 'INFERRED' | 'INSUFFICIENT_CONTEXT';
  sources: GraphRAGSource[];
  contextUsed: GraphContext;
  durationMs: number;
}

export interface GraphStats {
  totalNodes: number;
  totalRelationships: number;
  nodesByLabel: Record<string, number>;
  memoryCount: number;
  decisionCount: number;
  vectorIndexStatus: string;
  isConnected: boolean;
}


