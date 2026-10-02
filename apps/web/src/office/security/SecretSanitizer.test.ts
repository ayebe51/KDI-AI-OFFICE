// ==========================================================
// apps/web/src/office/security/SecretSanitizer.test.ts
// Unit Tests for KDI SecretSanitizer
// ==========================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SecretSanitizer } from './SecretSanitizer.ts';

describe('SecretSanitizer', () => {
  it('masks PostgreSQL and Redis connection URIs with passwords', () => {
    const raw = 'Connected to postgresql://kdi_admin:SuperSecretPass123@localhost:5432/kdi_prod';
    const clean = SecretSanitizer.sanitize(raw);
    assert.strictEqual(clean.includes('SuperSecretPass123'), false);
    assert.strictEqual(clean, 'Connected to postgresql://[REDACTED_CREDENTIALS]');
  });

  it('masks OpenAI, Anthropic, Gemini and Groq API keys', () => {
    const openai = 'sk-proj-abc123456789012345678901234567890';
    const gemini = 'AIzaSyD-abc1234567890123456789012345';
    const groq = 'gsk_123456789012345678901234';

    assert.strictEqual(SecretSanitizer.sanitize(openai), 'sk-[REDACTED_KEY]');
    assert.strictEqual(SecretSanitizer.sanitize(gemini), 'AIza[REDACTED_GEMINI_KEY]');
    assert.strictEqual(SecretSanitizer.sanitize(groq), 'gsk_[REDACTED_GROQ_KEY]');
  });

  it('masks JWT Bearer tokens in headers or logs', () => {
    const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const clean = SecretSanitizer.sanitize(raw);
    assert.strictEqual(clean.includes('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'), false);
    assert.strictEqual(clean, 'Authorization: Bearer [REDACTED_JWT_TOKEN]');
  });

  it('masks Telegram bot tokens', () => {
    const raw = 'TELEGRAM_BOT_TOKEN=7123456789:AAH1234567890abcdefghijklmnopqrstuvwxyz';
    const clean = SecretSanitizer.sanitize(raw);
    assert.strictEqual(clean.includes('AAH1234567890abcdefghijklmnopqrstuvwxyz'), false);
    assert.strictEqual(clean.includes('[REDACTED_TELEGRAM_TOKEN]'), true, `clean was: ${clean}`);
  });

  it('detects presence of secrets accurately', () => {
    assert.strictEqual(SecretSanitizer.containsSecret('Normal message about Farhan coding'), false);
    assert.strictEqual(SecretSanitizer.containsSecret('Using sk-proj-123456789012345678901234'), true);
  });
});
