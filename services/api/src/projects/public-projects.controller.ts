// ==========================================================
// services/api/src/projects/public-projects.controller.ts
// Public Read-Only Portfolio API Endpoints
// ==========================================================

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import type { PortfolioFilterQuery, PublicProject, ProjectMedia, CaseStudy, ProjectArchitecture } from '@kdi/types';

@Controller('public/projects')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  getPublicProjects(@Query() query: PortfolioFilterQuery): { total: number; data: PublicProject[] } {
    return this.projectsService.getPublicProjects(query);
  }

  @Get('featured')
  getFeatured(): PublicProject[] {
    return this.projectsService.getFeaturedPublicProjects();
  }

  @Get(':slug')
  getProjectBySlug(@Param('slug') slug: string): PublicProject {
    return this.projectsService.getPublicProjectBySlug(slug);
  }

  @Get(':slug/media')
  getProjectMedia(@Param('slug') slug: string): ProjectMedia[] {
    return this.projectsService.getPublicProjectMedia(slug);
  }

  @Get(':slug/case-study')
  getProjectCaseStudy(@Param('slug') slug: string): CaseStudy {
    return this.projectsService.getPublicProjectCaseStudy(slug);
  }

  @Get(':slug/architecture')
  getProjectArchitecture(@Param('slug') slug: string): ProjectArchitecture {
    return this.projectsService.getPublicProjectArchitecture(slug);
  }
}
