// ==========================================================
// services/api/src/engineering/phase30/external-prerequisite-gate.ts
// Phase 30.4: External Prerequisite Verification Gate B1–B6 (§4)
// ==========================================================

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type {
  PrerequisiteId,
  PrerequisiteCheckResult,
  ReadinessState,
  DeploymentTarget,
  DeploymentEnvironment,
  SignedSloDocument,
  BuildEnvironmentState,
} from './phase30.types.js';
import { SloVerificationService } from './slo-verification.service.js';
import { ExternalTelemetryAdapter } from './external-telemetry.adapter.js';
import { SecretHygieneService } from './secret-hygiene.service.js';

export interface PrerequisiteInspectionOptions {
  targetEnvironment?: DeploymentEnvironment;
  sloDocument?: SignedSloDocument;
  sloPublicKeyPem?: string;
  simulatedEnvironment?: {
    buildState?: BuildEnvironmentState;
    hasDockerCli?: boolean;
    hasDockerDaemon?: boolean;
    remoteBuildRunnerConfigured?: boolean;
    wslDockerCli?: boolean;
    wslDockerDaemon?: boolean;
    wslDistribution?: string;
    wslStorageLocation?: string;
    registryToken?: string;
    registryWriteAuthorized?: boolean;
    telemetryEndpoint?: string;
    telemetryEnvironment?: DeploymentEnvironment;
    telegramToken?: string;
    hasKubeCredentials?: boolean;
    isTargetOverPrivileged?: boolean;
    targetNamespace?: string;
    evaluatedRoleBindings?: boolean;
  };
}

export class ExternalPrerequisiteGate {
  private readonly sloService = new SloVerificationService();
  private readonly telemetryAdapter = new ExternalTelemetryAdapter();

  /**
   * Run full inspection of all 6 external prerequisites (§4.B1–B6)
   */
  public async inspectAllPrerequisites(
    options?: PrerequisiteInspectionOptions
  ): Promise<Record<PrerequisiteId, PrerequisiteCheckResult>> {
    const b1 = await this.inspectB1BuildService(options);
    const b2 = await this.inspectB2Registry(options);
    const b3 = await this.inspectB3Telemetry(options);
    const b4 = await this.inspectB4SignedSlo(options);
    const b5 = await this.inspectB5Telegram(options);
    const b6 = await this.inspectB6Target(options);

    return {
      B1_BUILD: b1,
      B2_REGISTRY: b2,
      B3_TELEMETRY: b3,
      B4_SLO: b4,
      B5_APPROVAL: b5,
      B6_TARGET: b6,
    };
  }

  /**
   * Phase 30.6: Dedicated Staging Prerequisite Inspection (§4)
   */
  public async inspectStagingPrerequisites(
    options?: PrerequisiteInspectionOptions
  ): Promise<Record<PrerequisiteId, PrerequisiteCheckResult>> {
    return this.inspectAllPrerequisites({
      ...options,
      targetEnvironment: 'STAGING',
    });
  }

  /**
   * B1: Build Service Inspection (§4.B1)
   */
  public async inspectB1BuildService(
    options?: PrerequisiteInspectionOptions
  ): Promise<PrerequisiteCheckResult> {
    const now = new Date().toISOString();

    // Check simulated options if provided (deterministic testing)
    if (options?.simulatedEnvironment) {
      const { buildState, hasDockerCli, hasDockerDaemon, remoteBuildRunnerConfigured } =
        options.simulatedEnvironment;

      if (buildState) {
        if (buildState === 'NOT_INSTALLED') {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_TEST',
            details: '[NOT_INSTALLED] Docker is not installed on this workstation.',
            blockers: ['Install Docker CLI or configure remote container build runner.'],
            rawPayload: { buildState: 'NOT_INSTALLED', cliInstalled: false, daemonReachable: false },
            checkedAt: now,
          };
        }
        if (buildState === 'NOT_IN_PATH') {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_TEST',
            details: '[NOT_IN_PATH] Docker binary is present on disk but not discoverable in PATH.',
            blockers: ['Add Docker binary directory to PATH environment variable.'],
            rawPayload: { buildState: 'NOT_IN_PATH', cliInstalled: false, daemonReachable: false },
            checkedAt: now,
          };
        }
        if (buildState === 'DAEMON_UNREACHABLE') {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_TEST',
            details: '[DAEMON_UNREACHABLE] Docker CLI is present but Docker daemon is unreachable / not running.',
            blockers: ['Start Docker daemon or ensure service accessibility.'],
            rawPayload: { buildState: 'DAEMON_UNREACHABLE', cliInstalled: true, daemonReachable: false },
            checkedAt: now,
          };
        }
        if (buildState === 'CONFIGURED_UNVERIFIED') {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'CONFIGURED_UNVERIFIED',
            evidenceTier: 'LOCAL_TEST',
            details: '[CONFIGURED_UNVERIFIED] Remote build runner endpoint configured, but build readiness unverified.',
            blockers: ['Verify remote build runner connectivity.'],
            rawPayload: { buildState: 'CONFIGURED_UNVERIFIED', cliInstalled: false, daemonReachable: false },
            checkedAt: now,
          };
        }
        if (buildState === 'VERIFIED') {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'VERIFIED_READ_ONLY',
            evidenceTier: 'LOCAL_TEST',
            details: '[VERIFIED] Docker daemon reachable; container build environment verified.',
            blockers: [],
            rawPayload: { buildState: 'VERIFIED', cliInstalled: true, daemonReachable: true },
            checkedAt: now,
          };
        }
      }

      if (remoteBuildRunnerConfigured) {
        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'CONFIGURED_UNVERIFIED',
          evidenceTier: 'LOCAL_TEST',
          details: '[CONFIGURED_UNVERIFIED] Remote build runner endpoint configured, but build readiness unverified.',
          blockers: ['Verify remote build runner connectivity.'],
          rawPayload: { buildState: 'CONFIGURED_UNVERIFIED', cliInstalled: false, daemonReachable: false },
          checkedAt: now,
        };
      }

      if (options.simulatedEnvironment.wslDockerCli !== undefined || options.simulatedEnvironment.wslDockerDaemon !== undefined) {
        const { wslDockerCli, wslDockerDaemon, wslDistribution, wslStorageLocation } = options.simulatedEnvironment;
        if (!wslDockerCli && !hasDockerCli) {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_TEST',
            details: '[NOT_INSTALLED] Docker CLI not found in Windows PATH or WSL environment.',
            blockers: ['Install Docker CLI or configure remote container build runner.'],
            rawPayload: { buildState: 'NOT_INSTALLED', cliInstalled: false, daemonReachable: false },
            checkedAt: now,
          };
        }
        if (wslDockerCli && !wslDockerDaemon) {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_TEST',
            details: '[DAEMON_UNREACHABLE] Docker CLI is present in WSL but Docker daemon is unreachable / not running.',
            blockers: ['Start Docker daemon inside WSL distribution.'],
            rawPayload: { buildState: 'DAEMON_UNREACHABLE', context: 'WSL', cliInstalled: true, daemonReachable: false },
            checkedAt: now,
          };
        }
        if (wslDockerCli && wslDockerDaemon) {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'VERIFIED_READ_ONLY',
            evidenceTier: 'LOCAL_TEST',
            details: `[VERIFIED] Docker daemon reachable via WSL (${wslDistribution || 'Ubuntu'}); container build environment verified.`,
            blockers: [],
            rawPayload: {
              buildState: 'VERIFIED',
              context: 'WSL',
              distribution: wslDistribution || 'Ubuntu',
              storageLocation: wslStorageLocation || 'D:\\WSL\\Ubuntu',
              cliInstalled: true,
              daemonReachable: true,
            },
            checkedAt: now,
          };
        }
      }

      if (!hasDockerCli) {
        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: '[NOT_INSTALLED] Docker CLI not found in PATH or environment.',
          blockers: ['Install Docker CLI or configure remote container build runner.'],
          rawPayload: { buildState: 'NOT_INSTALLED', cliInstalled: false, daemonReachable: false },
          checkedAt: now,
        };
      }
      if (!hasDockerDaemon) {
        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: '[DAEMON_UNREACHABLE] Docker CLI is present but Docker daemon is unreachable / not running.',
          blockers: ['Start Docker daemon or ensure service accessibility.'],
          rawPayload: { buildState: 'DAEMON_UNREACHABLE', cliInstalled: true, daemonReachable: false },
          checkedAt: now,
        };
      }
      return {
        id: 'B1_BUILD',
        name: 'Artifact & Container Build Service',
        status: 'VERIFIED_READ_ONLY',
        evidenceTier: 'LOCAL_TEST',
        details: '[VERIFIED] Docker daemon reachable; container build environment verified.',
        blockers: [],
        rawPayload: { buildState: 'VERIFIED', cliInstalled: true, daemonReachable: true },
        checkedAt: now,
      };
    }

    // Actual system inspection
    try {
      const cliResult = await this.runCommandWithTimeout('docker --version', 2000);
      if (cliResult.success) {
        const daemonResult = await this.runCommandWithTimeout(
          'docker info --format "{{.ServerVersion}}"',
          2500
        );
        if (!daemonResult.success) {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_EXECUTION',
            details:
              '[DAEMON_UNREACHABLE] Docker CLI is installed and in PATH, but the Docker daemon is unreachable / not running.',
            blockers: ['Start Docker desktop or daemon service.'],
            rawPayload: {
              buildState: 'DAEMON_UNREACHABLE',
              cliInstalled: true,
              daemonReachable: false,
              error: daemonResult.error,
            },
            checkedAt: now,
          };
        }

        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'VERIFIED_READ_ONLY',
          evidenceTier: 'LOCAL_EXECUTION',
          details: `[VERIFIED] Docker build daemon is reachable (Server Version: ${daemonResult.output.trim()}).`,
          blockers: [],
          rawPayload: {
            buildState: 'VERIFIED',
            cliInstalled: true,
            daemonReachable: true,
            version: daemonResult.output.trim(),
          },
          checkedAt: now,
        };
      }

      // Check WSL Docker environment if Windows host check failed
      const wslCheck = await this.runCommandWithTimeout(
        'wsl.exe -d Ubuntu -e bash -c "command -v docker"',
        2500
      );
      if (wslCheck.success && wslCheck.output.trim().includes('docker')) {
        const wslDaemonResult = await this.runCommandWithTimeout(
          'wsl.exe -d Ubuntu -e bash -c "docker info --format \\"{{.ServerVersion}}\\""',
          8000
        );
        if (!wslDaemonResult.success) {
          return {
            id: 'B1_BUILD',
            name: 'Artifact & Container Build Service',
            status: 'BLOCKED',
            evidenceTier: 'LOCAL_EXECUTION',
            details:
              '[DAEMON_UNREACHABLE] Docker CLI is installed in WSL (Ubuntu on drive D:), but Docker daemon is unreachable / not running.',
            blockers: ['Start Docker daemon inside WSL distribution (e.g., sudo service docker start).'],
            rawPayload: {
              buildState: 'DAEMON_UNREACHABLE',
              context: 'WSL',
              distribution: 'Ubuntu',
              cliInstalled: true,
              daemonReachable: false,
              error: wslDaemonResult.error,
            },
            checkedAt: now,
          };
        }

        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'VERIFIED_READ_ONLY',
          evidenceTier: 'LOCAL_EXECUTION',
          details: `[VERIFIED] WSL Docker build daemon is reachable (Server Version: ${wslDaemonResult.output.trim()} in Ubuntu distribution stored on drive D:).`,
          blockers: [],
          rawPayload: {
            buildState: 'VERIFIED',
            context: 'WSL',
            distribution: 'Ubuntu',
            cliInstalled: true,
            daemonReachable: true,
            version: wslDaemonResult.output.trim(),
            storageLocation: 'D:\\WSL\\Ubuntu',
          },
          checkedAt: now,
        };
      }

      // Check remote build runner
      const remoteRunner =
        process.env.REMOTE_BUILD_RUNNER_URL || process.env.BUILD_RUNNER_ENDPOINT;
      if (remoteRunner) {
        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'CONFIGURED_UNVERIFIED',
          evidenceTier: 'LOCAL_EXECUTION',
          details:
            '[CONFIGURED_UNVERIFIED] Remote build runner endpoint configured, but build readiness unverified.',
          blockers: ['Verify remote build runner connectivity.'],
          rawPayload: {
            buildState: 'CONFIGURED_UNVERIFIED',
            cliInstalled: false,
            daemonReachable: false,
            remoteRunnerConfigured: true,
          },
          checkedAt: now,
        };
      }

      // Check standard installation paths on disk
      const standardPaths = [
        'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
        'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
        '/usr/bin/docker',
        '/usr/local/bin/docker',
      ];
      const foundOnDisk = standardPaths.find((p) => fs.existsSync(p));

      if (foundOnDisk) {
        return {
          id: 'B1_BUILD',
          name: 'Artifact & Container Build Service',
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_EXECUTION',
          details: `[NOT_IN_PATH] Docker binary found at '${foundOnDisk}' but is not discoverable in PATH.`,
          blockers: ['Add Docker binary directory to PATH environment variable.'],
          rawPayload: {
            buildState: 'NOT_IN_PATH',
            cliInstalled: false,
            daemonReachable: false,
            binaryPath: foundOnDisk,
          },
          checkedAt: now,
        };
      }

      return {
        id: 'B1_BUILD',
        name: 'Artifact & Container Build Service',
        status: 'BLOCKED',
        evidenceTier: 'LOCAL_EXECUTION',
        details:
          '[NOT_INSTALLED] Docker CLI executable not found in PATH or WSL on current workstation.',
        blockers: ['Install Docker or authenticate remote CI build service.'],
        rawPayload: {
          buildState: 'NOT_INSTALLED',
          cliInstalled: false,
          daemonReachable: false,
        },
        checkedAt: now,
      };
    } catch (err) {
      return {
        id: 'B1_BUILD',
        name: 'Artifact & Container Build Service',
        status: 'BLOCKED',
        evidenceTier: 'LOCAL_EXECUTION',
        details: `Failed to inspect build service: ${(err as Error).message}`,
        blockers: ['Ensure build tools are installed and accessible.'],
        rawPayload: {
          buildState: 'NOT_INSTALLED',
          cliInstalled: false,
          daemonReachable: false,
          error: (err as Error).message,
        },
        checkedAt: now,
      };
    }
  }

  /**
   * B2: OCI Registry Inspection (§4.B2)
   */
  public async inspectB2Registry(
    options?: PrerequisiteInspectionOptions
  ): Promise<PrerequisiteCheckResult> {
    const now = new Date().toISOString();
    const isStaging = options?.targetEnvironment === 'STAGING';
    const namespace = isStaging
      ? 'ghcr.io/koneksi-digital-inovasi/staging'
      : 'ghcr.io/koneksi-digital-inovasi';
    const name = isStaging
      ? 'Staging OCI Artifact Registry'
      : 'Production OCI Artifact Registry';

    if (options?.simulatedEnvironment) {
      const { registryToken, registryWriteAuthorized } = options.simulatedEnvironment;
      if (!registryToken) {
        return {
          id: 'B2_REGISTRY',
          name,
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_TEST',
          details: `No authentication credentials configured for registry namespace '${namespace}'.`,
          blockers: [`Configure push/pull token for ${namespace}.`],
          rawPayload: {
            namespace,
            authenticated: false,
            writeAuthorized: false,
            permissions: {
              registryAuthentication: false,
              canInspectOrPull: false,
              canPushOrPublish: false,
              artifactVerified: false,
            },
          },
          checkedAt: now,
        };
      }

      // Invariant: Presence of environment variable alone does not prove authenticated access (§4.B2)
      if (registryToken === 'INVALID_TOKEN' || registryToken.length < 10) {
        return {
          id: 'B2_REGISTRY',
          name,
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: `Registry token is invalid or rejected during read-only authentication check.`,
          blockers: ['Provide a valid GitHub Container Registry personal access token.'],
          rawPayload: {
            namespace,
            authenticated: false,
            writeAuthorized: false,
            permissions: {
              registryAuthentication: false,
              canInspectOrPull: false,
              canPushOrPublish: false,
              artifactVerified: false,
            },
          },
          checkedAt: now,
        };
      }

      const isWriteAuthorized = !!registryWriteAuthorized;
      return {
        id: 'B2_REGISTRY',
        name,
        status: 'VERIFIED_READ_ONLY',
        evidenceTier: 'LOCAL_TEST',
        details: isStaging
          ? `Authenticated read-only connectivity verified for staging namespace '${namespace}'. Production write credentials not required.`
          : `Authenticated read-only connectivity verified for namespace '${namespace}'.`,
        blockers: [],
        rawPayload: {
          namespace,
          authenticated: true,
          writeAuthorized: isWriteAuthorized,
          permissions: {
            registryAuthentication: true,
            canInspectOrPull: true,
            canPushOrPublish: isWriteAuthorized,
            artifactVerified: false,
          },
        },
        checkedAt: now,
      };
    }

    // Actual environment inspection
    const token = isStaging
      ? process.env.GHCR_STAGING_TOKEN || process.env.GHCR_TOKEN || process.env.GITHUB_TOKEN
      : process.env.GHCR_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) {
      return {
        id: 'B2_REGISTRY',
        name,
        status: 'NOT_CONFIGURED',
        evidenceTier: 'LOCAL_EXECUTION',
        details: isStaging
          ? `No GHCR_STAGING_TOKEN, GHCR_TOKEN, or GITHUB_TOKEN configured in workstation environment for ${namespace}.`
          : `No GHCR_TOKEN or GITHUB_TOKEN configured in workstation environment for ${namespace}.`,
        blockers: [`Configure authenticated read/write token for ${namespace}.`],
        rawPayload: {
          namespace,
          authenticated: false,
          writeAuthorized: false,
          permissions: {
            registryAuthentication: false,
            canInspectOrPull: false,
            canPushOrPublish: false,
            artifactVerified: false,
          },
        },
        checkedAt: now,
      };
    }

    return {
      id: 'B2_REGISTRY',
      name,
      status: 'CONFIGURED_UNVERIFIED',
      evidenceTier: 'LOCAL_EXECUTION',
      details: `Registry token is present in environment, but live registry network connection not executed.`,
      blockers: ['Perform read-only registry authentication handshake.'],
      rawPayload: {
        namespace,
        configured: true,
        authenticated: false,
        writeAuthorized: false,
        permissions: {
          registryAuthentication: false,
          canInspectOrPull: false,
          canPushOrPublish: false,
          artifactVerified: false,
        },
      },
      checkedAt: now,
    };
  }

  /**
   * B3: Live Telemetry Provider Inspection (§4.B3)
   */
  public async inspectB3Telemetry(
    options?: PrerequisiteInspectionOptions
  ): Promise<PrerequisiteCheckResult> {
    const now = new Date().toISOString();
    const isStaging = options?.targetEnvironment === 'STAGING';
    const targetEnv = options?.targetEnvironment || 'PRODUCTION';
    const name = isStaging
      ? 'Authoritative Staging Telemetry'
      : 'Authoritative Production Telemetry';

    if (options?.simulatedEnvironment) {
      const { telemetryEndpoint, telemetryEnvironment } = options.simulatedEnvironment;
      if (!telemetryEndpoint) {
        return {
          id: 'B3_TELEMETRY',
          name,
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_TEST',
          details: 'No Prometheus or Datadog telemetry provider endpoint configured.',
          blockers: ['Configure PROMETHEUS_ENDPOINT or DATADOG_API_KEY.'],
          rawPayload: { providerConfigured: false },
          checkedAt: now,
        };
      }

      // Check environment scope
      if (telemetryEnvironment && telemetryEnvironment !== targetEnv) {
        return {
          id: 'B3_TELEMETRY',
          name,
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: `Telemetry environment mismatch: Metrics are tagged '${telemetryEnvironment}', but target environment is '${targetEnv}'.`,
          blockers: [`Configure telemetry provider scoped to ${targetEnv}.`],
          rawPayload: { providerConfigured: true, environmentMismatch: true },
          checkedAt: now,
        };
      }

      return {
        id: 'B3_TELEMETRY',
        name,
        status: 'VERIFIED_READ_ONLY',
        evidenceTier: 'LOCAL_TEST',
        details: `Telemetry provider endpoint verified and returning active metric signals for ${targetEnv}.`,
        blockers: [],
        rawPayload: { providerConfigured: true, endpoint: SecretHygieneService.sanitize(telemetryEndpoint) },
        checkedAt: now,
      };
    }

    // Actual environment inspection
    const endpoint = isStaging
      ? process.env.PROMETHEUS_STAGING_ENDPOINT || process.env.PROMETHEUS_ENDPOINT || process.env.DATADOG_STAGING_API_KEY || process.env.DATADOG_API_KEY
      : process.env.PROMETHEUS_ENDPOINT || process.env.DATADOG_API_KEY;
    if (!endpoint) {
      return {
        id: 'B3_TELEMETRY',
        name,
        status: 'NOT_CONFIGURED',
        evidenceTier: 'LOCAL_EXECUTION',
        details: isStaging
          ? 'No live staging telemetry provider configured (PROMETHEUS_STAGING_ENDPOINT / DATADOG_STAGING_API_KEY absent).'
          : 'No live telemetry provider configured (PROMETHEUS_ENDPOINT / DATADOG_API_KEY absent).',
        blockers: ['Provide reachable Prometheus or Datadog APM endpoint.'],
        rawPayload: { providerConfigured: false },
        checkedAt: now,
      };
    }

    return {
      id: 'B3_TELEMETRY',
      name,
      status: 'CONFIGURED_UNVERIFIED',
      evidenceTier: 'LOCAL_EXECUTION',
      details: 'Telemetry provider is configured but live query not executed.',
      blockers: ['Verify metric scrape freshness from live endpoint.'],
      rawPayload: { providerConfigured: true },
      checkedAt: now,
    };
  }

  /**
   * B4: Signed Production / Staging SLOs (§4.B4)
   */
  public async inspectB4SignedSlo(
    options?: PrerequisiteInspectionOptions
  ): Promise<PrerequisiteCheckResult> {
    const now = new Date().toISOString();
    const isStaging = options?.targetEnvironment === 'STAGING';
    const targetEnv = options?.targetEnvironment || 'PRODUCTION';
    const name = isStaging
      ? 'Signed Staging SLO Configuration'
      : 'Signed Production SLO Configuration';

    if (!options?.sloDocument || !options?.sloPublicKeyPem) {
      return {
        id: 'B4_SLO',
        name,
        status: 'NOT_CONFIGURED',
        evidenceTier: 'LOCAL_TEST',
        details: isStaging
          ? 'Authoritative signed staging SLO configuration document or public key is missing.'
          : 'Authoritative signed production SLO configuration document or public key is missing.',
        blockers: ['Provide versioned SLO document signed with Ed25519 digital signature.'],
        rawPayload: { hasDocument: !!options?.sloDocument, hasPublicKey: !!options?.sloPublicKeyPem },
        checkedAt: now,
      };
    }

    // Invariant: Environment mismatch between SLO document and inspection target
    if (options.sloDocument.environment !== targetEnv) {
      return {
        id: 'B4_SLO',
        name,
        status: 'BLOCKED',
        evidenceTier: 'LOCAL_TEST',
        details: `SLO environment mismatch: Document is scoped for '${options.sloDocument.environment}', but target environment is '${targetEnv}'.`,
        blockers: [`Provide an authoritative signed SLO document scoped strictly for '${targetEnv}'.`],
        rawPayload: { valid: false, scopeMismatch: true },
        checkedAt: now,
      };
    }

    const verification = this.sloService.verifySloDocument(
      options.sloDocument,
      options.sloPublicKeyPem
    );

    if (!verification.valid) {
      return {
        id: 'B4_SLO',
        name,
        status: 'BLOCKED',
        evidenceTier: 'LOCAL_TEST',
        details: `SLO failed verification: ${verification.reason}`,
        blockers: ['Ensure SLO document is signed with authorized Ed25519 key and has not expired or altered.'],
        rawPayload: { valid: false, reason: verification.reason },
        checkedAt: now,
      };
    }

    return {
      id: 'B4_SLO',
      name,
      status: 'VERIFIED_READ_ONLY',
      evidenceTier: 'LOCAL_TEST',
      details: `Ed25519 signed ${targetEnv.toLowerCase()} SLO verified (Version: ${options.sloDocument.version}, KeyId: ${options.sloDocument.keyId}).`,
      blockers: [],
      rawPayload: {
        valid: true,
        version: options.sloDocument.version,
        thresholds: verification.verifiedThresholds,
      },
      checkedAt: now,
    };
  }

  /**
   * B5: Telegram Human Approval (§4.B5)
   */
  public async inspectB5Telegram(
    options?: PrerequisiteInspectionOptions
  ): Promise<PrerequisiteCheckResult> {
    const now = new Date().toISOString();

    if (options?.simulatedEnvironment) {
      const { telegramToken } = options.simulatedEnvironment;
      if (!telegramToken) {
        return {
          id: 'B5_APPROVAL',
          name: 'Telegram Human Approval Delivery',
          status: 'NOT_CONFIGURED',
          evidenceTier: 'LOCAL_TEST',
          details: 'TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_ID is not configured.',
          blockers: ['Set TELEGRAM_BOT_TOKEN and TELEGRAM_OWNER_ID in .env.'],
          rawPayload: {
            configured: false,
            credentialsConfigured: false,
            providerAuthVerified: false,
            approvalDeliveryVerified: false,
            humanApprovalReceived: false,
            releaseAuthorizationValid: false,
          },
          checkedAt: now,
        };
      }

      // Check token format
      const isValidFormat = /^\d{8,12}:[A-Za-z0-9_-]{30,}$/.test(telegramToken);
      if (!isValidFormat) {
        return {
          id: 'B5_APPROVAL',
          name: 'Telegram Human Approval Delivery',
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: 'Telegram bot token format is invalid.',
          blockers: ['Provide a valid Telegram bot token from BotFather.'],
          rawPayload: {
            configured: true,
            validFormat: false,
            credentialsConfigured: true,
            providerAuthVerified: false,
            approvalDeliveryVerified: false,
            humanApprovalReceived: false,
            releaseAuthorizationValid: false,
          },
          checkedAt: now,
        };
      }

      // Invariant: Bot auth check success does NOT equal human approval delivery! (§4.B5)
      return {
        id: 'B5_APPROVAL',
        name: 'Telegram Human Approval Delivery',
        status: 'VERIFIED_READ_ONLY',
        evidenceTier: 'LOCAL_TEST',
        details: 'Telegram bot token format and configuration validated. Note: Bot authentication does not equal approval completion.',
        blockers: [],
        rawPayload: {
          configured: true,
          validFormat: true,
          humanApprovalCompleted: false,
          credentialsConfigured: true,
          providerAuthVerified: true,
          approvalDeliveryVerified: false,
          humanApprovalReceived: false,
          releaseAuthorizationValid: false,
        },
        checkedAt: now,
      };
    }

    // Actual environment inspection
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return {
        id: 'B5_APPROVAL',
        name: 'Telegram Human Approval Delivery',
        status: 'NOT_CONFIGURED',
        evidenceTier: 'LOCAL_EXECUTION',
        details: 'TELEGRAM_BOT_TOKEN is not configured in workstation environment.',
        blockers: ['Provide TELEGRAM_BOT_TOKEN and TELEGRAM_OWNER_ID in .env.'],
        rawPayload: {
          configured: false,
          credentialsConfigured: false,
          providerAuthVerified: false,
          approvalDeliveryVerified: false,
          humanApprovalReceived: false,
          releaseAuthorizationValid: false,
        },
        checkedAt: now,
      };
    }

    return {
      id: 'B5_APPROVAL',
      name: 'Telegram Human Approval Delivery',
      status: 'CONFIGURED_UNVERIFIED',
      evidenceTier: 'LOCAL_EXECUTION',
      details: 'Telegram bot token is present in environment, but webhook/poll connectivity unverified.',
      blockers: ['Perform read-only getMe authentication check.'],
      rawPayload: {
        configured: true,
        credentialsConfigured: true,
        providerAuthVerified: false,
        approvalDeliveryVerified: false,
        humanApprovalReceived: false,
        releaseAuthorizationValid: false,
      },
      checkedAt: now,
    };
  }

  /**
   * B6: Deployment Target Connectivity (§4.B6)
   */
  public async inspectB6Target(
    options?: PrerequisiteInspectionOptions
  ): Promise<PrerequisiteCheckResult> {
    const now = new Date().toISOString();
    const isStaging = options?.targetEnvironment === 'STAGING';
    const name = isStaging
      ? 'Staging Deployment Target Connectivity & Permissions'
      : 'Deployment Target Connectivity & Permissions';

    if (options?.simulatedEnvironment) {
      const { hasKubeCredentials, isTargetOverPrivileged, targetNamespace, evaluatedRoleBindings } =
        options.simulatedEnvironment;

      if (!hasKubeCredentials) {
        return {
          id: 'B6_TARGET',
          name,
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: 'No Kubernetes credentials or target cluster access credentials configured.',
          blockers: [
            isStaging
              ? 'Configure scoped kubeconfig restricted strictly to designated staging namespace.'
              : 'Configure scoped kubeconfig restricted strictly to designated canary namespace.',
          ],
          rawPayload: {
            hasCredentials: false,
            evaluatedRoleBindings: false,
            canInspectWorkload: false,
            canMutate: false,
          },
          checkedAt: now,
        };
      }

      // Invariant: Staging namespace mismatch
      if (isStaging && targetNamespace && targetNamespace !== 'staging') {
        return {
          id: 'B6_TARGET',
          name,
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details: `Target namespace mismatch for staging: Target configured with namespace '${targetNamespace}', but staging requires 'staging'.`,
          blockers: ['Restrict target kubeconfig strictly to staging namespace.'],
          rawPayload: {
            hasCredentials: true,
            targetNamespace,
            expectedNamespace: 'staging',
            isNamespaceRestricted: false,
            evaluatedRoleBindings: !!evaluatedRoleBindings,
            canInspectWorkload: false,
            canMutate: false,
          },
          checkedAt: now,
        };
      }

      // Invariant: Overly privileged / cluster-admin permissions must be rejected (§4.B6)
      if (isTargetOverPrivileged) {
        return {
          id: 'B6_TARGET',
          name,
          status: 'BLOCKED',
          evidenceTier: 'LOCAL_TEST',
          details:
            'Target credentials grant excessive permissions (wildcard cluster-admin detected). Must be namespace-scoped.',
          blockers: ['Restrict target service account permissions strictly to target canary namespace.'],
          rawPayload: {
            hasCredentials: true,
            excessivePrivilege: true,
            hasExcessiveClusterPrivilege: true,
            isNamespaceRestricted: false,
            evaluatedRoleBindings: true,
            canInspectWorkload: false,
            canMutate: false,
          },
          checkedAt: now,
        };
      }

      return {
        id: 'B6_TARGET',
        name,
        status: 'VERIFIED_READ_ONLY',
        evidenceTier: 'LOCAL_TEST',
        details: isStaging
          ? 'Target staging cluster connectivity verified with appropriately restricted namespace permissions.'
          : 'Target cluster connectivity verified with appropriately restricted namespace permissions.',
        blockers: [],
        rawPayload: {
          hasCredentials: true,
          excessivePrivilege: false,
          hasExcessiveClusterPrivilege: false,
          targetNamespace: isStaging ? 'staging' : (targetNamespace || 'production-canary'),
          isNamespaceRestricted: true,
          evaluatedRoleBindings: true,
          canInspectWorkload: true,
          canMutate: false,
        },
        checkedAt: now,
      };
    }

    // Actual environment inspection
    const kubeconfig = isStaging
      ? process.env.KUBECONFIG_STAGING || process.env.KUBECONFIG
      : process.env.KUBECONFIG;
    if (!kubeconfig) {
      return {
        id: 'B6_TARGET',
        name,
        status: 'BLOCKED',
        evidenceTier: 'LOCAL_EXECUTION',
        details: 'No KUBECONFIG or cluster access credentials found on current workstation.',
        blockers: [
          isStaging
            ? 'Provide scoped Kubernetes service account credentials for staging target cluster.'
            : 'Provide scoped Kubernetes service account credentials for target cluster.',
        ],
        rawPayload: {
          hasCredentials: false,
          evaluatedRoleBindings: false,
          canInspectWorkload: false,
          canMutate: false,
        },
        checkedAt: now,
      };
    }

    return {
      id: 'B6_TARGET',
      name,
      status: 'CONFIGURED_UNVERIFIED',
      evidenceTier: 'LOCAL_EXECUTION',
      details: 'KUBECONFIG is set, but read-only cluster permissions have not been evaluated.',
      blockers: ['Execute read-only authorization check against target namespace.'],
      rawPayload: {
        hasCredentials: true,
        evaluatedRoleBindings: false,
        canInspectWorkload: false,
        canMutate: false,
      },
      checkedAt: now,
    };
  }

  /**
   * Helper to execute CLI command with a strict bounded timeout
   */
  private runCommandWithTimeout(
    command: string,
    timeoutMs: number
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      child_process.exec(
        command,
        { timeout: timeoutMs, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              output: stdout || '',
              error: stderr || error.message,
            });
          } else {
            resolve({
              success: true,
              output: stdout || '',
            });
          }
        }
      );
    });
  }
}
