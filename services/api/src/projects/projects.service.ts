// ==========================================================
// services/api/src/projects/projects.service.ts
// Canonical Projects & Public Portfolio Service
// ==========================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  Project,
  PublicProject,
  CreateProjectDto,
  UpdateProjectDto,
  PortfolioFilterQuery,
  ProjectMedia,
  CaseStudy,
  ProjectArchitecture,
} from '@kdi/types';
import { INITIAL_PORTFOLIO_PROJECTS } from './projects.constants.js';

@Injectable()
export class ProjectsService {
  private projects: Map<string, Project> = new Map();

  constructor() {
    // Hydrate canonical projects
    for (const project of INITIAL_PORTFOLIO_PROJECTS) {
      this.projects.set(project.projectId, { ...project });
    }
  }

  // ==========================================================
  // Public Portfolio API (Zero-Trust Sanitized)
  // ==========================================================

  /**
   * List all published, public projects with optional filters
   */
  getPublicProjects(query?: PortfolioFilterQuery): { total: number; data: PublicProject[] } {
    let result = Array.from(this.projects.values()).filter(
      (p) => p.visibility === 'PUBLIC' && p.publishStatus === 'PUBLISHED'
    );

    if (query) {
      if (query.category) {
        const cat = query.category.toLowerCase();
        result = result.filter((p) => p.category.toLowerCase().includes(cat));
      }
      if (query.projectType) {
        result = result.filter((p) => p.projectType === query.projectType);
      }
      if (query.technology) {
        const tech = query.technology.toLowerCase();
        result = result.filter((p) =>
          p.technologies.some((t) => t.toLowerCase() === tech)
        );
      }
      if (query.year) {
        result = result.filter((p) => p.year === query.year);
      }
      if (query.status) {
        const st = query.status.toUpperCase();
        result = result.filter((p) => p.status.toUpperCase() === st);
      }
      if (query.featured !== undefined) {
        const isFeat = String(query.featured) === 'true';
        result = result.filter((p) => p.featured === isFeat);
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.shortDescription.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.technologies.some((t) => t.toLowerCase().includes(q))
        );
      }
    }

    // Sort by sortOrder ascending, then year descending
    result.sort((a, b) => a.sortOrder - b.sortOrder);

    const projected = result.map((p) => this.toPublicProjectDto(p));
    return {
      total: projected.length,
      data: projected,
    };
  }

  /**
   * Get featured public projects
   */
  getFeaturedPublicProjects(): PublicProject[] {
    return this.getPublicProjects({ featured: true }).data;
  }

  /**
   * Retrieve a single public project by slug
   */
  getPublicProjectBySlug(slug: string): PublicProject {
    const cleanSlug = this.sanitizeSlug(slug);
    const project = Array.from(this.projects.values()).find(
      (p) => p.slug === cleanSlug && p.visibility === 'PUBLIC' && p.publishStatus === 'PUBLISHED'
    );

    if (!project) {
      throw new NotFoundException(`Public project with slug "${slug}" not found`);
    }

    return this.toPublicProjectDto(project);
  }

  /**
   * Retrieve public media for a project
   */
  getPublicProjectMedia(slug: string): ProjectMedia[] {
    const project = this.getPublicProjectBySlug(slug);
    // Find internal entity to get all media matching PUBLIC
    const internal = Array.from(this.projects.values()).find((p) => p.projectId === project.projectId);
    if (!internal) return [];
    return internal.media
      .filter((m) => m.visibility === 'PUBLIC')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Retrieve case study for a public project
   */
  getPublicProjectCaseStudy(slug: string): CaseStudy {
    const project = this.getPublicProjectBySlug(slug);
    if (!project.caseStudy) {
      throw new NotFoundException(`Case study for project "${slug}" is not available`);
    }
    return project.caseStudy;
  }

  /**
   * Retrieve architecture for a public project
   */
  getPublicProjectArchitecture(slug: string): ProjectArchitecture {
    const project = this.getPublicProjectBySlug(slug);
    if (!project.architecture) {
      throw new NotFoundException(`Architecture details for project "${slug}" are not available`);
    }
    return project.architecture;
  }

  // ==========================================================
  // Internal / Admin Portfolio Management
  // ==========================================================

  getAllProjects(includeNonPublic = true): Project[] {
    const list = Array.from(this.projects.values());
    if (includeNonPublic) return list;
    return list.filter((p) => p.visibility === 'PUBLIC');
  }

  getProjectById(id: string): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    return { ...project };
  }

  createProject(dto: CreateProjectDto): Project {
    if (!dto.name || !dto.shortDescription) {
      throw new BadRequestException('Project name and short description are required');
    }

    // Slug calculation & uniqueness verification
    const slug = dto.slug ? this.sanitizeSlug(dto.slug) : this.generateUniqueSlug(dto.name);
    this.ensureSlugUnique(slug);

    // Validate URLs
    if (dto.demoUrl && !this.validateSafeUrl(dto.demoUrl)) {
      throw new BadRequestException('Invalid or dangerous demo URL provided');
    }
    if (dto.repositoryUrl && !this.validateSafeUrl(dto.repositoryUrl)) {
      throw new BadRequestException('Invalid or dangerous repository URL provided');
    }

    const projectId = `prj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newProject: Project = {
      projectId,
      slug,
      name: this.sanitizeString(dto.name),
      shortDescription: this.sanitizeString(dto.shortDescription),
      description: this.sanitizeString(dto.description || dto.shortDescription),
      category: this.sanitizeString(dto.category || 'General'),
      projectType: dto.projectType || 'WEB_APP',
      status: dto.status || 'DEVELOPMENT',
      publishStatus: 'DRAFT',
      year: dto.year || new Date().getFullYear().toString(),
      clientType: this.sanitizeString(dto.clientType || 'Internal'),
      problem: this.sanitizeString(dto.problem || ''),
      solution: this.sanitizeString(dto.solution || ''),
      role: this.sanitizeString(dto.role || 'Fullstack Engineering'),
      technologies: (dto.technologies || []).map((t) => this.sanitizeString(t)),
      features: (dto.features || []).map((f) => ({
        ...f,
        name: this.sanitizeString(f.name),
        description: this.sanitizeString(f.description),
      })),
      aiContribution: dto.aiContribution || {
        humanContribution: 'Platform architecture and review',
        aiContribution: 'Autonomous code implementation',
        engineeringAgents: ['Farhan (Software Engineer)'],
      },
      screenshots: dto.screenshots || [],
      videos: dto.videos || [],
      media: dto.media || [],
      demoUrl: dto.demoUrl,
      repositoryUrl: dto.repositoryUrl,
      isRepositoryPublic: Boolean(dto.isRepositoryPublic),
      caseStudy: dto.caseStudy,
      architecture: dto.architecture,
      timeline: dto.timeline || [],
      team: dto.team || [],
      results: dto.results || [],
      featured: Boolean(dto.featured),
      visibility: dto.visibility || 'INTERNAL',
      sortOrder: dto.sortOrder ?? (this.projects.size + 1),
      createdAt: now,
      updatedAt: now,
      internalNotes: dto.internalNotes,
    };

    this.projects.set(projectId, newProject);
    return { ...newProject };
  }

  updateProject(id: string, dto: UpdateProjectDto): Project {
    const existing = this.getProjectById(id);

    if (dto.slug && dto.slug !== existing.slug) {
      const cleanSlug = this.sanitizeSlug(dto.slug);
      this.ensureSlugUnique(cleanSlug, id);
      existing.slug = cleanSlug;
    }

    if (dto.demoUrl !== undefined) {
      if (dto.demoUrl && !this.validateSafeUrl(dto.demoUrl)) {
        throw new BadRequestException('Invalid or dangerous demo URL provided');
      }
      existing.demoUrl = dto.demoUrl;
    }

    if (dto.repositoryUrl !== undefined) {
      if (dto.repositoryUrl && !this.validateSafeUrl(dto.repositoryUrl)) {
        throw new BadRequestException('Invalid or dangerous repository URL provided');
      }
      existing.repositoryUrl = dto.repositoryUrl;
    }

    if (dto.name) existing.name = this.sanitizeString(dto.name);
    if (dto.shortDescription) existing.shortDescription = this.sanitizeString(dto.shortDescription);
    if (dto.description) existing.description = this.sanitizeString(dto.description);
    if (dto.category) existing.category = this.sanitizeString(dto.category);
    if (dto.projectType) existing.projectType = dto.projectType;
    if (dto.status) existing.status = dto.status;
    if (dto.publishStatus) existing.publishStatus = dto.publishStatus;
    if (dto.year) existing.year = dto.year;
    if (dto.clientType) existing.clientType = this.sanitizeString(dto.clientType);
    if (dto.problem) existing.problem = this.sanitizeString(dto.problem);
    if (dto.solution) existing.solution = this.sanitizeString(dto.solution);
    if (dto.role) existing.role = this.sanitizeString(dto.role);
    if (dto.technologies) existing.technologies = dto.technologies.map((t) => this.sanitizeString(t));
    if (dto.features) existing.features = dto.features;
    if (dto.aiContribution) existing.aiContribution = dto.aiContribution;
    if (dto.screenshots) existing.screenshots = dto.screenshots;
    if (dto.videos) existing.videos = dto.videos;
    if (dto.media) existing.media = dto.media;
    if (dto.isRepositoryPublic !== undefined) existing.isRepositoryPublic = dto.isRepositoryPublic;
    if (dto.caseStudy) existing.caseStudy = dto.caseStudy;
    if (dto.architecture) existing.architecture = dto.architecture;
    if (dto.timeline) existing.timeline = dto.timeline;
    if (dto.team) existing.team = dto.team;
    if (dto.results) existing.results = dto.results;
    if (dto.featured !== undefined) existing.featured = dto.featured;
    if (dto.visibility) existing.visibility = dto.visibility;
    if (dto.sortOrder !== undefined) existing.sortOrder = dto.sortOrder;
    if (dto.internalNotes !== undefined) existing.internalNotes = dto.internalNotes;

    existing.updatedAt = new Date().toISOString();
    this.projects.set(id, existing);
    return { ...existing };
  }

  // ==========================================================
  // Publishing Workflow Lifecycle
  // ==========================================================

  submitForReview(id: string): Project {
    const p = this.getProjectById(id);
    if (p.publishStatus === 'PUBLISHED') {
      throw new BadRequestException('Project is already published');
    }
    p.publishStatus = 'REVIEW';
    p.updatedAt = new Date().toISOString();
    this.projects.set(id, p);
    return { ...p };
  }

  approveProject(id: string): Project {
    const p = this.getProjectById(id);
    p.publishStatus = 'APPROVED';
    p.updatedAt = new Date().toISOString();
    this.projects.set(id, p);
    return { ...p };
  }

  publishProject(id: string): Project {
    const p = this.getProjectById(id);
    if (p.visibility !== 'PUBLIC') {
      p.visibility = 'PUBLIC'; // Explicitly promote visibility to PUBLIC
    }
    p.publishStatus = 'PUBLISHED';
    p.updatedAt = new Date().toISOString();
    this.projects.set(id, p);
    return { ...p };
  }

  unpublishProject(id: string): Project {
    const p = this.getProjectById(id);
    p.publishStatus = 'DRAFT';
    p.updatedAt = new Date().toISOString();
    this.projects.set(id, p);
    return { ...p };
  }

  archiveProject(id: string): Project {
    const p = this.getProjectById(id);
    p.publishStatus = 'ARCHIVED';
    p.status = 'ARCHIVED';
    p.updatedAt = new Date().toISOString();
    this.projects.set(id, p);
    return { ...p };
  }

  toggleFeatured(id: string): Project {
    const p = this.getProjectById(id);
    p.featured = !p.featured;
    p.updatedAt = new Date().toISOString();
    this.projects.set(id, p);
    return { ...p };
  }

  // ==========================================================
  // Security & Sanitization Helpers
  // ==========================================================

  /**
   * Transform an internal Project entity into a sanitized PublicProject DTO
   * GUARANTEES:
   * - No private/internal notes
   * - No financial costs or token usage
   * - No internal agent IDs
   * - No private repository URLs
   * - Strips non-public features and media
   */
  public toPublicProjectDto(project: Project): PublicProject {
    if (project.visibility !== 'PUBLIC' || project.publishStatus !== 'PUBLISHED') {
      throw new NotFoundException(`Project is not accessible publicly`);
    }

    // Filter features: only public
    const publicFeatures = (project.features || [])
      .filter((f) => f.isPublic)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ isPublic, ...rest }) => ({
        ...rest,
        name: this.sanitizeString(rest.name),
        description: this.sanitizeString(rest.description),
      }));

    // Filter media: only public
    const publicMedia = (project.media || [])
      .filter((m) => m.visibility === 'PUBLIC')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ visibility, ...rest }) => ({
        ...rest,
        altText: this.sanitizeString(rest.altText),
        caption: rest.caption ? this.sanitizeString(rest.caption) : undefined,
      }));

    // Team members: strip internal agentId
    const publicTeam = (project.team || []).map(({ agentId, ...rest }) => ({
      ...rest,
      name: this.sanitizeString(rest.name),
      role: this.sanitizeString(rest.role),
      responsibilities: (rest.responsibilities || []).map((r) => this.sanitizeString(r)),
    }));

    // Repository link: strictly sanitized
    const publicRepoUrl = project.isRepositoryPublic && project.repositoryUrl
      ? project.repositoryUrl
      : undefined;

    // Map public status string
    const publicStatus = this.mapToPublicStatus(project.status);

    return {
      projectId: project.projectId,
      slug: project.slug,
      name: this.sanitizeString(project.name),
      shortDescription: this.sanitizeString(project.shortDescription),
      description: this.sanitizeString(project.description),
      category: this.sanitizeString(project.category),
      projectType: project.projectType,
      status: publicStatus,
      year: project.year,
      clientType: this.sanitizeString(project.clientType),
      problem: this.sanitizeString(project.problem),
      solution: this.sanitizeString(project.solution),
      role: this.sanitizeString(project.role),
      technologies: project.technologies.map((t) => this.sanitizeString(t)),
      features: publicFeatures,
      aiContribution: {
        humanContribution: this.sanitizeString(project.aiContribution.humanContribution),
        aiContribution: this.sanitizeString(project.aiContribution.aiContribution),
        engineeringAgents: project.aiContribution.engineeringAgents.map((a) => this.sanitizeString(a)),
        planningContribution: project.aiContribution.planningContribution
          ? this.sanitizeString(project.aiContribution.planningContribution)
          : undefined,
        testingContribution: project.aiContribution.testingContribution
          ? this.sanitizeString(project.aiContribution.testingContribution)
          : undefined,
        automationContribution: project.aiContribution.automationContribution
          ? this.sanitizeString(project.aiContribution.automationContribution)
          : undefined,
      },
      screenshots: project.screenshots,
      videos: project.videos,
      media: publicMedia,
      demoUrl: project.demoUrl,
      repositoryUrl: publicRepoUrl,
      isRepositoryPublic: project.isRepositoryPublic,
      caseStudyUrl: project.caseStudyUrl,
      caseStudy: project.caseStudy,
      architecture: project.architecture,
      timeline: project.timeline,
      team: publicTeam,
      results: project.results,
      featured: project.featured,
      sortOrder: project.sortOrder,
      updatedAt: project.updatedAt,
    };
  }

  private mapToPublicStatus(status: string): string {
    switch (status) {
      case 'PRODUCTION':
        return 'Production Active';
      case 'STAGING':
        return 'Staging Showcase';
      case 'DEVELOPMENT':
        return 'Active Development';
      case 'PROTOTYPE':
        return 'Prototype / Pilot';
      case 'MAINTENANCE':
        return 'Maintenance & Support';
      case 'ARCHIVED':
        return 'Archived Portfolio';
      default:
        return 'Concept';
    }
  }

  /**
   * Slug generation & URL sanitization
   */
  public sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word characters except hyphens and spaces
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with a single hyphen
      .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens
  }

  private generateUniqueSlug(name: string, currentId?: string): string {
    let base = this.sanitizeSlug(name);
    if (!base) base = 'project';

    let candidate = base;
    let counter = 1;

    while (this.isSlugTaken(candidate, currentId)) {
      candidate = `${base}-${counter}`;
      counter++;
    }

    return candidate;
  }

  private isSlugTaken(slug: string, excludeId?: string): boolean {
    for (const project of this.projects.values()) {
      if (project.slug === slug && project.projectId !== excludeId) {
        return true;
      }
    }
    return false;
  }

  private ensureSlugUnique(slug: string, excludeId?: string): void {
    if (this.isSlugTaken(slug, excludeId)) {
      throw new BadRequestException(`Project slug "${slug}" is already taken`);
    }
  }

  /**
   * Validate safe URLs (Strict defense against open redirects & XSS protocols)
   */
  public validateSafeUrl(url?: string): boolean {
    if (!url) return true;
    try {
      // Must be a valid URL
      const parsed = new URL(url);
      // Strictly allow http and https protocols only
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      // Protocol-relative injection check
      if (url.startsWith('//')) {
        return false;
      }
      // Reject dangerous inline JavaScript or data schemes
      const lower = url.toLowerCase();
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
   * XSS String Sanitization (Escapes dangerous HTML tags)
   */
  public sanitizeString(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Strip iframes
      .replace(/\bon\w+\s*=/gi, '') // Strip event handlers like onload=, onerror=
      .replace(/javascript:/gi, '') // Strip javascript: pseudo-protocols
      .trim();
  }
}
