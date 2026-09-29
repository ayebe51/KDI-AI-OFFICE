// ==========================================================
// services/api/src/llm/governance/cost.estimator.ts
// Accurate Token Cost Estimation & Billing Mode Verification
// ==========================================================

import type { ModelMetadata } from '@kdi/types';

export interface CostCalculationResult {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  currency: 'USD';
  pricingSource: string;
  pricingVersion: string;
  isConfirmedFree: boolean;
}

export class CostEstimator {
  public static calculateCost(
    model: ModelMetadata,
    inputTokens: number,
    outputTokens: number
  ): CostCalculationResult {
    // If provider/model is local or explicitly verified free
    if (model.local || model.billingMode === 'FREE') {
      return {
        inputCostUsd: 0,
        outputCostUsd: 0,
        totalCostUsd: 0,
        currency: 'USD',
        pricingSource: model.pricing.pricingSource || 'local_verified_free',
        pricingVersion: model.pricing.pricingVersion || 'v1',
        isConfirmedFree: true,
      };
    }

    // Explicit pricing calculation based on per-million rates
    const inputCost = (inputTokens / 1_000_000) * model.pricing.inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * model.pricing.outputCostPerMillion;
    const totalCost = Number((inputCost + outputCost).toFixed(6));

    return {
      inputCostUsd: Number(inputCost.toFixed(6)),
      outputCostUsd: Number(outputCost.toFixed(6)),
      totalCostUsd: totalCost,
      currency: 'USD',
      pricingSource: model.pricing.pricingSource,
      pricingVersion: model.pricing.pricingVersion,
      isConfirmedFree: false,
    };
  }
}
