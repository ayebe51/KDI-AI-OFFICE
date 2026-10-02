// ==========================================================
// services/api/src/engineering/execution/engineering-host.service.ts
// Phase 15.4: Engineering Execution Host Abstraction (§24 & §25)
// ==========================================================

import * as os from 'os';
import { StructuredLogger } from '@kdi/shared';
import { AntigravityDiscoveryService } from './antigravity-discovery.service.js';
import type { EngineeringExecutionHost } from './engineering-execution.types.js';

export class EngineeringHostService {
  private readonly logger = new StructuredLogger('EngineeringHostService');
  private readonly hostId: string;
  private readonly discoveryService: AntigravityDiscoveryService;

  constructor(discoveryService?: AntigravityDiscoveryService) {
    this.hostId = `host_${os.hostname().toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
    this.discoveryService = discoveryService || new AntigravityDiscoveryService();
  }

  /**
   * Get telemetry and capability status of the engineering execution host (§25)
   */
  public async getHostStatus(): Promise<EngineeringExecutionHost> {
    const discovery = await this.discoveryService.discover();
    const availableExecutors = ['CODING_WORKER', 'GIT_WORKTREE'];

    if (discovery.available) {
      availableExecutors.push('ANTIGRAVITY');
    }

    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const memUsagePercent = Math.round(((totalMemMb - freeMemMb) / totalMemMb) * 100);

    const capabilities = [
      'GIT_ISOLATED_WORKTREE',
      'BOUNDED_REPAIR_LOOP',
      'INDEPENDENT_TEST_VERIFIER',
      'DIFF_COLLECTOR',
      'ACCEPTANCE_CRITERIA_EVALUATOR',
    ];

    if (discovery.headlessCapable) {
      capabilities.push('ANTIGRAVITY_HEADLESS');
    }
    if (discovery.structuredOutputSupported) {
      capabilities.push('ANTIGRAVITY_STRUCTURED_OUTPUT');
    }

    return {
      hostId: this.hostId,
      platform: `${process.platform}-${process.arch}`,
      status: discovery.available ? 'ONLINE' : 'ONLINE',
      capabilities,
      availableExecutors,
      health: {
        cpuPercent: 0,
        memoryAvailableMb: freeMemMb,
        lastHeartbeat: new Date().toISOString(),
      },
    };
  }
}
