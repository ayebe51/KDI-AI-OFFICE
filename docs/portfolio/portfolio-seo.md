# Portfolio SEO & Crawlability Specification

## 1. Meta Tag Strategy
Every public project dynamically constructs indexable metadata:
- **Title Tag:** `{Project Name} | KDI AI Office Portfolio`
- **Meta Description:** Sanitized `shortDescription` (max 160 characters).
- **Canonical URL:** `https://kdi-office.id/project/{slug}`
- **OpenGraph Protocol:**
  - `og:title`, `og:description`, `og:url`
  - `og:image` (high-resolution project screenshot or default branded card)

## 2. Structured Data (JSON-LD)
Injected into document head for Google and search engine rich snippets:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SIMMACI — Academic Management & Student Statistics",
  "applicationCategory": "Web Application",
  "operatingSystem": "Web / Cloud",
  "author": {
    "@type": "Organization",
    "name": "KDI AI Office",
    "url": "https://kdi-office.id"
  },
  "keywords": "Laravel, PHP, React, TypeScript, MySQL, Redis"
}
```
