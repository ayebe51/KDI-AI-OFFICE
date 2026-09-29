# Authentication & Authorization Specification: KDI AI Office

## 1. Overview & Security Baseline
The **KDI AI Office** security architecture mandates cryptographic authentication for all client-to-server interactions. Unauthenticated requests are rejected at the edge gateway before reaching the office workstation.

---

## 2. Authentication Mechanism: JSON Web Tokens (JWT)

### 2.1 Token Hierarchy
- **Access Token:** Short-lived JWT (lifetime: 60 minutes) containing user identity, roles, and cryptographic signature (Ed25519 or RS256).
- **Refresh Token:** Long-lived opaque token (lifetime: 30 days) stored in PostgreSQL `user_sessions`, bound to a specific client device fingerprint.

### 2.2 JWT Payload Structure
```json
{
  "iss": "https://auth.kdi-office.internal",
  "sub": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "username": "chief_developer",
  "role": "ROLE_DEVELOPER",
  "permissions": [
    "tasks:create",
    "tasks:read",
    "approvals:decide",
    "system:admin"
  ],
  "iat": 1759162800,
  "exp": 1759166400
}
```

---

## 3. Authentication Flows

### 3.1 Initial Login (`POST /api/v1/auth/login`)
1. User provides `username` and `password` (plus optional MFA TOTP code).
2. Gateway verifies credentials against PostgreSQL (Argon2id password hash check).
3. Issues `access_token` in JSON body and `refresh_token` as an `HttpOnly`, `SameSite=Strict`, `Secure` cookie.

### 3.2 WebSocket Connection Authentication
WebSockets authenticate during the HTTP upgrade handshake:
1. Client connects to `/ws/v1/events?token=<access_token>`.
2. Gateway verifies token validity and expiration.
3. If valid, the connection upgrades to WebSocket 101 Switching Protocols; if invalid, connection terminates with HTTP 401.

### 3.3 Edge Validation on VPS Reverse Proxy
To shield the office computer from brute-force authentication attempts:
- The Edge Nginx proxy uses `auth_request` or lightweight Lua / OpenResty handlers to verify the JWT signature locally on the VPS using the public verification key.
- Invalid requests are dropped at the VPS without entering the reverse tunnel.
