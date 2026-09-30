// ==========================================================
// apps/web/src/components/portfolio/SeoMetadata.ts
// Dynamic SEO & Structured Data Generator for Projects
// ==========================================================

import type { PublicProject } from '@kdi/types';

function cleanText(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}


export interface SeoConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: string;
  ogImage?: string;
  keywords: string[];
  jsonLd: Record<string, unknown>;
}

export function generateProjectSeo(
  project: PublicProject,
  baseUrl = 'https://kdi-office.id'
): SeoConfig {
  const cleanTitle = `${cleanText(project.name)} | KDI AI Office Portfolio`;
  const cleanDesc = cleanText(project.shortDescription || project.description);

  const canonicalUrl = `${baseUrl}/project/${project.slug}`;
  const ogImage =
    project.screenshots?.[0] ||
    project.media?.[0]?.url ||
    `${baseUrl}/images/kdi-portfolio-og.jpg`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: project.name,
    headline: project.shortDescription,
    description: project.description,
    applicationCategory: project.category,
    operatingSystem: 'Web / Cloud / Mobile',
    datePublished: project.year,
    dateModified: project.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'KDI AI Office',
      url: baseUrl,
    },
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
    keywords: project.technologies.join(', '),
  };

  return {
    title: cleanTitle,
    description: cleanDesc,
    canonicalUrl,
    ogType: 'website',
    ogImage,
    keywords: project.technologies,
    jsonLd,
  };
}

/**
 * Apply SEO tags dynamically to browser document head
 */
export function applyDocumentSeo(seo: SeoConfig): void {
  if (typeof document === 'undefined') return;

  // Title
  document.title = seo.title;

  // Meta description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.setAttribute('name', 'description');
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute('content', seo.description);

  // OpenGraph Title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', seo.title);

  // OpenGraph Image
  if (seo.ogImage) {
    let ogImg = document.querySelector('meta[property="og:image"]');
    if (!ogImg) {
      ogImg = document.createElement('meta');
      ogImg.setAttribute('property', 'og:image');
      document.head.appendChild(ogImg);
    }
    ogImg.setAttribute('content', seo.ogImage);
  }
}
