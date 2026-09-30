// ==========================================================
// services/api/src/office/office.module.ts
// NestJS Module for Living Virtual Office 3D Digital Twin
// ==========================================================

import { Module } from '@nestjs/common';
import { OfficeController } from './office.controller.js';
import { OfficeService } from './office.service.js';
import { WebSocketModule } from '../websocket/websocket.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
  imports: [WebSocketModule, DatabaseModule, ProjectsModule],
  controllers: [OfficeController],
  providers: [OfficeService],
  exports: [OfficeService],
})
export class OfficeModule {}
