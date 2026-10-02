// ==========================================================
// services/api/src/telegram/telegram.controller.ts
// REST Controller for Telegram Webhook & Operator Command Telemetry
// ==========================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { TelegramUpdate } from '@kdi/types';
import { TelegramGatewayService } from './gateway/telegram-gateway.service.js';
import { TelegramNotificationService } from './notifications/telegram-notification.service.js';
import { TelegramClient } from './client/telegram.client.js';
import { TelegramRepository } from './persistence/telegram.repository.js';
import { loadAppConfig } from '@kdi/config';

@Controller('api/v1/telegram')
export class TelegramController {
  constructor(
    private readonly gatewayService: TelegramGatewayService,
    private readonly notificationService: TelegramNotificationService,
    private readonly telegramClient: TelegramClient,
    private readonly repository: TelegramRepository
  ) {}

  /**
   * Telegram Webhook Inbound Endpoint
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() update: TelegramUpdate,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
    @Ip() ipAddress?: string
  ) {
    const result = await this.gatewayService.handleIncomingUpdate(update, secretToken, ipAddress);

    if (!result.ok && result.status === 'UNAUTHORIZED_SECRET') {
      throw new UnauthorizedException('Invalid Telegram webhook secret token');
    }

    return result;
  }

  /**
   * Health and Status Endpoint
   */
  @Get('health')
  async getStatus() {
    const config = loadAppConfig();
    const me = await this.telegramClient.getMe().catch(() => ({ ok: false, result: undefined }));

    return {
      status: 'UP',
      telegramConnected: me.ok,
      botUsername: me.result?.username,
      botId: me.result?.id,
      allowedOwnersCount: config.telegram.allowedOwnerIds.length,
      pollingFallbackActive: config.telegram.pollingFallback,
      recentAuditLogsCount: this.repository.getRecentAuditLogs(10).length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manual notification broadcast (internal operations)
   */
  @Post('notify')
  @HttpCode(HttpStatus.OK)
  async sendNotification(
    @Body()
    body: {
      title: string;
      message: string;
      severity?: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
      recipientId?: string;
    }
  ) {
    return this.notificationService.sendNotification({
      title: body.title,
      content: body.message,
      severity: body.severity || 'INFO',
      type: 'SYSTEM_ALERT',
      recipientId: body.recipientId,
    });
  }

  /**
   * Webhook Setup Registration Helper
   */
  @Post('setup-webhook')
  @HttpCode(HttpStatus.OK)
  async setupWebhook(@Body() body: { url?: string; secret?: string }) {
    const config = loadAppConfig();
    const url = body.url || config.telegram.webhookUrl;
    const secret = body.secret || config.telegram.webhookSecret;

    if (!url) {
      return { ok: false, message: 'Missing webhook URL in request or configuration' };
    }

    return this.telegramClient.setWebhook(url, secret);
  }
}
