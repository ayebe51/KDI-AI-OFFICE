// ==========================================================
// services/api/src/engineering/phase30/release-deployment.adapter.ts
// Phase 30.2: Release Deployment Adapter & Canary State Machine Coordinator (§11, §12)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { AuthorizedReleaseExecutor } from './authorized-release-executor.js';
import { TelemetryAdapter, type TelemetryCollectorOptions } from './telemetry-adapter.js';
import { ReleaseRegistryService } from './release-registry.service.js';
import { Phase30AuditService } from './phase30-audit.service.js';
import type {
  DeploymentTarget,
  ReleaseRecord,
  TelemetryReading,
  ReleaseStatus,
} from './phase30.types.js';

export interface DeploymentCycleResult {
  success: boolean;
  finalStatus: ReleaseStatus;
  telemetryReading: TelemetryReading;
  rollbackTriggered: boolean;
  rollbackReleaseId?: string;
  auditTrail: string[];
}

@Injectable()
export class ReleaseDeploymentAdapter {
  constructor(
    public readonly executor: AuthorizedReleaseExecutor,
    public readonly telemetry: TelemetryAdapter,
    public readonly registry: ReleaseRegistryService,
    public readonly audit: Phase30AuditService
  ) {}

  /**
   * Coordinate progressive delivery cycle through executor and telemetry gates (§11)
   */
  public async coordinateDeployment(params: {
    target: DeploymentTarget;
    release: ReleaseRecord;
    isDryRun: boolean;
    callerIdentity: string;
    telemetryOptions?: TelemetryCollectorOptions;
  }): Promise<DeploymentCycleResult> {
    const auditTrail: string[] = [];

    // 1. Dry Run / Local Target Path
    if (params.target.environment === 'LOCAL_DRY_RUN' || (params.isDryRun && params.target.environment !== 'PRODUCTION')) {
      const execRes = await this.executor.executeOperation({
        operation: 'EXECUTE_DRY_RUN',
        target: params.target,
        release: params.release,
        isDryRun: true,
      });

      this.audit.recordEvent({
        phase: 'DRY_RUN',
        action: 'EXECUTE_DRY_RUN',
        project: params.target.project,
        service: params.target.service,
        environment: params.target.environment,
        releaseId: params.release.releaseId,
        actor: params.callerIdentity,
        details: execRes.output,
      });

      auditTrail.push(execRes.output);

      const reading = await this.telemetry.observeTarget(params.target, params.telemetryOptions);
      this.registry.updateReleaseStatus(params.release.releaseId, 'STAGED');

      return {
        success: true,
        finalStatus: 'STAGED',
        telemetryReading: reading,
        rollbackTriggered: false,
        auditTrail,
      };
    }

    // 2. Staging Path
    if (params.target.environment === 'STAGING') {
      const execRes = await this.executor.executeOperation({
        operation: 'EXECUTE_STAGING_DEPLOY',
        target: params.target,
        release: params.release,
        isDryRun: false,
      });

      this.audit.recordEvent({
        phase: 'STAGING_DEPLOY',
        action: 'EXECUTE_STAGING_DEPLOY',
        project: params.target.project,
        service: params.target.service,
        environment: params.target.environment,
        releaseId: params.release.releaseId,
        actor: params.callerIdentity,
        details: execRes.output,
      });

      auditTrail.push(execRes.output);

      const reading = await this.telemetry.observeTarget(params.target, params.telemetryOptions);
      const isEligible = this.telemetry.isEligibleForPromotion(reading);

      if (!isEligible.eligible) {
        this.registry.updateReleaseStatus(params.release.releaseId, 'FAILED');
        return {
          success: false,
          finalStatus: 'FAILED',
          telemetryReading: reading,
          rollbackTriggered: false,
          auditTrail,
        };
      }

      this.registry.updateReleaseStatus(params.release.releaseId, 'ACTIVE');
      return {
        success: true,
        finalStatus: 'ACTIVE',
        telemetryReading: reading,
        rollbackTriggered: false,
        auditTrail,
      };
    }

    // 3. Production Canary Path (Emulated in Phase 30.2 since production mutation is disabled)
    // Step 3.1: Canary Deployment
    this.registry.updateReleaseStatus(params.release.releaseId, 'CANARY');
    const canaryRes = await this.executor.executeOperation({
      operation: 'EXECUTE_CANARY_DEPLOY',
      target: params.target,
      release: params.release,
      isDryRun: true,
      canaryPercentage: 10,
    });
    auditTrail.push(canaryRes.output);

    // Step 3.2: Observe Telemetry
    const telemetryReading = await this.telemetry.observeTarget(params.target, params.telemetryOptions);

    // Step 3.3: Evaluate Health Gate
    const promoCheck = this.telemetry.isEligibleForPromotion(telemetryReading);

    if (!promoCheck.eligible) {
      // Automatic Rollback Triggered (§14)
      auditTrail.push(`Canary Health Check Failed: ${promoCheck.reason}. Triggering automatic rollback.`);
      this.audit.recordEvent({
        phase: 'CANARY_HEALTH_FAILURE',
        action: 'TRIGGER_ROLLBACK',
        project: params.target.project,
        service: params.target.service,
        environment: params.target.environment,
        releaseId: params.release.releaseId,
        actor: 'AUTONOMOUS_POLICY_GATE',
        details: promoCheck.reason || 'Telemetry check failed',
      });

      const rbRes = await this.executor.executeOperation({
        operation: 'EXECUTE_ROLLBACK',
        target: params.target,
        release: params.release,
        isDryRun: true,
      });
      auditTrail.push(rbRes.output);

      this.registry.updateReleaseStatus(params.release.releaseId, 'ROLLED_BACK');

      return {
        success: false,
        finalStatus: 'ROLLED_BACK',
        telemetryReading,
        rollbackTriggered: true,
        rollbackReleaseId: params.release.rollbackTargetReleaseId,
        auditTrail,
      };
    }

    // Step 3.4: Promotion to 100% Active
    const promoRes = await this.executor.executeOperation({
      operation: 'EXECUTE_PROMOTION',
      target: params.target,
      release: params.release,
      isDryRun: true,
    });
    auditTrail.push(promoRes.output);

    this.registry.updateReleaseStatus(params.release.releaseId, 'ACTIVE');

    return {
      success: true,
      finalStatus: 'ACTIVE',
      telemetryReading,
      rollbackTriggered: false,
      auditTrail,
    };
  }
}
