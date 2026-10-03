// ==========================================================
// services/api/src/benchmark/persistence/benchmark.repository.ts
// PostgreSQL Authoritative Persistence for Benchmark Runs & Evidence
// ==========================================================

import type {
  BenchmarkRun,
  BenchmarkArtifact,
  BenchmarkApproval,
  HumanIntervention,
  BenchmarkMetric,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import type { PostgresService } from '../../database/postgres.service.js';

export class BenchmarkRepository {
  private readonly logger = new StructuredLogger('BenchmarkRepository');

  // In-memory cache & fallback storage for resilience & unit test suites
  private readonly runs = new Map<string, BenchmarkRun>();
  private readonly artifacts = new Map<string, BenchmarkArtifact[]>();
  private readonly approvals = new Map<string, BenchmarkApproval>();
  private readonly interventions = new Map<string, HumanIntervention[]>();

  constructor(private readonly postgresService?: PostgresService) {}

  public async saveRun(run: BenchmarkRun): Promise<void> {
    this.runs.set(run.run_id, { ...run });

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO benchmark_runs (
            run_id, task_id, repository, branch, started_at, completed_at,
            status, mode, human_interventions, agent_count, tool_calls,
            test_runs, failed_tests, successful_tests, recovery_count, approval_count,
            final_artifact, final_commit, failure_reason, failure_taxonomy, metrics,
            payload
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21,
            $22
          )
          ON CONFLICT (run_id) DO UPDATE SET
            completed_at = EXCLUDED.completed_at,
            status = EXCLUDED.status,
            human_interventions = EXCLUDED.human_interventions,
            tool_calls = EXCLUDED.tool_calls,
            test_runs = EXCLUDED.test_runs,
            failed_tests = EXCLUDED.failed_tests,
            successful_tests = EXCLUDED.successful_tests,
            recovery_count = EXCLUDED.recovery_count,
            approval_count = EXCLUDED.approval_count,
            final_artifact = EXCLUDED.final_artifact,
            final_commit = EXCLUDED.final_commit,
            failure_reason = EXCLUDED.failure_reason,
            failure_taxonomy = EXCLUDED.failure_taxonomy,
            metrics = EXCLUDED.metrics,
            payload = EXCLUDED.payload`,
          [
            run.run_id,
            run.task_id,
            run.repository,
            run.branch,
            run.started_at,
            run.completed_at || null,
            run.status,
            run.mode,
            run.human_interventions,
            run.agent_count,
            run.tool_calls,
            run.test_runs,
            run.failed_tests,
            run.successful_tests,
            run.recovery_count,
            run.approval_count,
            run.final_artifact || null,
            run.final_commit || null,
            run.failure_reason || null,
            run.failure_taxonomy || null,
            JSON.stringify(run.metrics || {}),
            JSON.stringify(run),
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveRun', `PostgreSQL write skipped / fallback to memory: ${err.message}`);
      }
    }
  }

  public async getRun(runId: string): Promise<BenchmarkRun | undefined> {
    const cached = this.runs.get(runId);
    if (cached) return cached;

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(`SELECT payload FROM benchmark_runs WHERE run_id = $1`, [runId]);
        if (res.rows.length > 0 && res.rows[0].payload) {
          const run = typeof res.rows[0].payload === 'string'
            ? JSON.parse(res.rows[0].payload)
            : res.rows[0].payload;
          this.runs.set(run.run_id, run);
          return run;
        }
      } catch (err: any) {
        this.logger.debug('getRun', `PostgreSQL read fallback: ${err.message}`);
      }
    }
    return undefined;
  }

  public async listRuns(): Promise<BenchmarkRun[]> {
    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(`SELECT payload FROM benchmark_runs ORDER BY started_at DESC LIMIT 100`);
        if (res.rows.length > 0) {
          return res.rows.map((r: any) =>
            typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
          );
        }
      } catch (err: any) {
        this.logger.debug('listRuns', `PostgreSQL read fallback: ${err.message}`);
      }
    }
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }

  public async saveArtifact(runId: string, artifact: BenchmarkArtifact): Promise<void> {
    const list = this.artifacts.get(runId) || [];
    list.push(artifact);
    this.artifacts.set(runId, list);

    const run = this.runs.get(runId);
    if (run) {
      if (!run.artifacts) run.artifacts = [];
      const existingIdx = run.artifacts.findIndex((a) => a.filename === artifact.filename);
      if (existingIdx >= 0) {
        run.artifacts[existingIdx] = artifact;
      } else {
        run.artifacts.push(artifact);
      }
      await this.saveRun(run);
    }
  }

  public async getArtifacts(runId: string): Promise<BenchmarkArtifact[]> {
    const run = await this.getRun(runId);
    if (run?.artifacts) return run.artifacts;
    return this.artifacts.get(runId) || [];
  }

  public async saveApproval(approval: BenchmarkApproval): Promise<void> {
    this.approvals.set(approval.approvalId, approval);
  }

  public async getApproval(approvalId: string): Promise<BenchmarkApproval | undefined> {
    return this.approvals.get(approvalId);
  }

  public async listPendingApprovals(): Promise<BenchmarkApproval[]> {
    return Array.from(this.approvals.values()).filter((a) => a.status === 'PENDING');
  }

  public async recordIntervention(runId: string, intervention: HumanIntervention): Promise<void> {
    const list = this.interventions.get(runId) || [];
    list.push(intervention);
    this.interventions.set(runId, list);

    const run = this.runs.get(runId);
    if (run) {
      if (!run.interventions) run.interventions = [];
      run.interventions.push(intervention);
      run.human_interventions = run.interventions.length;
      await this.saveRun(run);
    }
  }

  public async getInterventions(runId: string): Promise<HumanIntervention[]> {
    return this.interventions.get(runId) || [];
  }
}
