-- ==========================================================
-- infrastructure/sql/phase4_engineering_schema.sql
-- Phase 4: PostgreSQL Operational Source of Truth for Engineering Execution
-- ==========================================================

-- 1. Engineering Providers Registry
CREATE TABLE IF NOT EXISTS engineering_providers (
    provider_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    provider_type VARCHAR(64) NOT NULL, -- 'antigravity', 'antigravity-sdk', 'antigravity-cli', 'opencode', 'mock'
    mode VARCHAR(32) NOT NULL, -- 'sdk', 'cli', 'hybrid', 'mock'
    status VARCHAR(32) NOT NULL, -- 'AVAILABLE', 'DEGRADED', 'UNAVAILABLE', 'AUTH_REQUIRED'
    endpoint VARCHAR(256),
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Isolated Workspaces
CREATE TABLE IF NOT EXISTS engineering_workspaces (
    workspace_id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64),
    repository_path VARCHAR(512) NOT NULL,
    workspace_path VARCHAR(512) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    base_commit VARCHAR(64),
    isolation_type VARCHAR(32) NOT NULL DEFAULT 'WORKTREE', -- 'WORKTREE', 'SANDBOX_DIR'
    is_locked BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'CLEANED_UP', 'ERROR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cleaned_at TIMESTAMP WITH TIME ZONE
);

-- 3. Engineering Sessions
CREATE TABLE IF NOT EXISTS engineering_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL,
    execution_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NOT NULL,
    provider_type VARCHAR(64) NOT NULL,
    repository VARCHAR(256) NOT NULL,
    branch VARCHAR(128) NOT NULL,
    workspace_path VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Engineering Executions
CREATE TABLE IF NOT EXISTS engineering_executions (
    execution_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES engineering_sessions(session_id),
    task_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NOT NULL,
    attempt INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL, -- 'RUNNING', 'IMPLEMENTED', 'VERIFICATION_PENDING', 'VERIFIED', 'COMPLETED', 'FAILED'
    current_phase VARCHAR(32) NOT NULL DEFAULT 'UNDERSTAND',
    duration_ms INT,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 5. Engineering Results & Verification Evidence
CREATE TABLE IF NOT EXISTS engineering_results (
    result_id VARCHAR(64) PRIMARY KEY,
    execution_id VARCHAR(64) NOT NULL REFERENCES engineering_executions(execution_id),
    status VARCHAR(32) NOT NULL, -- 'VERIFIED', 'FAILED_VERIFICATION', 'COMPLETED'
    summary TEXT NOT NULL,
    diff_summary TEXT,
    commit_hash VARCHAR(64),
    files_changed JSONB NOT NULL DEFAULT '[]'::jsonb,
    files_created JSONB NOT NULL DEFAULT '[]'::jsonb,
    files_deleted JSONB NOT NULL DEFAULT '[]'::jsonb,
    tests_run JSONB NOT NULL DEFAULT '[]'::jsonb,
    tests_passed JSONB NOT NULL DEFAULT '[]'::jsonb,
    tests_failed JSONB NOT NULL DEFAULT '[]'::jsonb,
    build_status VARCHAR(32) DEFAULT 'NOT_APPLICABLE',
    lint_status VARCHAR(32) DEFAULT 'NOT_APPLICABLE',
    typecheck_status VARCHAR(32) DEFAULT 'NOT_APPLICABLE',
    security_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Engineering Events (Audit Trail)
CREATE TABLE IF NOT EXISTS engineering_events (
    event_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    execution_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Engineering Approval Requests
CREATE TABLE IF NOT EXISTS engineering_approval_requests (
    approval_id VARCHAR(64) PRIMARY KEY,
    execution_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NOT NULL,
    command TEXT NOT NULL,
    risk_level VARCHAR(32) NOT NULL, -- 'HIGH', 'CRITICAL'
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(128)
);

-- 8. Engineering Artifacts
CREATE TABLE IF NOT EXISTS engineering_artifacts (
    artifact_id VARCHAR(64) PRIMARY KEY,
    execution_id VARCHAR(64) NOT NULL,
    task_id VARCHAR(64) NOT NULL,
    name VARCHAR(256) NOT NULL,
    artifact_type VARCHAR(64) NOT NULL, -- 'DIFF', 'LOG', 'TEST_REPORT', 'PATCH'
    file_path VARCHAR(512),
    content TEXT,
    size_bytes INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-efficiency querying & audit traceability
CREATE INDEX IF NOT EXISTS idx_eng_sessions_task ON engineering_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_eng_executions_task ON engineering_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_eng_events_execution ON engineering_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_eng_events_session ON engineering_events(session_id);
CREATE INDEX IF NOT EXISTS idx_eng_results_execution ON engineering_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_eng_approvals_status ON engineering_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_eng_workspaces_task ON engineering_workspaces(task_id);
