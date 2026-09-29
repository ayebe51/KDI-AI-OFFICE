# Secrets Management & Key Security: KDI AI Office

## 1. Overview & Core Principles
Secrets management in **KDI AI Office** prevents unauthorized disclosure or exfiltration of sensitive credentials (LLM API keys, database credentials, reverse tunnel tokens, Git tokens).

### 1.1 The Golden Rules of Secrets
1. **Zero Plaintext Secrets in Repositories:** No API keys, passwords, or tokens may ever be committed to Git. `.gitignore` strictly excludes `.env`, `*.pem`, `*.key`, and `data/`.
2. **In-Memory Injection Only:** Secrets are injected directly into process memory at boot time or fetched on-demand from the encrypted database vault.
3. **Automated Secret Redaction:** All logging pipelines, telemetry streams, and WebSocket broadcasters pass through regex filters that scrub detected tokens.

---

## 2. Key Hierarchy & Encryption Standards

```text
[ MASTER ENCRYPTION KEY (MEK) ]
   └── Sourced from local OS Keyring / Protected Workstation File (chmod 600)
            │
            ▼ (AES-256-GCM Envelope Encryption)
[ DATABASE SECRETS VAULT (PostgreSQL: system_settings) ]
   ├── GEMINI_API_KEY (Encrypted Ciphertext + IV + Auth Tag)
   ├── GROQ_API_KEY (Encrypted Ciphertext + IV + Auth Tag)
   ├── OPENROUTER_API_KEY (Encrypted Ciphertext + IV + Auth Tag)
   └── GITHUB_PAT_TOKEN (Encrypted Ciphertext + IV + Auth Tag)
```

### 2.1 Encryption Specification (AES-256-GCM)
- **Algorithm:** AES-256 in Galois/Counter Mode (GCM).
- **Initialization Vector (IV):** 96-bit cryptographically secure random bytes generated uniquely per secret record.
- **Authentication Tag:** 128-bit tag verified on every decryption operation to guarantee integrity.

---

## 3. Secret Redaction Pipeline

Every log entry, LLM response, and tool output is sanitized before persistence:

```python
# Conceptual Regex Scrubber
SECRET_PATTERNS = [
    r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}",
    r"AIzaSy[a-zA-Z0-9_-]{33}",               # Google Gemini Key
    r"gsk_[a-zA-Z0-9]{48}",                   # Groq API Key
    r"sk-or-v1-[a-zA-Z0-9]{64}",              # OpenRouter Key
    r"ghp_[a-zA-Z0-9]{36}",                   # GitHub PAT
    r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END"
]

def redact_secrets(text: str) -> str:
    sanitized = text
    for pattern in SECRET_PATTERNS:
        sanitized = re.sub(pattern, "[REDACTED_SECRET]", sanitized)
    return sanitized
```

---

## 4. Secret Rotation & Revocation
1. **Immediate Revocation:** If a key is suspected of being exposed, updating `system_settings` via the Web UI immediately flushes the in-memory cache in the AI Router.
2. **Periodic Rotation:** Cloud provider keys are rotated every 90 days.
3. **Emergency Secret Wipe:** A dedicated local CLI script (`./scripts/wipe-secrets.sh`) can instantly scrub all cached tokens and reset the local vault in an emergency.
