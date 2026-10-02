// ==========================================================
// services/api/src/company/company.controller.ts
// KDI Company OS REST Controller
// ==========================================================

import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  CompanyService,
  type LeadStatus,
  type OpportunityStage,
  type DealStatus,
} from './company.service.js';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ── Snapshot ─────────────────────────────────────────────
  @Get('snapshot')
  getSnapshot() {
    return this.companyService.getSnapshot();
  }

  // ── Products ─────────────────────────────────────────────
  @Get('products')
  getProducts() {
    return this.companyService.getProducts();
  }

  @Get('products/:productId')
  getProduct(@Param('productId') productId: string) {
    const product = this.companyService.getProduct(productId);
    if (!product) return { error: 'Product not found' };
    return product;
  }

  // ── Customers ─────────────────────────────────────────────
  @Get('customers')
  getCustomers() {
    return this.companyService.getCustomers();
  }

  @Get('customers/at-risk')
  getAtRiskCustomers() {
    return this.companyService.getAtRiskCustomers();
  }

  @Get('customers/:customerId')
  getCustomer(@Param('customerId') customerId: string) {
    const customer = this.companyService.getCustomer(customerId);
    if (!customer) return { error: 'Customer not found' };
    return customer;
  }

  // ── Leads ─────────────────────────────────────────────────
  @Get('leads')
  getLeads(@Query('status') status?: string) {
    return this.companyService.getLeads(status as LeadStatus | undefined);
  }

  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  createLead(@Body() body: any) {
    return this.companyService.createLead(body);
  }

  @Post('leads/:leadId/status')
  updateLeadStatus(
    @Param('leadId') leadId: string,
    @Body() body: { status: LeadStatus; notes?: string }
  ) {
    const updated = this.companyService.updateLeadStatus(leadId, body.status, body.notes);
    if (!updated) return { error: 'Lead not found' };
    return updated;
  }

  // ── Opportunities ─────────────────────────────────────────
  @Get('opportunities')
  getOpportunities(@Query('stage') stage?: string) {
    return this.companyService.getOpportunities(stage as OpportunityStage | undefined);
  }

  @Get('opportunities/pipeline-value')
  getPipelineValue() {
    return { pipelineValue: this.companyService.getPipelineValue(), currency: 'IDR' };
  }

  @Post('opportunities')
  @HttpCode(HttpStatus.CREATED)
  createOpportunity(@Body() body: any) {
    return this.companyService.createOpportunity(body);
  }

  @Post('opportunities/:opportunityId/stage')
  advanceStage(
    @Param('opportunityId') opportunityId: string,
    @Body() body: { stage: OpportunityStage }
  ) {
    const updated = this.companyService.advanceOpportunityStage(opportunityId, body.stage);
    if (!updated) return { error: 'Opportunity not found' };
    return updated;
  }

  // ── Deals ─────────────────────────────────────────────────
  @Get('deals')
  getDeals(@Query('status') status?: string) {
    return this.companyService.getDeals(status as DealStatus | undefined);
  }

  @Post('deals')
  @HttpCode(HttpStatus.CREATED)
  createDeal(@Body() body: any) {
    return this.companyService.createDeal(body);
  }

  // ── Revenue ───────────────────────────────────────────────
  @Get('revenue')
  getRevenue() {
    return {
      records: this.companyService.getRevenueRecords(),
      total: this.companyService.getTotalRevenue(),
      currency: 'IDR',
    };
  }

  @Post('revenue')
  @HttpCode(HttpStatus.CREATED)
  recordRevenue(@Body() body: any) {
    return this.companyService.recordRevenue(body);
  }

  // ── Intelligence (deterministic facts & rules) ─────────────
  @Get('intelligence/facts')
  getFacts() {
    return this.companyService.getBusinessFacts();
  }

  @Get('intelligence/rules')
  getRuleResults() {
    return this.companyService.getBusinessRuleResults();
  }

  @Get('intelligence/insights')
  getCachedInsights() {
    return this.companyService.getCachedInsights();
  }
}
