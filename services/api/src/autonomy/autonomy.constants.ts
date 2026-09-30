// ==========================================================
// services/api/src/autonomy/autonomy.constants.ts
// Constants, Policies & Seed Definitions for Phase 9 Autonomy Engine
// ==========================================================

import type {
  AutonomyPolicy,
  Runbook,
  OfficeObjective,
  AutomationRule,
  PendingApproval,
  Incident,
  DecisionTrace,
  AgentOperationalHealthSignals,
  ProjectHealthSignals,
  Recommendation,
} from '@kdi/types';

/**
 * Standard Default Autonomy Policies enforcing safety boundaries
 */
export const DEFAULT_AUTONOMY_POLICIES: AutonomyPolicy[] = [
  {
    policyId: 'pol_read_telemetry',
    action: 'READ',
    riskLevel: 'LOW',
    autonomyLevel: 2, // Low risk allowed
    allowedAgents: ['AI_MANAGER', 'DEVOPS_ENGINEER', 'QA_ENGINEER', 'SOFTWARE_ENGINEER'],
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 1.0,
    maxDuration: 10_000,
    approvalRequired: false,
  },
  {
    policyId: 'pol_analyze_logs',
    action: 'ANALYZE',
    riskLevel: 'LOW',
    autonomyLevel: 2,
    allowedAgents: ['AI_MANAGER', 'SYSTEM_ARCHITECT', 'SOFTWARE_ENGINEER', 'QA_ENGINEER'],
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 5.0,
    maxDuration: 30_000,
    approvalRequired: false,
  },
  {
    policyId: 'pol_plan_architecture',
    action: 'PLAN',
    riskLevel: 'LOW',
    autonomyLevel: 1, // Suggestion only
    allowedAgents: ['AI_MANAGER', 'SYSTEM_ARCHITECT'],
    allowedProjects: ['*'],
    allowedEnvironment: 'SANDBOX',
    maxCost: 10.0,
    maxDuration: 60_000,
    approvalRequired: false,
  },
  {
    policyId: 'pol_safe_tests',
    action: 'TEST',
    riskLevel: 'LOW',
    autonomyLevel: 2,
    allowedAgents: ['AI_MANAGER', 'QA_ENGINEER', 'SOFTWARE_ENGINEER'],
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 5.0,
    maxDuration: 60_000,
    approvalRequired: false,
  },
  {
    policyId: 'pol_isolated_code_edit',
    action: 'EDIT',
    riskLevel: 'MEDIUM',
    autonomyLevel: 2,
    allowedAgents: ['SOFTWARE_ENGINEER', 'REFACTORING_ENGINEER'],
    allowedProjects: ['prj_kdi_portal', 'prj_ai_office'],
    allowedEnvironment: 'SANDBOX', // Isolated worktree only
    maxCost: 15.0,
    maxDuration: 120_000,
    approvalRequired: false,
  },
  {
    policyId: 'pol_prod_mutation_gate',
    action: 'EDIT',
    riskLevel: 'HIGH',
    autonomyLevel: 3, // Requires Human Approval Gate
    allowedAgents: ['SOFTWARE_ENGINEER', 'DEVOPS_ENGINEER'],
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 50.0,
    maxDuration: 300_000,
    approvalRequired: true,
  },
  {
    policyId: 'pol_security_credential_change',
    action: 'EDIT',
    riskLevel: 'CRITICAL',
    autonomyLevel: 4, // HUMAN ONLY
    allowedAgents: [], // No AI allowed
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 0,
    maxDuration: 0,
    approvalRequired: true,
  },
  {
    policyId: 'pol_generate_report',
    action: 'REPORT',
    riskLevel: 'LOW',
    autonomyLevel: 2,
    allowedAgents: ['AI_MANAGER', 'TECHNICAL_WRITER'],
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 5.0,
    maxDuration: 30_000,
    approvalRequired: false,
  },
  {
    policyId: 'pol_operator_escalation',
    action: 'ESCALATE',
    riskLevel: 'MEDIUM',
    autonomyLevel: 2,
    allowedAgents: ['AI_MANAGER', 'DEVOPS_ENGINEER'],
    allowedProjects: ['*'],
    allowedEnvironment: 'PRODUCTION',
    maxCost: 2.0,
    maxDuration: 10_000,
    approvalRequired: false,
  },
];

/**
 * Standard Canonical Operational Runbooks
 */
export const SEED_RUNBOOKS: Runbook[] = [
  {
    runbookId: 'rbk_website_health',
    title: 'Website Health & Availability Check',
    description:
      'Scheduled procedure to check HTTP endpoint availability, response latency, TLS certificate validity, and generate health summary report.',
    category: 'HEALTH_CHECK',
    targetRiskLevel: 'LOW',
    autonomyLevel: 2,
    enabled: true,
    version: 1,
    steps: [
      {
        stepId: 'step_web_1',
        name: 'Check Endpoint Availability',
        type: 'READ',
        action: 'GET /health/status',
        riskLevel: 'LOW',
        timeout: 5000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'status === 200',
        failureAction: 'ESCALATE',
      },
      {
        stepId: 'step_web_2',
        name: 'Analyze Response Latency',
        type: 'ANALYZE',
        action: 'Calculate P95 latency from sample requests',
        riskLevel: 'LOW',
        timeout: 10000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'latencyP95 < 500',
        failureAction: 'CONTINUE',
      },
      {
        stepId: 'step_web_3',
        name: 'Run Non-Destructive Smoke Test',
        type: 'TEST',
        action: 'Verify public portfolio gallery routes',
        riskLevel: 'LOW',
        timeout: 15000,
        retryPolicy: { maxRetries: 1, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'smoke_passed === true',
        failureAction: 'ESCALATE',
      },
      {
        stepId: 'step_web_4',
        name: 'Publish Health Briefing Report',
        type: 'REPORT',
        action: 'Format and record website diagnostic report',
        riskLevel: 'LOW',
        timeout: 5000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'report_persisted === true',
        failureAction: 'CONTINUE',
      },
    ],
  },
  {
    runbookId: 'rbk_diag_service',
    title: 'Subsystem Degradation Diagnostic & Triage',
    description:
      'Diagnostic procedure triggered when a subsystem reports latency spikes, query slowdowns, or elevated error rates.',
    category: 'DIAGNOSTIC',
    targetRiskLevel: 'LOW',
    autonomyLevel: 2,
    enabled: true,
    version: 1,
    steps: [
      {
        stepId: 'step_diag_1',
        name: 'Read Error Logs & Slow Queries',
        type: 'READ',
        action: 'Fetch slow query log and active connections',
        riskLevel: 'LOW',
        timeout: 10000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'logs_retrieved === true',
        failureAction: 'ABORT',
      },
      {
        stepId: 'step_diag_2',
        name: 'Analyze Degradation Root Cause',
        type: 'ANALYZE',
        action: 'Cross-reference graph node count and memory allocation',
        riskLevel: 'LOW',
        timeout: 20000,
        retryPolicy: { maxRetries: 1, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'root_cause_identified === true',
        failureAction: 'ESCALATE',
      },
      {
        stepId: 'step_diag_3',
        name: 'Propose Remediation Plan',
        type: 'PLAN',
        action: 'Draft index rebuild or connection flush proposal',
        riskLevel: 'LOW',
        timeout: 15000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'plan_ready === true',
        failureAction: 'CONTINUE',
      },
      {
        stepId: 'step_diag_4',
        name: 'Notify Human Operator of Findings',
        type: 'NOTIFY',
        action: 'Send diagnostic briefing notification',
        riskLevel: 'LOW',
        timeout: 5000,
        retryPolicy: { maxRetries: 2, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'notification_sent === true',
        failureAction: 'CONTINUE',
      },
    ],
  },
  {
    runbookId: 'rbk_auto_engineering',
    title: 'Autonomous Engineering Bug Triage & Isolated Repair',
    description:
      'End-to-end loop for code regression triage: analyzes test failure, spins up isolated worktree, patches code, runs tests, and pauses for human signoff before merging.',
    category: 'ENGINEERING',
    targetRiskLevel: 'HIGH',
    autonomyLevel: 3, // Requires Approval Gate before final commit/merge
    enabled: true,
    version: 1,
    steps: [
      {
        stepId: 'step_eng_1',
        name: 'Analyze Test Regression & Stack Trace',
        type: 'ANALYZE',
        action: 'Inspect failing unit test and git diff',
        riskLevel: 'LOW',
        timeout: 15000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'fault_localized === true',
        failureAction: 'ESCALATE',
      },
      {
        stepId: 'step_eng_2',
        name: 'Create Sandboxed Git Worktree',
        type: 'PLAN',
        action: 'Spawn isolated branch ai/repair-worktree',
        riskLevel: 'LOW',
        timeout: 10000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'worktree_mounted === true',
        failureAction: 'ABORT',
      },
      {
        stepId: 'step_eng_3',
        name: 'Apply Targeted Code Patch',
        type: 'EDIT',
        action: 'Surgically patch offending logic in isolated worktree',
        riskLevel: 'MEDIUM',
        timeout: 30000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'patch_applied === true',
        failureAction: 'RETRY',
      },
      {
        stepId: 'step_eng_4',
        name: 'Execute Verification Test Suite',
        type: 'TEST',
        action: 'Run automated tests in sandboxed worktree',
        riskLevel: 'LOW',
        timeout: 45000,
        retryPolicy: { maxRetries: 1, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'tests_passed === true',
        failureAction: 'RETRY',
      },
      {
        stepId: 'step_eng_5',
        name: 'Human Approval Gate for Production Merge',
        type: 'APPROVE_GATE',
        action: 'Halt for cryptographic operator review of diff and test logs',
        riskLevel: 'HIGH',
        timeout: 86400000, // 24 hours
        retryPolicy: { maxRetries: 0, backoffMs: 0 },
        requiresApproval: true,
        successCondition: 'approval_granted === true',
        failureAction: 'ABORT',
      },
      {
        stepId: 'step_eng_6',
        name: 'Merge & Publish Resolution Report',
        type: 'REPORT',
        action: 'Merge verified patch to target branch and generate resolution memory',
        riskLevel: 'HIGH',
        timeout: 10000,
        retryPolicy: { maxRetries: 1, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'merged_cleanly === true',
        failureAction: 'ESCALATE',
      },
    ],
  },
  {
    runbookId: 'rbk_security_triage',
    title: 'Security Boundary & Credential Audit Triage',
    description:
      'Strict procedure inspecting security boundary access. Critical credential mutations are strictly prohibited from AI execution.',
    category: 'SECURITY',
    targetRiskLevel: 'CRITICAL',
    autonomyLevel: 4, // LEVEL 4 — HUMAN ONLY
    enabled: true,
    version: 1,
    steps: [
      {
        stepId: 'step_sec_1',
        name: 'Read Security Audit Logs',
        type: 'READ',
        action: 'Fetch authentication failures and permission escalation attempts',
        riskLevel: 'LOW',
        timeout: 10000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'audit_scanned === true',
        failureAction: 'ABORT',
      },
      {
        stepId: 'step_sec_2',
        name: 'Analyze Security Threat Vectors',
        type: 'ANALYZE',
        action: 'Determine if anomalous IP or key usage detected',
        riskLevel: 'MEDIUM',
        timeout: 15000,
        retryPolicy: { maxRetries: 1, backoffMs: 500 },
        requiresApproval: false,
        successCondition: 'threat_assessed === true',
        failureAction: 'ESCALATE',
      },
      {
        stepId: 'step_sec_3',
        name: 'Escalate to Human Security Authority',
        type: 'ESCALATE',
        action: 'Notify Security Lead with forensic evidence',
        riskLevel: 'CRITICAL',
        timeout: 5000,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        requiresApproval: false,
        successCondition: 'escalated === true',
        failureAction: 'CONTINUE',
      },
    ],
  },
];

/**
 * Seed Objectives
 */
export const SEED_OBJECTIVES: OfficeObjective[] = [
  {
    objectiveId: 'obj_maintain_website',
    title: 'Maintain KDI website every week',
    description:
      'Autonomous recurring maintenance of the KDI public portal and client showcase: verify health, check SSL certificates, test showcase links, and publish weekly operational report.',
    owner: 'Human Operator',
    priority: 'HIGH',
    status: 'ACTIVE',
    riskLevel: 'LOW',
    autonomyLevel: 2,
    recurrence: 'cron(0 8 * * 1)', // Every Monday 08:00
    successCriteria: [
      'Endpoint availability > 99.9%',
      'TLS certificates valid > 30 days',
      'All showcase links respond 200 OK',
      'Weekly diagnostic report recorded',
    ],
    constraints: [
      'Read-only checks on production environment',
      'Production configuration changes require human approval',
      'Daily LLM budget not to exceed $10.00',
    ],
    projects: ['prj_kdi_portal'],
    agents: ['AI_MANAGER', 'SOFTWARE_ENGINEER', 'QA_ENGINEER', 'TECHNICAL_WRITER'],
    budget: {
      dailyBudgetUsd: 10.0,
      weeklyBudgetUsd: 50.0,
      monthlyBudgetUsd: 200.0,
      currentSpendDailyUsd: 1.25,
      currentSpendWeeklyUsd: 8.4,
      currentSpendMonthlyUsd: 31.5,
      enforcement: 'HARD',
    },
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    objectiveId: 'obj_infrastructure_guard',
    title: 'Monitor system telemetry and prevent production degradations',
    description:
      'Continuous operational surveillance across PostgreSQL, Neo4j, Redis, and API workers with proactive diagnostic triage and automated safe self-healing.',
    owner: 'Human Operator',
    priority: 'URGENT',
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    autonomyLevel: 2,
    recurrence: 'INTERVAL_15M',
    successCriteria: [
      'Zero unhandled service outages',
      'Database connection pool saturation < 80%',
      'Subsystem degradation MTTR < 15 minutes',
    ],
    constraints: [
      'No automated database drops or schema alterations',
      'Max 3 automated retries per incident before human escalation',
    ],
    projects: ['prj_infra_core'],
    agents: ['AI_MANAGER', 'DEVOPS_ENGINEER', 'SYSTEM_ARCHITECT'],
    budget: {
      dailyBudgetUsd: 20.0,
      weeklyBudgetUsd: 100.0,
      monthlyBudgetUsd: 400.0,
      currentSpendDailyUsd: 3.8,
      currentSpendWeeklyUsd: 22.1,
      currentSpendMonthlyUsd: 74.0,
      enforcement: 'HARD',
    },
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Seed Automation Rules
 */
export const SEED_AUTOMATION_RULES: AutomationRule[] = [
  {
    ruleId: 'rule_weekly_web_maint',
    name: 'Weekly Website Health Sweep',
    description: 'Triggers the Website Health Runbook every Monday morning.',
    trigger: {
      type: 'TIME',
      config: { schedule: '0 8 * * 1', timezone: 'Asia/Jakarta' },
    },
    action: {
      type: 'REPORT',
      target: 'rbk_website_health',
    },
    runbookId: 'rbk_website_health',
    autonomyLevel: 2,
    riskLevel: 'LOW',
    enabled: true,
    cooldown: 3600, // 1 hour cooldown
    maxRuns: 100,
    runsCount: 3,
    lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    ruleId: 'rule_service_degraded_diag',
    name: 'Auto Diagnostic on Service Degradation',
    description: 'Triggers diagnostic triage runbook when any subsystem latency exceeds 2000ms.',
    trigger: {
      type: 'CONDITION',
      config: { event: 'subsystem.health.evaluated' },
    },
    condition: {
      field: 'latencyMs',
      operator: 'GT',
      value: 2000,
    },
    action: {
      type: 'ANALYZE',
      target: 'rbk_diag_service',
    },
    runbookId: 'rbk_diag_service',
    autonomyLevel: 2,
    riskLevel: 'LOW',
    enabled: true,
    cooldown: 300, // 5 minutes cooldown
    maxRuns: 50,
    runsCount: 1,
    lastTriggeredAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    ruleId: 'rule_repeated_fail_escalate',
    name: 'Escalate Repeated Task Failures',
    description: 'Escalates to human operator when consecutive task failures reach threshold 2.',
    trigger: {
      type: 'CONDITION',
      config: { event: 'task.failed' },
    },
    condition: {
      field: 'task_failures',
      operator: 'GTE',
      value: 2,
    },
    action: {
      type: 'ESCALATE',
      target: 'operator',
    },
    autonomyLevel: 3,
    riskLevel: 'HIGH',
    enabled: true,
    cooldown: 600,
    maxRuns: 20,
    runsCount: 1,
    lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

/**
 * Seed Incidents
 */
export const SEED_INCIDENTS: Incident[] = [
  {
    incidentId: 'inc_01_neo4j_latency',
    title: 'Neo4j Graph Query Latency Spike (> 2400ms)',
    severity: 'MEDIUM',
    source: 'Telemetry Watcher',
    project: 'prj_kdi_portal',
    status: 'INVESTIGATING',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    detectedAt: new Date(Date.now() - 3500000).toISOString(),
    rootCause: 'Unindexed lookup on :WorkforceBenchmark label during multi-hop graph expansion',
    diagnostics: [
      'Neo4j query execution plan shows Cypher table scan across 14,000 nodes',
      'Host memory usage steady at 64%',
      'PostgreSQL connection pool healthy (4 active / 20 pool)',
    ],
    mitigationActions: [
      'Executed safe cache flush',
      'Prepared DDL index addition migration',
      'Drafted human approval request for production index creation',
    ],
    memoryCandidateCreated: true,
  },
];

/**
 * Seed Pending Approvals
 */
export const SEED_PENDING_APPROVALS: PendingApproval[] = [
  {
    approvalId: 'appr_prod_index_migration',
    action: 'Apply Neo4j Composite Index on :WorkforceBenchmark(marketRoleId, location)',
    reason:
      'Resolve query latency spike detected in incident inc_01_neo4j_latency by eliminating unindexed label scans.',
    agentId: 'AGT-ENG-001',
    agentRole: 'DATABASE_ENGINEER',
    projectId: 'prj_infra_core',
    objectiveId: 'obj_infrastructure_guard',
    runbookId: 'rbk_diag_service',
    risk: 'HIGH',
    expectedImpact:
      'Creates index on production Neo4j database. Query execution drops from 2400ms to < 15ms. Brief 500ms write lock during index building.',
    files: ['infrastructure/neo4j/migrations/005_add_workforce_indexes.cypher'],
    commands: ['neo4j-admin database migrate --force'],
    estimatedCost: 0.1,
    evidence: [
      'Diagnostic trace #dec_neo4j_lat_01',
      'P95 query profiling logs',
      'Incident inc_01_neo4j_latency triage report',
    ],
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Seed Proactive Recommendations
 */
export const SEED_RECOMMENDATIONS: Recommendation[] = [
  {
    recommendationId: 'rec_cache_warmup',
    title: 'Enable Redis Query Result Caching for Public Portfolio Gallery',
    reason: 'Portfolio page requests spike during client presentations, creating redundant PostgreSQL queries.',
    evidence: [
      {
        source: 'Telemetry Metric',
        details: 'PostgreSQL read requests for portfolio categories hit 85% duplicate rate in past 48h',
        timestamp: new Date().toISOString(),
      },
    ],
    priority: 'MEDIUM',
    risk: 'LOW',
    estimatedCost: 0.5,
    recommendedAction: 'Configure 5-minute Redis TTL on /api/v1/projects/portfolio endpoint',
    confidence: 0.92,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'ACTIVE',
  },
  {
    recommendationId: 'rec_weekly_backup_verify',
    title: 'Automate Graph Snapshot Integrity Check in Weekly Maintenance',
    reason: 'Weekly website objective can proactively test database backup restores in sandbox.',
    evidence: [
      {
        source: 'Objective Success Criteria',
        details: 'Objective obj_maintain_website includes backup verification in criteria',
        timestamp: new Date().toISOString(),
      },
    ],
    priority: 'LOW',
    risk: 'LOW',
    estimatedCost: 1.0,
    recommendedAction: 'Append sandbox backup restore step to rbk_website_health',
    confidence: 0.88,
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'ACTIVE',
  },
];

/**
 * Seed Decision Traces
 */
export const SEED_DECISION_TRACES: DecisionTrace[] = [
  {
    decisionId: 'dec_web_init_01',
    objectiveId: 'obj_maintain_website',
    triggerId: 'rule_weekly_web_maint',
    policyId: 'pol_read_telemetry',
    agentId: 'AGT-ENG-001',
    reason: 'Scheduled trigger initiated weekly website health check runbook',
    evidence: ['Cron schedule 08:00 WIB', 'Policy pol_read_telemetry permits LOW risk READ'],
    decision: 'PERMITTED',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

/**
 * Seed Operational Health Data
 */
export const SEED_PROJECT_HEALTH: ProjectHealthSignals[] = [
  {
    projectId: 'prj_kdi_portal',
    projectName: 'KDI Public Portal & Client Showcase',
    openTasks: 3,
    blockedTasks: 0,
    failedExecutions: 0,
    reworkCount: 1,
    staleWorkCount: 0,
    testFailures: 0,
    securityFindings: 0,
    deploymentStatus: 'HEALTHY',
    recentActivityTimestamp: new Date().toISOString(),
    status: 'HEALTHY',
  },
  {
    projectId: 'prj_infra_core',
    projectName: 'Core Infrastructure & Telemetry Gateway',
    openTasks: 5,
    blockedTasks: 1,
    failedExecutions: 1,
    reworkCount: 2,
    staleWorkCount: 0,
    testFailures: 0,
    securityFindings: 0,
    deploymentStatus: 'DEGRADED',
    recentActivityTimestamp: new Date().toISOString(),
    status: 'NEEDS_ATTENTION',
  },
];

export const SEED_AGENT_OPERATIONAL_HEALTH: AgentOperationalHealthSignals[] = [
  {
    agentId: 'AGT-MGR-001',
    agentRole: 'AI_MANAGER',
    availability: 'ONLINE',
    executionSuccessRate: 0.98,
    failureRate: 0.02,
    stuckExecutions: 0,
    averageDurationMs: 420,
    currentWorkload: 2,
    providerHealth: 'HEALTHY',
  },
  {
    agentId: 'AGT-ENG-001',
    agentRole: 'SOFTWARE_ENGINEER',
    availability: 'ONLINE',
    executionSuccessRate: 0.95,
    failureRate: 0.05,
    stuckExecutions: 0,
    averageDurationMs: 1450,
    currentWorkload: 1,
    providerHealth: 'HEALTHY',
  },
  {
    agentId: 'AGT-QA-001',
    agentRole: 'QA_ENGINEER',
    availability: 'ONLINE',
    executionSuccessRate: 1.0,
    failureRate: 0.0,
    stuckExecutions: 0,
    averageDurationMs: 820,
    currentWorkload: 0,
    providerHealth: 'HEALTHY',
  },
  {
    agentId: 'AGT-OPS-001',
    agentRole: 'DEVOPS_ENGINEER',
    availability: 'ONLINE',
    executionSuccessRate: 0.94,
    failureRate: 0.06,
    stuckExecutions: 0,
    averageDurationMs: 1100,
    currentWorkload: 1,
    providerHealth: 'HEALTHY',
  },
];
