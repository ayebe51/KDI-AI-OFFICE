// ==========================================================
// apps/web/src/components/portfolio/SecurityUtils.ts
// Frontend Content Sanitization & Open-Redirect Defense
// ==========================================================

/**
 * Validates whether an outbound URL is safe to navigate to.
 * Enforces http: and https: protocols only.
 * Rejects javascript:, data:, vbscript:, and protocol-relative URLs (//)
 */
export function validateSafeUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const trimmed = url.trim();
    if (trimmed.startsWith('//')) return false;

    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const lower = trimmed.toLowerCase();
    if (
      lower.includes('javascript:') ||
      lower.includes('data:') ||
      lower.includes('vbscript:') ||
      lower.includes('<script')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Strips dangerous HTML tags and script handlers from text
 */
export function sanitizeString(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Produces safe repository link presentation
 */
export function getSafeRepositoryNotice(isPublic: boolean, url?: string): {
  isAvailable: boolean;
  label: string;
  safeUrl?: string;
  notice: string;
} {
  if (isPublic && url && validateSafeUrl(url)) {
    return {
      isAvailable: true,
      label: 'View Repository',
      safeUrl: url,
      notice: 'Public Open Source Repository',
    };
  }

  return {
    isAvailable: false,
    label: 'Repository Unavailable Publicly',
    safeUrl: undefined,
    notice: 'Proprietary / Internal Enterprise Codebase. Public access is restricted.',
  };
}
