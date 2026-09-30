// ==========================================================
// services/api/src/workforce/public-workforce.controller.ts
// Public Sanitized Workforce Showcase API (Zero PII & No Sensitive Salary Leakage)
// ==========================================================

import { Controller, Get } from '@nestjs/common';
import { WorkforceService } from './workforce.service.js';

@Controller('public/workforce')
export class PublicWorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get('summary')
  getPublicSummary() {
    return this.workforceService.getPublicWorkforceSummary();
  }
}
