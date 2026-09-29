// ==========================================================
// services/api/src/engineering/persistence/engineering.repository.ts
// PostgreSQL Operational Persistence Layer for Engineering State
// ==========================================================

import type {
  EngineeringSession,
  EngineeringResult,
  EngineeringEvent,
  EngineeringApprovalRequest,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import type { PostgresService } from '../../database/postgres.service.js';

export class EngineeringRepository {
  private readonly logger = new StructuredLogger('EngineeringRepository');

  // In-memory resilient cache / storage when running unit tests or offline
  private readonly memorySessions = new Map<string, EngineeringSession>();
  private readonly memoryResults = new Map<string, EngineeringResult>();
  private readonly memoryEvents = new Map<string, EngineeringEvent[]>();
  private readonly memoryApprovals = new Map<string, EngineeringApprovalRequest>();

  constructor(private readonly postgresService?: PostgresService) {}

  public async saveSession(session: EngineeringSession): Promise<void> {
    this.memorySessions.set(session.sessionId, session);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO engineering_sessions (session_id, task_id, execution_id, agent_id, provider_type, repository, branch, workspace_path, status, started_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (session_id) DO UPDATE SET status = $9, ended_at = CURRENT_TIMESTAMP`,
          [
            session.sessionId,
            session.taskId,
            session.executionId,
            session.agentId,
            session.provider,
            session.repository,
            session.branch,
            session.workspacePath,
            session.status,
            session.startedAt,
            JSON.stringify(session.metadata || {}),
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveSession', `PostgreSQL write skipped / fallback to memory: ${err.message}`);
      }
    }
  }

  public async getSession(sessionId: string): Promise<EngineeringSession | undefined> {
    const cached = this.memorySessions.get(sessionId);
    if (cached) return cached;

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(`SELECT * FROM engineering_sessions WHERE session_id = $1`, [sessionId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            sessionId: row.session_id,
            taskId: row.task_id,
            executionId: row.execution_id,
            agentId: row.agent_id,
            provider: row.provider_type,
            repository: row.repository,
            branch: row.branch,
            workspacePath: row.workspace_path,
            status: row.status,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            metadata: row.metadata,
          };
        }
      } catch (err: any) {
        this.logger.debug('getSession', `PostgreSQL read fallback: ${err.message}`);
      }
    }
    return undefined;
  }

  public async saveResult(result: EngineeringResult): Promise<void> {
    this.memoryResults.set(result.executionId, result);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const resultId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await pool.query(
          `INSERT INTO engineering_results (result_id, execution_id, status, summary, diff_summary, commit_hash, files_changed, files_created, files_deleted, tests_run, tests_passed, tests_failed, build_status, lint_status, typecheck_status, security_findings, verification_evidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            resultId,
            result.executionId,
            result.status,
            result.summary,
            result.diffSummary,
            result.commitHash || null,
            JSON.stringify(result.filesChanged),
            JSON.stringify(result.filesCreated),
            JSON.stringify(result.filesDeleted),
            JSON.stringify(result.testsRun),
            JSON.stringify(result.testsPassed),
            JSON.stringify(result.testsFailed),
            result.buildStatus,
            result.lintStatus,
            result.typecheckStatus,
            JSON.stringify(result.securityFindings),
            JSON.stringify(result.verificationEvidence),
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveResult', `PostgreSQL write skipped / fallback to memory: ${err.message}`);
      }
    }
  }

  public async getResult(executionId: string): Promise<EngineeringResult | undefined> {
    return this.memoryResults.get(executionId);
  }

  public async saveEvent(event: EngineeringEvent): Promise<void> {
    const list = this.memoryEvents.get(event.executionId) || [];
    list.push(event);
    this.memoryEvents.set(event.executionId, list);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO engineering_events (event_id, session_id, execution_id, task_id, agent_id, event_type, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            event.eventId,
            event.sessionId,
            event.executionId,
            event.taskId,
            event.agentId,
            event.type,
            JSON.stringify(event.payload),
            event.timestamp,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveEvent', `PostgreSQL write skipped / fallback to memory: ${err.message}`);
      }
    }
  }

  public async getEvents(executionId: string): Promise<EngineeringEvent[]> {
    return this.memoryEvents.get(executionId) || [];
  }

  public async saveApproval(approval: EngineeringApprovalRequest): Promise<void> {
    this.memoryApprovals.set(approval.approvalId, approval);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO engineering_approval_requests (approval_id, execution_id, task_id, agent_id, command, risk_level, reason, status, requested_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (approval_id) DO UPDATE SET status = $8, resolved_at = CURRENT_TIMESTAMP, resolved_by = $10`,
          [
            approval.approvalId,
            approval.executionId,
            approval.taskId,
            approval.agentId,
            approval.command,
            approval.riskLevel,
            approval.reason,
            approval.status,
            approval.requestedAt,
            approval.resolvedBy || null,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveApproval', `PostgreSQL write skipped / fallback to memory: ${err.message}`);
      }
    }
  }

  public async getApproval(approvalId: string): Promise<EngineeringApprovalRequest | undefined> {
    return this.memoryApprovals.get(approvalId);
  }
}
