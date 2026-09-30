# Portfolio Security Architecture

## 1. Threat Vectors & Defenses

### 1.1 Cross-Site Scripting (XSS)
- **Vector:** Malicious script injection into project titles, problem descriptions, or team notes.
- **Defense:** Dual-layer sanitization:
  - Backend: `sanitizeString()` regex removes `<script>`, `<iframe>`, inline event handlers (`onload=`, `onerror=`), and `javascript:` pseudo-protocols.
  - Frontend: React JSX auto-escapes string interpolations; manual dangerouslySetInnerHTML is prohibited across all portfolio components.

### 1.2 Open Redirect Defense
- **Vector:** Exploiting `demoUrl` or `repositoryUrl` to redirect users to phishing sites via schemes like `javascript:`, `data:`, or protocol-relative URLs (`//evil.com`).
- **Defense:** `validateSafeUrl()` strictly parses URLs and enforces:
  - Protocol must be strictly `http:` or `https:`.
  - Rejection of protocol-relative (`//`) prefixes.
  - Validation runs both on administrative project submission and on client click rendering.

### 1.3 Repository Information Disclosure
- **Vector:** Exposing internal private repository URLs containing internal hostnames, port numbers, or auth tokens.
- **Defense:** If `isRepositoryPublic` is `false`, the `repositoryUrl` field is omitted from public responses, and the frontend renders a static notice: `"Repository Unavailable Publicly"`.
