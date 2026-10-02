// ==========================================================
// @kdi/config - Configuration Engine & Constants
// ==========================================================

export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  port: number;
  host: string;
  apiUrl: string;
  wsUrl: string;
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: number;
  postgres: {
    url: string;
    host: string;
    port: number;
    db: string;
    user: string;
    password?: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
    password?: string;
  };
  neo4j: {
    uri: string;
    user: string;
    password?: string;
  };
  ollama: {
    baseUrl: string;
    numThreads: number;
    numGpu: number;
  };
  llm: {
    geminiApiKey?: string;
    groqApiKey?: string;
    openRouterApiKey?: string;
    ollamaBaseUrl: string;
    ollamaNumThreads: number;
    ollamaNumGpu: number;
    defaultDailySoftCapUsd: number;
    defaultDailyHardCapUsd: number;
  };
  governance: {
    workerMaxConcurrency: number;
    hostCpuLimitPercent: number;
    hostRamLimitPercent: number;
  };
  runtime: {
    workerConcurrency: number;
    maxRunningTasks: number;
    maxRunningAgents: number;
    defaultTaskTimeoutMs: number;
    defaultMaxRetries: number;
    heartbeatIntervalMs: number;
    staleWorkerThresholdMs: number;
  };
  reliability: {
    backupDir: string;
    backupEncryptionKey?: string;
    backupRetentionDailyDays: number;
    backupRetentionWeeklyWeeks: number;
    backupRetentionMonthlyMonths: number;
    offsiteStoragePath: string;
    maxWorkerConcurrency: number;
    crashLoopThreshold: number;
    crashLoopCooldownMs: number;
    rateLimitMaxRequestsPerMinute: number;
    logDir: string;
    maxLogSizeBytes: number;
    enableReadOnlyMode: boolean;
    enableMaintenanceMode: boolean;
    enableSafeMode: boolean;
    enableRecoveryMode: boolean;
  };
  telegram: {
    botToken?: string;
    ownerId?: string;
    allowedOwnerIds: string[];
    webhookSecret?: string;
    webhookUrl?: string;
    pollingFallback: boolean;
    enableAuditLogging: boolean;
    rateLimitPerMinute: number;
  };
}

export const OFFICE_ROOMS = [
  { id: 'RM-01', name: 'Reception', type: 'PUBLIC' },
  { id: 'RM-02', name: 'Management Room', type: 'INTERNAL' },
  { id: 'RM-03', name: 'PM Room', type: 'INTERNAL' },
  { id: 'RM-04', name: 'Architecture Room', type: 'INTERNAL' },
  { id: 'RM-05', name: 'Engineering Floor', type: 'INTERNAL' },
  { id: 'RM-06', name: 'Frontend Area', type: 'INTERNAL' },
  { id: 'RM-07', name: 'Backend Area', type: 'INTERNAL' },
  { id: 'RM-08', name: 'DevOps Area', type: 'INTERNAL' },
  { id: 'RM-09', name: 'QA Room', type: 'INTERNAL' },
  { id: 'RM-10', name: 'Security Room', type: 'INTERNAL' },
  { id: 'RM-11', name: 'Research Room', type: 'INTERNAL' },
  { id: 'RM-12', name: 'Meeting Room', type: 'COLLABORATION' },
  { id: 'RM-13', name: 'Whiteboard Area', type: 'COLLABORATION' },
  { id: 'RM-14', name: 'Pantry', type: 'WELLNESS' },
  { id: 'RM-15', name: 'Break Area', type: 'WELLNESS' },
  { id: 'RM-16', name: 'Musholla', type: 'PRAYER' },
  { id: 'RM-17', name: 'Server Room', type: 'INFRASTRUCTURE' },
  { id: 'RM-18', name: 'Portfolio Gallery', type: 'PUBLIC_SHOWCASE' },
  { id: 'RM-19', name: 'Project Showcase Room', type: 'PUBLIC_SHOWCASE' },
] as const;

export function loadAppConfig(): AppConfig {
  const env = (process.env.APP_ENV || process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
  return {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '127.0.0.1',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    wsUrl: process.env.WS_URL || 'ws://localhost:3000',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(','),
    jwtSecret: process.env.JWT_SECRET || 'kdi_default_dev_secret_key_at_least_32_characters_long',
    jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10),
    postgres: {
      url: process.env.POSTGRES_URL || 'postgresql://kdi_admin:kdi_dev_password_only@127.0.0.1:5432/kdi_ai_office_dev',
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      db: process.env.POSTGRES_DB || 'kdi_ai_office_dev',
      user: process.env.POSTGRES_USER || 'kdi_admin',
      password: process.env.POSTGRES_PASSWORD || 'kdi_dev_password_only',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://:kdi_redis_dev_secret@127.0.0.1:6379/0',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || 'kdi_redis_dev_secret',
    },
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://127.0.0.1:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'kdi_neo4j_dev_password',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      numThreads: parseInt(process.env.OLLAMA_NUM_THREADS || '6', 10),
      numGpu: parseInt(process.env.OLLAMA_NUM_GPU || '0', 10),
    },
    llm: {
      geminiApiKey: process.env.GEMINI_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      ollamaNumThreads: parseInt(process.env.OLLAMA_NUM_THREADS || '6', 10),
      ollamaNumGpu: parseInt(process.env.OLLAMA_NUM_GPU || '0', 10),
      defaultDailySoftCapUsd: parseFloat(process.env.LLM_DAILY_SOFT_CAP_USD || '5.0'),
      defaultDailyHardCapUsd: parseFloat(process.env.LLM_DAILY_HARD_CAP_USD || '10.0'),
    },
    governance: {
      workerMaxConcurrency: parseInt(process.env.WORKER_MAX_CONCURRENCY || '2', 10),
      hostCpuLimitPercent: parseInt(process.env.HOST_CPU_LIMIT_PERCENT || '75', 10),
      hostRamLimitPercent: parseInt(process.env.HOST_RAM_LIMIT_PERCENT || '80', 10),
    },
    runtime: {
      workerConcurrency: parseInt(process.env.WORKER_MAX_CONCURRENCY || '2', 10),
      maxRunningTasks: parseInt(process.env.RUNTIME_MAX_RUNNING_TASKS || '8', 10),
      maxRunningAgents: parseInt(process.env.RUNTIME_MAX_RUNNING_AGENTS || '14', 10),
      defaultTaskTimeoutMs: parseInt(process.env.RUNTIME_TASK_TIMEOUT_MS || '60000', 10),
      defaultMaxRetries: parseInt(process.env.RUNTIME_MAX_RETRIES || '3', 10),
      heartbeatIntervalMs: parseInt(process.env.RUNTIME_HEARTBEAT_INTERVAL_MS || '10000', 10),
      staleWorkerThresholdMs: parseInt(process.env.RUNTIME_STALE_WORKER_THRESHOLD_MS || '30000', 10),
    },
    reliability: {
      backupDir: process.env.BACKUP_DIR || (process.platform === 'win32' ? 'd:/kdi-backups' : './backups'),
      backupEncryptionKey: process.env.BACKUP_ENCRYPTION_KEY || 'kdi-secure-production-backup-key-256-bit-aes-gcm',
      backupRetentionDailyDays: parseInt(process.env.BACKUP_RETENTION_DAILY_DAYS || '7', 10),
      backupRetentionWeeklyWeeks: parseInt(process.env.BACKUP_RETENTION_WEEKLY_WEEKS || '4', 10),
      backupRetentionMonthlyMonths: parseInt(process.env.BACKUP_RETENTION_MONTHLY_MONTHS || '12', 10),
      offsiteStoragePath: process.env.OFFSITE_STORAGE_PATH || (process.platform === 'win32' ? 'd:/kdi-offsite-vault' : './offsite-vault'),
      maxWorkerConcurrency: parseInt(process.env.WORKER_MAX_CONCURRENCY || '2', 10),
      crashLoopThreshold: parseInt(process.env.CRASH_LOOP_THRESHOLD || '3', 10),
      crashLoopCooldownMs: parseInt(process.env.CRASH_LOOP_COOLDOWN_MS || '60000', 10),
      rateLimitMaxRequestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '300', 10),
      logDir: process.env.LOG_DIR || './logs',
      maxLogSizeBytes: parseInt(process.env.MAX_LOG_SIZE_BYTES || '10485760', 10), // 10MB
      enableReadOnlyMode: process.env.ENABLE_READ_ONLY_MODE === 'true',
      enableMaintenanceMode: process.env.ENABLE_MAINTENANCE_MODE === 'true',
      enableSafeMode: process.env.ENABLE_SAFE_MODE === 'true',
      enableRecoveryMode: process.env.ENABLE_RECOVERY_MODE === 'true',
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      ownerId: process.env.TELEGRAM_OWNER_ID,
      allowedOwnerIds: (process.env.TELEGRAM_ALLOWED_OWNER_IDS || process.env.TELEGRAM_OWNER_ID || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      pollingFallback: process.env.TELEGRAM_POLLING_FALLBACK === 'true',
      enableAuditLogging: process.env.TELEGRAM_ENABLE_AUDIT_LOGGING !== 'false',
      rateLimitPerMinute: parseInt(process.env.TELEGRAM_RATE_LIMIT_PER_MINUTE || '60', 10),
    },
  };
}
