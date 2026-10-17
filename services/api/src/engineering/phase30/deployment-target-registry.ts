// ==========================================================
// services/api/src/engineering/phase30/deployment-target-registry.ts
// Phase 30.2: Authoritative Deployment Target Registry & Scope Validator (§11, §12)
// ==========================================================

import type { DeploymentTarget, ExecutionRequest, DeploymentEnvironment } from './phase30.types.js';

export class TargetScopeMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TargetScopeMismatchError';
  }
}

export class UnknownDeploymentTargetError extends Error {
  constructor(public readonly targetId: string) {
    super(`UnknownDeploymentTargetError: Target '${targetId}' is not registered in deployment target registry.`);
    this.name = 'UnknownDeploymentTargetError';
  }
}

export class DeploymentTargetRegistry {
  private readonly targets = new Map<string, DeploymentTarget>();

  constructor() {
    this.seedDefaultTargets();
  }

  private seedDefaultTargets(): void {
    // 1. SIMMACI targets
    this.registerTarget({
      targetId: 'tgt_simmaci_local_dry_run',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'LOCAL_DRY_RUN',
      cluster: 'local-docker-desktop',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'http://localhost:8081/health',
      allowedOperations: ['EXECUTE_DRY_RUN', 'VERIFY_TARGET_HEALTH'],
    });

    this.registerTarget({
      targetId: 'tgt_simmaci_staging',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'STAGING',
      cluster: 'simmaci-k8s-staging',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'https://staging.simmaci.kdi-office.id/health',
      allowedOperations: ['EXECUTE_STAGING_DEPLOY', 'EXECUTE_ROLLBACK', 'VERIFY_TARGET_HEALTH', 'EXECUTE_DRY_RUN'],
    });

    this.registerTarget({
      targetId: 'tgt_simmaci_production',
      project: 'SIMMACI',
      service: 'simmaci-academic-portal',
      environment: 'PRODUCTION',
      cluster: 'simmaci-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://simmaci.kdi-office.id/health',
      allowedOperations: [
        'EXECUTE_CANARY_DEPLOY',
        'EXECUTE_PROMOTION',
        'EXECUTE_ROLLBACK',
        'VERIFY_TARGET_HEALTH',
        'EXECUTE_DRY_RUN',
      ],
    });

    // 2. ILMORA targets
    this.registerTarget({
      targetId: 'tgt_ilmora_local_dry_run',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'LOCAL_DRY_RUN',
      cluster: 'local-docker-desktop',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'http://localhost:8082/health',
      allowedOperations: ['EXECUTE_DRY_RUN', 'VERIFY_TARGET_HEALTH'],
    });

    this.registerTarget({
      targetId: 'tgt_ilmora_staging',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'STAGING',
      cluster: 'ilmora-k8s-staging',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'https://staging.ilmora.kdi-office.id/health',
      allowedOperations: ['EXECUTE_STAGING_DEPLOY', 'EXECUTE_ROLLBACK', 'VERIFY_TARGET_HEALTH', 'EXECUTE_DRY_RUN'],
    });

    this.registerTarget({
      targetId: 'tgt_ilmora_production',
      project: 'ILMORA',
      service: 'ilmora-lms-core',
      environment: 'PRODUCTION',
      cluster: 'ilmora-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://ilmora.kdi-office.id/health',
      allowedOperations: [
        'EXECUTE_CANARY_DEPLOY',
        'EXECUTE_PROMOTION',
        'EXECUTE_ROLLBACK',
        'VERIFY_TARGET_HEALTH',
        'EXECUTE_DRY_RUN',
      ],
    });

    // 3. KDI targets
    this.registerTarget({
      targetId: 'tgt_kdi_local_dry_run',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      cluster: 'local-windows-host',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'http://localhost:3000/api/health',
      allowedOperations: ['EXECUTE_DRY_RUN', 'VERIFY_TARGET_HEALTH'],
    });

    this.registerTarget({
      targetId: 'tgt_kdi_staging',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'STAGING',
      cluster: 'kdi-k8s-staging',
      isProduction: false,
      requiresHumanApproval: false,
      healthEndpoint: 'https://staging.api.kdi-office.id/health',
      allowedOperations: ['EXECUTE_STAGING_DEPLOY', 'EXECUTE_ROLLBACK', 'VERIFY_TARGET_HEALTH', 'EXECUTE_DRY_RUN'],
    });

    this.registerTarget({
      targetId: 'tgt_kdi_production',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'PRODUCTION',
      cluster: 'kdi-k8s-prod',
      isProduction: true,
      requiresHumanApproval: true,
      healthEndpoint: 'https://api.kdi-office.id/health',
      allowedOperations: [
        'EXECUTE_CANARY_DEPLOY',
        'EXECUTE_PROMOTION',
        'EXECUTE_ROLLBACK',
        'VERIFY_TARGET_HEALTH',
        'EXECUTE_DRY_RUN',
      ],
    });
  }

  public registerTarget(target: DeploymentTarget): void {
    this.targets.set(target.targetId, target);
  }

  public getTarget(targetId: string): DeploymentTarget {
    const t = this.targets.get(targetId);
    if (!t) {
      throw new UnknownDeploymentTargetError(targetId);
    }
    return t;
  }

  public resolveTarget(
    project: 'SIMMACI' | 'ILMORA' | 'KDI',
    service: string,
    environment: DeploymentEnvironment
  ): DeploymentTarget {
    for (const t of this.targets.values()) {
      if (t.project === project && t.service === service && t.environment === environment) {
        return t;
      }
    }
    throw new UnknownDeploymentTargetError(`${project}/${service}/${environment}`);
  }

  public validateRequestScope(request: ExecutionRequest): DeploymentTarget {
    const target = this.getTarget(request.targetId);

    // Cross-project validation
    if (target.project !== request.project) {
      throw new TargetScopeMismatchError(
        `Cross-project mismatch: Request project '${request.project}' does not match target project '${target.project}'`
      );
    }

    // Service validation
    if (target.service !== request.service) {
      throw new TargetScopeMismatchError(
        `Service mismatch: Request service '${request.service}' does not match target service '${target.service}'`
      );
    }

    // Environment validation
    if (target.environment !== request.environment) {
      throw new TargetScopeMismatchError(
        `Environment mismatch: Request environment '${request.environment}' does not match target environment '${target.environment}'`
      );
    }

    return target;
  }
}
