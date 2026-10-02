// ==========================================================
// services/api/src/telegram/persistence/telegram.repository.ts
// PostgreSQL & Resilient In-Memory Repository for Telegram Operations
// ==========================================================

import type {
  TelegramIdentity,
  TelegramConversation,
  TelegramConversationMessage,
  TelegramApproval,
  TelegramNotification,
  TelegramAuditLog,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import type { PostgresService } from '../../database/postgres.service.js';
import type { RedisService } from '../../database/redis.service.js';

export interface TelegramCommandRecord {
  commandId: string;
  conversationId?: string;
  correlationId: string;
  rawInput: string;
  classification: string;
  intent: string;
  taskId?: string;
  executionStatus: string;
  createdAt: string;
}

export class TelegramRepository {
  private readonly logger = new StructuredLogger('TelegramRepository');

  // Resilient in-memory storage for test/offline/graceful fallback
  private readonly memoryIdentities = new Map<string, TelegramIdentity>();
  private readonly memoryConversations = new Map<string, TelegramConversation>();
  private readonly memoryMessages = new Map<string, TelegramConversationMessage[]>();
  private readonly memoryApprovals = new Map<string, TelegramApproval>();
  private readonly memoryNotifications = new Map<string, TelegramNotification>();
  private readonly memoryAuditLogs: TelegramAuditLog[] = [];
  private readonly memoryProcessedUpdates = new Set<number>();
  private readonly memoryCommands = new Map<string, TelegramCommandRecord>();

  constructor(
    private readonly postgresService?: PostgresService,
    private readonly redisService?: RedisService
  ) {}

  // ----------------------------------------------------------
  // 1. UPDATE DEDUPLICATION
  // ----------------------------------------------------------

  public async isUpdateProcessed(updateId: number): Promise<boolean> {
    // 1. Check in-memory first
    if (this.memoryProcessedUpdates.has(updateId)) {
      return true;
    }

    // 2. Check Redis if available
    const redis = this.redisService?.getClient();
    if (redis && redis.status === 'ready') {
      try {
        const exists = await redis.sismember('telegram:processed_updates', updateId.toString());
        if (exists === 1) {
          this.memoryProcessedUpdates.add(updateId);
          return true;
        }
      } catch (err: any) {
        this.logger.debug('isUpdateProcessed', `Redis query error: ${err.message}`);
      }
    }

    // 3. Check PostgreSQL if available
    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT 1 FROM telegram_processed_updates WHERE update_id = $1 LIMIT 1',
          [updateId]
        );
        if (res.rows.length > 0) {
          this.memoryProcessedUpdates.add(updateId);
          return true;
        }
      } catch (err: any) {
        this.logger.debug('isUpdateProcessed', `Postgres query error: ${err.message}`);
      }
    }

    return false;
  }

  public async markUpdateProcessed(updateId: number): Promise<void> {
    this.memoryProcessedUpdates.add(updateId);

    // Keep memory cache bounded
    if (this.memoryProcessedUpdates.size > 10000) {
      const arr = Array.from(this.memoryProcessedUpdates);
      arr.slice(0, 2000).forEach((id) => this.memoryProcessedUpdates.delete(id));
    }

    // Redis
    const redis = this.redisService?.getClient();
    if (redis && redis.status === 'ready') {
      try {
        await redis.sadd('telegram:processed_updates', updateId.toString());
        // Set expiry if key is new (7 days)
        await redis.expire('telegram:processed_updates', 604800);
      } catch (err: any) {
        this.logger.debug('markUpdateProcessed', `Redis write error: ${err.message}`);
      }
    }

    // PostgreSQL
    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          'INSERT INTO telegram_processed_updates (update_id) VALUES ($1) ON CONFLICT DO NOTHING',
          [updateId]
        );
      } catch (err: any) {
        this.logger.debug('markUpdateProcessed', `Postgres write error: ${err.message}`);
      }
    }
  }

  // ----------------------------------------------------------
  // 2. IDENTITY & AUTHORIZATION
  // ----------------------------------------------------------

  public async getIdentity(telegramId: string): Promise<TelegramIdentity | undefined> {
    const mem = this.memoryIdentities.get(telegramId);
    if (mem) return mem;

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM telegram_identities WHERE telegram_id = $1 LIMIT 1',
          [telegramId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const identity: TelegramIdentity = {
            telegramId: row.telegram_id,
            username: row.username,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            isAuthorized: row.is_authorized,
            lastSeenAt: row.last_seen_at?.toISOString() || new Date().toISOString(),
            metadata: row.metadata || {},
          };
          this.memoryIdentities.set(telegramId, identity);
          return identity;
        }
      } catch (err: any) {
        this.logger.debug('getIdentity', `Postgres query error: ${err.message}`);
      }
    }
    return undefined;
  }

  public async saveIdentity(identity: TelegramIdentity): Promise<void> {
    this.memoryIdentities.set(identity.telegramId, identity);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_identities (telegram_id, username, first_name, last_name, role, is_authorized, last_seen_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (telegram_id) DO UPDATE SET
             username = EXCLUDED.username,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             role = EXCLUDED.role,
             is_authorized = EXCLUDED.is_authorized,
             last_seen_at = EXCLUDED.last_seen_at,
             metadata = EXCLUDED.metadata,
             updated_at = CURRENT_TIMESTAMP`,
          [
            identity.telegramId,
            identity.username || null,
            identity.firstName || null,
            identity.lastName || null,
            identity.role,
            identity.isAuthorized,
            identity.lastSeenAt,
            JSON.stringify(identity.metadata || {}),
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveIdentity', `Postgres write error: ${err.message}`);
      }
    }
  }

  // ----------------------------------------------------------
  // 3. CONVERSATIONS & MESSAGES
  // ----------------------------------------------------------

  public async getOrCreateConversation(chatId: string, ownerId: string): Promise<TelegramConversation> {
    for (const conv of this.memoryConversations.values()) {
      if (conv.chatId === chatId && conv.status === 'ACTIVE') {
        return conv;
      }
    }

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM telegram_conversations WHERE chat_id = $1 AND status = $2 ORDER BY updated_at DESC LIMIT 1',
          [chatId, 'ACTIVE']
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const conv: TelegramConversation = {
            conversationId: row.conversation_id,
            chatId: row.chat_id,
            ownerId: row.owner_id,
            status: row.status,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
            metadata: row.metadata || {},
          };
          this.memoryConversations.set(conv.conversationId, conv);
          return conv;
        }
      } catch (err: any) {
        this.logger.debug('getOrCreateConversation', `Postgres query error: ${err.message}`);
      }
    }

    // Create new conversation
    const newConv: TelegramConversation = {
      conversationId: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      chatId,
      ownerId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };

    await this.saveConversation(newConv);
    return newConv;
  }

  public async saveConversation(conv: TelegramConversation): Promise<void> {
    this.memoryConversations.set(conv.conversationId, conv);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_conversations (conversation_id, chat_id, owner_id, status, metadata, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (conversation_id) DO UPDATE SET
             status = EXCLUDED.status,
             metadata = EXCLUDED.metadata,
             updated_at = EXCLUDED.updated_at`,
          [
            conv.conversationId,
            conv.chatId,
            conv.ownerId,
            conv.status,
            JSON.stringify(conv.metadata || {}),
            conv.updatedAt,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveConversation', `Postgres write error: ${err.message}`);
      }
    }
  }

  public async saveMessage(msg: TelegramConversationMessage): Promise<void> {
    const list = this.memoryMessages.get(msg.conversationId) || [];
    list.push(msg);
    this.memoryMessages.set(msg.conversationId, list);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_messages (message_id, conversation_id, correlation_id, direction, sender_id, text)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            msg.messageId,
            msg.conversationId,
            msg.correlationId,
            msg.direction,
            msg.senderId,
            msg.text,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveMessage', `Postgres write error: ${err.message}`);
      }
    }
  }

  public async getRecentMessages(conversationId: string, limit = 10): Promise<TelegramConversationMessage[]> {
    const memList = this.memoryMessages.get(conversationId) || [];
    if (memList.length > 0) {
      return memList.slice(-limit);
    }

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT * FROM telegram_messages
           WHERE conversation_id = $1
           ORDER BY created_at DESC LIMIT $2`,
          [conversationId, limit]
        );
        const mapped = res.rows.reverse().map((row) => ({
          messageId: row.message_id,
          conversationId: row.conversation_id,
          direction: row.direction,
          senderId: row.sender_id,
          text: row.text,
          correlationId: row.correlation_id,
          timestamp: row.created_at?.toISOString() || new Date().toISOString(),
        }));
        this.memoryMessages.set(conversationId, mapped);
        return mapped;
      } catch (err: any) {
        this.logger.debug('getRecentMessages', `Postgres query error: ${err.message}`);
      }
    }

    return [];
  }

  // ----------------------------------------------------------
  // 4. COMMANDS
  // ----------------------------------------------------------

  public async saveCommand(cmd: TelegramCommandRecord): Promise<void> {
    this.memoryCommands.set(cmd.commandId, cmd);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_commands (command_id, conversation_id, correlation_id, raw_input, classification, intent, task_id, execution_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (command_id) DO UPDATE SET
             execution_status = EXCLUDED.execution_status`,
          [
            cmd.commandId,
            cmd.conversationId || null,
            cmd.correlationId,
            cmd.rawInput,
            cmd.classification,
            cmd.intent,
            cmd.taskId || null,
            cmd.executionStatus,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveCommand', `Postgres write error: ${err.message}`);
      }
    }
  }

  // ----------------------------------------------------------
  // 5. APPROVALS
  // ----------------------------------------------------------

  public async saveApproval(approval: TelegramApproval): Promise<void> {
    this.memoryApprovals.set(approval.approvalId, approval);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_approvals (
             approval_id, conversation_id, chat_id, message_id, action_title,
             action_description, risk_level, plan_steps, impact, status,
             requested_by, correlation_id, expires_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (approval_id) DO UPDATE SET
             status = EXCLUDED.status,
             responded_by = EXCLUDED.responded_by,
             response_reason = EXCLUDED.response_reason,
             responded_at = EXCLUDED.responded_at`,
          [
            approval.approvalId,
            approval.conversationId || null,
            String(approval.chatId),
            approval.messageId || null,
            approval.actionTitle,
            approval.actionDescription,
            approval.riskLevel,
            JSON.stringify(approval.planSteps || []),
            approval.impact,
            approval.status,
            approval.requestedBy,
            approval.correlationId,
            approval.expiresAt,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveApproval', `Postgres write error: ${err.message}`);
      }
    }
  }

  public async getApproval(approvalId: string): Promise<TelegramApproval | undefined> {
    const mem = this.memoryApprovals.get(approvalId);
    if (mem) return mem;

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM telegram_approvals WHERE approval_id = $1 LIMIT 1',
          [approvalId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const approval: TelegramApproval = {
            approvalId: row.approval_id,
            conversationId: row.conversation_id,
            chatId: row.chat_id,
            messageId: row.message_id,
            actionTitle: row.action_title,
            actionDescription: row.action_description,
            riskLevel: row.risk_level,
            planSteps: Array.isArray(row.plan_steps) ? row.plan_steps : [],
            impact: row.impact,
            status: row.status,
            requestedBy: row.requested_by,
            respondedBy: row.responded_by,
            responseReason: row.response_reason,
            correlationId: row.correlation_id,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            expiresAt: row.expires_at?.toISOString() || new Date().toISOString(),
            respondedAt: row.responded_at?.toISOString(),
          };
          this.memoryApprovals.set(approvalId, approval);
          return approval;
        }
      } catch (err: any) {
        this.logger.debug('getApproval', `Postgres query error: ${err.message}`);
      }
    }

    return undefined;
  }

  public async resolveApproval(
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    operatorId: string,
    reason?: string
  ): Promise<TelegramApproval | undefined> {
    const app = await this.getApproval(approvalId);
    if (!app) return undefined;

    app.status = decision;
    app.respondedBy = operatorId;
    app.responseReason = reason;
    app.respondedAt = new Date().toISOString();

    await this.saveApproval(app);
    return app;
  }

  // ----------------------------------------------------------
  // 6. NOTIFICATIONS
  // ----------------------------------------------------------

  public async saveNotification(notification: TelegramNotification): Promise<void> {
    this.memoryNotifications.set(notification.notificationId, notification);

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_notifications (
             notification_id, recipient_id, type, severity, title, message, status, correlation_id, metadata, sent_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (notification_id) DO UPDATE SET status = EXCLUDED.status`,
          [
            notification.notificationId,
            notification.recipientId,
            notification.type,
            notification.severity,
            notification.title,
            notification.message,
            notification.status,
            notification.correlationId || null,
            JSON.stringify(notification.metadata || {}),
            notification.sentAt || null,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveNotification', `Postgres write error: ${err.message}`);
      }
    }
  }

  // ----------------------------------------------------------
  // 7. AUDIT LOGS
  // ----------------------------------------------------------

  public async saveAuditLog(entry: TelegramAuditLog): Promise<void> {
    this.memoryAuditLogs.unshift(entry);
    if (this.memoryAuditLogs.length > 5000) {
      this.memoryAuditLogs.pop();
    }

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO telegram_audit_logs (
             audit_id, correlation_id, update_id, sender_id, username, action, authorized, details, ip_address
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            entry.auditId,
            entry.correlationId,
            entry.updateId || null,
            entry.senderId,
            entry.username || null,
            entry.action,
            entry.authorized,
            entry.details,
            entry.ipAddress || null,
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveAuditLog', `Postgres write error: ${err.message}`);
      }
    }
  }

  public getRecentAuditLogs(limit = 50): TelegramAuditLog[] {
    return this.memoryAuditLogs.slice(0, limit);
  }
}
