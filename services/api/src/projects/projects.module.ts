// ==========================================================
// services/api/src/projects/projects.module.ts
// ==========================================================

import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { PublicProjectsController } from './public-projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController, PublicProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
