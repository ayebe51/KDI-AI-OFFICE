// ==========================================================
// services/api/src/engineering/benchmark-p22/phase-22-benchmark.catalog.ts
// Phase 22: Real HARD Engineering Tasks Benchmark Catalog (§6, §21)
// Workloads from SIMMACI, ILMORA, and KDI AI OFFICE
// ==========================================================

import type { Phase22HardTaskDefinition } from './phase-22-benchmark.types.js';

export const PHASE_22_REAL_HARD_TASK_CATALOG: Phase22HardTaskDefinition[] = [
  // ==========================================================
  // 1. SIMMACI (School Management System) — HARD Task (§6)
  // ==========================================================
  {
    taskId: 'SIMMACI-P22-HARD-01',
    projectSlug: 'simmaci',
    repository: 'simmaci',
    role: 'SECURITY',
    difficulty: 'HARD',
    title: 'Recursive student profile export sanitization and audit data retention',
    description:
      'Sanitize student profile API export to scrub credentials, raw session tokens, and passwords. Keep export compliant with madrasah data protection standards. Make sure audit timestamps are handled properly.',
    ambiguityDescription:
      'Specification is ambiguous regarding whether audit timestamps and session metadata should be scrubbed along with authentication secrets, or retained for compliance tracking.',
    acceptanceCriteria: [
      'passwordHash, session token, and internal salt are recursively scrubbed from export',
      'Audit log metadata (createdAt, exportedAt) is retained for audit traceability',
      'AI security review score is at least 90/100',
      'Requires human approval gate before merging into main branch',
    ],
    constraints: [
      'Zero plaintext credentials in exported payload or logs',
      'Do not mutate internal in-memory user objects',
      'Do not weaken existing authentication schemas',
    ],
    expectedArtifacts: ['src/users.service.js', 'test/security.test.js'],
    riskLevel: 'HIGH',
    baselineHumanMinutes: 120,
  },

  // ==========================================================
  // 2. ILMORA (Online Learning Platform) — HARD Task (§6)
  // ==========================================================
  {
    taskId: 'ILMORA-P22-HARD-01',
    projectSlug: 'ilmora',
    repository: 'ilmora',
    role: 'BACKEND',
    difficulty: 'HARD',
    title: 'Course quiz scoring threshold & dynamic grade rounding with RFC-4180 export',
    description:
      'Implement course completion scoring and CSV export for student quiz results. Handle borderline floating-point percentages and format output cleanly according to standard specifications.',
    ambiguityDescription:
      'Specification is incomplete regarding whether borderline scores (e.g. 59.5% or 79.5%) should round up or truncate, and whether numeric attendance rate columns in CSV export should include a trailing percentage symbol.',
    acceptanceCriteria: [
      'Calculates quiz score percentages with half-up mathematical rounding precision',
      'Produces RFC-4180 compliant CSV export with proper quotation escaping for commas and quotes',
      'Headers match standard schema: id, name, subject, present_days, absent_days, attendance_rate',
      'test/export.test.js and test/quiz.test.js pass with 100% assertions',
    ],
    constraints: [
      'Strict adherence to RFC-4180 CSV specifications',
      'Deterministic calculations without floating-point precision leakage',
    ],
    expectedArtifacts: ['src/export.service.js', 'test/export.test.js', 'test/quiz.test.js'],
    riskLevel: 'LOW',
    baselineHumanMinutes: 90,
  },

  // ==========================================================
  // 3. KDI AI OFFICE (Control Plane & Infrastructure) — HARD Task (§6)
  // ==========================================================
  {
    taskId: 'KDI-P22-HARD-01',
    projectSlug: 'kdi',
    repository: 'demo-calc',
    role: 'DEVOPS',
    difficulty: 'HARD',
    title: 'Docker Control Plane multi-host heartbeat probe and failover SLA reconciliation',
    description:
      'Implement health probe reconciling Windows Execution Host heartbeats with Control Plane container readiness. Reconcile stale hosts exceeding SLA and mask sensitive credentials in approval cards.',
    ambiguityDescription:
      'Ambiguity regarding whether an unresponsive host (>30s SLA) should fail open with warning or immediately trigger failover isolation, and whether pending approval cards should redact database URIs before notifying Telegram.',
    acceptanceCriteria: [
      'Detects stale Windows Execution Host if heartbeat exceeds 30s SLA and flags offline safely',
      'Sanitizes sensitive database URIs and tokens with [REDACTED] in approval request previews',
      'HMAC signature remains valid and verifiable on internal command record',
      'High-risk operations remain strictly gated by human approval before commit',
    ],
    constraints: [
      'Probe timeout must not exceed 5000ms',
      'Agent cannot self-approve pending execution requests',
      'Do not mutate internal secure command in approval record',
    ],
    expectedArtifacts: [
      'services/api/src/engineering/host/host-registry.service.ts',
      'services/api/src/engineering/security/approval-gate.service.ts',
    ],
    riskLevel: 'HIGH',
    baselineHumanMinutes: 110,
  },
];
