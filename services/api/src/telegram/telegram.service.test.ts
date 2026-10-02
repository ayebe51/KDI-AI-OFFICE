// ==========================================================
// services/api/src/telegram/telegram.service.test.ts
// Comprehensive Phase 11 Test Suite: Telegram Command & Communication Layer
// ==========================================================

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TelegramClient } from './client/telegram.client.js';
import { TelegramRepository } from './persistence/telegram.repository.js';
import { TelegramFormatter } from './formatter/telegram.formatter.js';
import { OrchestratorService } from './orchestrator/orchestrator.service.js';
import { TelegramGatewayService } from './gateway/telegram-gateway.service.js';
import { TelegramNotificationService } from './notifications/telegram-notification.service.js';
import { EventsGateway } from '../websocket/events.gateway.js';
import { RuntimeService } from '../runtime/runtime.service.js';
import { AutonomyService } from '../autonomy/autonomy.service.js';
import { LLMService } from '../llm/llm.service.js';
import type { TelegramUpdate, OwnerMessage } from '@kdi/types';

describe('Phase 11 — Telegram Command & Communication Layer Verification Suite', () => {
  const OWNER_ID = '123456789';
  const UNAUTHORIZED_ID = '987654321';
  const WEBHOOK_SECRET = 'kdi_test_secret_token_1234567890';

  let client: TelegramClient;
  let repository: TelegramRepository;
  let eventsGateway: EventsGateway;
  let orchestrator: OrchestratorService;
  let gateway: TelegramGatewayService;
  let notificationService: TelegramNotificationService;
  let autonomyService: AutonomyService;
  let runtimeService: RuntimeService;

  // Track sent Telegram messages for assertions
  const outboundMessages: Array<{ method: string; payload: any }> = [];
  const emittedEvents: Array<{ type: string; channel: string; data: any }> = [];

  beforeEach(() => {
    outboundMessages.length = 0;
    emittedEvents.length = 0;

    process.env.TELEGRAM_OWNER_ID = OWNER_ID;
    process.env.TELEGRAM_ALLOWED_OWNER_IDS = `${OWNER_ID},111222333`;
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;

    client = new TelegramClient('test_bot_token', async (method, payload) => {
      outboundMessages.push({ method, payload });
      if (method === 'sendMessage') {
        return {
          ok: true,
          result: {
            message_id: 1000 + outboundMessages.length,
            date: Math.floor(Date.now() / 1000),
            chat: { id: payload.chat_id, type: 'private' },
            text: payload.text,
          },
        };
      }
      if (method === 'editMessageText') {
        return { ok: true, result: true };
      }
      if (method === 'answerCallbackQuery') {
        return { ok: true, result: true };
      }
      return { ok: true, result: {} as any };
    });

    repository = new TelegramRepository();

    eventsGateway = {
      broadcastEvent: (envelope: any) => {
        emittedEvents.push(envelope);
      },
      broadcastAgentState: (payload: any) => {
        emittedEvents.push({ type: 'agent.status.changed', channel: 'office:events', data: payload });
      },
      broadcastOfficeEvent: (eventType: string, data: any) => {
        emittedEvents.push({ type: eventType, channel: 'office:events', data });
      },
    } as unknown as EventsGateway;

    // Optional dependencies for orchestrator
    autonomyService = new AutonomyService();
    runtimeService = new RuntimeService(new LLMService(), eventsGateway);

    orchestrator = new OrchestratorService(
      repository,
      runtimeService,
      autonomyService,
      undefined,
      undefined,
      undefined,
      undefined,
      eventsGateway
    );

    gateway = new TelegramGatewayService(client, repository, orchestrator);
    notificationService = new TelegramNotificationService(client, repository, eventsGateway);
  });

  // ==========================================================
  // 1. AUTHENTICATION & IDENTITY TESTS
  // ==========================================================

  test('Test 1: Authorized owner can successfully send instructions', async () => {
    const update: TelegramUpdate = {
      update_id: 1001,
      message: {
        message_id: 50,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi', username: 'kdi_owner' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/status',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.status, 'MESSAGE_PROCESSED');

    // Verify response sent to owner
    assert.strictEqual(outboundMessages.length, 1);
    assert.strictEqual(outboundMessages[0].method, 'sendMessage');
    assert.match(outboundMessages[0].payload.text, /STATUS SISTEM/);

    // Verify identity persisted
    const identity = await repository.getIdentity(OWNER_ID);
    assert.ok(identity);
    assert.strictEqual(identity?.isAuthorized, true);
    assert.strictEqual(identity?.role, 'OWNER');
  });

  test('Test 2: Unauthorized Telegram user is rejected with audit log', async () => {
    const update: TelegramUpdate = {
      update_id: 1002,
      message: {
        message_id: 51,
        from: { id: Number(UNAUTHORIZED_ID), is_bot: false, first_name: 'Attacker', username: 'stranger' },
        chat: { id: Number(UNAUTHORIZED_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/pause',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 'UNAUTHORIZED_SENDER');

    // Verify polite rejection sent
    assert.strictEqual(outboundMessages.length, 1);
    assert.match(outboundMessages[0].payload.text, /AKSES DITOLAK/);

    // Verify audit log
    const auditLogs = repository.getRecentAuditLogs();
    const rejectedLog = auditLogs.find((l) => l.action === 'UNAUTHORIZED_ACCESS_REJECTED');
    assert.ok(rejectedLog);
    assert.strictEqual(rejectedLog?.authorized, false);
    assert.strictEqual(rejectedLog?.senderId, UNAUTHORIZED_ID);
  });

  test('Test 3: Malformed update without update_id is rejected gracefully', async () => {
    const res = await gateway.handleIncomingUpdate({} as any, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 'MALFORMED_UPDATE');
  });

  // ==========================================================
  // 2. WEBHOOK SECURITY & DEDUPLICATION TESTS
  // ==========================================================

  test('Test 4: Webhook with invalid secret token is rejected with 401', async () => {
    const update: TelegramUpdate = {
      update_id: 1003,
      message: {
        message_id: 52,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/status',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, 'WRONG_SECRET_TOKEN');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 'UNAUTHORIZED_SECRET');
    assert.strictEqual(outboundMessages.length, 0); // No message dispatched

    const auditLogs = repository.getRecentAuditLogs();
    assert.ok(auditLogs.some((l) => l.action === 'WEBHOOK_REJECTED_SECRET'));
  });

  test('Test 5: Duplicate webhook update is deduplicated and not executed twice', async () => {
    const update: TelegramUpdate = {
      update_id: 99999,
      message: {
        message_id: 77,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Cek kesehatan SIMMACI',
      },
    };

    // First time
    const res1 = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res1.status, 'MESSAGE_PROCESSED');
    assert.strictEqual(outboundMessages.length, 1);

    // Duplicate webhook retry
    const res2 = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res2.ok, true);
    assert.strictEqual(res2.status, 'DUPLICATE_IGNORED');
    assert.strictEqual(outboundMessages.length, 1); // Not duplicated!
  });

  // ==========================================================
  // 3. CONVERSATION & NATURAL LANGUAGE COMMANDS
  // ==========================================================

  test('Test 6: Owner asks natural language question about system health', async () => {
    const update: TelegramUpdate = {
      update_id: 1004,
      message: {
        message_id: 53,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Bagaimana kondisi kantor hari ini?',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(outboundMessages.length, 1);
    assert.match(outboundMessages[0].payload.text, /STATUS SISTEM/);
    assert.match(outboundMessages[0].payload.text, /PostgreSQL/);
  });

  test('Test 7: Owner asks about ongoing work and receives active tasks overview', async () => {
    const update: TelegramUpdate = {
      update_id: 1005,
      message: {
        message_id: 54,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Apa yang sedang dikerjakan?',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(outboundMessages.length, 1);
    assert.match(outboundMessages[0].payload.text, /DAFTAR TUGAS KDI|KONDISI PEKERJAAN SAAT INI/);
  });

  test('Test 8: Owner initiates diagnostic investigation for SIMMACI login', async () => {
    const update: TelegramUpdate = {
      update_id: 1006,
      message: {
        message_id: 55,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Cari penyebab error login SIMMACI.',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);
    assert.match(outboundMessages[0].payload.text, /HASIL INVESTIGASI ORCHESTRATOR/);

    // Verify 3D office telemetry was triggered
    const agentStateEvents = emittedEvents.filter((e) => e.type === 'agent.status.changed');
    assert.ok(agentStateEvents.length >= 1);
  });

  // ==========================================================
  // 4. SLASH COMMANDS VERIFICATION
  // ==========================================================

  test('Test 9: All slash commands execute accurately', async () => {
    const commands = ['/start', '/help', '/tasks', '/agents', '/projects', '/incidents', '/approvals', '/report'];

    for (let i = 0; i < commands.length; i++) {
      const update: TelegramUpdate = {
        update_id: 2000 + i,
        message: {
          message_id: 100 + i,
          from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
          chat: { id: Number(OWNER_ID), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: commands[i],
        },
      };

      const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
      assert.strictEqual(res.ok, true);
    }

    assert.strictEqual(outboundMessages.length, commands.length);
  });

  // ==========================================================
  // 5. HUMAN OVERRIDE: PAUSE & RESUME
  // ==========================================================

  test('Test 10: Owner can trigger global autonomy pause and resume via Telegram', async () => {
    // 1. Pause
    const pauseUpdate: TelegramUpdate = {
      update_id: 3001,
      message: {
        message_id: 201,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/pause',
      },
    };

    await gateway.handleIncomingUpdate(pauseUpdate, WEBHOOK_SECRET);
    assert.match(outboundMessages[0].payload.text, /GLOBAL AUTONOMY PAUSED/);
    assert.strictEqual((autonomyService as any).globalPauseActive, true);

    // 2. Resume
    const resumeUpdate: TelegramUpdate = {
      update_id: 3002,
      message: {
        message_id: 202,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/resume',
      },
    };

    await gateway.handleIncomingUpdate(resumeUpdate, WEBHOOK_SECRET);
    assert.match(outboundMessages[1].payload.text, /AUTONOMY RESUMED/);
    assert.strictEqual((autonomyService as any).globalPauseActive, false);
  });

  // ==========================================================
  // 6. APPROVAL FLOW WITH INLINE BUTTONS & IDEMPOTENCY
  // ==========================================================

  test('Test 11: High-risk action generates approval request with inline buttons', async () => {
    const deployUpdate: TelegramUpdate = {
      update_id: 4001,
      message: {
        message_id: 301,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Deploy SIMMACI authentication fix sekarang.',
      },
    };

    const res = await gateway.handleIncomingUpdate(deployUpdate, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);

    // Verify approval card sent with inline keyboard
    const msg = outboundMessages[0].payload;
    assert.match(msg.text, /APPROVAL REQUIRED/);
    assert.match(msg.text, /HIGH/);
    assert.ok(msg.reply_markup);
    assert.ok(msg.reply_markup.inline_keyboard);
    assert.strictEqual(msg.reply_markup.inline_keyboard[0][0].text, '✅ SETUJUI');
    assert.strictEqual(msg.reply_markup.inline_keyboard[0][1].text, '❌ TOLAK');

    // Extract approvalId from callback data
    const callbackData = msg.reply_markup.inline_keyboard[0][0].callback_data;
    assert.match(callbackData, /^appr:[^:]+:approve$/);
    const approvalId = callbackData.split(':')[1];

    // Verify persisted approval
    const approval = await repository.getApproval(approvalId);
    assert.ok(approval);
    assert.strictEqual(approval?.status, 'PENDING');
  });

  test('Test 12: Owner approves high-risk action via callback query and triggers task', async () => {
    // 1. Manually create an approval in repository
    const approvalId = `appr_test_123`;
    await repository.saveApproval({
      approvalId,
      chatId: OWNER_ID,
      messageId: 500,
      actionTitle: 'Deploy SIMMACI Patch',
      actionDescription: 'Deploy production authentication fix',
      riskLevel: 'HIGH',
      planSteps: ['Build container', 'Run tests', 'Deploy'],
      impact: 'SIMMACI Cluster',
      status: 'PENDING',
      requestedBy: 'Owner',
      correlationId: 'trc_123',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    // 2. Incoming callback query
    const callbackUpdate: TelegramUpdate = {
      update_id: 5001,
      callback_query: {
        id: 'cb_query_001',
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        message: {
          message_id: 500,
          chat: { id: Number(OWNER_ID), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'APPROVAL REQUIRED',
        },
        data: `appr:${approvalId}:approve`,
      },
    };

    const res = await gateway.handleIncomingUpdate(callbackUpdate, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.status, 'CALLBACK_PROCESSED');

    // Verify approval resolved in DB
    const resolvedApproval = await repository.getApproval(approvalId);
    assert.strictEqual(resolvedApproval?.status, 'APPROVED');
    assert.strictEqual(resolvedApproval?.respondedBy, OWNER_ID);

    // Verify callback answered and message edited
    assert.ok(outboundMessages.some((m) => m.method === 'answerCallbackQuery'));
    assert.ok(outboundMessages.some((m) => m.method === 'editMessageText'));

    // 3. Test Idempotency: Repeating the approval is rejected safely
    const duplicateCallbackRes = await gateway.handleIncomingUpdate(callbackUpdate, WEBHOOK_SECRET);
    assert.strictEqual(duplicateCallbackRes.ok, true);
  });

  test('Test 13: Owner rejects approval via callback query and cancels task', async () => {
    const approvalId = `appr_test_reject_456`;
    await repository.saveApproval({
      approvalId,
      chatId: OWNER_ID,
      messageId: 501,
      actionTitle: 'Dangerous Migration',
      actionDescription: 'Drop legacy table',
      riskLevel: 'HIGH',
      planSteps: ['Drop table'],
      impact: 'Database',
      status: 'PENDING',
      requestedBy: 'Owner',
      correlationId: 'trc_456',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const callbackUpdate: TelegramUpdate = {
      update_id: 5002,
      callback_query: {
        id: 'cb_query_002',
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        message: {
          message_id: 501,
          chat: { id: Number(OWNER_ID), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'APPROVAL REQUIRED',
        },
        data: `appr:${approvalId}:reject`,
      },
    };

    const res = await gateway.handleIncomingUpdate(callbackUpdate, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);

    const resolved = await repository.getApproval(approvalId);
    assert.strictEqual(resolved?.status, 'REJECTED');
  });

  // ==========================================================
  // 7. LONG-RUNNING ASYNCHRONOUS TASK FLOW
  // ==========================================================

  test('Test 14: Long-running task returns immediate queued receipt without blocking', async () => {
    const update: TelegramUpdate = {
      update_id: 6001,
      message: {
        message_id: 401,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Audit seluruh backend SIMMACI.',
      },
    };

    const res = await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);
    assert.strictEqual(res.ok, true);

    // Verify immediate non-blocking response
    assert.strictEqual(outboundMessages.length, 1);
    assert.match(outboundMessages[0].payload.text, /PERINTAH DITERIMA/);
    assert.match(outboundMessages[0].payload.text, /Queued/);
    assert.match(outboundMessages[0].payload.text, /Task ID:/);

    // Verify task was registered in runtime queue
    const tasks = runtimeService.getAllTasks();
    assert.ok(tasks.length >= 1);
  });

  // ==========================================================
  // 8. PROACTIVE NOTIFICATIONS & COOLDOWN ANTI-SPAM
  // ==========================================================

  test('Test 15: Proactive notifications are sent and duplicate alerts suppressed by cooldown', async () => {
    // 1. Task Completed Notification
    const notif1 = await notificationService.notifyTaskCompleted({
      taskId: 'tsk_test_100',
      title: 'SIMMACI Auth Patch',
      agentName: 'Backend Engineer',
      summary: 'Tests passed, build verified.',
      recipientId: OWNER_ID,
    });
    assert.strictEqual(notif1.sent, true);
    assert.strictEqual(notif1.suppressed, false);

    // 2. Incident Notification
    const incident1 = await notificationService.notifyIncident({
      title: 'SIMMACI API Latency Spike',
      impact: 'Production API',
      severity: 'CRITICAL',
      status: 'Investigating',
      recipientId: OWNER_ID,
    });
    assert.strictEqual(incident1.sent, true);
    assert.strictEqual(incident1.suppressed, false);

    // 3. Duplicate Incident Notification within cooldown window must be SUPPRESSED
    const incidentDuplicate = await notificationService.notifyIncident({
      title: 'SIMMACI API Latency Spike',
      impact: 'Production API',
      severity: 'CRITICAL',
      status: 'Investigating',
      recipientId: OWNER_ID,
    });
    assert.strictEqual(incidentDuplicate.suppressed, true);
    assert.strictEqual(incidentDuplicate.sent, false);
  });

  // ==========================================================
  // 9. SECURITY & SECRET REDACTION DEFENSE
  // ==========================================================

  test('Test 16: Zero secrets leakage: All outbound Telegram messages have credentials redacted', async () => {
    const rawWithSecrets =
      `Konfigurasi database:\n` +
      `URL: postgresql://admin:superSecretPassword123@127.0.0.1:5432/kdi_prod\n` +
      `OpenAI Key: sk-proj-123456789012345678901234\n` +
      `Gemini Key: AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456\n` +
      `Telegram Token: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_example`;

    await client.sendMessage({
      chat_id: OWNER_ID,
      text: rawWithSecrets,
    });

    assert.strictEqual(outboundMessages.length, 1);
    const sentText = outboundMessages[0].payload.text;

    // Verify all secrets are masked
    assert.doesNotMatch(sentText, /superSecretPassword123/);
    assert.doesNotMatch(sentText, /sk-proj-123456789012345678901234/);
    assert.doesNotMatch(sentText, /AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456/);
    assert.doesNotMatch(sentText, /123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_example/);

    assert.match(sentText, /\[REDACTED_PASSWORD\]/);
    assert.match(sentText, /\[REDACTED_API_KEY\]/);
    assert.match(sentText, /\[REDACTED_GOOGLE_API_KEY\]/);
    assert.match(sentText, /\[REDACTED_TELEGRAM_TOKEN\]/);
  });

  // ==========================================================
  // 10. 3D DIGITAL TWIN OFFICE INTEGRATION
  // ==========================================================

  test('Test 17: Telegram commands broadcast WebSocket events for 3D Office visual movement', async () => {
    const update: TelegramUpdate = {
      update_id: 7001,
      message: {
        message_id: 601,
        from: { id: Number(OWNER_ID), is_bot: false, first_name: 'Budi' },
        chat: { id: Number(OWNER_ID), type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Cari penyebab error login SIMMACI.',
      },
    };

    await gateway.handleIncomingUpdate(update, WEBHOOK_SECRET);

    // Verify events were emitted to office:events channel
    const agentEvents = emittedEvents.filter(
      (e) => e.type === 'agent.status.changed' && e.channel === 'office:events'
    );
    assert.ok(agentEvents.length >= 1);
    const securityEvent = agentEvents.find((e) => e.data.role === 'SECURITY_ENGINEER');
    assert.ok(securityEvent);
    assert.strictEqual(securityEvent?.data.roomId, 'RM-10');
  });
});
