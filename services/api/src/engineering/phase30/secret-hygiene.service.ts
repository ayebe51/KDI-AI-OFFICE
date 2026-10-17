// ==========================================================
// services/api/src/engineering/phase30/secret-hygiene.service.ts
// Phase 30.4: Secret Sanitization & Authorization Hygiene Engine (§5)
// ==========================================================

export class SecretHygieneService {
  // Regex patterns for sensitive authorization credentials
  private static readonly TELEGRAM_TOKEN_REGEX =
    /(?:bot)?(\d{8,12}:[A-Za-z0-9_-]{30,})\b/gi;

  private static readonly PRIVATE_KEY_REGEX =
    /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g;

  private static readonly BEARER_TOKEN_REGEX =
    /(?:Bearer\s+)[A-Za-z0-9_.-]{16,}/gi;

  private static readonly KUBECONFIG_TOKEN_REGEX =
    /(?:token:\s*)[A-Za-z0-9_.-]{20,}/gi;

  private static readonly KUBECONFIG_DATA_REGEX =
    /(?:client-key-data:\s*)[A-Za-z0-9+/=]{20,}/gi;

  private static readonly CONNECTION_STRING_REGEX =
    /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi;

  private static readonly GENERIC_SECRET_KV_REGEX =
    /(?:password|secret|api_key|token|auth_token|client_secret)["']?\s*[:=]\s*["']?([A-Za-z0-9_.-]{8,})["']?/gi;

  /**
   * Sanitize text by redacting all identified secrets (§5)
   */
  public static sanitize(text: string): string {
    if (!text || typeof text !== 'string') return text;

    return text
      .replace(new RegExp(this.TELEGRAM_TOKEN_REGEX.source, 'gi'), (match, token) => {
        return match.replace(token, '[REDACTED_TELEGRAM_TOKEN]');
      })
      .replace(this.PRIVATE_KEY_REGEX, '[REDACTED_PRIVATE_KEY]')
      .replace(this.BEARER_TOKEN_REGEX, 'Bearer [REDACTED_TOKEN]')
      .replace(this.KUBECONFIG_TOKEN_REGEX, 'token: [REDACTED_KUBE_TOKEN]')
      .replace(this.KUBECONFIG_DATA_REGEX, 'client-key-data: [REDACTED_KEY_DATA]')
      .replace(this.CONNECTION_STRING_REGEX, (match) => {
        const protocol = match.split('://')[0];
        return `${protocol}://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]`;
      })
      .replace(this.GENERIC_SECRET_KV_REGEX, (match, secretVal) => {
        return match.replace(secretVal, '[REDACTED]');
      });
  }

  /**
   * Determine if a string contains unredacted credential patterns (§5)
   */
  public static containsExposedSecret(text: string): boolean {
    if (!text || typeof text !== 'string') return false;

    // Filter out already sanitized placeholders
    const cleanText = text
      .replace(/\[REDACTED_TELEGRAM_TOKEN\]/g, '')
      .replace(/Bearer \[REDACTED_TOKEN\]/g, '')
      .replace(/\[REDACTED_PRIVATE_KEY\]/g, '')
      .replace(/token: \[REDACTED_KUBE_TOKEN\]/g, '')
      .replace(/client-key-data: \[REDACTED_KEY_DATA\]/g, '')
      .replace(/\[REDACTED_USER\]:\[REDACTED_PASSWORD\]@\[REDACTED_HOST\]/g, '')
      .replace(/\[REDACTED\]/g, '');

    // Check against patterns (resetting regex state)
    const tRegex = new RegExp(this.TELEGRAM_TOKEN_REGEX.source, 'gi');
    if (tRegex.test(cleanText)) return true;

    const pkRegex = new RegExp(this.PRIVATE_KEY_REGEX.source, 'g');
    if (pkRegex.test(text)) return true;

    const bRegex = new RegExp(this.BEARER_TOKEN_REGEX.source, 'gi');
    if (bRegex.test(text)) return true;

    const kRegex = new RegExp(this.KUBECONFIG_TOKEN_REGEX.source, 'gi');
    if (kRegex.test(text)) return true;

    const connRegex = new RegExp(this.CONNECTION_STRING_REGEX.source, 'gi');
    if (connRegex.test(text)) return true;

    return false;
  }

  /**
   * Audit and validate a human authorization token / signature (§5)
   * Prevents treating synthetic test fixtures as live production credentials.
   */
  public static auditAuthorizationToken(
    token: string,
    mode: 'STRICT_PRODUCTION' | 'TEST_FIXTURE'
  ): {
    valid: boolean;
    isSyntheticFixture: boolean;
    rejectionReason?: string;
  } {
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        isSyntheticFixture: false,
        rejectionReason: 'TOKEN_EMPTY: Human authorization token is missing or empty.',
      };
    }

    // Check if token matches synthetic fixture naming conventions
    const isSynthetic =
      token.startsWith('human_sig_p303_auth_') ||
      token.startsWith('human_sig_valid') ||
      token.startsWith('mock_') ||
      token.includes('fixture') ||
      token.includes('test');

    if (mode === 'STRICT_PRODUCTION' && isSynthetic) {
      return {
        valid: false,
        isSyntheticFixture: true,
        rejectionReason:
          'SYNTHETIC_FIXTURE_REJECTED: Token is an illustrative test fixture, not a live verified Ed25519/HMAC signature. Live production rejects synthetic authorization.',
      };
    }

    if (mode === 'STRICT_PRODUCTION' && token.length < 32) {
      return {
        valid: false,
        isSyntheticFixture: false,
        rejectionReason:
          'TOKEN_ENTROPY_INSUFFICIENT: Cryptographic signature must be at least 32 characters in strict production mode.',
      };
    }

    return {
      valid: true,
      isSyntheticFixture: isSynthetic,
    };
  }
}
