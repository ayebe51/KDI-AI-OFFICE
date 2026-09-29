// ==========================================================
// services/api/src/llm/exceptions/llm.exception.ts
// Canonical Error Normalization for LLM Providers
// ==========================================================

import type { LLMErrorCode, LLMProviderType } from '@kdi/types';

export class LLMException extends Error {
  public readonly code: LLMErrorCode;
  public readonly provider: LLMProviderType;
  public readonly statusCode?: number;
  public readonly retryAfterMs?: number;
  public readonly isRetryable: boolean;
  public readonly rawError?: unknown;

  constructor(params: {
    code: LLMErrorCode;
    provider: LLMProviderType;
    message: string;
    statusCode?: number;
    retryAfterMs?: number;
    isRetryable?: boolean;
    rawError?: unknown;
  }) {
    super(`[${params.provider.toUpperCase()}::${params.code}] ${params.message}`);
    this.name = 'LLMException';
    this.code = params.code;
    this.provider = params.provider;
    this.statusCode = params.statusCode;
    this.retryAfterMs = params.retryAfterMs;
    this.isRetryable = params.isRetryable ?? LLMException.computeDefaultRetryable(params.code);
    this.rawError = params.rawError;
  }

  private static computeDefaultRetryable(code: LLMErrorCode): boolean {
    switch (code) {
      case 'RATE_LIMITED':
      case 'QUOTA_EXCEEDED':
      case 'TIMEOUT':
      case 'PROVIDER_UNAVAILABLE':
      case 'PROVIDER_ERROR':
        return true;
      case 'AUTHENTICATION_FAILED':
      case 'MODEL_NOT_FOUND':
      case 'INVALID_REQUEST':
      case 'CONTEXT_TOO_LARGE':
      case 'CONTENT_FILTERED':
      case 'UNKNOWN_ERROR':
      default:
        return false;
    }
  }

  public static fromHttpStatus(
    provider: LLMProviderType,
    status: number,
    message: string,
    retryAfterSeconds?: number,
    raw?: unknown
  ): LLMException {
    let code: LLMErrorCode = 'PROVIDER_ERROR';
    if (status === 401 || status === 403) code = 'AUTHENTICATION_FAILED';
    else if (status === 404) code = 'MODEL_NOT_FOUND';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status === 400 || status === 422) code = 'INVALID_REQUEST';
    else if (status === 408 || status === 504) code = 'TIMEOUT';
    else if (status === 502 || status === 503) code = 'PROVIDER_UNAVAILABLE';

    const retryAfterMs = retryAfterSeconds ? retryAfterSeconds * 1000 : undefined;
    return new LLMException({
      code,
      provider,
      message,
      statusCode: status,
      retryAfterMs,
      rawError: raw,
    });
  }
}
