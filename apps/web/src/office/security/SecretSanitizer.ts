// ==========================================================
// apps/web/src/office/security/SecretSanitizer.ts
// Centralized Secret Detection & Redaction Engine
// Ensures zero leakage of credentials, tokens, and secrets
// into thought bubbles, activity feeds, terminals, or logs.
// ==========================================================

export class SecretSanitizer {
  private static readonly SECRET_PATTERNS: Array<{ pattern: RegExp; mask: string }> = [
    // Database connection strings (Postgres, Redis, Neo4j, MongoDB, MySQL)
    {
      pattern: /(postgres(?:ql)?|redis|rediss|neo4j|neo4js|mongodb|mysql):\/\/[^\s"'<>]+/gi,
      mask: '$1://[REDACTED_CREDENTIALS]',
    },
    // Bearer / JWT Tokens
    {
      pattern: /bearer\s+eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
      mask: 'Bearer [REDACTED_JWT_TOKEN]',
    },
    {
      pattern: /\beyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_.+/=]{10,}\b/g,
      mask: '[REDACTED_JWT]',
    },
    // OpenAI API Keys
    {
      pattern: /\bsk-(?:proj-|live-)?[A-Za-z0-9_-]{20,}\b/g,
      mask: 'sk-[REDACTED_KEY]',
    },
    // Anthropic API Keys
    {
      pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
      mask: 'sk-ant-[REDACTED_KEY]',
    },
    // Google / Gemini API Keys (AIza followed by 30 to 45 alphanumeric / dashes)
    {
      pattern: /\bAIza[0-9A-Za-z-_]{25,45}\b/g,
      mask: 'AIza[REDACTED_GEMINI_KEY]',
    },
    // Groq API Keys
    {
      pattern: /\bgsk_[A-Za-z0-9_-]{20,}\b/g,
      mask: 'gsk_[REDACTED_GROQ_KEY]',
    },
    // GitHub Personal Access Tokens
    {
      pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}\b/g,
      mask: 'ghp_[REDACTED_GITHUB_TOKEN]',
    },
    // Telegram Bot Tokens (e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ)
    {
      pattern: /\b\d{7,12}:[A-Za-z0-9_-]{30,45}\b/g,
      mask: '[REDACTED_TELEGRAM_TOKEN]',
    },
    // Generic Passwords & Secrets in JSON / env / CLI assignments (ignoring already redacted placeholders)
    {
      pattern: /(["']?(?:password|secret|passwd|apiKey|api_key|access_token|private_key|token)["']?\s*[:=]\s*["']?)(?!(?:\[REDACTED_[^\]]+\]))([^"'&\s\n\r,}{]{3,})(["']?)/gi,
      mask: '$1[REDACTED_SECRET]$3',
    },
    // PEM Private Keys
    {
      pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
      mask: '[REDACTED_PRIVATE_KEY_BLOCK]',
    },
  ];

  /**
   * Sanitizes an input string by masking all sensitive tokens, passwords, and URIs.
   */
  public static sanitize(text: string | null | undefined): string {
    if (!text) return '';
    let result = text;
    for (const { pattern, mask } of this.SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, mask);
    }
    return result;
  }

  /**
   * Checks whether the text contains any detectable secret.
   */
  public static containsSecret(text: string | null | undefined): boolean {
    if (!text) return false;
    return this.SECRET_PATTERNS.some(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
  }
}
