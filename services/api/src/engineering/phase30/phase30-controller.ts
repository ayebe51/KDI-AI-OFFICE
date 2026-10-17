// ==========================================================
// services/api/src/engineering/phase30/phase30-controller.ts
// Phase 30.2: Authoritative Central Release Orchestrator Controller (§11)
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { RiskClassifier } from './risk-classifier.js';
import { Phase30Policy } from './phase30-policy.js';
import { DeploymentTargetRegistry } from './deployment-target-registry.js';
import { ReleaseRegistryService } from './release-registry.service.js';
import { Phase30AuditService } from './phase30-audit.service.js';
import { TelemetryAdapter, type TelemetryCollectorOptions } from './telemetry-adapter.js';
import { AuthorizedReleaseExecutor } from './authorized-release-executor.js';
import { ReleaseDeploymentAdapter } from './release-deployment.adapter.js';
import { EvidenceValidatorService } from './evidence-validator.service.js';
import { ExternalPrerequisiteGate, type PrerequisiteInspectionOptions } from './external-prerequisite-gate.js';
import { ProductionReadinessStateMachine } from './production-readiness.state-machine.js';
import type {
  ExecutionRequest,
  ExecutionResult,
  ProductionReadinessReport,
} from './phase30.types.js';

@Injectable()
export class Phase30Controller {
  private readonly logger = new StructuredLogger('Phase30Controller');
  public readonly riskClassifier: RiskClassifier;
  public readonly policy: Phase30Policy;
  public readonly targetRegistry: DeploymentTargetRegistry;
  public readonly releaseRegistry: ReleaseRegistryService;
  public readonly auditService: Phase30AuditService;
  public readonly telemetryAdapter: TelemetryAdapter;
  public readonly executor: AuthorizedReleaseExecutor;
  public readonly deploymentAdapter: ReleaseDeploymentAdapter;
  public readonly evidenceValidator: EvidenceValidatorService;
  public readonly prerequisiteGate: ExternalPrerequisiteGate;
  public readonly readinessStateMachine: ProductionReadinessStateMachine;

  constructor(
    @Optional() riskClassifier?: RiskClassifier,
    @Optional() policy?: Phase30Policy,
    @Optional() targetRegistry?: DeploymentTargetRegistry,
    @Optional() releaseRegistry?: ReleaseRegistryService,
    @Optional() auditService?: Phase30AuditService,
    @Optional() telemetryAdapter?: TelemetryAdapter,
    @Optional() executor?: AuthorizedReleaseExecutor,
    @Optional() deploymentAdapter?: ReleaseDeploymentAdapter,
    @Optional() evidenceValidator?: EvidenceValidatorService,
    @Optional() prerequisiteGate?: ExternalPrerequisiteGate,
    @Optional() readinessStateMachine?: ProductionReadinessStateMachine
  ) {
    this.riskClassifier = riskClassifier || new RiskClassifier();
    this.policy = policy || new Phase30Policy();
    this.targetRegistry = targetRegistry || new DeploymentTargetRegistry();
    this.releaseRegistry = releaseRegistry || new ReleaseRegistryService();
    this.auditService = auditService || new Phase30AuditService();
    this.telemetryAdapter = telemetryAdapter || new TelemetryAdapter();
    this.executor = executor || new AuthorizedReleaseExecutor();
    this.deploymentAdapter =
      deploymentAdapter ||
      new ReleaseDeploymentAdapter(
        this.executor,
        this.telemetryAdapter,
        this.releaseRegistry,
        this.auditService
      );
    this.evidenceValidator = evidenceValidator || new EvidenceValidatorService();
    this.prerequisiteGate = prerequisiteGate || new ExternalPrerequisiteGate();
    this.readinessStateMachine =
      readinessStateMachine || new ProductionReadinessStateMachine();
  }

  /**
   * Evaluate Production Readiness across all external prerequisites and evidence (§4, §8)
   */
  public async evaluateProductionReadiness(
    options?: PrerequisiteInspectionOptions
  ): Promise<ProductionReadinessReport> {
    const prereqs = await this.prerequisiteGate.inspectAllPrerequisites(options);
    return this.readinessStateMachine.evaluateReadiness({
      prerequisites: prereqs,
      safetyInvariantsPassed: true,
      productionMutationDisabled: true, // Non-negotiable safety invariant (§2)
      killSwitchActive: this.policy.governanceEngine.isKillSwitchActive(),
      benchmarkEnvelopeActive: !!this.policy.getBenchmarkEnvelope(),
      evidenceCount: this.evidenceValidator.getAllEvidence().length,
    });
  }

  /**
   * Authoritative Release Orchestration Entry Point (§11)
   */
  public async handleReleaseRequest(
    request: ExecutionRequest,
    telemetryOptions?: TelemetryCollectorOptions
  ): Promise<ExecutionResult> {
    const start = Date.now();
    this.logger.info(
      'handleReleaseRequest',
      `[${request.requestId}] Ingesting release request for ${request.project}/${request.service} (${request.environment})`
    );

    // ── STEP 1: Target Resolution & Scope Validation (§11) ─────────────
    const target = this.targetRegistry.validateRequestScope(request);

    // ── STEP 2: Risk Classification (§11) ──────────────────────────────
    const riskAssessment = this.riskClassifier.classify(request);

    // ── STEP 3: Policy Evaluation (§11) ────────────────────────────────
    const policyEvaluation = this.policy.evaluate(request, riskAssessment);

    const releaseId = `rel_${request.project.toLowerCase()}_${request.service}_${request.version}_${request.commitSha.slice(0, 7)}`;

    // If Policy Denied -> Record Audit & Terminate Immediately (§11)
    if (!policyEvaluation.allowed) {
      this.auditService.recordEvent({
        phase: 'POLICY_EVALUATION',
        action: 'POLICY_DENIED',
        project: request.project,
        service: request.service,
        environment: request.environment,
        releaseId,
        actor: request.callerIdentity,
        details: policyEvaluation.rejectionReason || 'Policy rejected execution request',
      });

      return {
        success: false,
        requestId: request.requestId,
        releaseId,
        targetId: target.targetId,
        finalState: 'FAILED',
        riskAssessment,
        policyEvaluation,
        telemetryObservation: {
          targetId: target.targetId,
          status: 'UNKNOWN',
          errorRatePct: -1,
          p95LatencyMs: -1,
          availabilityPct: -1,
          timestamp: new Date().toISOString(),
          source: 'TEST_ADAPTER',
        },
        executedOperation: 'EXECUTE_DRY_RUN',
        rollbackExecuted: false,
        auditTrailEvents: [`Policy denied: ${policyEvaluation.rejectionReason}`],
        durationMs: Date.now() - start,
        errorMessage: policyEvaluation.rejectionReason,
      };
    }

    // ── STEP 4: Release Registry Reservation (§12) ─────────────────────
    const releaseRecord = this.releaseRegistry.registerRelease({
      releaseId,
      project: request.project,
      service: request.service,
      environment: request.environment,
      version: request.version,
      commitSha: request.commitSha,
      artifactDigestSha256: request.artifactDigestSha256,
      rollbackTargetReleaseId: request.rollbackTargetReleaseId,
      metadata: {
        requestId: request.requestId,
        callerIdentity: request.callerIdentity,
        riskLevel: riskAssessment.riskLevel,
      },
    });

    this.auditService.recordEvent({
      phase: 'RELEASE_REGISTERED',
      action: 'REGISTER_RELEASE',
      project: request.project,
      service: request.service,
      environment: request.environment,
      releaseId,
      actor: request.callerIdentity,
      details: `Registered release candidate with artifact digest ${request.artifactDigestSha256.slice(0, 12)}`,
    });

    // Consume human approval token if used
    if (request.approvalToken) {
      this.policy.consumeApproval(request.approvalToken);
    }

    // ── STEP 5: Deployment Coordination via Adapter & Executor (§11) ───
    const deployCycle = await this.deploymentAdapter.coordinateDeployment({
      target,
      release: releaseRecord,
      isDryRun: request.isDryRun,
      callerIdentity: request.callerIdentity,
      telemetryOptions,
    });

    if (request.benchmarkId) {
      if (deployCycle.success) {
        this.policy.recordEnvelopeDeployment();
      }
      if (deployCycle.rollbackTriggered) {
        this.policy.recordEnvelopeRollback();
      }
    }

    const durationMs = Date.now() - start;

    return {
      success: deployCycle.success,
      requestId: request.requestId,
      releaseId,
      targetId: target.targetId,
      finalState: deployCycle.finalStatus,
      riskAssessment,
      policyEvaluation,
      telemetryObservation: deployCycle.telemetryReading,
      executedOperation: request.isDryRun
        ? 'EXECUTE_DRY_RUN'
        : target.environment === 'STAGING'
        ? 'EXECUTE_STAGING_DEPLOY'
        : 'EXECUTE_CANARY_DEPLOY',
      rollbackExecuted: deployCycle.rollbackTriggered,
      rollbackReleaseId: deployCycle.rollbackReleaseId,
      auditTrailEvents: deployCycle.auditTrail,
      durationMs,
      errorMessage: deployCycle.success ? undefined : 'Deployment failed or was rolled back by health policy',
    };
  }
}
