// ==========================================================
// @kdi/shared - Structured Logger & Common Utilities
// ==========================================================

import type { WSEventEnvelope } from '@kdi/types';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  requestId?: string;
  operation: string;
  errorCode?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Regex patterns for scrubbed keys and tokens
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /bearer/i,
  /private_?key/i,
  /credential/i,
];

// Inline secret content patterns
const SENSITIVE_CONTENT_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // PEM Private Keys
  { pattern: /-----BEGIN [A-Z\s]+PRIVATE KEY-----[\s\S]*?-----END [A-Z\s]+PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
  // Google API Keys
  { pattern: /AIzaSy[A-Za-z0-9_-]{25,40}/g, replacement: '[REDACTED_GOOGLE_API_KEY]' },
  // OpenAI / Anthropic / Generic sk- keys
  { pattern: /sk-[a-zA-Z0-9_-]{20,}/g, replacement: '[REDACTED_API_KEY]' },
  // Groq API Keys
  { pattern: /gsk_[a-zA-Z0-9_-]{20,}/g, replacement: '[REDACTED_GROQ_API_KEY]' },
  // GitHub Personal Access Tokens
  { pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  // Database connection strings with credentials
  { pattern: /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@[^\s"']+)/gi, replacement: '$1[REDACTED_PASSWORD]$3' },
  { pattern: /(redis:\/\/[^:]+:)([^@]+)(@[^\s"']+)/gi, replacement: '$1[REDACTED_PASSWORD]$3' },
  // Bearer tokens
  { pattern: /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, replacement: '$1[REDACTED_BEARER_TOKEN]' },
  // Key-value patterns like password=xyz or secret: "xyz"
  { pattern: /((?:password|secret|api_?key|token)\s*[:=]\s*["']?)([^"'\s\n\r]+)(["']?)/gi, replacement: '$1[REDACTED]$3' },
];

export function redactSecretsFromString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;
  for (const { pattern, replacement } of SENSITIVE_CONTENT_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

export function scrubSensitiveData(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return redactSecretsFromString(obj);
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(scrubSensitiveData);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitiveKey) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = redactSecretsFromString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = scrubSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class StructuredLogger {
  constructor(private readonly serviceName: string) {}

  private write(level: LogLevel, operation: string, message: string, meta?: Record<string, unknown>, requestId?: string, errorCode?: string) {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      requestId,
      operation,
      errorCode,
      message,
      metadata: meta ? (scrubSensitiveData(meta) as Record<string, unknown>) : undefined,
    };

    const serialized = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(serialized);
    } else if (level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  info(operation: string, message: string, meta?: Record<string, unknown>, requestId?: string) {
    this.write('INFO', operation, message, meta, requestId);
  }

  warn(operation: string, message: string, meta?: Record<string, unknown>, requestId?: string, errorCode?: string) {
    this.write('WARN', operation, message, meta, requestId, errorCode);
  }

  error(operation: string, message: string, meta?: Record<string, unknown>, requestId?: string, errorCode?: string) {
    this.write('ERROR', operation, message, meta, requestId, errorCode);
  }

  debug(operation: string, message: string, meta?: Record<string, unknown>, requestId?: string) {
    this.write('DEBUG', operation, message, meta, requestId);
  }
}

export function createWSEventEnvelope<T>(
  type: string,
  channel: 'office:public' | 'portfolio:public' | 'office:events' | 'workforce:finance',
  data: T
): WSEventEnvelope<T> {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return {
    eventId: `evt_${Date.now()}_${randomSuffix}`,
    type,
    timestamp: new Date().toISOString(),
    channel,
    data,
  };
}
