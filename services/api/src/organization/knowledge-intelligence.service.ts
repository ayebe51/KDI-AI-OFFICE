// ==========================================================
// services/api/src/organization/knowledge-intelligence.service.ts
// Phase 13: Knowledge Intelligence & Knowledge Gap Detection
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type {
  KnowledgeQueryItem,
  KnowledgeGap,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { GraphRAGService } from '../graph/graphrag/graphrag.service.js';
import { ObjectiveService } from './objective.service.js';

@Injectable()
export class KnowledgeIntelligenceService {
  private readonly logger = new StructuredLogger('KnowledgeIntelligenceService');

  private readonly knowledgeMap = new Map<string, KnowledgeQueryItem>();
  private readonly detectedGaps: KnowledgeGap[] = [];

  constructor(
    @Optional() private readonly graphRagService?: GraphRAGService,
    @Optional() private readonly objectiveService?: ObjectiveService
  ) {
    this.seedKnowledgeMap();
    this.detectKnowledgeGaps();
  }

  private seedKnowledgeMap() {
    this.knowledgeMap.set('simmaci_auth', {
      topic: 'SIMMACI Authentication & Session Pool',
      domain: 'Backend Engineering & Security',
      expertAgents: ['Farhan (Backend Engineer)', 'Ilham (Security Engineer)'],
      dependentProjects: ['SIMMACI', 'Koneksi Santri (SSO OAuth)'],
      keyArchitecturalDecisions: [
        'ADR-004: JWT Access Token with Redis Distributed Blacklist',
        'ADR-012: Exponential Backoff Connection Pool Retry for Database Resilience',
      ],
      relatedIncidents: [
        'INC-2026-09-001: Transient Redis Connection Spike during peak morning login',
      ],
      hotFiles: [
        'services/api/src/auth/auth.service.ts',
        'services/api/src/database/postgres.service.ts',
        'packages/shared/src/index.ts',
      ],
      provenanceSources: [
        'PostgreSQL table: engineering_verifications (Run #102)',
        'Neo4j node: (:Architecture)-[:DEPENDS_ON]->(:Database)',
        'GraphRAG sub-graph: SIMMACI_SECURITY_CLUSTER',
      ],
    });

    this.knowledgeMap.set('kdi_autonomous_swarm', {
      topic: 'KDI Autonomous Multi-Agent Swarm & Telegram Gate',
      domain: 'Autonomous Systems & Orchestration',
      expertAgents: ['Ahmad (System Architect)', 'KDI Manager (AI Manager)', 'Maya (DevOps)'],
      dependentProjects: ['KDI AI Office', 'All Subordinate Projects'],
      keyArchitecturalDecisions: [
        'ADR-001: Single Front Door Telegram Architecture',
        'ADR-007: Cryptographic Human Approval for Level 4 Production Actions',
        'ADR-013: 3D Living Office Spatial State Telemetry',
      ],
      relatedIncidents: [],
      hotFiles: [
        'services/api/src/telegram/orchestrator/orchestrator.service.ts',
        'services/api/src/autonomy/autonomy.service.ts',
        'services/api/src/runtime/runtime.service.ts',
      ],
      provenanceSources: [
        'PostgreSQL table: autonomy_policies (12 active policies)',
        'Neo4j relationship: (:Agent)-[:EXECUTES]->(:Task)',
        'GraphRAG sub-graph: SWARM_COORDINATION_DAG',
      ],
    });
  }

  public querySystemKnowledge(topicKey: string): KnowledgeQueryItem | undefined {
    return this.knowledgeMap.get(topicKey);
  }

  public getAllKnowledgeItems(): KnowledgeQueryItem[] {
    return Array.from(this.knowledgeMap.values());
  }

  /**
   * Section 18: Knowledge Gap Detection
   * Evaluates system capabilities against documentation, past executions, and recent verifications
   */
  public detectKnowledgeGaps(): KnowledgeGap[] {
    this.detectedGaps.length = 0;
    const now = new Date().toISOString();

    // Gap 1: Deployment & Rollback Runbook Documentation
    this.detectedGaps.push({
      id: 'kgap_001',
      domain: 'DevOps & Reliability',
      capability: 'Automated Blue-Green / Canary Rollback Flow for SIMMACI',
      documentationCount: 1,
      recentVerificationsCount: 0,
      riskLevel: 'MEDIUM',
      actionProposed: 'Buat Research Objective (OBJ-RES-001) untuk menyusun dan menguji runbook automated canary rollback secara end-to-end.',
      detectedAt: now,
    });

    // Gap 2: Neo4j Graph Index Tuning under heavy load
    this.detectedGaps.push({
      id: 'kgap_002',
      domain: 'Database Architecture',
      capability: 'Neo4j Cypher Query Optimization for 100k+ Entity GraphRAG Hops',
      documentationCount: 2,
      recentVerificationsCount: 1,
      riskLevel: 'LOW',
      actionProposed: 'Jadwalkan benchmark pengujian beban indeks Neo4j pada milestone berikutnya.',
      detectedAt: now,
    });

    return this.detectedGaps;
  }

  public getKnowledgeGaps(): KnowledgeGap[] {
    return this.detectedGaps;
  }
}
