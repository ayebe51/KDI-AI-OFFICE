// ==========================================================
// services/api/src/telegram/gateway/telegram-gateway.service.ts
// Telegram Gateway: Ingestion, Authentication, Deduplication & Pipeline Dispatcher
// ==========================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type {
  TelegramUpdate,
  OwnerMessage,
  TelegramAuditLog,
} from '@kdi/types';
import { StructuredLogger, generateTraceId } from '@kdi/shared';
import { loadAppConfig } from '@kdi/config';
import { TelegramClient } from '../client/telegram.client.js';
import { TelegramRepository } from '../persistence/telegram.repository.js';
import { TelegramFormatter } from '../formatter/telegram.formatter.js';
import { OrchestratorService } from '../orchestrator/orchestrator.service.js';

@Injectable()
export class TelegramGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('TelegramGatewayService');
  private pollingActive = false;
  private pollingOffset = 0;
  private pollingTimeout?: NodeJS.Timeout;

  // Rate limiter: Map of senderId -> array of timestamps
  private readonly rateLimits = new Map<string, number[]>();

  constructor(
    private readonly telegramClient: TelegramClient,
    private readonly repository: TelegramRepository,
    private readonly orchestratorService: OrchestratorService
  ) {}

  onModuleInit() {
    const config = loadAppConfig();
    this.logger.info(
      'onModuleInit',
      `TelegramGatewayService initialized. Allowed owners: [${config.telegram.allowedOwnerIds.join(', ')}]`
    );

    // Start local polling fallback only if explicitly enabled
    if (config.telegram.pollingFallback) {
      this.logger.info('onModuleInit', 'Starting local polling fallback loop for Telegram updates');
      this.startPollingLoop();
    }
  }

  onModuleDestroy() {
    this.pollingActive = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
    this.logger.info('onModuleDestroy', 'TelegramGatewayService stopped cleanly');
  }

  /**
   * Primary entry point for incoming Telegram webhook updates
   */
  public async handleIncomingUpdate(
    update: TelegramUpdate,
    clientSecretToken?: string,
    ipAddress?: string
  ): Promise<{ ok: boolean; status: string; description?: string }> {
    const correlationId = generateTraceId();
    const config = loadAppConfig();

    // 1. Webhook Secret Validation
    if (config.telegram.webhookSecret) {
      if (clientSecretToken !== config.telegram.webhookSecret) {
        this.logger.warn('handleIncomingUpdate', 'Webhook secret token mismatch. Rejecting request.', {
          correlationId,
          ipAddress,
        });

        await this.repository.saveAuditLog({
          auditId: `aud_${Date.now()}`,
          correlationId,
          updateId: update?.update_id,
          senderId: 'UNKNOWN',
          action: 'WEBHOOK_REJECTED_SECRET',
          authorized: false,
          details: 'Header X-Telegram-Bot-Api-Secret-Token did not match configured secret',
          ipAddress,
          timestamp: new Date().toISOString(),
        });

        return { ok: false, status: 'UNAUTHORIZED_SECRET', description: 'Invalid secret token' };
      }
    }

    // 2. Validate Update Object
    if (!update || typeof update.update_id !== 'number') {
      return { ok: false, status: 'MALFORMED_UPDATE', description: 'Missing update_id' };
    }

    // 3. Deduplication Protection (Idempotency)
    const isDuplicate = await this.repository.isUpdateProcessed(update.update_id);
    if (isDuplicate) {
      this.logger.debug('handleIncomingUpdate', `Duplicate update ignored: ${update.update_id}`);
      return { ok: true, status: 'DUPLICATE_IGNORED' };
    }
    await this.repository.markUpdateProcessed(update.update_id);

    // 4. Resolve Sender Identity
    const message = update.message || update.edited_message;
    const callbackQuery = update.callback_query;

    const sender = message?.from || callbackQuery?.from;
    if (!sender) {
      this.logger.debug('handleIncomingUpdate', `Update ${update.update_id} has no sender information`);
      return { ok: true, status: 'NO_SENDER' };
    }

    const senderId = String(sender.id);
    const username = sender.username;
    const firstName = sender.first_name;
    const lastName = sender.last_name;

    // 5. Sender Authorization (Allowlist check)
    const isAuthorized = this.isSenderAuthorized(senderId, config.telegram.allowedOwnerIds);

    // Upsert Identity
    await this.repository.saveIdentity({
      telegramId: senderId,
      username,
      firstName,
      lastName,
      role: isAuthorized ? 'OWNER' : 'UNAUTHORIZED',
      isAuthorized,
      lastSeenAt: new Date().toISOString(),
      metadata: { updateId: update.update_id },
    });

    if (!isAuthorized) {
      this.logger.warn('handleIncomingUpdate', `Unauthorized Telegram sender: ${senderId} (@${username || 'no_user'})`, {
        correlationId,
      });

      await this.repository.saveAuditLog({
        auditId: `aud_${Date.now()}`,
        correlationId,
        updateId: update.update_id,
        senderId,
        username,
        action: 'UNAUTHORIZED_ACCESS_REJECTED',
        authorized: false,
        details: `Sender ${senderId} not found in allowlist [${config.telegram.allowedOwnerIds.join(',')}]`,
        ipAddress,
        timestamp: new Date().toISOString(),
      });

      // Polite rejection message
      if (message) {
        await this.telegramClient.sendMessage({
          chat_id: senderId,
          text: TelegramFormatter.formatUnauthorized(senderId, username),
          parse_mode: 'Markdown',
        });
      } else if (callbackQuery) {
        await this.telegramClient.answerCallbackQuery(
          callbackQuery.id,
          'Akses ditolak: User ID Anda tidak terdaftar sebagai Owner.',
          true
        );
      }

      return { ok: false, status: 'UNAUTHORIZED_SENDER' };
    }

    // 6. Rate Limiting Protection
    if (this.isRateLimited(senderId, config.telegram.rateLimitPerMinute)) {
      this.logger.warn('handleIncomingUpdate', `Rate limit exceeded for sender ${senderId}`);
      if (message) {
        await this.telegramClient.sendMessage({
          chat_id: senderId,
          text: '⏳ *Batas Pesan Terlampaui*\nMohon tunggu beberapa detik sebelum mengirim pesan kembali.',
          parse_mode: 'Markdown',
        });
      }
      return { ok: false, status: 'RATE_LIMITED' };
    }

    // 7. Pipeline Routing: Callback Query (Inline Button Click)
    if (callbackQuery) {
      const result = await this.orchestratorService.handleCallbackQuery(callbackQuery, correlationId);

      // Answer callback
      await this.telegramClient.answerCallbackQuery(callbackQuery.id, result.text);

      // Optionally update message text in place
      if (result.updatedMessageText && callbackQuery.message) {
        await this.telegramClient.editMessageText({
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          text: result.updatedMessageText,
          parse_mode: 'Markdown',
        });
      }

      await this.repository.saveAuditLog({
        auditId: `aud_${Date.now()}`,
        correlationId,
        updateId: update.update_id,
        senderId,
        username,
        action: 'CALLBACK_PROCESSED',
        authorized: true,
        details: `Callback payload: "${callbackQuery.data}" -> ${result.text}`,
        ipAddress,
        timestamp: new Date().toISOString(),
      });

      return { ok: true, status: 'CALLBACK_PROCESSED' };
    }

    // 8. Pipeline Routing: Text Message
    if (message && message.text) {
      const chatId = String(message.chat.id);
      const conv = await this.repository.getOrCreateConversation(chatId, senderId);

      const ownerMessage: OwnerMessage = {
        conversationId: conv.conversationId,
        channel: 'telegram',
        senderId,
        senderUsername: username,
        senderFirstName: firstName,
        senderLastName: lastName,
        messageId: String(message.message_id),
        text: message.text,
        timestamp: new Date(message.date * 1000).toISOString(),
        metadata: {
          chatId,
          updateId: update.update_id,
        },
      };

      const result = await this.orchestratorService.handleOwnerMessage(ownerMessage, correlationId);

      // Dispatch Outbound Response to Telegram
      const sendRes = await this.telegramClient.sendMessage({
        chat_id: chatId,
        text: result.responseMessage,
        parse_mode: 'Markdown',
        reply_markup: result.inlineKeyboard,
      });

      // Save Outbound Message record
      if (sendRes.ok && sendRes.result) {
        await this.repository.saveMessage({
          messageId: String(sendRes.result.message_id),
          conversationId: conv.conversationId,
          correlationId,
          direction: 'OUTBOUND',
          senderId: 'ORCHESTRATOR',
          text: result.responseMessage,
          timestamp: new Date().toISOString(),
        });
      }

      await this.repository.saveAuditLog({
        auditId: `aud_${Date.now()}`,
        correlationId,
        updateId: update.update_id,
        senderId,
        username,
        action: 'MESSAGE_PROCESSED',
        authorized: true,
        details: `Command/Message: "${message.text.slice(0, 80)}" -> Result type: ${result.type}`,
        ipAddress,
        timestamp: new Date().toISOString(),
      });

      return { ok: true, status: 'MESSAGE_PROCESSED' };
    }

    return { ok: true, status: 'UPDATE_UNHANDLED' };
  }

  /**
   * Authorization check helper
   */
  public isSenderAuthorized(senderId: string, allowedIds: string[]): boolean {
    if (!senderId) return false;
    if (allowedIds.length === 0) {
      // If no owner IDs are configured, fall back to denying all for security
      return false;
    }
    return allowedIds.includes(senderId.trim());
  }

  /**
   * Rate limiting sliding window
   */
  private isRateLimited(senderId: string, limitPerMinute: number): boolean {
    const now = Date.now();
    const timestamps = this.rateLimits.get(senderId) || [];
    const recent = timestamps.filter((t) => now - t < 60000);

    if (recent.length >= limitPerMinute) {
      return true;
    }

    recent.push(now);
    this.rateLimits.set(senderId, recent);
    return false;
  }

  /**
   * Polling fallback loop for development/testing
   */
  private startPollingLoop(): void {
    this.pollingActive = true;

    const poll = async () => {
      if (!this.pollingActive) return;

      try {
        const res = await this.telegramClient.getUpdates(this.pollingOffset, 2);
        if (res.ok && res.result && Array.isArray(res.result)) {
          for (const update of res.result) {
            await this.handleIncomingUpdate(update);
            this.pollingOffset = Math.max(this.pollingOffset, update.update_id + 1);
          }
        }
      } catch (err: any) {
        this.logger.debug('startPollingLoop', `Polling tick error: ${err.message}`);
      }

      if (this.pollingActive) {
        this.pollingTimeout = setTimeout(poll, 1500);
      }
    };

    poll();
  }
}
