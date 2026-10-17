// ==========================================================
// services/api/src/engineering/benchmark-p23/phase-23-benchmark.catalog.ts
// Phase 23: Real Hard Tasks Catalog (§19)
// ==========================================================

export interface Phase23HardTask {
  taskId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  title: string;
  description: string;
  complexity: 'HARD';
  fileCount: number;
  testCount: number;
  expectedDiffLines: number;
}

export const PHASE_23_HARD_TASKS: Phase23HardTask[] = [
  {
    taskId: 'SIMMACI-HARD-01',
    project: 'SIMMACI',
    title: 'Multi-tenant Async Event Bus Routing & Dead Letter Recovery',
    description:
      'Implement partitioned Redis stream dispatcher with idempotency deduplication keys, dead-letter quarantine, and tenant-scoped metric emission across microservice boundaries.',
    complexity: 'HARD',
    fileCount: 6,
    testCount: 14,
    expectedDiffLines: 320,
  },
  {
    taskId: 'ILMORA-HARD-02',
    project: 'ILMORA',
    title: 'High-Volume Academic Record Schema Migration & Data Transform',
    description:
      'Execute atomic zero-downtime database migration for 500k academic transmittal records, verifying foreign key integrity, column encryption, and rollback assertions.',
    complexity: 'HARD',
    fileCount: 8,
    testCount: 20,
    expectedDiffLines: 480,
  },
  {
    taskId: 'KDI-HARD-03',
    project: 'KDI',
    title: 'Engineering Control Plane Dispatch & Sandboxed Verification',
    description:
      'Orchestrate task lifecycle through pre-warmed worktrees, verified resets, isolated test execution, and human approval boundaries without secret or state contamination.',
    complexity: 'HARD',
    fileCount: 10,
    testCount: 25,
    expectedDiffLines: 610,
  },
];
