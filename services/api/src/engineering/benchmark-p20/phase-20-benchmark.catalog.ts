// ==========================================================
// services/api/src/engineering/benchmark-p20/phase-20-benchmark.catalog.ts
// Phase 20: 10 Real Engineering Tasks Suite (SIMMACI: 4, ILMORA: 3, KDI: 3) (§3–§5)
// ==========================================================

import type { Phase20TaskDefinition } from './phase-20-benchmark.types.js';

export const PHASE_20_REAL_TASK_CATALOG: Phase20TaskDefinition[] = [
  // ==========================================================
  // 1. SIMMACI (School Management System) — 4 Real Tasks
  // ==========================================================
  {
    taskId: 'SIMMACI-P20-01',
    title: 'Fix student session token refresh persistence in AuthService',
    projectSlug: 'simmaci',
    repository: 'simmaci',
    role: 'BACKEND',
    category: 'BUG_FIX',
    difficulty: 'EASY',
    difficultyRationale: 'Localized bug in auth.service.js where refreshToken fails to persist new session and returns null.',
    description: 'Investigate and fix refreshToken(token) method in AuthService. Ensure new session is stored and valid token is returned to caller.',
    acceptanceCriteria: [
      'AuthService.refreshToken returns valid session object with new token',
      'Refreshed token passes validateSession verification',
      'Existing login and authentication unit tests pass without regression',
    ],
    constraints: [
      'Do not modify existing user credentials map',
      'Preserve token format convention',
    ],
    expectedArtifacts: ['src/auth.service.js', 'test/auth.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 40,
    baselineSource: 'HISTORICAL_DATA',
  },
  {
    taskId: 'SIMMACI-P20-02',
    title: 'Add loading indicator and download notification to student attendance UI',
    projectSlug: 'simmaci',
    repository: 'simmaci',
    role: 'FRONTEND',
    category: 'FEATURE',
    difficulty: 'MEDIUM',
    difficultyRationale: 'Component state logic tracking export lifecycle, loading boolean, and dynamic file download notice.',
    description: 'Implement UI state handling for attendance report download. Track isExporting state flag and store generated export filename.',
    acceptanceCriteria: [
      'isExporting transitions to true during export and false upon completion',
      'Generated filename is set in UI state after successful export',
      'Component unit test suite passes cleanly',
    ],
    constraints: [
      'Pure state logic without external browser DOM dependencies',
    ],
    expectedArtifacts: ['src/attendance.ui.js', 'test/ui.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 65,
    baselineSource: 'PRIOR_TASK',
  },
  {
    taskId: 'SIMMACI-P20-03',
    title: 'Harden student attendance edge cases regression test suite',
    projectSlug: 'simmaci',
    repository: 'simmaci',
    role: 'QA',
    category: 'TEST',
    difficulty: 'EASY',
    difficultyRationale: 'Create comprehensive test matrix for boundary conditions (empty attendance, leap years, 0% rates).',
    description: 'Add deterministic regression assertions testing zero attendance, full attendance, and leap year calculations.',
    acceptanceCriteria: [
      'Covers 100% of attendance boundary conditions',
      'Test run produces zero flakiness across consecutive executions',
      'All assertions pass with 100% test reliability',
    ],
    constraints: [
      'Use deterministic fixed dates instead of dynamic Date.now()',
    ],
    expectedArtifacts: ['test/attendance.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 45,
    baselineSource: 'HISTORICAL_DATA',
  },
  {
    taskId: 'SIMMACI-P20-04',
    title: 'Sanitize student profile API export against password and secret leakage',
    projectSlug: 'simmaci',
    repository: 'simmaci',
    role: 'SECURITY',
    category: 'SECURITY',
    difficulty: 'HARD',
    difficultyRationale: 'Requires recursive property scrubbing of passwordHash, raw tokens, and internal salt before JSON export.',
    description: 'Implement strict sanitization filter for student data export to guarantee password hashes and sensitive session keys are scrubbed.',
    acceptanceCriteria: [
      'Password hashes and session tokens are completely removed from exported objects',
      'AI security review score is at least 90/100',
      'Requires human approval gate verification before merging',
    ],
    constraints: [
      'Zero plaintext credentials in exported payload or logs',
      'Do not mutate internal in-memory user objects',
    ],
    expectedArtifacts: ['src/users.service.js', 'test/security.test.js'],
    riskLevel: 'HIGH',
    baselineHumanMinutes: 120,
    baselineSource: 'PRIOR_TASK',
  },

  // ==========================================================
  // 2. ILMORA (Online Learning & Quiz Platform) — 3 Real Tasks
  // ==========================================================
  {
    taskId: 'ILMORA-P20-01',
    title: 'RFC-4180 compliant CSV export for course enrollment & quiz results',
    projectSlug: 'ilmora',
    repository: 'ilmora',
    role: 'BACKEND',
    category: 'FEATURE',
    difficulty: 'MEDIUM',
    difficultyRationale: 'Multi-column serialization with quote escaping for commas, quotes, and newlines in export.service.js.',
    description: 'Implement robust CSV serialization helper method for quiz results supporting UTF-8 encoding and quote escaping.',
    acceptanceCriteria: [
      'CSV contains headers: id, name, subject, present_days, absent_days, attendance_rate',
      'Values with commas or quotation marks are properly escaped in double quotes',
      'export.test.js passes with 100% assertion coverage',
    ],
    constraints: [
      'Strict adherence to RFC-4180 CSV specifications',
      'Zero memory leaks on large record arrays',
    ],
    expectedArtifacts: ['src/export.service.js', 'test/export.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 80,
    baselineSource: 'PRIOR_TASK',
  },
  {
    taskId: 'ILMORA-P20-02',
    title: 'Fix empty course category filter regression in user lookup',
    projectSlug: 'ilmora',
    repository: 'ilmora',
    role: 'BACKEND',
    category: 'BUG_FIX',
    difficulty: 'EASY',
    difficultyRationale: 'Fix condition in users.service.js where passing empty category/school filter array unexpectedly evaluates to false.',
    description: 'Resolve bug where passing empty filter array [] causes user list lookup to return zero results instead of full list.',
    acceptanceCriteria: [
      'Passing schoolId: [] returns all available users rather than empty array',
      'Passing populated schoolId filter continues to correctly filter records',
      'users.test.js passes without regressions',
    ],
    constraints: [
      'Do not alter valid schoolId filtering logic',
    ],
    expectedArtifacts: ['src/users.service.js', 'test/users.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 35,
    baselineSource: 'HISTORICAL_DATA',
  },
  {
    taskId: 'ILMORA-P20-03',
    title: 'Deterministic mock test runner for quiz score calculation',
    projectSlug: 'ilmora',
    repository: 'ilmora',
    role: 'QA',
    category: 'TEST',
    difficulty: 'MEDIUM',
    difficultyRationale: 'Replace dynamic Date.now() with deterministic static epoch timestamps to eliminate test flakiness.',
    description: 'Harden quiz score test fixtures with deterministic mock scores and timestamps, eliminating time-dependent test flakiness.',
    acceptanceCriteria: [
      'Mock test fixtures use static timestamps and deterministic random seed',
      'Repeated test executions yield identical pass/fail status',
      'Flake detection confirms 0% test variance across 3 runs',
    ],
    constraints: [
      'No reliance on system timezone or current real-time clock',
    ],
    expectedArtifacts: ['test/quiz.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 50,
    baselineSource: 'HISTORICAL_DATA',
  },

  // ==========================================================
  // 3. KDI AI OFFICE — 3 Real Tasks
  // ==========================================================
  {
    taskId: 'KDI-P20-01',
    title: 'Calculator division by zero and percentage calculation edge-case verification',
    projectSlug: 'kdi',
    repository: 'demo-calc',
    role: 'BACKEND',
    category: 'FEATURE',
    difficulty: 'EASY',
    difficultyRationale: 'Arithmetic service validation for division by zero error handling and percentage precision.',
    description: 'Verify Calculator class handles division by zero exception properly and computes floating percentage deterministically.',
    acceptanceCriteria: [
      'divide(a, 0) throws descriptive DIVISION_BY_ZERO error',
      'percentage(part, total) returns (part / total) * 100 with zero denominator safety',
      'test/calculator.test.js passes with 6/6 assertions',
    ],
    constraints: [
      'Zero regression on add, subtract, and multiply operations',
    ],
    expectedArtifacts: ['src/calculator.js', 'test/calculator.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 30,
    baselineSource: 'HISTORICAL_DATA',
  },
  {
    taskId: 'KDI-P20-02',
    title: 'Docker Control Plane health check probe and host heartbeat reconciliation',
    projectSlug: 'kdi',
    repository: 'kdi',
    role: 'DEVOPS',
    category: 'BUILD_CI',
    difficulty: 'HARD',
    difficultyRationale: 'Multi-service health probe verifying container readiness and reconciling Windows host heartbeats within 15s.',
    description: 'Implement health check probe reconciling Control Plane container status with active Windows Execution Host heartbeats.',
    acceptanceCriteria: [
      'Health check probe reports container readiness (Postgres, Redis, API)',
      'Detects stale Windows Execution Host if heartbeat exceeds 30s SLA',
      'Returns structured health report card to Telegram Orchestrator',
    ],
    constraints: [
      'Probe timeout must not exceed 5000ms',
      'Safe fallback if execution host is unreachable',
    ],
    expectedArtifacts: ['services/api/src/engineering/host/host-registry.service.ts'],
    riskLevel: 'HIGH',
    baselineHumanMinutes: 110,
    baselineSource: 'PRIOR_TASK',
  },
  {
    taskId: 'KDI-P20-03',
    title: 'Sanitize sensitive command arguments in human approval Telegram alerts',
    projectSlug: 'kdi',
    repository: 'kdi',
    role: 'SECURITY',
    category: 'SECURITY',
    difficulty: 'MEDIUM',
    difficultyRationale: 'Mask passwords, database URIs, and tokens in approval card previews before sending to Telegram.',
    description: 'Enforce secret masking on pending approval request previews to prevent leaking authorization tokens into Telegram chat.',
    acceptanceCriteria: [
      'All database URIs and tokens in approval preview commands are masked with [REDACTED]',
      'HMAC signature of approval request remains valid and verifiable',
      'Immutable audit event recorded for approval generation',
    ],
    constraints: [
      'Do not alter original executable command in internal secure approval record',
    ],
    expectedArtifacts: ['services/api/src/engineering/security/approval-gate.service.ts'],
    riskLevel: 'HIGH',
    baselineHumanMinutes: 70,
    baselineSource: 'HISTORICAL_DATA',
  },
];
