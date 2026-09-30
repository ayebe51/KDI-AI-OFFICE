// ==========================================================
// services/api/src/workforce/workforce.controller.ts
// REST Controller for Internal/Admin Workforce Valuation & Benchmark Operations
// ==========================================================

import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { WorkforceService, type WhatIfOptions } from './workforce.service.js';
import type {
  ReliabilityTier,
  ExperienceLevel,
  WorkloadProfile,
  SalaryBenchmark,
  SalaryBenchmarkSource,
} from '@kdi/types';

@Controller('workforce')
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  // 1. Sources
  @Get('sources')
  getSources(
    @Query('country') country?: string,
    @Query('tier') tier?: ReliabilityTier,
    @Query('search') search?: string
  ) {
    const data = this.workforceService.getSources({ country, tier, search });
    return { total: data.length, data };
  }

  @Get('sources/:id')
  getSourceById(@Param('id') id: string) {
    return this.workforceService.getSourceById(id);
  }

  @Post('sources')
  createSource(@Body() body: Omit<SalaryBenchmarkSource, 'sourceId' | 'retrievalDate'>) {
    if (!body.name || !body.provider || !body.url || !body.reliabilityTier) {
      throw new BadRequestException('Source name, provider, url, and reliabilityTier are required');
    }
    return this.workforceService.registerSource(body);
  }

  // 2. Market Roles & Normalization
  @Get('roles')
  getRoles() {
    const data = this.workforceService.getMarketRoles();
    return { total: data.length, data };
  }

  @Get('roles/:id')
  getRoleById(@Param('id') id: string) {
    return this.workforceService.getMarketRoleById(id);
  }

  @Post('roles/candidate-match')
  findCandidateRoles(
    @Body() criteria: { title?: string; skills?: string[]; tools?: string[]; responsibilities?: string[] }
  ) {
    const data = this.workforceService.findCandidateRoles(criteria);
    return { total: data.length, data };
  }

  // 3. Salary Benchmarks
  @Get('benchmarks')
  getBenchmarks(
    @Query('marketRoleId') marketRoleId?: string,
    @Query('roleId') roleId?: string,
    @Query('location') location?: string,
    @Query('country') country?: string,
    @Query('experienceLevel') experienceLevel?: ExperienceLevel,
    @Query('includeStale') includeStale?: string
  ) {
    const data = this.workforceService.getBenchmarks({
      marketRoleId: marketRoleId || roleId,
      location,
      country,
      experienceLevel,
      includeStale: includeStale === 'true',
    });
    return { total: data.length, data };
  }

  @Get('benchmarks/:id')
  getBenchmarkById(@Param('id') id: string) {
    return this.workforceService.getBenchmarkById(id);
  }

  @Post('benchmarks')
  createOrUpdateBenchmark(@Body() body: Omit<SalaryBenchmark, 'benchmarkId' | 'retrievedAt'>) {
    return this.workforceService.createOrUpdateBenchmark(body);
  }

  @Get('benchmarks/:id/snapshots')
  getSnapshots(@Param('id') id: string) {
    const data = this.workforceService.getSnapshots(id);
    return { total: data.length, data };
  }

  @Post('benchmarks/:id/snapshots')
  createSnapshot(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.workforceService.createSnapshot(id, reason || 'Manual Admin Snapshot');
  }

  @Get('benchmarks/:id/staleness')
  checkStaleness(@Param('id') id: string, @Query('maxDays') maxDays?: string) {
    return this.workforceService.checkStaleness(id, maxDays ? parseInt(maxDays, 10) : 180);
  }

  @Get('benchmarks-conflicts/:roleId')
  handleSourceConflict(@Param('roleId') roleId: string, @Query('location') location?: string) {
    return this.workforceService.handleSourceConflict(roleId, location || 'Central Java');
  }

  // 4. Workload Profiles
  @Get('profiles')
  getProfiles() {
    const data = this.workforceService.getWorkloadProfiles();
    return { total: data.length, data };
  }

  @Get('profiles/:id')
  getProfileById(@Param('id') id: string) {
    return this.workforceService.getWorkloadProfileById(id);
  }

  @Post('profiles')
  saveProfile(@Body() profile: WorkloadProfile) {
    if (!profile.profileId || !profile.responsibilities?.length) {
      throw new BadRequestException('Profile ID and at least one responsibility are required');
    }
    return this.workforceService.saveWorkloadProfile(profile);
  }

  // 5. What-If Simulation
  @Post('what-if')
  runWhatIf(@Body() dto: { baseProfileId: string; options: WhatIfOptions }) {
    if (!dto.baseProfileId) {
      throw new BadRequestException('baseProfileId is required for what-if simulation');
    }
    return this.workforceService.runWhatIfSimulation(dto.baseProfileId, dto.options || {});
  }

  // 6. Virtual AI Employees & Cost
  @Get('virtual-employees')
  getVirtualEmployees() {
    const data = this.workforceService.getVirtualEmployees();
    return { total: data.length, data };
  }

  @Get('virtual-employees/:id')
  getVirtualEmployeeById(@Param('id') id: string) {
    return this.workforceService.getVirtualEmployeeById(id);
  }

  @Get('ai-summary')
  getAiSummary() {
    return this.workforceService.getAiWorkforceSummary();
  }

  // 7. Three-View Comparison
  @Get('three-view')
  getThreeView(@Query('profileId') profileId?: string) {
    return this.workforceService.getThreeViewComparison(profileId);
  }

  // 8. Exports
  @Get('export/:profileId')
  exportProfile(
    @Param('profileId') profileId: string,
    @Query('format') format?: 'json' | 'csv' | 'markdown'
  ) {
    return this.workforceService.exportWorkloadValuation(profileId, format || 'json');
  }

  // 9. Audit
  @Get('audit')
  getAudit(@Query('limit') limit?: string) {
    const data = this.workforceService.getAuditRecords(limit ? parseInt(limit, 10) : 100);
    return { total: data.length, data };
  }

  // 10. Graph & GraphRAG
  @Get('graph-entities')
  getGraphEntities() {
    return this.workforceService.getGraphEntities();
  }

  @Post('graphrag-query')
  queryGraphRAG(@Body('query') query: string) {
    if (!query) {
      throw new BadRequestException('query is required');
    }
    return this.workforceService.queryGraphRAGProvenance(query);
  }
}
