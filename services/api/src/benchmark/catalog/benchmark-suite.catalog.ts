// ==========================================================
// services/api/src/benchmark/catalog/benchmark-suite.catalog.ts
// Standardized Benchmark Task Suite (10 Tasks across 5 Difficulty Levels)
// ==========================================================

import type { BenchmarkTask } from '@kdi/types';

export const BENCHMARK_TASK_SUITE: BenchmarkTask[] = [
  {
    id: 'SIMMACI-001',
    title: 'Fix email validation bug in login form',
    repository: 'simmaci-benchmark-repo',
    description: 'Ensure email format validation checks valid domain format and trims whitespace before authenticating.',
    level: 1,
    category: 'BUG_FIX',
    acceptanceCriteria: [
      'Email with leading or trailing whitespace is accepted when trimmed',
      'Malformed email without domain is rejected with INVALID_CREDENTIALS_FORMAT',
      'Existing login tests pass without regression',
    ],
    constraints: [
      'Do not modify password hashing algorithm',
      'Do not alter database schema',
    ],
    expectedArtifacts: [
      'src/auth.service.js',
      'test/auth.test.js',
      'git diff',
      'commit',
    ],
  },
  {
    id: 'SIMMACI-002',
    title: 'Add CSV export to user management',
    repository: 'simmaci-benchmark-repo',
    description: 'Implement CSV export helper method for teacher directory supporting UTF-8 and quoted values.',
    level: 2,
    category: 'FEATURE',
    acceptanceCriteria: [
      'CSV contains visible column headers: id, name, subject',
      'Fields containing commas or quotes are properly escaped with double quotes',
      'Output encoding is UTF-8',
      'Export test passes with 100% test reliability',
    ],
    constraints: [
      'Do not change existing authentication logic',
      'Ensure zero external memory leaks on large arrays',
    ],
    expectedArtifacts: [
      'src/export.service.js',
      'test/export.test.js',
      'git diff',
      'commit',
    ],
  },
  {
    id: 'SIMMACI-003',
    title: 'Add export button and state management to attendance UI',
    repository: 'simmaci-benchmark-repo',
    description: 'Provide UI component state management for triggering monthly attendance export with loading indicator and download notification.',
    level: 2,
    category: 'FEATURE',
    acceptanceCriteria: [
      'isExporting flag transitions to true during export and false upon completion',
      'Filename is populated in UI render state upon successful export',
      'UI unit tests pass cleanly',
    ],
    constraints: [
      'Pure component state logic without browser DOM dependencies',
    ],
    expectedArtifacts: [
      'src/attendance.ui.js',
      'test/ui.test.js',
      'git diff',
    ],
  },
  {
    id: 'SIMMACI-004',
    title: 'Add monthly attendance aggregation and export endpoint',
    repository: 'simmaci-benchmark-repo',
    description: 'Implement multi-layer attendance service combining data query, monthly rate calculation, and CSV generation.',
    level: 3,
    category: 'MULTI_LAYER',
    acceptanceCriteria: [
      'getMonthlyAttendance retrieves records matching the specified YYYY-MM parameter',
      'exportMonthlyAttendanceCSV produces valid downloadable payload with all 7 columns',
      'Throws descriptive error when month parameter is missing',
      'All attendance tests pass',
    ],
    constraints: [
      'Reuse ExportService for CSV generation',
      'Preserve existing teacher records',
    ],
    expectedArtifacts: [
      'src/attendance.service.js',
      'test/attendance.test.js',
      'commit',
    ],
  },
  {
    id: 'SIMMACI-005',
    title: 'Repair failing test in token expiration verification',
    repository: 'simmaci-benchmark-repo',
    description: 'Investigate and repair test failure where expired tokens are not properly cleaned up from memory sessions.',
    level: 1,
    category: 'BUG_FIX',
    acceptanceCriteria: [
      'verifyToken returns null and removes session if Date.now() exceeds expiresAt',
      'Active tokens remain verified and return valid session payload',
      'Self-recovery loop identifies failure, forms hypothesis, and resolves within 3 attempts',
    ],
    constraints: [
      'Maintain backwards compatibility for active tokens',
    ],
    expectedArtifacts: [
      'src/auth.service.js',
      'test/auth.test.js',
      'recovery log',
    ],
  },
  {
    id: 'SIMMACI-006',
    title: 'Investigate school filter regression returning empty array',
    repository: 'simmaci-benchmark-repo',
    description: 'Investigate bug where passing an empty school filter array causes user list to unexpectedly return zero users.',
    level: 4,
    category: 'INVESTIGATION',
    acceptanceCriteria: [
      'Root cause identified: array length check missing in filter condition',
      'Passing schoolId: [] returns all available users without crash',
      'Regression test added and verified',
    ],
    constraints: [
      'Do not alter valid schoolId filtering behavior when non-empty',
    ],
    expectedArtifacts: [
      'src/users.service.js',
      'test/users.test.js',
      'investigation report',
    ],
  },
  {
    id: 'SIMMACI-007',
    title: 'Multi-agent coordinated delivery for reporting module',
    repository: 'simmaci-benchmark-repo',
    description: 'Coordinate Engineering Lead, Backend Engineer, Frontend Engineer, and QA Agent to implement and verify attendance reporting.',
    level: 3,
    category: 'MULTI_LAYER',
    acceptanceCriteria: [
      'Work decomposed cleanly across Backend, Frontend, and QA roles',
      'Context and artifacts handed off between agents without human routing',
      'End-to-end integration verified by QA Agent',
    ],
    constraints: [
      'Follow KDI agent role definitions',
    ],
    expectedArtifacts: [
      'multi-agent execution trace',
      'integrated diff',
      'commit',
    ],
  },
  {
    id: 'SIMMACI-008',
    title: 'Fix syntax and configuration error breaking repository build',
    repository: 'simmaci-benchmark-repo',
    description: 'Detect and resolve syntax error in configuration file preventing successful build execution.',
    level: 2,
    category: 'BUG_FIX',
    acceptanceCriteria: [
      'Build script exits with status code 0',
      'Config exports valid structure with appName, version, and features',
      'Zero lint/syntax errors remain',
    ],
    constraints: [
      'Preserve existing feature flags',
    ],
    expectedArtifacts: [
      'src/config.js',
      'build output evidence',
    ],
  },
  {
    id: 'SIMMACI-009',
    title: 'Resolve missing barrel export in index bundle',
    repository: 'simmaci-benchmark-repo',
    description: 'Fix missing named exports in src/index.js ensuring consumer modules can import all core services.',
    level: 2,
    category: 'FEATURE',
    acceptanceCriteria: [
      'All 6 services exported from src/index.js: AuthService, ExportService, UserService, AttendanceService, AttendanceExportUI, Config',
      'Import verification test passes without undefined symbols',
    ],
    constraints: [
      'Strict ES Module exports',
    ],
    expectedArtifacts: [
      'src/index.js',
      'diff',
      'commit',
    ],
  },
  {
    id: 'SIMMACI-010',
    title: 'Autonomous Golden Path: Full-Stack Monthly Teacher Attendance CSV Export',
    repository: 'simmaci-benchmark-repo',
    description: 'Add a new reporting endpoint and UI that allows administrators to export monthly teacher attendance data as CSV from requirements to production-ready commit.',
    level: 5,
    category: 'AUTONOMOUS_PROJECT',
    acceptanceCriteria: [
      'Complete autonomous execution: Intake -> Planning -> Workforce assignment -> Code -> Test -> Verification -> Diff review -> Approval gate -> Delivery',
      'Backend attendance service exports CSV with 7 columns',
      'Frontend UI handles export trigger and renders download filename',
      'All test suites execute and pass with zero test failures',
      'Unnecessary human intervention is ZERO',
      'Full evidence package generated (report.json, report.md, execution-log.json, git-diff.patch, test-results.json)',
    ],
    constraints: [
      'No human manual code editing or test guidance',
      'Mandatory approval gate evaluated for production commit',
    ],
    expectedArtifacts: [
      'src/attendance.service.js',
      'src/attendance.ui.js',
      'test/attendance.test.js',
      'test/ui.test.js',
      'benchmark-report.json',
      'benchmark-report.md',
      'execution-log.json',
      'git-diff.patch',
      'test-results.json',
      'verified commit',
    ],
  },
];

export class BenchmarkTaskCatalog {
  private readonly tasks = new Map<string, BenchmarkTask>();

  constructor() {
    for (const task of BENCHMARK_TASK_SUITE) {
      this.tasks.set(task.id, task);
    }
  }

  public getTask(id: string): BenchmarkTask | undefined {
    return this.tasks.get(id);
  }

  public listTasks(): BenchmarkTask[] {
    return Array.from(this.tasks.values());
  }

  public getTasksByLevel(level: number): BenchmarkTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.level === level);
  }

  public getGoldenPathTask(): BenchmarkTask {
    return this.tasks.get('SIMMACI-010')!;
  }
}
