// ==========================================================
// services/api/src/projects/projects.service.test.ts
// Unit Tests for Canonical Projects & Public Portfolio Service
// ==========================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProjectsService } from './projects.service.js';

describe('ProjectsService: Canonical Portfolio & Zero-Leakage Tests', () => {
  const service = new ProjectsService();

  it('Test 1: Project CRUD & Slug Uniqueness', () => {
    // Create new project
    const created = service.createProject({
      name: 'Pesantren AI Assistant',
      shortDescription: 'AI assistant for Islamic knowledge queries',
      description: 'Full description of pesantren AI assistant',
      category: 'AI System',
      projectType: 'AI_SYSTEM',
      technologies: ['Python', 'FastAPI', 'Ollama'],
      visibility: 'PUBLIC',
      demoUrl: 'https://assistant.kdi-office.id',
    });

    assert.ok(created.projectId);
    assert.strictEqual(created.slug, 'pesantren-ai-assistant');
    assert.strictEqual(created.publishStatus, 'DRAFT'); // Default status is DRAFT

    // Updating project
    const updated = service.updateProject(created.projectId, {
      shortDescription: 'Updated assistant short description',
    });
    assert.strictEqual(updated.shortDescription, 'Updated assistant short description');

    // Duplicate slug rejection
    assert.throws(
      () => {
        service.createProject({
          name: 'Pesantren AI Assistant',
          slug: 'pesantren-ai-assistant', // duplicate slug
          shortDescription: 'Duplicate test',
          description: 'Duplicate test',
          category: 'AI',
          projectType: 'AI_SYSTEM',
        });
      },
      /already taken/
    );
  });

  it('Test 2: Publishing Workflow (DRAFT -> REVIEW -> APPROVED -> PUBLISHED -> ARCHIVED)', () => {
    const project = service.createProject({
      name: 'Workflow Test App',
      shortDescription: 'Testing lifecycle transitions',
      description: 'Testing lifecycle transitions',
      category: 'Web App',
      projectType: 'WEB_APP',
    });

    assert.strictEqual(project.publishStatus, 'DRAFT');

    const inReview = service.submitForReview(project.projectId);
    assert.strictEqual(inReview.publishStatus, 'REVIEW');

    const approved = service.approveProject(project.projectId);
    assert.strictEqual(approved.publishStatus, 'APPROVED');

    const published = service.publishProject(project.projectId);
    assert.strictEqual(published.publishStatus, 'PUBLISHED');
    assert.strictEqual(published.visibility, 'PUBLIC');

    // Now it should be visible in public projects
    const publicProj = service.getPublicProjectBySlug('workflow-test-app');
    assert.strictEqual(publicProj.name, 'Workflow Test App');

    // Unpublish
    const unpublished = service.unpublishProject(project.projectId);
    assert.strictEqual(unpublished.publishStatus, 'DRAFT');

    // Public query should now throw 404
    assert.throws(() => {
      service.getPublicProjectBySlug('workflow-test-app');
    }, /not found/);

    // Archive
    const archived = service.archiveProject(project.projectId);
    assert.strictEqual(archived.publishStatus, 'ARCHIVED');
    assert.strictEqual(archived.status, 'ARCHIVED');
  });

  it('Test 3: Public DTO Leakage Test (Zero-Trust Privacy)', () => {
    const publicSimmaci = service.getPublicProjectBySlug('simmaci');

    // 1. Must NOT leak internal notes
    assert.strictEqual((publicSimmaci as any).internalNotes, undefined);

    // 2. Must NOT leak financial token and cost data
    assert.strictEqual((publicSimmaci as any).totalCostUsd, undefined);
    assert.strictEqual((publicSimmaci as any).totalTokensUsed, undefined);

    // 3. Must NOT leak private internal git repository URL
    assert.strictEqual((publicSimmaci as any).privateRepoUrl, undefined);

    // 4. Must NOT leak internal agentId in team array
    for (const member of publicSimmaci.team) {
      assert.strictEqual((member as any).agentId, undefined);
    }

    // 5. Must NOT leak private/internal features
    const leakedInternalFeature = publicSimmaci.features.find(
      (f: any) => f.featureId === 'ft_sim_04_internal'
    );
    assert.strictEqual(leakedInternalFeature, undefined);
  });

  it('Test 4: Visibility Authorization (PUBLIC vs INTERNAL vs CONFIDENTIAL)', () => {
    // Internal project must throw NotFoundException on public API
    assert.throws(() => {
      service.getPublicProjectBySlug('internal-billing-automation');
    }, /not found/);

    // Confidential project must throw NotFoundException on public API
    assert.throws(() => {
      service.getPublicProjectBySlug('bank-security-audit');
    }, /not found/);

    // Public project list must contain ONLY published public items
    const { data } = service.getPublicProjects();
    for (const p of data) {
      assert.ok(p.slug !== 'internal-billing-automation');
      assert.ok(p.slug !== 'bank-security-audit');
    }
  });

  it('Test 5: Filtering by Category, Technology, Featured & Search', () => {
    const allPublic = service.getPublicProjects();
    assert.ok(allPublic.total >= 4);

    // Category filter
    const saasOnly = service.getPublicProjects({ category: 'SaaS' });
    assert.ok(saasOnly.data.some((p) => p.slug === 'koneksi-santri'));
    assert.ok(!saasOnly.data.some((p) => p.slug === 'simmaci'));

    // Technology filter
    const laravelProjects = service.getPublicProjects({ technology: 'Laravel' });
    assert.strictEqual(laravelProjects.data.length, 1);
    assert.strictEqual(laravelProjects.data[0].slug, 'simmaci');

    // Featured filter
    const featured = service.getFeaturedPublicProjects();
    assert.ok(featured.length >= 3);
    for (const feat of featured) {
      assert.strictEqual(feat.featured, true);
    }

    // Search query
    const searched = service.getPublicProjects({ search: 'decree' });
    assert.strictEqual(searched.data[0].slug, 'simmaci');
  });

  it('Test 6: Safe URL Validation & Open Redirect Shield', () => {
    // Valid URLs
    assert.strictEqual(service.validateSafeUrl('https://demo.simmaci.kdi-office.id'), true);
    assert.strictEqual(service.validateSafeUrl('http://localhost:3000'), true);
    assert.strictEqual(service.validateSafeUrl(undefined), true);

    // Dangerous / Open Redirect URLs
    assert.strictEqual(service.validateSafeUrl('javascript:alert(1)'), false);
    assert.strictEqual(service.validateSafeUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.strictEqual(service.validateSafeUrl('//evil-phishing-site.com/login'), false);
    assert.strictEqual(service.validateSafeUrl('vbscript:msgbox(1)'), false);

    // Reject dangerous URLs during project creation
    assert.throws(() => {
      service.createProject({
        name: 'Malicious Url App',
        shortDescription: 'Testing dangerous url rejection',
        description: 'Testing dangerous url rejection',
        category: 'Test',
        projectType: 'WEB_APP',
        demoUrl: 'javascript:stealCredentials()',
      });
    }, /Invalid or dangerous demo URL/);
  });

  it('Test 7: XSS Content Sanitization', () => {
    const maliciousInput = '<script>alert("hack")</script>Secure Project Name <iframe src="evil.com"></iframe>';
    const sanitized = service.sanitizeString(maliciousInput);

    assert.ok(!sanitized.includes('<script'));
    assert.ok(!sanitized.includes('<iframe>'));
    assert.ok(sanitized.includes('Secure Project Name'));

    const project = service.createProject({
      name: '<script>alert(1)</script>Safe Name',
      shortDescription: 'Testing <iframe src="x"></iframe> sanitization',
      description: 'Testing XSS',
      category: 'Web',
      projectType: 'WEB_APP',
    });

    assert.strictEqual(project.name, 'Safe Name');
    assert.strictEqual(project.shortDescription, 'Testing  sanitization');
  });

  it('Test 8: Repository Public vs Private Notice', () => {
    // Public repo (SIMMACI): repositoryUrl is visible
    const publicProj = service.getPublicProjectBySlug('simmaci');
    assert.strictEqual(publicProj.isRepositoryPublic, true);
    assert.ok(publicProj.repositoryUrl);

    // Private repo (Graph RAG Memory): repositoryUrl is sanitized to undefined
    const privateProj = service.getPublicProjectBySlug('graph-rag-memory');
    assert.strictEqual(privateProj.isRepositoryPublic, false);
    assert.strictEqual(privateProj.repositoryUrl, undefined);
  });
});
