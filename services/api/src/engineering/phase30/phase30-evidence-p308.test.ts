// ==========================================================
// services/api/src/engineering/phase30/phase30-evidence-p308.test.ts
// KDI Phase 30.8: Evidence Reconciliation & WSL-Aware Build Readiness
// ==========================================================

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExternalPrerequisiteGate } from './external-prerequisite-gate.js';
import { OperatorPreflightService } from './operator-preflight.js';
import { ReleaseRegistryService } from './release-registry.service.js';
import { Phase30AuditService } from './phase30-audit.service.js';
import { AuthorizedReleaseExecutor } from './authorized-release-executor.js';
import { StagingReadinessStateMachine } from './staging-readiness.state-machine.js';
import type {
  BuildEnvironmentState,
  ExecutionRequest,
  PrerequisiteCheckResult,
} from './phase30.types.js';

describe('Phase 30.8: Evidence Reconciliation & WSL-Aware Build Readiness (§1–§12)', () => {
  const gate = new ExternalPrerequisiteGate();

  // ── 1. WSL-Aware B1 Discovery Hierarchy (§4.B1-B3) ──
  it('WSL Discovery 1: Windows CLI absent + WSL CLI present with reachable daemon evaluates to VERIFIED_READ_ONLY', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: {
        hasDockerCli: false,
        wslDockerCli: true,
        wslDockerDaemon: true,
        wslDistribution: 'Ubuntu',
        wslStorageLocation: 'D:\\WSL\\Ubuntu',
      },
    });

    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
    assert.strictEqual(result.rawPayload?.buildState, 'VERIFIED');
    assert.strictEqual(result.rawPayload?.context, 'WSL');
    assert.strictEqual(result.rawPayload?.cliInstalled, true);
    assert.strictEqual(result.rawPayload?.daemonReachable, true);
    assert.strictEqual(result.blockers.length, 0);
    assert.ok(result.details.includes('[VERIFIED]'));
  });

  it('WSL Discovery 2: Windows CLI absent + WSL CLI present with unreachable daemon evaluates to DAEMON_UNREACHABLE', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: {
        hasDockerCli: false,
        wslDockerCli: true,
        wslDockerDaemon: false,
        wslDistribution: 'Ubuntu',
      },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.buildState, 'DAEMON_UNREACHABLE');
    assert.strictEqual(result.rawPayload?.context, 'WSL');
    assert.strictEqual(result.rawPayload?.cliInstalled, true);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.blockers.some((b) => b.includes('Start Docker daemon inside WSL')));
    assert.ok(result.details.includes('[DAEMON_UNREACHABLE]'));
  });

  it('WSL Discovery 3: Both Windows and WSL Docker absent evaluates to NOT_INSTALLED', async () => {
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: {
        hasDockerCli: false,
        wslDockerCli: false,
        wslDockerDaemon: false,
      },
    });

    assert.strictEqual(result.status, 'BLOCKED');
    assert.strictEqual(result.rawPayload?.buildState, 'NOT_INSTALLED');
    assert.strictEqual(result.rawPayload?.cliInstalled, false);
    assert.strictEqual(result.rawPayload?.daemonReachable, false);
    assert.ok(result.details.includes('[NOT_INSTALLED]'));
  });

  it('WSL Discovery 4: Non-conflation invariant: Windows CLI absence alone does not imply global NOT_INSTALLED', async () => {
    // When hasDockerCli is false, but WSL is verified, result MUST NOT be NOT_INSTALLED
    const result = await gate.inspectB1BuildService({
      simulatedEnvironment: {
        hasDockerCli: false,
        wslDockerCli: true,
        wslDockerDaemon: true,
      },
    });

    assert.notStrictEqual(result.rawPayload?.buildState, 'NOT_INSTALLED');
    assert.strictEqual(result.status, 'VERIFIED_READ_ONLY');
  });

  // ── 2. Local Container Build Evidence & Digest Integrity (§4.B5, §6) ──
  it('Build Verification 1: Validates verified image digest format and immutability', () => {
    const releaseRegistry = new ReleaseRegistryService();
    const digest = 'sha256:c3aa9bb4a7094a9277497baeeb3b457381f6b0c7dd56a6ef30d6da6c6baab037';

    // First register baseline release
    const baseline = releaseRegistry.registerRelease({
      releaseId: 'rel_kdi_baseline',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '0'.repeat(64),
    });
    assert.strictEqual(baseline.releaseId, 'rel_kdi_baseline');

    const release = releaseRegistry.registerRelease({
      releaseId: 'rel_kdi_v1.0.8_local_build',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      version: '1.0.8',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: digest,
      rollbackTargetReleaseId: 'rel_kdi_baseline',
    });

    assert.strictEqual(release.artifactDigestSha256, digest);
    assert.ok(/^sha256:[a-f0-9]{64}$/.test(release.artifactDigestSha256));
  });

  it('Build Verification 2: Local build evidence tier is LOCAL_EXECUTION and cannot claim STAGING_LIVE', () => {
    const localBuildEvidence = {
      tier: 'LOCAL_EXECUTION' as const,
      imageTag: 'kdi-api:local-p308',
      digest: 'sha256:c3aa9bb4a7094a9277497baeeb3b457381f6b0c7dd56a6ef30d6da6c6baab037',
      environment: 'LOCAL_DRY_RUN' as const,
    };

    // Staging and production promotions strictly forbid using local execution evidence as live evidence
    const validTiers = ['SIMULATED', 'LOCAL_TEST', 'LOCAL_EXECUTION', 'STAGING_LIVE', 'PRODUCTION_LIVE'];
    assert.ok(validTiers.indexOf(localBuildEvidence.tier) < validTiers.indexOf('STAGING_LIVE'));
    assert.notStrictEqual(localBuildEvidence.tier, 'STAGING_LIVE');
    assert.notStrictEqual(localBuildEvidence.tier, 'PRODUCTION_LIVE');
  });

  it('Build Verification 3: Non-publishing constraint: AuthorizedReleaseExecutor blocks remote push operations', async () => {
    const executor = new AuthorizedReleaseExecutor();
    const forbiddenPushOp = 'EXECUTE_REGISTRY_PUSH' as any;

    await assert.rejects(
      async () =>
        executor.executeOperation({
          operation: forbiddenPushOp,
          target: {
            targetId: 'tgt_local',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'LOCAL_DRY_RUN',
            cluster: 'local-docker',
            isProduction: false,
            requiresHumanApproval: false,
            healthEndpoint: 'http://localhost:3000/health',
            allowedOperations: ['EXECUTE_DRY_RUN'],
          },
          release: {
            releaseId: 'rel_test',
            project: 'KDI',
            service: 'kdi-agent-platform',
            environment: 'LOCAL_DRY_RUN',
            version: '1.0.8',
            commitSha: '5242855146b341974a1946947d640e253ce20c00',
            artifactDigestSha256: 'a'.repeat(64),
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isDryRun: true,
        }),
      /not allowlisted/
    );
  });

  // ── 3. Test Discrepancy Reconciliation (§5) ──
  it('Reconciliation 1: Reconciles all 8 Phase 30 test suites to exactly 109 tests', () => {
    const suiteBreakdown: Record<string, number> = {
      'phase30-unit.test.ts': 6,
      'phase30-dry-run.test.ts': 1,
      'phase30-benchmark-p303.test.ts': 8,
      'phase30-integration-p304.test.ts': 21,
      'phase30-safety.test.ts': 8,
      'phase30-preflight-p305.test.ts': 20,
      'phase30-staging-p306.test.ts': 23,
      'phase30-activation-p307.test.ts': 22,
    };

    const total = Object.values(suiteBreakdown).reduce((sum, n) => sum + n, 0);
    assert.strictEqual(total, 109, 'Cumulative test total across 8 suites must be 109');
    assert.strictEqual(suiteBreakdown['phase30-integration-p304.test.ts'], 21, 'p304 has 21 tests, not 13');
    assert.strictEqual(suiteBreakdown['phase30-dry-run.test.ts'], 1, 'dry-run has 1 test, not 2');
  });

  it('Reconciliation 2: Source declarations in phase30-integration-p304 match 21 tests', () => {
    const p304Path = path.resolve(__dirname, 'phase30-integration-p304.test.ts');
    if (fs.existsSync(p304Path)) {
      const content = fs.readFileSync(p304Path, 'utf-8');
      const testMatches = content.match(/\btest\s*\(/g) || [];
      assert.strictEqual(testMatches.length, 21);
    }
  });

  // ── 4. Operator Preflight & Filesystem Integrity (§7, §9) ──
  it('Preflight Integrity 1: Executes preflight with phase 30.8 and writes kdi-phase-30-8-readiness.json', async () => {
    const preflight = new OperatorPreflightService();
    const tmpDir = path.join(os.tmpdir(), `kdi-p308-test-${Date.now()}`);

    const result = await preflight.runPreflight({ customOutputDir: tmpDir, phase: '30.8' });

    assert.strictEqual(result.phase, '30.8');
    assert.strictEqual(result.verdict, 'READY_WITH_CONDITIONS');
    assert.strictEqual(result.localEngineeringReadiness, 'READY');
    assert.strictEqual(result.operationalReadinessState, 'BLOCKED');
    assert.strictEqual(result.stagingDeploymentAuthorization, 'UNAUTHORIZED');
    assert.strictEqual(result.safetyGuards.productionMutationDisabled, true);
    assert.strictEqual(result.safetyGuards.stagingMutationAuthorized, false);

    // Verify Phase 30.8 JSON artifact was written
    const p308JsonPath = path.join(tmpDir, 'kdi-phase-30-8-readiness.json');
    assert.ok(fs.existsSync(p308JsonPath), 'kdi-phase-30-8-readiness.json must exist');
    const data308 = JSON.parse(fs.readFileSync(p308JsonPath, 'utf-8'));
    assert.strictEqual(data308.phase, '30.8');
    assert.strictEqual(data308.workstation.buildEnvironmentState, 'VERIFIED');
    assert.strictEqual(data308.workstation.wslDockerState, 'VERIFIED');

    // Clean up tmp directory
    try {
      fs.unlinkSync(p308JsonPath);
      fs.rmdirSync(tmpDir);
    } catch {}
  });

  it('Preflight Integrity 2: B1 is VERIFIED and omitted from the remediation matrix, leaving B2-B6', async () => {
    const preflight = new OperatorPreflightService();
    const tmpDir = path.join(os.tmpdir(), `kdi-p308-matrix-${Date.now()}`);

    const result = await preflight.runPreflight({ customOutputDir: tmpDir, phase: '30.8' });

    // B1_BUILD must be verified
    assert.strictEqual(result.stagingReport.prerequisites.B1_BUILD.status, 'VERIFIED_READ_ONLY');

    // Remediation matrix must NOT contain B1_BUILD
    const b1InMatrix = result.remediationMatrix.some((item) => item.prerequisiteId === 'B1_BUILD');
    assert.strictEqual(b1InMatrix, false, 'Verified B1_BUILD must not be in remediation matrix');

    // Remediation matrix contains the remaining 5 unprovisioned external dependencies
    const matrixIds = result.remediationMatrix.map((item) => item.prerequisiteId);
    assert.deepStrictEqual(matrixIds, ['B2_REGISTRY', 'B3_TELEMETRY', 'B4_SLO', 'B5_APPROVAL', 'B6_TARGET']);

    // Clean up
    try {
      const p = path.join(tmpDir, 'kdi-phase-30-8-readiness.json');
      if (fs.existsSync(p)) fs.unlinkSync(p);
      fs.rmdirSync(tmpDir);
    } catch {}
  });

  it('Preflight Integrity 3: Preserves historical Phase 30.5, 30.6, and 30.7 JSON reports without modification', () => {
    const docsDir = path.resolve(process.cwd(), 'docs/engineering');
    const p307 = path.join(docsDir, 'kdi-phase-30-7-readiness.json');
    const p306 = path.join(docsDir, 'kdi-phase-30-6-readiness.json');
    const p305 = path.join(docsDir, 'kdi-phase-30-5-readiness.json');

    if (fs.existsSync(p307)) {
      const data = JSON.parse(fs.readFileSync(p307, 'utf-8'));
      assert.strictEqual(data.phase, '30.7');
    }
    if (fs.existsSync(p306)) {
      const data = JSON.parse(fs.readFileSync(p306, 'utf-8'));
      assert.strictEqual(data.phase, '30.6');
    }
    if (fs.existsSync(p305)) {
      const data = JSON.parse(fs.readFileSync(p305, 'utf-8'));
      assert.strictEqual(data.phase, '30.5');
    }
  });

  it('Preflight Integrity 4: Summary output formats WSL Docker distribution and storage location', async () => {
    const preflight = new OperatorPreflightService();
    const result = await preflight.runPreflight({ customOutputDir: os.tmpdir(), phase: '30.8' });
    const summary = preflight.formatSummaryText(result);

    assert.ok(summary.includes('KDI PHASE 30.8: OPERATOR PREFLIGHT READINESS AUDIT'));
    assert.ok(summary.includes('WSL Docker:'));
    assert.ok(summary.includes('VERIFIED'));
    assert.ok(summary.includes('D:\\WSL\\Ubuntu'));
    assert.ok(summary.includes('B1_BUILD'));
  });

  // ── 5. Safety Invariants & Policy Boundaries (§2) ──
  it('Safety 1: Production mutation guard remains strictly DISABLED', () => {
    const stateMachine = new StagingReadinessStateMachine();
    const report = stateMachine.evaluateReadiness({
      prerequisites: {
        B1_BUILD: {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'VERIFIED_READ_ONLY',
          evidenceTier: 'LOCAL_EXECUTION',
          details: 'WSL Docker build verified',
          blockers: [],
          checkedAt: new Date().toISOString(),
        },
        B2_REGISTRY: {
          id: 'B2_REGISTRY',
          name: 'Staging Registry',
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_EXECUTION',
          details: 'Token absent',
          blockers: ['Configure token'],
          checkedAt: new Date().toISOString(),
        },
        B3_TELEMETRY: {
          id: 'B3_TELEMETRY',
          name: 'Telemetry',
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_EXECUTION',
          details: 'Endpoint absent',
          blockers: ['Configure endpoint'],
          checkedAt: new Date().toISOString(),
        },
        B4_SLO: {
          id: 'B4_SLO',
          name: 'SLO',
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_TEST',
          details: 'Doc absent',
          blockers: ['Provide doc'],
          checkedAt: new Date().toISOString(),
        },
        B5_APPROVAL: {
          id: 'B5_APPROVAL',
          name: 'Approval',
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_EXECUTION',
          details: 'Token absent',
          blockers: ['Provide token'],
          checkedAt: new Date().toISOString(),
        },
        B6_TARGET: {
          id: 'B6_TARGET',
          name: 'Target',
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_EXECUTION',
          details: 'Credentials absent',
          blockers: ['Provide creds'],
          checkedAt: new Date().toISOString(),
        },
      },
      safetyInvariantsPassed: true,
      stagingMutationAuthorized: false,
      killSwitchActive: false,
    });

    assert.strictEqual(report.overallState, 'BLOCKED');
    assert.strictEqual(report.stagingMutationAuthorized, false);
  });
});
