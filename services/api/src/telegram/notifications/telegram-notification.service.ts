// ==========================================================
// services/api/src/telegram/notifications/telegram-notification.service.ts
// Proactive Notifications with Cooldown, Aggregation & Spam Prevention
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import type { TelegramNotification } from '@kdi/types';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import { TelegramClient } from '../client/telegram.client.js';
import { TelegramFormatter } from '../formatter/telegram.formatter.js';
import { TelegramRepository } from '../persistence/telegram.repository.js';
import { EventsGateway } from '../../websocket/events.gateway.js';
import { loadAppConfig } from '@kdi/config';

export interface SendNotificationOptions {
  recipientId?: string;
  type: TelegramNotification['type'];
  severity: TelegramNotification['severity'];
  title: string;
  content: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  cooldownSeconds?: number;
}

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new StructuredLogger('TelegramNotificationService');
  private readonly lastSentTimestamps = new Map<string, number>();

  constructor(
    private readonly telegramClient: TelegramClient,
    private readonly repository: TelegramRepository,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) {}

  /**
   * Send a proactive notification to the Owner with anti-spam cooldown protection
   */
  public async sendNotification(options: SendNotificationOptions): Promise<{
    sent: boolean;
    suppressed: boolean;
    notificationId: string;
  }> {
    const config = loadAppConfig();
    const recipientId = options.recipientId || config.telegram.ownerId || '';
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cooldownSeconds = options.cooldownSeconds ?? 60; // default 60s cooldown

    // Dedup key based on type + title
    const dedupKey = `${options.type}:${options.title.trim().toLowerCase()}`;
    const now = Date.now();
    const lastSent = this.lastSentTimestamps.get(dedupKey) || 0;

    if (now - lastSent < cooldownSeconds * 1000) {
      this.logger.debug('sendNotification', `Notification suppressed by cooldown (${cooldownSeconds}s): ${dedupKey}`);
      await this.repository.saveNotification({
        notificationId,
        recipientId,
        type: options.type,
        severity: options.severity,
        title: options.title,
        message: options.content,
        correlationId: options.correlationId,
        metadata: options.metadata,
        status: 'SUPPRESSED',
        timestamp: new Date().toISOString(),
      });
      return { sent: false, suppressed: true, notificationId };
    }

    // Record last sent
    this.lastSentTimestamps.set(dedupKey, now);

    // Format text
    const text = `📢 *NOTIFIKASI KDI ORCHESTRATOR*\n\n*${options.title}*\n\n${options.content}`;

    // Dispatch via Telegram Client
    let sentSuccessfully = false;
    if (recipientId) {
      const res = await this.telegramClient.sendMessage({
        chat_id: recipientId,
        text,
        parse_mode: 'Markdown',
      });
      sentSuccessfully = res.ok;
    }

    // Persist
    await this.repository.saveNotification({
      notificationId,
      recipientId,
      type: options.type,
      severity: options.severity,
      title: options.title,
      message: options.content,
      correlationId: options.correlationId,
      metadata: options.metadata,
      status: sentSuccessfully ? 'SENT' : 'FAILED',
      sentAt: sentSuccessfully ? new Date().toISOString() : undefined,
      timestamp: new Date().toISOString(),
    });

    // 3D Office Event Broadcast
    if (this.eventsGateway) {
      this.eventsGateway.broadcastEvent(
        createWSEventEnvelope('notification.emitted', 'office:events', {
          notificationId,
          type: options.type,
          severity: options.severity,
          title: options.title,
        })
      );
    }

    return { sent: sentSuccessfully, suppressed: false, notificationId };
  }

  /**
   * Helper: Send task completion notification
   */
  public async notifyTaskCompleted(task: {
    taskId: string;
    title: string;
    agentName?: string;
    summary?: string;
    commitHash?: string;
    recipientId?: string;
  }) {
    const text = TelegramFormatter.formatTaskCompleted(task);
    return this.sendNotification({
      recipientId: task.recipientId,
      type: 'TASK_COMPLETED',
      severity: 'INFO',
      title: `Tugas Selesai: ${task.title}`,
      content: text,
      metadata: { taskId: task.taskId, commitHash: task.commitHash },
    });
  }

  /**
   * Helper: Send incident alert
   */
  public async notifyIncident(incident: {
    title: string;
    impact: string;
    severity: string;
    actionTaken?: string;
    status: string;
    recipientId?: string;
  }) {
    const text = TelegramFormatter.formatIncidentAlert(incident);
    return this.sendNotification({
      recipientId: incident.recipientId,
      type: 'INCIDENT',
      severity: 'CRITICAL',
      title: `Insiden Sistem: ${incident.title}`,
      content: text,
      cooldownSeconds: 300, // 5 min cooldown on same incident
    });
  }
}
