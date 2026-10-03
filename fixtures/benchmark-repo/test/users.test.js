import { test } from 'node:test';
import assert from 'node:assert';
import { UserService } from '../src/users.service.js';

test('UserService: Filters users by school without empty-result regression', () => {
  const service = new UserService();
  const allUsers = service.listUsers();
  assert.strictEqual(allUsers.length, 4);

  const sch1Users = service.listUsers({ schoolId: 'SCH-01' });
  assert.strictEqual(sch1Users.length, 2);

  // Regression test: Empty filter array should not throw or return empty
  const emptyFilterUsers = service.listUsers({ schoolId: [] });
  assert.strictEqual(emptyFilterUsers.length, 4);
});
