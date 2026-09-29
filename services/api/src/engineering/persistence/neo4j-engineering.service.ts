// ==========================================================
// services/api/src/engineering/persistence/neo4j-engineering.service.ts
// Neo4j Relationship & Engineering Context Graph Ingestion Service
// ==========================================================

import type {
  EngineeringSession,
  EngineeringResult,
  EngineeringExecutionContext,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import type { Neo4jService } from '../../database/neo4j.service.js';

export class Neo4jEngineeringService {
  private readonly logger = new StructuredLogger('Neo4jEngineeringService');

  constructor(private readonly neo4jService?: Neo4jService) {}

  /**
   * Ingest engineering graph nodes and relationships:
   * (:Agent)-[:EXECUTED]->(:EngineeringExecution)-[:FOR_TASK]->(:Task)
   * (:EngineeringExecution)-[:WORKED_ON]->(:Project)
   * (:EngineeringExecution)-[:PRODUCED]->(:Commit)-[:CHANGED]->(:File)
   */
  public async ingestExecutionGraph(
    session: EngineeringSession,
    result: EngineeringResult,
    context: EngineeringExecutionContext
  ): Promise<void> {
    const driver = this.neo4jService?.getDriver();
    if (!driver) {
      this.logger.debug('ingestExecutionGraph', 'Neo4j driver offline / skipped');
      return;
    }

    const neoSession = driver.session();
    try {
      const cypher = `
        MERGE (a:Agent { agent_id: $agentId })
        MERGE (t:Task { task_id: $taskId })
        MERGE (p:Project { project_id: $projectId })
        MERGE (e:EngineeringExecution { execution_id: $executionId })
          SET e.status = $status,
              e.summary = $summary,
              e.duration_ms = $durationMs,
              e.timestamp = datetime($timestamp)

        MERGE (a)-[:EXECUTED]->(e)
        MERGE (e)-[:FOR_TASK]->(t)
        MERGE (e)-[:WORKED_ON]->(p)

        FOREACH (file IN $filesChanged |
          MERGE (f:File { path: file })
          MERGE (e)-[:CHANGED]->(f)
        )
      `;

      await neoSession.run(cypher, {
        agentId: session.agentId,
        taskId: session.taskId,
        projectId: context.projectId || 'PRJ-KDI',
        executionId: session.executionId,
        status: result.status,
        summary: result.summary,
        durationMs: 1200,
        timestamp: new Date().toISOString(),
        filesChanged: result.filesChanged || [],
      });

      // If commit produced, link commit node
      if (result.commitHash) {
        const commitCypher = `
          MATCH (e:EngineeringExecution { execution_id: $executionId })
          MERGE (c:Commit { hash: $commitHash })
          MERGE (e)-[:PRODUCED]->(c)
          FOREACH (file IN $filesChanged |
            MERGE (f:File { path: file })
            MERGE (c)-[:CHANGED]->(f)
          )
        `;
        await neoSession.run(commitCypher, {
          executionId: session.executionId,
          commitHash: result.commitHash,
          filesChanged: result.filesChanged || [],
        });
      }

      this.logger.info(
        'ingestExecutionGraph',
        `Ingested engineering graph for execution ${session.executionId}`
      );
    } catch (err: any) {
      this.logger.warn('ingestExecutionGraph', `Neo4j ingestion error: ${err.message}`);
    } finally {
      await neoSession.close();
    }
  }
}
