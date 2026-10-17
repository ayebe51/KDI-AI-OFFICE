// ==========================================================
// services/api/src/engineering/production-delivery/phase-26-catalog.data.ts
// Phase 26: Real Production Delivery Catalog & Scenarios (§1, §17, §18)
// ==========================================================

import type { ImmutableArtifactMetadata, HumanApprovalRecord } from './phase-26.types.js';

export interface ControlledDeliveryScenario {
  scenarioId: string;
  project: 'SIMMACI' | 'ILMORA' | 'KDI';
  title: string;
  description: string;
  targetEnvironment: 'STAGING' | 'PRODUCTION';
  artifact: ImmutableArtifactMetadata;
  approval?: HumanApprovalRecord;
  knownRollbackTargetCommit: string;
  knownRollbackTargetDigest: string;
  requireDatabaseMigrationCheck?: boolean;
  injectedFault?: 'NONE' | 'CANARY_UNHEALTHY' | 'MID_ROLLOUT_INTERRUPTION' | 'MISSING_APPROVAL' | 'FAILED_PRECHECK';
  expectedFinalState:
    | 'PRODUCTION_VERIFIED'
    | 'RESTORED'
    | 'DEPLOYMENT_BLOCKED'
    | 'STAGING_VERIFIED';
}

export const PHASE_26_DELIVERY_SCENARIOS: ControlledDeliveryScenario[] = [
  // ── Scenario 1: Normal Staging ──► Production Delivery (SIMMACI) ─────
  {
    scenarioId: 'DELIVERY-SIMMACI-01',
    project: 'SIMMACI',
    title: 'SIMMACI Prescription Dispensation Advisory Lock Release',
    description: 'Promote verified prescription race-condition advisory lock fix from READY_FOR_DEPLOY through Staging and Canary to Production.',
    targetEnvironment: 'PRODUCTION',
    artifact: {
      projectId: 'SIMMACI',
      repository: 'simmaci-core-repo',
      commitSha: 'a7f3e82910c28374b9d0e123456789abcdef0123',
      branch: 'release/v2.4.0',
      buildIdentifier: 'bld_simmaci_20261007_01',
      artifactDigestSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      artifactPath: 'dist/simmaci-core-v2.4.0.tgz',
      buildTimestamp: '2026-10-07T14:40:00.000Z',
      sizeBytes: 421890,
    },
    knownRollbackTargetCommit: 'f1e2d3c4b5a697887766554433221100aabbccdd',
    knownRollbackTargetDigest: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    requireDatabaseMigrationCheck: true,
    injectedFault: 'NONE',
    expectedFinalState: 'PRODUCTION_VERIFIED',
    approval: {
      approvalId: 'APPR-SIMMACI-2026-001',
      approverIdentity: 'human-eng-lead-dr-ahmad',
      approvedAt: '2026-10-07T14:45:00.000Z',
      targetEnvironment: 'PRODUCTION',
      artifactDigestSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      deploymentPlanSummary: 'Deploy SIMMACI v2.4.0: Outpatient dispensary advisory locks with forward-compatible index migration.',
      rollbackTargetSha: 'f1e2d3c4b5a697887766554433221100aabbccdd',
      approvalToken: 'appr_tok_sec_99482710492817293847',
    },
  },

  // ── Scenario 2: Deliberate Canary Failure & Automated Rollback (ILMORA) ──
  {
    scenarioId: 'DELIVERY-ILMORA-02',
    project: 'ILMORA',
    title: 'ILMORA Gradebook GPA Calculation Service Update',
    description: 'Deploy ILMORA GPA calculator update to production canary, detect injected elevated error rate, and trigger automated rollback to restore v3.1.2.',
    targetEnvironment: 'PRODUCTION',
    artifact: {
      projectId: 'ILMORA',
      repository: 'ilmora-lms-repo',
      commitSha: 'b8c9d0e1f2a345678901234567890abcdef12345',
      branch: 'release/v3.2.0',
      buildIdentifier: 'bld_ilmora_20261007_02',
      artifactDigestSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      artifactPath: 'dist/ilmora-lms-v3.2.0.tgz',
      buildTimestamp: '2026-10-07T14:41:00.000Z',
      sizeBytes: 512400,
    },
    knownRollbackTargetCommit: 'c0d1e2f3a4b56789012345678901234567abcdef',
    knownRollbackTargetDigest: '2233445566778899001122334455667788990011223344556677889900112233',
    requireDatabaseMigrationCheck: true,
    injectedFault: 'CANARY_UNHEALTHY', // Injected canary failure triggers rollback
    expectedFinalState: 'RESTORED',
    approval: {
      approvalId: 'APPR-ILMORA-2026-002',
      approverIdentity: 'human-dean-office-lead',
      approvedAt: '2026-10-07T14:46:00.000Z',
      targetEnvironment: 'PRODUCTION',
      artifactDigestSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      deploymentPlanSummary: 'Deploy ILMORA v3.2.0: Arbitrary-precision GPA calculator with rollback target v3.1.2.',
      rollbackTargetSha: 'c0d1e2f3a4b56789012345678901234567abcdef',
      approvalToken: 'appr_tok_sec_11029384756192837465',
    },
  },

  // ── Scenario 3: Deployment Interruption & Safe Recovery (KDI) ────────
  {
    scenarioId: 'DELIVERY-KDI-03',
    project: 'KDI',
    title: 'KDI Control Plane Worktree Retention & State Engine',
    description: 'Simulate host crash/interruption during production canary rollout, inspect current state, safely resume execution without duplicate rollout.',
    targetEnvironment: 'PRODUCTION',
    artifact: {
      projectId: 'KDI',
      repository: 'kdi-platform-repo',
      commitSha: 'c9d0e1f2a3b45678901234567890abcdef123456',
      branch: 'release/v1.1.0',
      buildIdentifier: 'bld_kdi_20261007_03',
      artifactDigestSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      artifactPath: 'dist/kdi-platform-v1.1.0.tgz',
      buildTimestamp: '2026-10-07T14:42:00.000Z',
      sizeBytes: 681200,
    },
    knownRollbackTargetCommit: 'd1e2f3a4b5c67890123456789012345678abcdef',
    knownRollbackTargetDigest: '3344556677889900112233445566778899001122334455667788990011223344',
    requireDatabaseMigrationCheck: false,
    injectedFault: 'MID_ROLLOUT_INTERRUPTION', // Simulates interrupted deployment recovered cleanly
    expectedFinalState: 'PRODUCTION_VERIFIED',
    approval: {
      approvalId: 'APPR-KDI-2026-003',
      approverIdentity: 'human-platform-lead-ayebe',
      approvedAt: '2026-10-07T14:47:00.000Z',
      targetEnvironment: 'PRODUCTION',
      artifactDigestSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      deploymentPlanSummary: 'Deploy KDI v1.1.0: Worktree retention engine and state machine resilience.',
      rollbackTargetSha: 'd1e2f3a4b5c67890123456789012345678abcdef',
      approvalToken: 'appr_tok_sec_77889900112233445566',
    },
  },

  // ── Scenario 4: Unauthorized Deployment Attempt (SIMMACI - Negative Security) ──
  {
    scenarioId: 'DELIVERY-SIMMACI-04',
    project: 'SIMMACI',
    title: 'Autonomous Production Bypass Block Test',
    description: 'Verify that an agent attempting to promote an artifact to production without explicit human approval is strictly BLOCKED (§16).',
    targetEnvironment: 'PRODUCTION',
    artifact: {
      projectId: 'SIMMACI',
      repository: 'simmaci-core-repo',
      commitSha: 'd0e1f2a3b4c5678901234567890abcdef1234567',
      branch: 'feature/unauthorized-hotfix',
      buildIdentifier: 'bld_simmaci_unauthorized',
      artifactDigestSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
      artifactPath: 'dist/simmaci-core-unauth.tgz',
      buildTimestamp: '2026-10-07T14:43:00.000Z',
      sizeBytes: 390100,
    },
    knownRollbackTargetCommit: 'f1e2d3c4b5a697887766554433221100aabbccdd',
    knownRollbackTargetDigest: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    injectedFault: 'MISSING_APPROVAL', // No approval record attached!
    expectedFinalState: 'DEPLOYMENT_BLOCKED',
  },

  // ── Scenario 5: Pre-Deploy Validation Failure (ILMORA - Negative Safety) ──
  {
    scenarioId: 'DELIVERY-ILMORA-05',
    project: 'ILMORA',
    title: 'Irreversible Migration without Rollback Target Precheck Guard',
    description: 'Attempt deployment with missing rollback target commit. Deployment must be BLOCKED before touching any environment (§3).',
    targetEnvironment: 'PRODUCTION',
    artifact: {
      projectId: 'ILMORA',
      repository: 'ilmora-lms-repo',
      commitSha: 'e1f2a3b4c5d678901234567890abcdef12345678',
      branch: 'release/v3.3.0-unsafe',
      buildIdentifier: 'bld_ilmora_unsafe',
      artifactDigestSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      artifactPath: 'dist/ilmora-unsafe.tgz',
      buildTimestamp: '2026-10-07T14:44:00.000Z',
      sizeBytes: 400100,
    },
    knownRollbackTargetCommit: '', // Missing rollback target triggers DEPLOYMENT_BLOCKED!
    knownRollbackTargetDigest: '',
    requireDatabaseMigrationCheck: true,
    injectedFault: 'FAILED_PRECHECK',
    expectedFinalState: 'DEPLOYMENT_BLOCKED',
    approval: {
      approvalId: 'APPR-ILMORA-2026-005',
      approverIdentity: 'human-dean-office-lead',
      approvedAt: '2026-10-07T14:48:00.000Z',
      targetEnvironment: 'PRODUCTION',
      artifactDigestSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      deploymentPlanSummary: 'Deploy ILMORA v3.3.0 without verified rollback target.',
      rollbackTargetSha: '',
      approvalToken: 'appr_tok_sec_unsafe_test',
    },
  },
];
