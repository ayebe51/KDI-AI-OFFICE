// ==========================================================
// services/api/src/telegram/client/telegram.client.ts
// Robust, Sanitized Telegram Bot API Client
// ==========================================================

import type {
  TelegramSendMessageOptions,
  TelegramEditMessageOptions,
  TelegramRawMessage,
  TelegramUpdate,
} from '@kdi/types';
import { StructuredLogger, redactSecretsFromString } from '@kdi/shared';

export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export type OutboundTransportHook = (method: string, payload: any) => Promise<TelegramApiResponse<any>>;

export class TelegramClient {
  private readonly logger = new StructuredLogger('TelegramClient');
  private readonly botToken: string;
  private readonly baseUrl: string;
  private customTransport?: OutboundTransportHook;

  constructor(botToken?: string, customTransport?: OutboundTransportHook) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.customTransport = customTransport;
  }

  /**
   * Set a custom transport for testing or simulation
   */
  public setCustomTransport(transport?: OutboundTransportHook): void {
    this.customTransport = transport;
  }

  /**
   * Send a text message to a Telegram chat with automatic secret sanitization
   */
  public async sendMessage(options: TelegramSendMessageOptions): Promise<TelegramApiResponse<TelegramRawMessage>> {
    // 1. Mandatory secret redaction before transmission
    const sanitizedText = redactSecretsFromString(options.text);

    const payload = {
      ...options,
      text: sanitizedText,
    };

    return this.callApi<TelegramRawMessage>('sendMessage', payload);
  }

  /**
   * Edit an existing message text
   */
  public async editMessageText(options: TelegramEditMessageOptions): Promise<TelegramApiResponse<TelegramRawMessage | boolean>> {
    const sanitizedText = redactSecretsFromString(options.text);

    const payload = {
      ...options,
      text: sanitizedText,
    };

    return this.callApi<TelegramRawMessage | boolean>('editMessageText', payload);
  }

  /**
   * Answer a callback query from an inline keyboard button
   */
  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false
  ): Promise<TelegramApiResponse<boolean>> {
    const payload = {
      callback_query_id: callbackQueryId,
      text: text ? redactSecretsFromString(text) : undefined,
      show_alert: showAlert,
    };

    return this.callApi<boolean>('answerCallbackQuery', payload);
  }

  /**
   * Configure Telegram webhook URL and optional secret token
   */
  public async setWebhook(url: string, secretToken?: string): Promise<TelegramApiResponse<boolean>> {
    const payload: Record<string, unknown> = {
      url,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
    };
    if (secretToken) {
      payload.secret_token = secretToken;
    }
    return this.callApi<boolean>('setWebhook', payload);
  }

  /**
   * Remove webhook (e.g., when switching to polling mode)
   */
  public async deleteWebhook(): Promise<TelegramApiResponse<boolean>> {
    return this.callApi<boolean>('deleteWebhook', { drop_pending_updates: false });
  }

  /**
   * Fetch updates via long polling
   */
  public async getUpdates(offset = 0, timeout = 10): Promise<TelegramApiResponse<TelegramUpdate[]>> {
    return this.callApi<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
    });
  }

  /**
   * Get basic information about the bot account
   */
  public async getMe(): Promise<TelegramApiResponse<{ id: number; is_bot: boolean; first_name: string; username?: string }>> {
    return this.callApi('getMe', {});
  }

  /**
   * Core HTTP dispatcher with retry and timeout protection
   */
  private async callApi<T>(method: string, payload: Record<string, unknown>): Promise<TelegramApiResponse<T>> {
    if (this.customTransport) {
      return this.customTransport(method, payload);
    }

    if (!this.botToken || this.botToken.startsWith('placeholder') || this.botToken.includes('example')) {
      this.logger.debug('callApi', `Mocking Telegram API call [${method}] (Mock/Dev Token in use)`);
      return {
        ok: true,
        result: { message_id: Math.floor(Math.random() * 100000), date: Math.floor(Date.now() / 1000), ...payload } as unknown as T,
      };
    }

    const endpoint = `${this.baseUrl}/${method}`;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = (await response.json()) as TelegramApiResponse<T>;

        if (!data.ok) {
          // Handle rate limiting (HTTP 429)
          if (data.error_code === 429 && attempts < maxAttempts) {
            this.logger.warn('callApi', `Telegram rate limited (429). Retrying in 1500ms...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          this.logger.error('callApi', `Telegram API error [${method}]: ${data.description} (code ${data.error_code})`);
        }

        return data;
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          this.logger.error('callApi', `Network error calling Telegram [${method}] after ${attempts} attempts: ${err.message}`);
          return {
            ok: false,
            description: `Network error: ${err.message}`,
            error_code: 500,
          };
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return {
      ok: false,
      description: 'Maximum retry attempts exceeded',
      error_code: 504,
    };
  }
}
