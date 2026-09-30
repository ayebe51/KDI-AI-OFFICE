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

// ==========================================================
// Phase 6: Living Virtual Office & 3D Digital Twin Canonical Types
// ==========================================================

export type OfficeActivityState =
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
  | 'WAITING_APPROVAL'
  | 'ERROR'
  | 'COMPLETED';

export type OfficeRoomType =
  | 'RECEPTION'
  | 'MANAGEMENT'
  | 'PM'
  | 'ARCHITECTURE'
  | 'ENGINEERING'
  | 'QA'
  | 'SECURITY'
  | 'RESEARCH'
  | 'MEETING'
  | 'PANTRY'
  | 'BREAK'
  | 'MUSHOLLA'
  | 'SERVER'
  | 'PORTFOLIO';

export interface OfficeRoom {
  roomId: string;
  name: string;
  type: OfficeRoomType;
  position: [number, number, number];
  size: [number, number, number];
  capacity: number;
  department?: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  interactive: boolean;
  description?: string;
  color?: string;
}

export interface AgentOfficeEvent {
  eventId: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  departmentId: string;
  projectId?: string;
  taskId?: string;
  executionId?: string;
  runtimeState: string;
  activityState: OfficeActivityState;
  previousActivity?: OfficeActivityState;
  currentLocation: string;
  targetLocation?: string;
  activityStartedAt: string;
  metadata: Record<string, unknown>;
  visibility: 'PUBLIC' | 'INTERNAL';
  entityVersion: number;
}

export interface OfficeMeeting {
  meetingId: string;
  title: string;
  projectId: string;
  taskIds: string[];
  participants: string[];
  agenda: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CONCLUDED';
  startedAt?: string;
  endedAt?: string;
  decisions: string[];
  whiteboardData?: {
    diagramType?: 'ARCHITECTURE' | 'DATABASE' | 'WORKFLOW' | 'DECOMPOSITION';
    title: string;
    sections: { heading: string; points: string[] }[];
    activeDecisions?: string[];
  };
  visibility: 'PUBLIC' | 'INTERNAL';
}

export interface ServerNode {
  serviceId: string;
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'ERROR';
  health: 'UP' | 'DOWN' | 'DEGRADED';
  latency: number;
  load: number;
  lastChecked: string;
  subsystem: string;
  version?: string;
  details?: Record<string, unknown>;
}

export interface OfficePrayerSession {
  prayerName: 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';
  status: 'CALL_TO_PRAYER' | 'PRAYING' | 'CONCLUDED';
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  participants: string[];
}

export interface OfficeProjectItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  activeAgents: number;
  currentTasks: number;
  techStack: string[];
  year?: string;
  featured?: boolean;
  visibility: 'PUBLIC' | 'INTERNAL';
}

export interface OfficeAgentDetail {
  agentId: string;
  name: string;
  role: AgentRole;
  department: string;
  grade: SalaryGrade;
  room: string;
  currentLocation: string;
  targetLocation?: string;
  currentState: AgentState;
  runtimeStatus: string;
  activityState: OfficeActivityState;
  currentTaskId?: string;
  currentProjectId?: string;
  currentActivity: string;
  position: [number, number, number];
  rotation: [number, number, number];
  entityVersion: number;
  lastUpdated: string;
  isPublicSafe: boolean;
  model?: string;
  provider?: string;
  costUsd?: number;
  completedTasksCount?: number;
}

export interface OfficeSnapshot {
  timestamp: string;
  officeTime: string;
  agents: OfficeAgentDetail[];
  rooms: OfficeRoom[];
  projects: OfficeProjectItem[];
  meetings: OfficeMeeting[];
  serverNodes: ServerNode[];
  activePrayer?: OfficePrayerSession | null;
  systemAlert?: string | null;
}

export interface OfficeCameraPreset {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface OfficeWaypoint {
  id: string;
  position: [number, number, number];
  connectedTo: string[];
  room?: string;
}

// ==========================================================
// Phase 7: Portfolio & Public Showcase Domain Types
// ==========================================================

export type ProjectType =
  | 'WEB_APP'
  | 'MOBILE_APP'
  | 'SAAS'
  | 'AI_SYSTEM'
  | 'AUTOMATION'
  | 'INTERNAL_SYSTEM'
  | 'WEBSITE'
  | 'UI_UX'
  | 'GRAPHIC_DESIGN'
  | 'RESEARCH'
  | 'EXPERIMENTAL';

export type ProjectStatus =
  | 'CONCEPT'
  | 'PROTOTYPE'
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION'
  | 'MAINTENANCE'
  | 'ARCHIVED';

export type ProjectVisibility =
  | 'PUBLIC'
  | 'PRIVATE'
  | 'INTERNAL'
  | 'CONFIDENTIAL';

export type ProjectPublishStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type MediaType =
  | 'IMAGE'
  | 'VIDEO'
  | 'SCREENSHOT'
  | 'ARCHITECTURE_DIAGRAM'
  | 'DOCUMENT';

export interface ProjectMedia {
  mediaId: string;
  projectId: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  altText: string;
  caption?: string;
  sortOrder: number;
  visibility: ProjectVisibility;
}

export interface ProjectFeature {
  featureId: string;
  projectId: string;
  name: string;
  description: string;
  status: string;
  isPublic: boolean;
  sortOrder: number;
}

export interface ProjectTimelineMilestone {
  milestoneId: string;
  name: string;
  phase: string;
  date?: string;
  description?: string;
  completed: boolean;
}

export interface ProjectTeamMember {
  memberId: string;
  name: string;
  role: string;
  department?: string;
  isAi: boolean;
  agentId?: string; // Internal agent ID - stripped from public views
  responsibilities: string[];
}

export interface ProjectArchitectureComponent {
  componentId: string;
  layer: 'FRONTEND' | 'BACKEND' | 'DATABASE' | 'CACHE' | 'API' | 'AI' | 'INFRASTRUCTURE';
  name: string;
  technology: string;
  description: string;
}

export interface ProjectArchitecture {
  overview: string;
  components: ProjectArchitectureComponent[];
  diagramUrl?: string;
  dataFlow?: string[];
}

export interface CaseStudy {
  context: string;
  problem: string;
  constraints: string[];
  approach: string;
  architecture: string;
  implementation: string;
  testing: string;
  deployment: string;
  lessonsLearned: string[];
  futureImprovements: string[];
}

export interface AiContribution {
  humanContribution: string;
  aiContribution: string;
  engineeringAgents: string[];
  planningContribution?: string;
  testingContribution?: string;
  automationContribution?: string;
}

export interface ResultMetric {
  metricId: string;
  label: string;
  value: string;
  unit?: string;
  verified: boolean;
}

/**
 * Canonical Project Domain Model (Internal source of truth in PostgreSQL)
 */
export interface Project {
  projectId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  projectType: ProjectType;
  status: ProjectStatus;
  publishStatus: ProjectPublishStatus;
  year: string;
  clientType: string;
  problem: string;
  solution: string;
  role: string;
  technologies: string[];
  features: ProjectFeature[];
  aiContribution: AiContribution;
  screenshots: string[];
  videos: string[];
  media: ProjectMedia[];
  demoUrl?: string;
  repositoryUrl?: string;
  isRepositoryPublic: boolean;
  caseStudyUrl?: string;
  caseStudy?: CaseStudy;
  architecture?: ProjectArchitecture;
  timeline: ProjectTimelineMilestone[];
  team: ProjectTeamMember[];
  results: ResultMetric[];
  featured: boolean;
  visibility: ProjectVisibility;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;

  // Strict Internal/Private Data (NEVER LEAK TO PUBLIC DTO)
  internalNotes?: string;
  totalCostUsd?: number;
  totalTokensUsed?: number;
  privateRepoUrl?: string;
  activeTaskCount?: number;
}

/**
 * Public Project DTO (Sanitized projection for external visitors)
 */
export interface PublicProject {
  projectId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  projectType: ProjectType;
  status: string; // Sanitized public status label
  year: string;
  clientType: string;
  problem: string;
  solution: string;
  role: string;
  technologies: string[];
  features: Array<Omit<ProjectFeature, 'isPublic'>>;
  aiContribution: AiContribution;
  screenshots: string[];
  videos: string[];
  media: Array<Omit<ProjectMedia, 'visibility'>>;
  demoUrl?: string;
  repositoryUrl?: string; // Only present if isRepositoryPublic is true
  isRepositoryPublic: boolean;
  caseStudyUrl?: string;
  caseStudy?: CaseStudy;
  architecture?: ProjectArchitecture;
  timeline: ProjectTimelineMilestone[];
  team: Array<Omit<ProjectTeamMember, 'agentId'>>;
  results: ResultMetric[];
  featured: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  slug?: string;
  shortDescription: string;
  description: string;
  category: string;
  projectType: ProjectType;
  status?: ProjectStatus;
  year?: string;
  clientType?: string;
  problem?: string;
  solution?: string;
  role?: string;
  technologies?: string[];
  features?: ProjectFeature[];
  aiContribution?: AiContribution;
  screenshots?: string[];
  videos?: string[];
  media?: ProjectMedia[];
  demoUrl?: string;
  repositoryUrl?: string;
  isRepositoryPublic?: boolean;
  caseStudy?: CaseStudy;
  architecture?: ProjectArchitecture;
  timeline?: ProjectTimelineMilestone[];
  team?: ProjectTeamMember[];
  results?: ResultMetric[];
  featured?: boolean;
  visibility?: ProjectVisibility;
  sortOrder?: number;
  internalNotes?: string;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  publishStatus?: ProjectPublishStatus;
}

export interface PortfolioFilterQuery {
  category?: string;
  projectType?: ProjectType;
  technology?: string;
  year?: string;
  status?: string;
  featured?: boolean;
  search?: string;
}

// ==========================================================
// Phase 8: AI Workforce, Market Salary Benchmark & Workload Valuation
// ==========================================================

export type ReliabilityTier =
  | 'TIER_A' // Official / government / statistical data (BPS, Kemnaker)
  | 'TIER_B' // Recognized salary surveys / recruitment reports (Michael Page, Mercer, Glints)
  | 'TIER_C' // Major job portals with salary disclosures (Jobstreet, Indeed, LinkedIn)
  | 'TIER_D' // Aggregated job postings / secondary sources
  | 'TIER_E'; // Model estimated / heuristic (MUST be explicitly marked ESTIMATED)

export type ExperienceLevel =
  | 'INTERN'
  | 'ENTRY'
  | 'JUNIOR'
  | 'MID'
  | 'SENIOR'
  | 'LEAD'
  | 'PRINCIPAL'
  | 'MANAGER'
  | 'DIRECTOR';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'REMOTE';

export type BenchmarkConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type ReviewStatus =
  | 'AI_SUGGESTED'
  | 'HUMAN_REVIEWED'
  | 'VERIFIED'
  | 'REJECTED';

/**
 * Verified Real-World Salary Benchmark Source Registry
 */
export interface SalaryBenchmarkSource {
  sourceId: string;
  name: string;
  provider: string;
  url: string;
  country: string;
  region: string; // e.g. "Central Java", "National Remote", "Jakarta"
  dataType: string; // e.g. "Salary Survey", "Job Board Disclosures", "Statistical Report"
  publicationDate: string;
  retrievalDate: string;
  effectivePeriod: string; // e.g. "2026"
  methodology: string;
  reliabilityTier: ReliabilityTier;
  notes?: string;
}

/**
 * Normalized Market Role definition
 */
export interface MarketRole {
  marketRoleId: string;
  canonicalTitle: string;
  category: string;
  description: string;
  alternateTitles: string[];
  typicalSkills: string[];
  typicalTools: string[];
  normalizedKdiLevel: ExperienceLevel;
  standardFteHoursPerWeek: number;
}

/**
 * Real-World Market Salary Benchmark for a Role
 */
export interface SalaryBenchmark {
  benchmarkId: string;
  marketRoleId: string;
  marketRoleTitle: string;
  location: string; // e.g. "Central Java (Cilacap/Purwokerto)", "National Remote Indonesia"
  country: string;
  region?: string;
  currency: 'IDR' | 'USD';
  salaryMin: number; // Monthly in specified currency
  salaryMax: number;
  salaryMedian: number;
  experienceLevel: ExperienceLevel;
  employmentType: EmploymentType;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceTier: ReliabilityTier;
  publicationDate: string;
  retrievalDate: string;
  effectivePeriod: string;
  isCurrent: boolean;
  isStale: boolean;
  confidence: BenchmarkConfidence;
  notes?: string;
  version: number;
}

/**
 * Point-in-time Frozen Snapshot of a Salary Benchmark
 */
export interface SalaryBenchmarkSnapshot {
  snapshotId: string;
  benchmarkId: string;
  marketRoleId: string;
  location: string;
  effectivePeriod: string;
  salaryMin: number;
  salaryMedian: number;
  salaryMax: number;
  sourceId: string;
  retrievedAt: string;
  methodology: string;
  confidence: BenchmarkConfidence;
}

/**
 * Workload Responsibility performed by a human
 */
export interface Responsibility {
  responsibilityId: string;
  title: string;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  estimatedHoursPerWeek: number;
  skills: string[];
  tools: string[];
  outputs: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  department: string;
  evidence: string[]; // Documented tasks, git commits, recurring duties
}

/**
 * Mapping between a human responsibility and a normalized market role
 */
export interface WorkloadRoleMapping {
  mappingId: string;
  responsibilityId: string;
  marketRoleId: string;
  marketRoleTitle: string;
  matchConfidence: BenchmarkConfidence;
  matchReason: string[];
  reviewStatus: ReviewStatus;
  allocationPercentage: number; // e.g. 100%, 50%, 40%
  overlapFactor: number; // e.g. 0.2 (20% overlap reduction to prevent double counting)
  reviewedBy?: string;
  reviewedAt?: string;
}

/**
 * Actual Human Compensation Breakdown (Confidential Simulation Input)
 */
export interface ActualCompensation {
  baseSalary: number;
  allowances: number;
  bonuses: number;
  other: number;
  totalMonthly: number;
  currency: 'IDR' | 'USD';
}

/**
 * Valuation summary for an equivalent market role
 */
export interface EquivalentRoleValuation {
  marketRoleId: string;
  marketRoleTitle: string;
  allocationPercentage: number;
  equivalentFte: number; // e.g. 0.5 FTE
  benchmark: SalaryBenchmark;
  illustrativeValueMin: number;
  illustrativeValueMedian: number;
  illustrativeValueMax: number;
}

/**
 * Workload Mirror Profile (ONE Human -> Multiple Roles & Valuation)
 */
export interface WorkloadProfile {
  profileId: string;
  personIdentifier: string; // Pseudonymized or ID (e.g. "EMP-LEAD-01")
  title: string;
  department: string;
  location: string;
  actualCompensation: ActualCompensation;
  responsibilities: Responsibility[];
  mappings: WorkloadRoleMapping[];
  equivalentRoles: EquivalentRoleValuation[];
  totalEquivalentFte: number; // Sum of equivalent FTEs
  illustrativeWorkforceValue: {
    monthlyMin: number;
    monthlyMedian: number;
    monthlyMax: number;
    annualizedMedian: number;
    currency: 'IDR' | 'USD';
  };
  illustrativeGap: {
    monthlyMin: number;
    monthlyMedian: number;
    monthlyMax: number;
    annualizedMedian: number;
  };
  disclaimer: string;
  updatedAt: string;
}

/**
 * Virtual Employee Compensation & Operating Cost Model
 */
export interface VirtualEmployeeCompensation {
  baseVirtualSalary: number;
  allowance: number;
  performanceIncentive: number;
  totalMonthly: number;
  currency: 'IDR' | 'USD';
}

export interface VirtualEmployeeOperatingCost {
  llmCostUsd: number;
  toolCostUsd: number;
  infrastructureCostUsd: number;
  totalMonthlyUsd: number;
  totalMonthlyIdr: number;
}

export interface VirtualEmployee {
  agentId: string;
  name: string;
  role: AgentRole;
  internalRoleTitle: string;
  department: string;
  grade: SalaryGrade;
  skills: string[];
  tools: string[];
  activeProjects: string[];
  virtualCompensation: VirtualEmployeeCompensation;
  operatingCost: VirtualEmployeeOperatingCost;
  totalCostMonthlyIdr: number; // Virtual Comp + Operating Cost in IDR
  tasksCompletedCount: number;
  verifiedTasksCount: number;
}

/**
 * Dynamic What-If Simulation Scenario
 */
export interface WorkforceValuationScenario {
  scenarioId: string;
  name: string;
  profileId: string;
  adjustedResponsibilities: Responsibility[];
  adjustedMappings: WorkloadRoleMapping[];
  projectedFte: number;
  projectedValueMedian: number;
  projectedGapMedian: number;
  comparisonBaselineDiff: number;
  createdAt: string;
}

/**
 * Audit record for workforce or benchmark modifications
 */
export interface WorkforceAuditRecord {
  auditId: string;
  timestamp: string;
  actor: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'OVERLAP_ADJUST';
  targetType: 'BENCHMARK' | 'MAPPING' | 'PROFILE' | 'COMPENSATION';
  targetId: string;
  oldValue?: string;
  newValue: string;
  justification?: string;
}

/**
 * Three-View Matrix Comparison
 */
export interface ThreeViewComparison {
  actualHumanCompensationMonthly: number;
  equivalentMarketBenchmarkMedianMonthly: number;
  illustrativeBenchmarkGapMonthly: number;
  aiVirtualCompensationMonthly: number;
  aiActualOperatingCostMonthly: number;
  totalAiCostMonthly: number;
  equivalentFte: number;
  currency: 'IDR' | 'USD';
}

// ==========================================================
// PHASE 9: AUTONOMOUS OFFICE OPERATIONS & HUMAN COMMAND CENTER
// ==========================================================

/**
 * Autonomy Level: Strict gradient of AI autonomous capability
 */
export type AutonomyLevel =
  | 0 // LEVEL 0 — OBSERVE (AI only reads/monitors)
  | 1 // LEVEL 1 — SUGGEST (AI creates recommendation)
  | 2 // LEVEL 2 — EXECUTE LOW RISK (AI executes whitelisted actions)
  | 3 // LEVEL 3 — APPROVAL REQUIRED (Action halts for human approval)
  | 4; // LEVEL 4 — HUMAN ONLY (Prohibited for AI)

export type ObjectiveStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'ARCHIVED';

export interface ObjectiveBudget {
  dailyBudgetUsd: number;
  weeklyBudgetUsd: number;
  monthlyBudgetUsd: number;
  currentSpendDailyUsd: number;
  currentSpendWeeklyUsd: number;
  currentSpendMonthlyUsd: number;
  enforcement: 'SOFT' | 'HARD';
}

/**
 * Office Objective: Higher-level strategic goal decomposing into tasks
 */
export interface OfficeObjective {
  objectiveId: string;
  title: string;
  description: string;
  owner: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: ObjectiveStatus;
  riskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  startAt?: string;
  deadline?: string;
  recurrence?: string;
  successCriteria: string[];
  constraints: string[];
  projects: string[];
  agents: AgentRole[];
  budget?: ObjectiveBudget;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export type RunbookActionType =
  | 'READ'
  | 'ANALYZE'
  | 'PLAN'
  | 'TEST'
  | 'EDIT'
  | 'NOTIFY'
  | 'REPORT'
  | 'APPROVE_GATE'
  | 'ESCALATE'
  | 'WAIT';

export interface AutonomyPolicy {
  policyId: string;
  action: RunbookActionType | string;
  riskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  allowedAgents: AgentRole[];
  allowedProjects: string[];
  allowedEnvironment: 'SANDBOX' | 'STAGING' | 'PRODUCTION';
  maxCost: number;
  maxDuration: number;
  approvalRequired: boolean;
}

export type TriggerType =
  | 'TIME'
  | 'EVENT'
  | 'CONDITION'
  | 'MANUAL'
  | 'DEPENDENCY'
  | 'THRESHOLD';

export interface RecurringJob {
  jobId: string;
  objectiveId?: string;
  runbookId?: string;
  name: string;
  schedule: string;
  timezone: string;
  enabled: boolean;
  nextRun: string;
  lastRun?: string;
  maxConcurrency: number;
  retryPolicy: { maxRetries: number; backoffMs: number };
  status: 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'FAILED';
}

export interface AutomationRule {
  ruleId: string;
  name: string;
  description: string;
  trigger: {
    type: TriggerType;
    config?: Record<string, any>;
  };
  condition?: {
    field: string;
    operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' | 'CONTAINS';
    value: any;
  };
  action: {
    type: RunbookActionType;
    target: string;
    params?: Record<string, any>;
  };
  runbookId?: string;
  autonomyLevel: AutonomyLevel;
  riskLevel: RiskLevel;
  enabled: boolean;
  cooldown: number; // Seconds
  maxRuns: number;
  runsCount: number;
  lastTriggeredAt?: string;
  causalTrackingId?: string;
}

export interface BudgetGuard {
  maxExecutions: number;
  maxDuration: number; // Milliseconds
  maxTokenUsage: number;
  maxEstimatedCost: number;
  maxToolCalls: number;
  currentExecutions: number;
  currentDuration: number;
  currentTokenUsage: number;
  currentEstimatedCost: number;
  currentToolCalls: number;
  status: 'NORMAL' | 'WARNED' | 'EXCEEDED';
}

export interface RunbookStep {
  stepId: string;
  name: string;
  type: RunbookActionType;
  action: string;
  riskLevel: RiskLevel;
  timeout: number;
  retryPolicy: { maxRetries: number; backoffMs: number };
  requiresApproval: boolean;
  successCondition: string;
  failureAction: 'ABORT' | 'RETRY' | 'ESCALATE' | 'CONTINUE';
  params?: Record<string, any>;
}

export interface Runbook {
  runbookId: string;
  title: string;
  description: string;
  category:
    | 'HEALTH_CHECK'
    | 'DIAGNOSTIC'
    | 'ENGINEERING'
    | 'MAINTENANCE'
    | 'SECURITY'
    | 'INCIDENT_RESPONSE';
  steps: RunbookStep[];
  targetRiskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  enabled: boolean;
  version: number;
}

export type CommandClassification =
  | 'QUERY'
  | 'ANALYSIS'
  | 'PLAN'
  | 'EXECUTION'
  | 'AUTOMATION'
  | 'APPROVAL'
  | 'EMERGENCY';

export interface ParsedCommand {
  commandId: string;
  rawInput: string;
  classification: CommandClassification;
  intent: string;
  extractedEntities: Record<string, any>;
  proposedPlan?: string[];
  requiresHumanConfirmation: boolean;
  executionStatus: 'PENDING_CONFIRMATION' | 'EXECUTING' | 'COMPLETED' | 'BLOCKED_BY_POLICY';
  responseMessage: string;
}

export interface DailyBriefing {
  briefingId: string;
  generatedAt: string;
  good: string[];
  attentionNeeded: string[];
  blocked: string[];
  upcoming: string[];
  completed: string[];
  cost: {
    dailySpendUsd: number;
    weeklySpendUsd: number;
    monthlySpendUsd: number;
    virtualCompensationIdr: number;
  };
  pendingApprovalsCount: number;
  activeIncidentsCount: number;
  activeObjectivesCount: number;
}

export interface WeeklyOperationsReport {
  reportId: string;
  week: string;
  generatedAt: string;
  objectives: { total: number; active: number; completed: number; blocked: number };
  tasks: { total: number; completed: number; failed: number; blocked: number };
  systemIncidents: { total: number; resolved: number; open: number };
  agentActivity: { activeAgents: number; totalExecutions: number; avgSuccessRate: number };
  aiCost: { llmCostUsd: number; infraCostUsd: number; toolCostUsd: number; totalCostIdr: number };
  importantDecisions: string[];
  nextActions: string[];
}

export interface MonthlyOperationsReport {
  reportId: string;
  month: string;
  generatedAt: string;
  aiWorkforce: { totalAgents: number; simulatedCompensationIdr: number; activeProjects: number };
  operatingCost: { llmUsd: number; toolUsd: number; infraUsd: number; totalIdr: number };
  workloadValuation: {
    equivalentFte: number;
    marketBenchmarkMedianIdr: number;
    actualCompensationIdr: number;
    illustrativeGapIdr: number;
  };
  systemHealth: { uptimePercentage: number; incidentCount: number; mttrMinutes: number };
  executionMetrics: { totalAutomations: number; successRate: number; humanInterventions: number };
}

export interface Recommendation {
  recommendationId: string;
  title: string;
  reason: string;
  evidence: { source: string; details: string; timestamp: string }[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk: RiskLevel;
  estimatedCost: number;
  recommendedAction: string;
  confidence: number;
  expiresAt: string;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
}

export type ApprovalScope = 'ONCE' | 'FOR_OBJECTIVE' | 'FOR_RUNBOOK' | 'TEMPORARY';

export interface PendingApproval {
  approvalId: string;
  action: string;
  reason: string;
  agentId: string;
  agentRole: AgentRole;
  projectId?: string;
  objectiveId?: string;
  runbookId?: string;
  risk: RiskLevel;
  expectedImpact: string;
  files: string[];
  commands: string[];
  estimatedCost: number;
  evidence: string[];
  expiresAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvedBy?: string;
  approvalScope?: ApprovalScope;
  createdAt: string;
  respondedAt?: string;
}

export type EscalationLevel = 'INFO' | 'ATTENTION' | 'ACTION_REQUIRED' | 'CRITICAL';

export type IncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'MITIGATING'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export interface Incident {
  incidentId: string;
  title: string;
  severity: RiskLevel;
  source: string;
  project?: string;
  status: IncidentStatus;
  startedAt: string;
  detectedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  resolution?: string;
  diagnostics: string[];
  mitigationActions: string[];
  memoryCandidateCreated: boolean;
}

export interface ProjectHealthSignals {
  projectId: string;
  projectName: string;
  openTasks: number;
  blockedTasks: number;
  failedExecutions: number;
  reworkCount: number;
  staleWorkCount: number;
  testFailures: number;
  securityFindings: number;
  deploymentStatus: 'HEALTHY' | 'STABLE' | 'DEGRADED' | 'FAILED';
  recentActivityTimestamp: string;
  status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
}

export interface AgentOperationalHealthSignals {
  agentId: string;
  agentRole: AgentRole;
  availability: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'UNAVAILABLE';
  executionSuccessRate: number;
  failureRate: number;
  stuckExecutions: number;
  averageDurationMs: number;
  currentWorkload: number;
  providerHealth: 'HEALTHY' | 'DEGRADED' | 'DOWN';
}

export interface AutonomyHealthMetrics {
  activeAutomations: number;
  successfulRuns: number;
  failedRuns: number;
  loopsPrevented: number;
  approvalWaits: number;
  budgetBlocks: number;
  escalations: number;
  globalPauseActive: boolean;
}

export interface NotificationPayload {
  notificationId: string;
  channel: 'WEB' | 'EMAIL' | 'MESSAGING' | 'PUSH';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  recipient: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
  deduplicationKey?: string;
}

export interface DecisionTrace {
  decisionId: string;
  objectiveId?: string;
  triggerId?: string;
  policyId?: string;
  agentId?: string;
  reason: string;
  evidence: string[];
  decision:
    | 'PERMITTED'
    | 'BLOCKED_POLICY'
    | 'WAITING_APPROVAL'
    | 'HUMAN_ONLY'
    | 'BUDGET_EXCEEDED'
    | 'LOOP_DETECTED';
  approval?: { approvedBy: string; timestamp: string; scope: string };
  timestamp: string;
}

export interface DryRunResult {
  dryRunId: string;
  triggered: boolean;
  proposedActions: {
    action: string;
    type: RunbookActionType;
    riskLevel: RiskLevel;
    params?: any;
  }[];
  risk: RiskLevel;
  estimatedCost: number;
  affectedSystems: string[];
  requiredApprovals: string[];
  executedMutations: false;
}

export interface SimulationResult {
  simulationId: string;
  workflowName: string;
  fixtureState: Record<string, any>;
  simulatedOutcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED_APPROVAL';
  stepsExecuted: {
    stepId: string;
    status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
    simulatedLatencyMs: number;
  }[];
  productionStateAffected: false;
  summary: string;
}






