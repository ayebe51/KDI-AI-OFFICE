# Remote Access Architecture & Secure Gateway: KDI AI Office

## 1. Threat Environment & Core Principle
Because the **KDI AI Office** execution host resides on an on-premise workstation containing source code repositories, development databases, and execution sandboxes, it must **NEVER** be directly exposed to the public internet.

### 1.1 Strict Isolation Rules
- **Rule 1:** Zero inbound listening ports on the office network router/firewall.
- **Rule 2:** Storage engines (`PostgreSQL`, `Redis`, `Neo4j`), `Ollama`, and `OpenCode` bind strictly to `127.0.0.1` and internal Docker networks.
- **Rule 3:** All ingress traffic from the public web dashboard must traverse the authenticated Edge VPS Gateway via an outbound-initiated encrypted reverse tunnel.

---

## 2. Remote Access Architecture Flow

```text
[ Remote Mobile / Desktop User ]
           │
           ▼ (1. HTTPS / WSS on Port 443 with TLS 1.3)
[ Cloud VPS / Hostinger Gateway (Nginx / Traefik) ]
   ├── Edge WAF & IP Rate Limiting (Cloudflare / Fail2ban)
   ├── Edge JWT Token Verification (HMAC-SHA256 / RSA-256)
   └── FRPS Tunnel Server (Port 7000 / mTLS Authentication)
           ▲
           ║ (2. Persistent Outbound Encrypted Reverse Tunnel)
           ║    (Initiated from Office PC to VPS)
           ▼
[ Office Workstation Behind NAT / Firewall ]
   └── FRPC Tunnel Client
           │
           ▼ (3. Forwarded Local HTTP/WS traffic to 127.0.0.1:8000)
   [ KDI AI Office API Gateway (FastAPI) ]
           │
           ├── Role-Based Auth Verification & Session Guard
           └── Internal Message Broker & Task Supervisor
```

---

## 3. Tunnel Implementation Details (FRP / Fast Reverse Proxy)

### 3.1 Edge Server Configuration (`frps.ini` on VPS)
```ini
[common]
bind_port = 7000
auth.token = "${KDI_FRPS_CRYPTO_TOKEN}"
tls_only = true
dashboard_port = 7500
dashboard_user = "admin"
dashboard_pwd = "${KDI_FRPS_DASHBOARD_PASS}"
```

### 3.2 Office Client Configuration (`frpc.ini` on Workstation)
```ini
[common]
server_addr = "vps.kdioffice.internal"
server_port = 7000
auth.token = "${KDI_FRPS_CRYPTO_TOKEN}"
tls_enable = true

[kdi-api-http]
type = tcp
local_ip = 127.0.0.1
local_port = 8000
remote_port = 18000

[kdi-api-ws]
type = tcp
local_ip = 127.0.0.1
local_port = 8000
remote_port = 18001
```

### 3.3 VPS Nginx Reverse Proxy Config Snippet
```nginx
server {
    server_name office.kdi.internal;
    listen 443 ssl http2;
    
    ssl_certificate /etc/letsencrypt/live/office.kdi.internal/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/office.kdi.internal/privkey.pem;

    # Rate limiting
    limit_req zone=kdi_api_limit burst=20 nodelay;

    location / {
        root /var/www/kdi-3d-dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:18000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:18000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

---

## 4. Edge Security & Token Authentication
1. **Edge Verification:** The Nginx reverse proxy or lightweight middleware validates the user's JWT before proxying to the tunnel. Unauthenticated requests are rejected at the edge with HTTP 401 without consuming workstation bandwidth.
2. **Replay Protection:** API requests include a monotonic timestamp and nonce; requests older than 60 seconds are dropped.
3. **Emergency Disconnect:** The developer can instantly kill the tunnel daemon on the office PC or revoke the tunnel token on the VPS, instantly severing all remote ingress while leaving local office operations intact.
