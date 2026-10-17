// ==========================================================
// services/api/src/engineering/operational-gate/phase-24-catalog.data.ts
// Phase 24: Real Engineering Tasks Catalog (9 Tasks across SIMMACI, ILMORA, KDI) (§1)
// ==========================================================

import type { RealEngineeringTask } from './phase-24.types.js';

export const PHASE_24_REAL_TASKS: RealEngineeringTask[] = [
  // ── SIMMACI (Tasks 1–3) ──────────────────────────────────────────
  {
    taskId: 'SIMMACI-REAL-01',
    project: 'SIMMACI',
    repository: 'd:/apss-source/SIMMACI',
    title: 'Tenant-Scoped Redis Stream Idempotency & Dead Letter Queue',
    description:
      'Resolve message re-processing during consumer group rebalance by adding a tenant-scoped idempotency key check (TTL: 86400s) and routing poisoned messages to a dedicated dead-letter queue after 3 retries.',
    taskType: 'BUG_FIX',
    priority: 'HIGH',
    domain: 'BACKEND',
    targetBranch: 'fix/simmaci-stream-idempotency',
    assignedAgent: 'CODING_WORKER',
    acceptanceCriteria: [
      'Duplicate message IDs within 24h are acknowledged without re-executing handler',
      'Poisoned message failing 3 consecutive deliveries is pushed to dead-letter stream with error payload',
      'Tenant partition isolation is preserved across all Redis stream operations',
    ],
    expectedFiles: [
      'services/events/src/stream-consumer.ts',
      'services/events/src/dead-letter.service.ts',
    ],
    testFiles: [
      'services/events/test/stream-idempotency.spec.ts',
      'services/events/test/dead-letter.spec.ts',
    ],
    justification:
      'Directly addresses live student enrollment event duplicates during network partitions in SIMMACI microservices.',
  },
  {
    taskId: 'SIMMACI-REAL-02',
    project: 'SIMMACI',
    repository: 'd:/apss-source/SIMMACI',
    title: 'Academic Session Token Revocation & Blacklist Middleware',
    description:
      'Implement instantaneous session revocation middleware upon user logout by writing token JTI to a short-lived Redis blacklist, blocking revoked tokens before JWT signature verification completes.',
    taskType: 'SECURITY_HARDENING',
    priority: 'HIGH',
    domain: 'SECURITY',
    targetBranch: 'sec/simmaci-token-blacklist',
    assignedAgent: 'SECURITY_SCANNER',
    acceptanceCriteria: [
      'Logout request successfully stores token JTI in Redis with TTL matching token expiration',
      'Auth guard rejects blacklisted tokens with 401 Unauthorized immediately',
      'Non-blacklisted valid tokens continue to authenticate with sub-5ms latency overhead',
    ],
    expectedFiles: [
      'services/auth/src/guards/token-blacklist.guard.ts',
      'services/auth/src/services/session.service.ts',
    ],
    testFiles: [
      'services/auth/test/token-blacklist.spec.ts',
    ],
    justification:
      'Closes session hijacking vulnerability where user logout previously failed to invalidate unexpired JWT tokens.',
  },
  {
    taskId: 'SIMMACI-REAL-03',
    project: 'SIMMACI',
    repository: 'd:/apss-source/SIMMACI',
    title: 'Schedule Calendar UTC Timezone Alignment & DST Correction',
    description:
      'Standardize calendar schedule timestamps to strict ISO-8601 UTC with explicit timezone offsets in database persistence and mobile payload serialization, preventing 1-hour schedule drifts across daylight saving shifts.',
    taskType: 'BUG_FIX',
    priority: 'MEDIUM',
    domain: 'FULLSTACK',
    targetBranch: 'fix/simmaci-calendar-utc-dst',
    assignedAgent: 'CODING_WORKER',
    acceptanceCriteria: [
      'Calendar appointment entity persists all start/end times in UTC timestamp with timezone',
      'API serialization produces RFC-3339 strings with timezone offset',
      'Unit tests verify invariant schedule time across boundary date transitions',
    ],
    expectedFiles: [
      'services/schedule/src/calendar.entity.ts',
      'services/schedule/src/calendar.service.ts',
    ],
    testFiles: [
      'services/schedule/test/calendar-timezone.spec.ts',
    ],
    justification:
      'Eliminates student lecture scheduling confusion caused by browser locale timezone coercion.',
  },

  // ── ILMORA (Tasks 4–6) ───────────────────────────────────────────
  {
    taskId: 'ILMORA-REAL-04',
    project: 'ILMORA',
    repository: 'd:/apss-source/ILMORA',
    title: 'Student Transmittal Export CSV Formatting & RFC-4180 Sanitizer',
    description:
      'Implement strict RFC-4180 CSV serializer for student transmittal exports, escaping commas, double quotes, and line breaks, and sanitizing formula injection prefixes (=, +, -, @) to prevent CSV injection in spreadsheet software.',
    taskType: 'CODE_QUALITY',
    priority: 'MEDIUM',
    domain: 'BACKEND',
    targetBranch: 'feat/ilmora-csv-rfc4180-sanitizer',
    assignedAgent: 'CODING_WORKER',
    acceptanceCriteria: [
      'CSV fields containing commas, quotes, or newlines are wrapped in double quotes and escaped',
      'Formula trigger prefixes (=, +, -, @) are sanitized with leading single apostrophe',
      'Export generation of 10k records streams within 200ms memory budget',
    ],
    expectedFiles: [
      'services/academic/src/export/csv-sanitizer.ts',
      'services/academic/src/export/transmittal-export.service.ts',
    ],
    testFiles: [
      'services/academic/test/csv-sanitizer.spec.ts',
    ],
    justification:
      'Prevents spreadsheet parsing corruption and CSV formula injection when exporting student academic records.',
  },
  {
    taskId: 'ILMORA-REAL-05',
    project: 'ILMORA',
    repository: 'd:/apss-source/ILMORA',
    title: 'Course Grade Scale Transition & Zero-Division Boundary Guard',
    description:
      'Add defensive boundary checks to GPA calculation engine for students with zero earned credits or withdrawn courses, returning safe 0.00 GPA structure instead of throwing uncaught division-by-zero NaN exceptions.',
    taskType: 'REGRESSION_FIX',
    priority: 'HIGH',
    domain: 'BACKEND',
    targetBranch: 'fix/ilmora-gpa-zero-credit-guard',
    assignedAgent: 'CODING_WORKER',
    acceptanceCriteria: [
      'GPA calculation returns 0.00 when total attempted credits are 0 without NaN error',
      'Pass/Fail and Withdrawn grades do not increment credit divisor',
      'Standard 4.0 letter grade conversions remain mathematically verified across all test cases',
    ],
    expectedFiles: [
      'services/grades/src/gpa-calculator.service.ts',
    ],
    testFiles: [
      'services/grades/test/gpa-calculator.spec.ts',
    ],
    justification:
      'Resolves student portal 500 error when newly enrolled or probationary students view empty grade sheets.',
  },
  {
    taskId: 'ILMORA-REAL-06',
    project: 'ILMORA',
    repository: 'd:/apss-source/ILMORA',
    title: 'Faculty Assignment Optimistic Lock & Version Check',
    description:
      'Enforce optimistic locking on course instructor assignment entity using version column, rejecting stale concurrent updates with OptimisticLockException to prevent concurrent administrative overwrites.',
    taskType: 'BUG_FIX',
    priority: 'HIGH',
    domain: 'BACKEND',
    targetBranch: 'fix/ilmora-faculty-optimistic-lock',
    assignedAgent: 'CODING_WORKER',
    acceptanceCriteria: [
      'Concurrent update on identical entity version increments version and rejects stale mutation',
      'Controller translates OptimisticLockException into 409 Conflict with conflict payload',
      'Successful single-threaded update increments entity version by 1',
    ],
    expectedFiles: [
      'services/faculty/src/instructor-assignment.entity.ts',
      'services/faculty/src/instructor-assignment.service.ts',
    ],
    testFiles: [
      'services/faculty/test/instructor-assignment-lock.spec.ts',
    ],
    justification:
      'Prevents department heads from accidentally overwriting concurrent instructor timetable modifications.',
  },

  // ── KDI (Tasks 7–9) ──────────────────────────────────────────────
  {
    taskId: 'KDI-REAL-07',
    project: 'KDI',
    repository: 'd:/apss-source/KDI AI OFFICE',
    title: 'Pre-Warmed Worktree Slot Health Heartbeat & Auto-Prune',
    description:
      'Implement automated slot health heartbeat monitor in WorktreePoolService to detect unreleased or orphan worktrees from abnormal host process exits, asserting clean state and restoring idle availability.',
    taskType: 'REFACTOR',
    priority: 'MEDIUM',
    domain: 'DEVOPS',
    targetBranch: 'refactor/kdi-worktree-health-prune',
    assignedAgent: 'INFRA_ENGINEER',
    acceptanceCriteria: [
      'Periodic heartbeat scan flags worktrees exceeding lease timeout as candidate stale leases',
      'Stale worktree with clean reset returns to pool; unrecoverable worktree is quarantined',
      'Total available pool count is dynamically reported through pool stats API',
    ],
    expectedFiles: [
      'services/api/src/engineering/worktree-pool/worktree-pool.service.ts',
    ],
    testFiles: [
      'services/api/src/engineering/worktree-pool/phase-23-unit.test.ts',
    ],
    justification:
      'Hardens KDI execution infrastructure on Windows hosts against uncleaned worktree slot leaks.',
  },
  {
    taskId: 'KDI-REAL-08',
    project: 'KDI',
    repository: 'd:/apss-source/KDI AI OFFICE',
    title: 'Command Classifier RegEx Subshell Bypass Detection',
    description:
      'Harden CommandPolicyEngine regex parser to detect and block nested shell invocation tokens (backticks, $(...), pipes to sh/bash/pwsh) within seemingly permitted git and npm arguments.',
    taskType: 'SECURITY_HARDENING',
    priority: 'CRITICAL',
    domain: 'SECURITY',
    targetBranch: 'sec/kdi-command-subshell-guard',
    assignedAgent: 'SECURITY_SCANNER',
    acceptanceCriteria: [
      'Commands containing backticks or $(...) are immediately classified as BLOCKED',
      'Chained invocations (| sh, ; rm, && bash) fail allowlist evaluation',
      'Legitimate allowed commands (git status, npm test, tsc) continue to pass evaluation without false positives',
    ],
    expectedFiles: [
      'services/api/src/engineering/execution/command-policy.engine.ts',
      'services/api/src/engineering/security/command-classifier.ts',
    ],
    testFiles: [
      'services/api/src/engineering/security/command-policy.spec.ts',
    ],
    justification:
      'Prevents prompt injection attacks from escaping the sandboxed engineering command allowlist.',
  },
  {
    taskId: 'KDI-REAL-09',
    project: 'KDI',
    repository: 'd:/apss-source/KDI AI OFFICE',
    title: 'Telemetry Histogram Binning & Outlier Filter',
    description:
      'Add Interquartile Range (IQR) outlier filtering to WorktreePoolTelemetryService percentile calculator to isolate abnormal Windows OS cold-boot filesystem spikes from steady-state operational latency metrics.',
    taskType: 'CODE_QUALITY',
    priority: 'LOW',
    domain: 'QA',
    targetBranch: 'feat/kdi-telemetry-outlier-filter',
    assignedAgent: 'QA_AUTOMATION',
    acceptanceCriteria: [
      'Extreme outliers exceeding 3x IQR above Q3 are tagged and isolated in statistical summaries',
      'P50, P90, P95, and P99 calculations accurately reflect both filtered and raw latency distributions',
      'Telemetry events retain original raw duration for full compliance auditability',
    ],
    expectedFiles: [
      'services/api/src/engineering/worktree-pool/worktree-pool-telemetry.service.ts',
    ],
    testFiles: [
      'services/api/src/engineering/worktree-pool/telemetry-outlier.spec.ts',
    ],
    justification:
      'Enhances telemetry precision on developer dashboards, separating host cold spikes from execution regressions.',
  },
];
