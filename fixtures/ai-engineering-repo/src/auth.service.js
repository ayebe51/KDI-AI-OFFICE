// ==========================================================
// fixtures/ai-engineering-repo/src/auth.service.js
// Authentication & Session Service with Deliberate Defect
// ==========================================================

export class AuthService {
  constructor() {
    this.users = new Map([
      ['budi', { id: 'usr_1', username: 'budi', passwordHash: 'hash_secret123' }],
      ['owner', { id: 'usr_2', username: 'owner', passwordHash: 'hash_adminpass' }],
    ]);
    this.sessions = new Map();
  }

  /**
   * User login endpoint
   */
  login(username, password) {
    const user = this.users.get(username);
    if (!user || user.passwordHash !== `hash_${password}`) {
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }
    const token = `tok_${user.id}_${Date.now()}`;
    this.sessions.set(token, { userId: user.id, username: user.username, createdAt: Date.now() });
    return { success: true, token, user: { id: user.id, username: user.username } };
  }

  /**
   * Validate session token
   */
  validateSession(token) {
    if (!token) return false;
    return this.sessions.has(token);
  }

  /**
   * Refresh session token
   * DELIBERATE DEFECT: Token refresh fails to persist new session and returns null.
   */
  refreshToken(token) {
    if (!token || !this.sessions.has(token)) {
      return null;
    }
    // BUG: Missing session persistence, returns null
    return null;
  }
}
