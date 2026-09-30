// ==========================================================
// services/api/src/projects/projects.controller.ts
// Internal / Admin Projects Management Controller
// ==========================================================

import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import type { CreateProjectDto, UpdateProjectDto, Project } from '@kdi/types';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  getAll(@Query('all') all?: string): { total: number; data: Project[] } {
    const includeNonPublic = all !== 'false';
    const list = this.projectsService.getAllProjects(includeNonPublic);
    return {
      total: list.length,
      data: list,
    };
  }

  @Get(':id')
  getById(@Param('id') id: string): Project {
    return this.projectsService.getProjectById(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto): Project {
    return this.projectsService.createProject(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto): Project {
    return this.projectsService.updateProject(id, dto);
  }

  @Post(':id/review')
  submitForReview(@Param('id') id: string): Project {
    return this.projectsService.submitForReview(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string): Project {
    return this.projectsService.approveProject(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string): Project {
    return this.projectsService.publishProject(id);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string): Project {
    return this.projectsService.unpublishProject(id);
  }

  @Delete(':id')
  archive(@Param('id') id: string): Project {
    return this.projectsService.archiveProject(id);
  }

  @Post(':id/feature')
  toggleFeatured(@Param('id') id: string): Project {
    return this.projectsService.toggleFeatured(id);
  }
}
