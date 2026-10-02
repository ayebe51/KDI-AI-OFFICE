-- ==========================================================
-- infrastructure/sql/phase11_telegram_schema.sql
-- Phase 11: Telegram Command & Communication Layer Persistence
-- ==========================================================

-- 1. Telegram Identities (Allowlist & Authorization)
CREATE TABLE IF NOT EXISTS telegram_identities (
    telegram_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128),
    first_name VARCHAR(128),
    last_name VARCHAR(128),
    role VARCHAR(32) NOT NULL DEFAULT 'OWNER', -- 'OWNER', 'ADMIN', 'UNAUTHORIZED'
    is_authorized BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Deduplicated Processed Updates (Prevents duplicate webhook processing)
CREATE TABLE IF NOT EXISTS telegram_processed_updates (
    update_id BIGINT PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Telegram Conversations (Bounded Context & History)
CREATE TABLE IF NOT EXISTS telegram_conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    chat_id VARCHAR(64) NOT NULL,
    owner_id VARCHAR(64) NOT NULL REFERENCES telegram_identities(telegram_id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Telegram Messages (Audit trail for every inbound/outbound interaction)
CREATE TABLE IF NOT EXISTS telegram_messages (
    message_id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES telegram_conversations(conversation_id),
    correlation_id VARCHAR(64) NOT NULL,
    direction VARCHAR(16) NOT NULL, -- 'INBOUND', 'OUTBOUND'
    sender_id VARCHAR(64) NOT NULL,
    text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Owner Commands Executed
CREATE TABLE IF NOT EXISTS telegram_commands (
    command_id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES telegram_conversations(conversation_id),
    correlation_id VARCHAR(64) NOT NULL,
    raw_input TEXT NOT NULL,
    classification VARCHAR(32) NOT NULL, -- 'COMMAND', 'NATURAL_LANGUAGE', 'QUERY', 'EMERGENCY'
    intent VARCHAR(128) NOT NULL,
    task_id VARCHAR(64),
    execution_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- 'QUEUED', 'COMPLETED', 'FAILED', 'WAITING_APPROVAL'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Telegram Approvals (Cryptographic human signoff via inline buttons)
CREATE TABLE IF NOT EXISTS telegram_approvals (
    approval_id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES telegram_conversations(conversation_id),
    chat_id VARCHAR(64) NOT NULL,
    message_id INT,
    action_title VARCHAR(256) NOT NULL,
    action_description TEXT NOT NULL,
    risk_level VARCHAR(16) NOT NULL DEFAULT 'HIGH', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    plan_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact VARCHAR(256) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
    requested_by VARCHAR(64) NOT NULL,
    responded_by VARCHAR(64),
    response_reason TEXT,
    correlation_id VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- 7. Telegram Proactive Notifications
CREATE TABLE IF NOT EXISTS telegram_notifications (
    notification_id VARCHAR(64) PRIMARY KEY,
    recipient_id VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'TASK_COMPLETED', 'TASK_FAILED', 'INCIDENT', 'APPROVAL_REQUIRED', 'DAILY_BRIEFING', 'SYSTEM_ALERT'
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARNING', 'HIGH', 'CRITICAL'
    title VARCHAR(256) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SENT', -- 'PENDING', 'SENT', 'FAILED', 'SUPPRESSED'
    correlation_id VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- 8. Telegram Audit Logs (Immutable security trace)
CREATE TABLE IF NOT EXISTS telegram_audit_logs (
    audit_id VARCHAR(64) PRIMARY KEY,
    correlation_id VARCHAR(64) NOT NULL,
    update_id BIGINT,
    sender_id VARCHAR(64) NOT NULL,
    username VARCHAR(128),
    action VARCHAR(64) NOT NULL,
    authorized BOOLEAN NOT NULL DEFAULT true,
    details TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tg_conv_owner ON telegram_conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_tg_msg_conv ON telegram_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tg_msg_corr ON telegram_messages(correlation_id);
CREATE INDEX IF NOT EXISTS idx_tg_appr_status ON telegram_approvals(status);
CREATE INDEX IF NOT EXISTS idx_tg_audit_sender ON telegram_audit_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_tg_audit_corr ON telegram_audit_logs(correlation_id);
