// ==========================================================
// services/api/src/engineering/phase30/risk-classifier.ts
// Phase 30.2: Deterministic Risk Classification Engine (§11)
// ==========================================================

import type { RiskAssessment, RiskLevel, ExecutionRequest } from './phase30.types.js';

export class RiskClassifier {
  public classify(request: ExecutionRequest): RiskAssessment {
    const reasons: string[] = [];
    let riskLevel: RiskLevel = 'LOW';
    let blastRadius: 'ISOLATED' | 'SERVICE' | 'PLATFORM' = 'ISOLATED';
    let isDatabaseMigrationRequired = false;
    let isSchemaBreaking = false;

    // 1. Environment evaluation
    if (request.environment === 'PRODUCTION' && !request.benchmarkId && !request.isDryRun) {
      blastRadius = 'SERVICE';
      reasons.push('Target environment is PRODUCTION; blast radius elevated to SERVICE');
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    } else if (request.environment === 'PRODUCTION') {
      blastRadius = 'ISOLATED';
      reasons.push('Production target evaluated under bounded canary / benchmark envelope');
    }

    // 2. Changed files analysis
    const files = request.changedFiles || [];
    for (const f of files) {
      const lower = f.toLowerCase();

      // Database migration patterns
      if (lower.includes('migration') || lower.endsWith('.sql') || lower.includes('schema')) {
        isDatabaseMigrationRequired = true;
        reasons.push(`Database migration detected in file: ${f}`);
        if (lower.includes('drop') || lower.includes('truncate') || lower.includes('alter_table')) {
          isSchemaBreaking = true;
          riskLevel = 'CRITICAL';
          blastRadius = 'PLATFORM';
          reasons.push(`Potentially schema-breaking or irreversible DDL detected in: ${f}`);
        } else {
          if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
        }
      }

      // Security sensitive components
      if (
        lower.includes('auth') ||
        lower.includes('guard') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('policy')
      ) {
        if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
        reasons.push(`Security-critical component modified: ${f}`);
      }

      // Infrastructure and orchestration files
      if (
        lower.includes('docker') ||
        lower.includes('k8s') ||
        lower.includes('infra') ||
        lower.includes('.env') ||
        lower.includes('workflow')
      ) {
        blastRadius = 'PLATFORM';
        if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
        reasons.push(`Platform infrastructure configuration modified: ${f}`);
      }
    }

    // 3. Multi-service impact
    if (files.length > 10) {
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      reasons.push(`Broad change scope (>10 files modified: ${files.length} files)`);
    }

    // 4. Determine human approval requirement
    const requiresHumanApproval =
      request.environment === 'PRODUCTION' ||
      riskLevel === 'CRITICAL' ||
      riskLevel === 'HIGH' ||
      isSchemaBreaking;

    return {
      riskLevel,
      blastRadius,
      isDatabaseMigrationRequired,
      isSchemaBreaking,
      requiresHumanApproval,
      reasons,
    };
  }
}
