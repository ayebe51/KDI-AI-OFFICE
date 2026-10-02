export class SecretSanitizer {
    static SECRET_PATTERNS = [
        {
            pattern: /(postgres(?:ql)?|redis|rediss|neo4j|neo4js|mongodb|mysql):\/\/[^\s"'<>]+/gi,
            mask: '$1://[REDACTED_CREDENTIALS]',
        },
        {
            pattern: /bearer\s+eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
            mask: 'Bearer [REDACTED_JWT_TOKEN]',
        },
        {
            pattern: /\beyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_.+/=]{10,}\b/g,
            mask: '[REDACTED_JWT]',
        },
        {
            pattern: /\bsk-(?:proj-|live-)?[A-Za-z0-9_-]{20,}\b/g,
            mask: 'sk-[REDACTED_KEY]',
        },
        {
            pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
            mask: 'sk-ant-[REDACTED_KEY]',
        },
        {
            pattern: /\bAIza[0-9A-Za-z-_]{25,45}\b/g,
            mask: 'AIza[REDACTED_GEMINI_KEY]',
        },
        {
            pattern: /\bgsk_[A-Za-z0-9_-]{20,}\b/g,
            mask: 'gsk_[REDACTED_GROQ_KEY]',
        },
        {
            pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}\b/g,
            mask: 'ghp_[REDACTED_GITHUB_TOKEN]',
        },
        {
            pattern: /\b\d{7,12}:[A-Za-z0-9_-]{30,45}\b/g,
            mask: '[REDACTED_TELEGRAM_TOKEN]',
        },
        {
            pattern: /(["']?(?:password|secret|passwd|apiKey|api_key|access_token|private_key|token)["']?\s*[:=]\s*["']?)(?!(?:\[REDACTED_[^\]]+\]))([^"'&\s\n\r,}{]{3,})(["']?)/gi,
            mask: '$1[REDACTED_SECRET]$3',
        },
        {
            pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
            mask: '[REDACTED_PRIVATE_KEY_BLOCK]',
        },
    ];
    static sanitize(text) {
        if (!text)
            return '';
        let result = text;
        for (const { pattern, mask } of this.SECRET_PATTERNS) {
            pattern.lastIndex = 0;
            result = result.replace(pattern, mask);
        }
        return result;
    }
    static containsSecret(text) {
        if (!text)
            return false;
        return this.SECRET_PATTERNS.some(({ pattern }) => {
            pattern.lastIndex = 0;
            return pattern.test(text);
        });
    }
}
//# sourceMappingURL=SecretSanitizer.js.map