// SIMMACI Authentication & Session Service
export class AuthService {
  constructor() {
    this.users = new Map([
      ['admin@simmaci.kdi', { id: 'usr_001', role: 'ADMIN', passwordHash: 'hash_admin123', failedAttempts: 0 }],
      ['guru1@simmaci.kdi', { id: 'usr_002', role: 'TEACHER', passwordHash: 'hash_guru123', failedAttempts: 0 }],
    ]);
    this.sessions = new Map();
  }

  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 6;
  }

  authenticate(email, password) {
    if (!this.validateEmail(email) || !this.validatePassword(password)) {
      return { success: false, error: 'INVALID_CREDENTIALS_FORMAT' };
    }

    const user = this.users.get(email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const expectedHash = `hash_${password}`;
    if (user.passwordHash !== expectedHash) {
      user.failedAttempts += 1;
      return { success: false, error: 'INCORRECT_PASSWORD' };
    }

    user.failedAttempts = 0;
    const token = `tok_${user.id}_${Date.now()}`;
    this.sessions.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + 3600000 });
    return { success: true, token, user: { id: user.id, role: user.role } };
  }

  verifyToken(token) {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  validateSession(token) {
    return Boolean(this.verifyToken(token));
  }

  refreshToken(token) {
    const session = this.verifyToken(token);
    if (!session) return null;
    const newToken = `tok_${session.userId}_${Date.now()}`;
    this.sessions.set(newToken, { ...session, expiresAt: Date.now() + 3600000 });
    return { success: true, token: newToken, user: { id: session.userId, role: session.role } };
  }
}
