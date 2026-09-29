// ==========================================================
// services/api/src/llm/registries/capability.registry.ts
// Canonical Capability Normalization & Matching Logic
// ==========================================================

import type { ModelCapability, ModelMetadata, PrivacyClass } from '@kdi/types';

export class CapabilityRegistry {
  /**
   * Check if a model satisfies all required capabilities
   */
  public static satisfiesCapabilities(
    model: ModelMetadata,
    required: ModelCapability[]
  ): boolean {
    if (!required || required.length === 0) return true;
    const modelCaps = new Set(model.capabilities);

    for (const cap of required) {
      if (!modelCaps.has(cap)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Verify if model complies with the privacy classification
   */
  public static satisfiesPrivacy(
    model: ModelMetadata,
    privacyClass: PrivacyClass
  ): boolean {
    switch (privacyClass) {
      case 'CONFIDENTIAL':
        // CONFIDENTIAL: Local execution only; cloud strictly forbidden
        return model.local && model.private;

      case 'PRIVATE':
        // PRIVATE: Local preferred, sovereign execution
        return model.local || model.private;

      case 'SENSITIVE':
        // SENSITIVE: Private cloud or local allowed, no third-party prompt training
        return true;

      case 'INTERNAL':
      case 'PUBLIC':
      default:
        // Any enabled model permitted
        return true;
    }
  }

  /**
   * Filter candidates based on capabilities and privacy rules
   */
  public static filterCompliantModels(
    models: ModelMetadata[],
    requiredCaps: ModelCapability[] = [],
    privacyClass: PrivacyClass = 'INTERNAL'
  ): ModelMetadata[] {
    return models.filter((m) => {
      if (!m.enabled) return false;
      if (!this.satisfiesPrivacy(m, privacyClass)) return false;
      if (!this.satisfiesCapabilities(m, requiredCaps)) return false;
      return true;
    });
  }
}
