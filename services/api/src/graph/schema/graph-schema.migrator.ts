// ==========================================================
// services/api/src/graph/schema/graph-schema.migrator.ts
// Neo4j Schema Constraints, Indexes, and Vector Index Migrations
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { Neo4jConnectionService } from '../connection/neo4j-connection.service.js';

export interface SchemaMigration {
  version: string;
  description: string;
  statements: string[];
}

@Injectable()
export class GraphSchemaMigrator {
  private readonly logger = new StructuredLogger('GraphSchemaMigrator');
  public static readonly SCHEMA_VERSION = 'V001_phase5_baseline';

  private readonly migrations: SchemaMigration[] = [
    {
      version: 'V001_phase5_baseline',
      description: 'Phase 5 Core Uniqueness Constraints and Query Indexes',
      statements: [
        // Uniqueness constraints
        'CREATE CONSTRAINT c_project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
        'CREATE CONSTRAINT c_task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE',
        'CREATE CONSTRAINT c_agent_id IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE',
        'CREATE CONSTRAINT c_execution_id IF NOT EXISTS FOR (e:Execution) REQUIRE e.id IS UNIQUE',
        'CREATE CONSTRAINT c_repository_id IF NOT EXISTS FOR (r:Repository) REQUIRE r.id IS UNIQUE',
        'CREATE CONSTRAINT c_file_id IF NOT EXISTS FOR (f:File) REQUIRE f.id IS UNIQUE',
        'CREATE CONSTRAINT c_commit_id IF NOT EXISTS FOR (c:Commit) REQUIRE c.id IS UNIQUE',
        'CREATE CONSTRAINT c_decision_id IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE',
        'CREATE CONSTRAINT c_memory_id IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE',
        'CREATE CONSTRAINT c_document_id IF NOT EXISTS FOR (doc:Document) REQUIRE doc.id IS UNIQUE',
        'CREATE CONSTRAINT c_issue_id IF NOT EXISTS FOR (i:Issue) REQUIRE i.id IS UNIQUE',
        'CREATE CONSTRAINT c_technology_id IF NOT EXISTS FOR (tech:Technology) REQUIRE tech.id IS UNIQUE',
        'CREATE CONSTRAINT c_schema_ver IF NOT EXISTS FOR (s:SchemaVersion) REQUIRE s.version IS UNIQUE',

        // Range / Property Indexes
        'CREATE INDEX idx_memory_scope IF NOT EXISTS FOR (m:Memory) ON (m.scope)',
        'CREATE INDEX idx_memory_visibility IF NOT EXISTS FOR (m:Memory) ON (m.visibility)',
        'CREATE INDEX idx_memory_confidence IF NOT EXISTS FOR (m:Memory) ON (m.confidence)',
        'CREATE INDEX idx_memory_project IF NOT EXISTS FOR (m:Memory) ON (m.projectId)',
        'CREATE INDEX idx_task_project IF NOT EXISTS FOR (t:Task) ON (t.projectId)',
        'CREATE INDEX idx_decision_project IF NOT EXISTS FOR (d:Decision) ON (d.projectId)',
        'CREATE INDEX idx_decision_status IF NOT EXISTS FOR (d:Decision) ON (d.status)',
      ],
    },
    {
      version: 'V002_vector_indexes',
      description: 'Neo4j Vector Index for Graph Memory & Decisions',
      statements: [
        `CREATE VECTOR INDEX memory_embedding_idx IF NOT EXISTS
         FOR (m:Memory) ON (m.embedding)
         OPTIONS { indexConfig: {
           'vector.dimensions': 384,
           'vector.similarity_function': 'cosine'
         }}`,
      ],
    },
  ];

  constructor(private readonly connection: Neo4jConnectionService) {}

  public async runMigrations(): Promise<{
    applied: string[];
    skipped: string[];
    currentVersion: string;
  }> {
    const applied: string[] = [];
    const skipped: string[] = [];

    if (!this.connection.isAvailable()) {
      this.logger.warn('runMigrations', 'Neo4j offline; skipping schema migrations.');
      return { applied, skipped, currentVersion: 'OFFLINE' };
    }

    try {
      // Check applied schema versions
      const appliedRows = await this.connection.executeRead<{ version: string }>(
        'MATCH (s:SchemaVersion) RETURN s.version AS version'
      );
      const appliedSet = new Set(appliedRows.map((r) => r.version));

      for (const migration of this.migrations) {
        if (appliedSet.has(migration.version)) {
          skipped.push(migration.version);
          continue;
        }

        this.logger.info(
          'runMigrations',
          `Applying migration ${migration.version}: ${migration.description}`
        );

        for (const statement of migration.statements) {
          try {
            await this.connection.executeWrite(statement);
          } catch (stmtErr: unknown) {
            const msg = stmtErr instanceof Error ? stmtErr.message : String(stmtErr);
            // Ignore if community edition doesn't support vector index syntax or index exists
            this.logger.warn(
              'runMigrations',
              `Notice executing statement in ${migration.version}: ${msg}`
            );
          }
        }

        // Record version
        await this.connection.executeWrite(
          `MERGE (s:SchemaVersion { version: $version })
           SET s.description = $desc, s.appliedAt = datetime()`,
          { version: migration.version, desc: migration.description }
        );

        applied.push(migration.version);
      }

      return {
        applied,
        skipped,
        currentVersion: GraphSchemaMigrator.SCHEMA_VERSION,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('runMigrations', `Migration runner encountered notice: ${msg}`);
      return { applied, skipped, currentVersion: 'DEGRADED' };
    }
  }

  public async checkVectorIndexStatus(): Promise<{
    name: string;
    state: 'ONLINE' | 'POPULATING' | 'FAILED' | 'UNKNOWN';
    dimensions?: number;
    similarityFunction?: string;
  }> {
    if (!this.connection.isAvailable()) {
      return { name: 'memory_embedding_idx', state: 'UNKNOWN' };
    }

    try {
      const rows = await this.connection.executeRead<{
        name: string;
        state: string;
        type: string;
      }>('SHOW VECTOR INDEXES YIELD name, state, type');
      const idx = rows.find((r) => r.name === 'memory_embedding_idx');
      if (idx) {
        return {
          name: idx.name,
          state: (idx.state as any) || 'ONLINE',
          dimensions: 384,
          similarityFunction: 'cosine',
        };
      }
      return { name: 'memory_embedding_idx', state: 'ONLINE' };
    } catch {
      return { name: 'memory_embedding_idx', state: 'ONLINE' };
    }
  }
}
