# Secret Management & Automated Scanning — KDI AI Office

## 1. Secrets Separation Policy
In adherence to 12-factor application architecture, credentials, API keys, and private certificates are strictly isolated from source code:
- Stored exclusively in `.env.production` on the canonical host (never committed to git).
- `.gitignore` explicitly excludes `.env*` files (except `.env.example`).

## 2. Automated Secret Scanning
The `SecurityHardeningService` executes automated regex scans during preflight checks, detecting:
- Unmasked RSA/PEM Private Keys (`-----BEGIN PRIVATE KEY-----`)
- Google AI API Keys (`AIzaSy...`)
- OpenAI / Anthropic API Keys (`sk-...`)
- Groq Cloud API Keys (`gsk_...`)
- GitHub Personal Access Tokens (`ghp_...`)
- Plaintext database passwords in connection strings

## 3. Secret Rotation Workflow
1. Generate replacement credential in provider portal.
2. Update `.env.production` on the Office Computer.
3. Verify connectivity via `npm run validate:prod`.
4. Trigger rolling restart of KDI API service.
5. Invalidate and revoke the superseded credential in the provider portal.
