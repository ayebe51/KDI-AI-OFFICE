import { test } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/auth.service.js';

test('AuthService: Validates login format and rejects bad inputs', () => {
  const auth = new AuthService();
  assert.strictEqual(auth.validateEmail('invalid-email'), false);
  assert.strictEqual(auth.validateEmail('admin@simmaci.kdi'), true);
  assert.strictEqual(auth.validatePassword('123'), false);
  assert.strictEqual(auth.validatePassword('admin123'), true);
});

test('AuthService: Authenticates valid credentials', () => {
  const auth = new AuthService();
  const res = auth.authenticate('admin@simmaci.kdi', 'admin123');
  assert.strictEqual(res.success, true);
  assert.ok(res.token.startsWith('tok_usr_001'));
  assert.strictEqual(res.user.role, 'ADMIN');

  const verified = auth.verifyToken(res.token);
  assert.ok(verified);
  assert.strictEqual(verified.userId, 'usr_001');
});
