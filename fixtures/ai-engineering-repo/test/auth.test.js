// ==========================================================
// fixtures/ai-engineering-repo/test/auth.test.js
// Automated Unit & Regression Tests for AuthService
// ==========================================================

import test from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/auth.service.js';

test('AuthService: Login and Session Lifecycle', async (t) => {
  const auth = new AuthService();

  await t.test('Login succeeds with valid credentials', () => {
    const res = auth.login('budi', 'secret123');
    assert.strictEqual(res.success, true);
    assert.ok(res.token);
    assert.strictEqual(auth.validateSession(res.token), true);
  });

  await t.test('Invalid credentials remain rejected', () => {
    const res = auth.login('budi', 'wrongpassword');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'INVALID_CREDENTIALS');
  });

  await t.test('Refresh token flow remains functional', () => {
    const loginRes = auth.login('budi', 'secret123');
    assert.ok(loginRes.token, 'Must obtain initial login token');

    const refreshed = auth.refreshToken(loginRes.token);
    assert.ok(refreshed, 'Refreshed response must not be null');
    assert.ok(refreshed.token, 'New session token must be present');
    assert.strictEqual(auth.validateSession(refreshed.token), true, 'Refreshed session must be valid');
  });
});
