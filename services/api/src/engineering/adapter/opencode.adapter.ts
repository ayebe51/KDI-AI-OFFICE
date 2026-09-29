// ==========================================================
// services/api/src/engineering/adapter/opencode.adapter.ts
// STATUS: DEPRECATED / INACTIVE / FUTURE EXPERIMENTAL ADAPTER
// ==========================================================
// In accordance with ADR-018 and Phase 4 Architecture Revision,
// OpenCode is no longer the primary software engineering execution layer.
// Primary engineering execution authority is transferred to Google Antigravity.
// This adapter is preserved strictly as an inactive/optional future plugin stub.
// ==========================================================

import type {
  EngineeringProviderType,
  EngineeringExecutionContext,
  EngineeringResult,
  EngineeringUsage,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export class OpenCodeAdapter {
  private readonly logger = new StructuredLogger('OpenCodeAdapter');
  public readonly providerType: EngineeringProviderType = 'opencode';
  public readonly isEnabled = false;

  constructor() {
    this.logger.debug('constructor', 'OpenCodeAdapter initialized in DEPRECATED / INACTIVE mode');
  }

  public async isAvailable(): Promise<boolean> {
    // Intentionally returns false in Phase 4
    return false;
  }

  public async execute(
    _prompt: string,
    _context: EngineeringExecutionContext
  ): Promise<{
    result: string;
    usage: EngineeringUsage;
  }> {
    throw new Error(
      'PROVIDER_DEPRECATED: OpenCode is disabled in Phase 4. Antigravity is the canonical engineering execution provider.'
    );
  }
}
