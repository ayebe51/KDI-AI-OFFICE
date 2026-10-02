// ==========================================================
// services/api/src/company/company.service.ts
// KDI Company OS — Core Business Loop
// Product -> Lead -> Opportunity -> Deal -> Customer -> Project -> Revenue -> Intelligence
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';

// ── Company OS Entity Types ─────────────────────────────────────────────

export type ProductStatus = 'ACTIVE' | 'BETA' | 'DEPRECATED' | 'PLANNED';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED';
export type OpportunityStage = 'DISCOVERY' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type DealStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type CustomerHealth = 'HEALTHY' | 'AT_RISK' | 'CHURNED';
export type RevenueType = 'PROJECT' | 'RETAINER' | 'LICENSING' | 'CONSULTING';

export interface Product {
  productId: string;
  name: string;
  description: string;
  category: string;
  status: ProductStatus;
  basePrice?: number;
  currency: string;
  tags: string[];
  createdAt: string;
}

export interface Customer {
  customerId: string;
  name: string;
  industry: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  health: CustomerHealth;
  activeProjects: number;
  totalRevenue: number;
  currency: string;
  createdAt: string;
}

export interface Lead {
  leadId: string;
  name: string;
  company?: string;
  email?: string;
  source: string;
  status: LeadStatus;
  qualificationScore: number;
  estimatedValue?: number;
  currency: string;
  notes: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  opportunityId: string;
  leadId?: string;
  customerId?: string;
  title: string;
  productIds: string[];
  stage: OpportunityStage;
  estimatedValue: number;
  currency: string;
  probability: number;
  expectedCloseDate: string;
  assignedAgent?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  dealId: string;
  opportunityId: string;
  customerId: string;
  title: string;
  value: number;
  currency: string;
  status: DealStatus;
  startDate: string;
  endDate?: string;
  projectId?: string;
  revenueRecords: RevenueRecord[];
  createdAt: string;
}

export interface RevenueRecord {
  recordId: string;
  dealId: string;
  customerId: string;
  type: RevenueType;
  amount: number;
  currency: string;
  recognizedAt: string;
  projectId?: string;
  notes: string;
}

export interface AIInsight {
  type: 'FACT' | 'RULE_RESULT' | 'AI_INSIGHT';
  label: string;
  value: string;
  source: 'DATABASE' | 'RULE_ENGINE' | 'LLM_GATEWAY';
  cachedAt?: string;
}

export interface BusinessIntelligenceSummary {
  totalPipelineValue: number;
  activeOpportunities: number;
  wonDealsThisMonth: number;
  activeCustomers: number;
  atRiskCustomers: number;
  totalRevenueRecognized: number;
  currency: string;
  observations: AIInsight[];
  generatedAt: string;
}

export interface CompanyOSSnapshot {
  products: Product[];
  customers: Customer[];
  leads: Lead[];
  opportunities: Opportunity[];
  deals: Deal[];
  revenueRecords: RevenueRecord[];
  intelligence: BusinessIntelligenceSummary;
  snapshotAt: string;
}

const SEED_PRODUCTS: Product[] = [
  {
    productId: 'PROD-001',
    name: 'SIMMACI',
    description: 'Sistem Informasi Manajemen Madrasah Cerdas',
    category: 'Education Technology',
    status: 'ACTIVE',
    basePrice: 5000000,
    currency: 'IDR',
    tags: ['edtech', 'saas', 'school-management'],
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    productId: 'PROD-002',
    name: 'KDI AI Office',
    description: 'AI Company Operating System',
    category: 'Enterprise AI',
    status: 'BETA',
    basePrice: 15000000,
    currency: 'IDR',
    tags: ['ai', 'automation', 'enterprise', 'local-llm'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    productId: 'PROD-003',
    name: 'GOWA WAHA',
    description: 'Data migration and analytics for government',
    category: 'GovTech',
    status: 'ACTIVE',
    basePrice: 25000000,
    currency: 'IDR',
    tags: ['govtech', 'data-migration'],
    createdAt: '2023-06-01T00:00:00Z',
  },
];

const SEED_CUSTOMERS: Customer[] = [
  {
    customerId: 'CUST-001',
    name: 'Kemenag Sulawesi Selatan',
    industry: 'Government / Education',
    contactEmail: 'it@kemenagss.go.id',
    location: 'Makassar, Indonesia',
    health: 'HEALTHY',
    activeProjects: 2,
    totalRevenue: 125000000,
    currency: 'IDR',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    customerId: 'CUST-002',
    name: 'MAN Insan Cendekia Gowa',
    industry: 'Education',
    contactEmail: 'admin@manicgowa.sch.id',
    location: 'Gowa, Indonesia',
    health: 'HEALTHY',
    activeProjects: 1,
    totalRevenue: 48000000,
    currency: 'IDR',
    createdAt: '2024-05-01T00:00:00Z',
  },
  {
    customerId: 'CUST-003',
    name: 'Pemkab Takalar',
    industry: 'Government',
    location: 'Takalar, Indonesia',
    health: 'AT_RISK',
    activeProjects: 1,
    totalRevenue: 32000000,
    currency: 'IDR',
    createdAt: '2024-08-01T00:00:00Z',
  },
];

const SEED_LEADS: Lead[] = [
  {
    leadId: 'LEAD-001',
    name: 'Ahmad Farid',
    company: 'MTsN Biringkanaya',
    email: 'afard@mtsn.sch.id',
    source: 'REFERRAL',
    status: 'QUALIFIED',
    qualificationScore: 78,
    estimatedValue: 15000000,
    currency: 'IDR',
    notes: 'Interested in SIMMACI for 1200 students. Budget approved Q1 2026.',
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-09-28T14:30:00Z',
  },
  {
    leadId: 'LEAD-002',
    name: 'Dinas Pendidikan Makassar',
    company: 'Pemkot Makassar',
    source: 'OUTBOUND',
    status: 'CONTACTED',
    qualificationScore: 55,
    estimatedValue: 80000000,
    currency: 'IDR',
    notes: 'City-wide madrasah platform. Government procurement required.',
    createdAt: '2026-09-20T09:00:00Z',
    updatedAt: '2026-09-30T10:00:00Z',
  },
  {
    leadId: 'LEAD-003',
    name: 'Hasan Murad',
    company: 'SMAN 3 Gowa',
    source: 'INBOUND_WEB',
    status: 'NEW',
    qualificationScore: 30,
    estimatedValue: 8000000,
    currency: 'IDR',
    notes: 'Inquiry from website. Not yet contacted.',
    createdAt: '2026-10-01T07:00:00Z',
    updatedAt: '2026-10-01T07:00:00Z',
  },
];

const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    opportunityId: 'OPP-001',
    leadId: 'LEAD-001',
    title: 'SIMMACI Deployment — MTsN Biringkanaya',
    productIds: ['PROD-001'],
    stage: 'PROPOSAL',
    estimatedValue: 15000000,
    currency: 'IDR',
    probability: 70,
    expectedCloseDate: '2026-11-30T00:00:00Z',
    assignedAgent: 'AI_SALES',
    notes: 'Proposal submitted. Awaiting committee review.',
    createdAt: '2026-09-28T14:30:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    opportunityId: 'OPP-002',
    leadId: 'LEAD-002',
    title: 'City-wide Madrasah Platform — Makassar',
    productIds: ['PROD-001', 'PROD-002'],
    stage: 'DISCOVERY',
    estimatedValue: 80000000,
    currency: 'IDR',
    probability: 20,
    expectedCloseDate: '2027-03-31T00:00:00Z',
    assignedAgent: 'AI_SALES',
    notes: 'Long sales cycle. Government procurement process required.',
    createdAt: '2026-09-30T10:00:00Z',
    updatedAt: '2026-09-30T10:00:00Z',
  },
];

const SEED_DEALS: Deal[] = [
  {
    dealId: 'DEAL-001',
    opportunityId: 'OPP-HIST-001',
    customerId: 'CUST-001',
    title: 'SIMMACI — Kemenag Sulsel Phase 2',
    value: 75000000,
    currency: 'IDR',
    status: 'ACTIVE',
    startDate: '2026-03-01T00:00:00Z',
    projectId: 'PRJ-SIMMACI-2026',
    revenueRecords: [],
    createdAt: '2026-02-15T00:00:00Z',
  },
  {
    dealId: 'DEAL-002',
    opportunityId: 'OPP-HIST-002',
    customerId: 'CUST-002',
    title: 'SIMMACI — MAN IC Gowa',
    value: 48000000,
    currency: 'IDR',
    status: 'COMPLETED',
    startDate: '2025-06-01T00:00:00Z',
    endDate: '2025-12-31T00:00:00Z',
    projectId: 'PRJ-SIMMACI-MANGOWA',
    revenueRecords: [],
    createdAt: '2025-05-01T00:00:00Z',
  },
];

const SEED_REVENUE: RevenueRecord[] = [
  {
    recordId: 'REV-001',
    dealId: 'DEAL-001',
    customerId: 'CUST-001',
    type: 'PROJECT',
    amount: 37500000,
    currency: 'IDR',
    recognizedAt: '2026-06-30T00:00:00Z',
    projectId: 'PRJ-SIMMACI-2026',
    notes: 'Milestone 1 of 2 — development complete',
  },
  {
    recordId: 'REV-002',
    dealId: 'DEAL-002',
    customerId: 'CUST-002',
    type: 'PROJECT',
    amount: 48000000,
    currency: 'IDR',
    recognizedAt: '2025-12-31T00:00:00Z',
    projectId: 'PRJ-SIMMACI-MANGOWA',
    notes: 'Project completed — final payment',
  },
  {
    recordId: 'REV-003',
    dealId: 'DEAL-001',
    customerId: 'CUST-001',
    type: 'RETAINER',
    amount: 5000000,
    currency: 'IDR',
    recognizedAt: '2026-09-30T00:00:00Z',
    projectId: 'PRJ-SIMMACI-2026',
    notes: 'Monthly support retainer — September 2026',
  },
];

@Injectable()
export class CompanyService {
  private readonly logger = new StructuredLogger('CompanyService');

  private products: Map<string, Product> = new Map();
  private customers: Map<string, Customer> = new Map();
  private leads: Map<string, Lead> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();
  private deals: Map<string, Deal> = new Map();
  private revenueRecords: Map<string, RevenueRecord> = new Map();
  private insightCache: Map<string, { insight: AIInsight; cachedAt: string }> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    for (const p of SEED_PRODUCTS) this.products.set(p.productId, { ...p });
    for (const c of SEED_CUSTOMERS) this.customers.set(c.customerId, { ...c });
    for (const l of SEED_LEADS) this.leads.set(l.leadId, { ...l });
    for (const o of SEED_OPPORTUNITIES) this.opportunities.set(o.opportunityId, { ...o });
    for (const d of SEED_DEALS) this.deals.set(d.dealId, { ...d, revenueRecords: [] });
    for (const r of SEED_REVENUE) {
      this.revenueRecords.set(r.recordId, { ...r });
      const deal = this.deals.get(r.dealId);
      if (deal) deal.revenueRecords.push(r);
    }
  }

  // PRODUCTS
  public getProducts(): Product[] { return Array.from(this.products.values()); }
  public getProduct(productId: string): Product | undefined { return this.products.get(productId); }
  public createProduct(data: Omit<Product, 'productId' | 'createdAt'>): Product {
    const productId = `PROD-${Date.now()}`;
    const product: Product = { productId, createdAt: new Date().toISOString(), ...data };
    this.products.set(productId, product);
    return product;
  }

  // CUSTOMERS
  public getCustomers(): Customer[] { return Array.from(this.customers.values()); }
  public getCustomer(customerId: string): Customer | undefined { return this.customers.get(customerId); }
  public getAtRiskCustomers(): Customer[] {
    return Array.from(this.customers.values()).filter((c) => c.health === 'AT_RISK');
  }
  public createCustomer(data: Omit<Customer, 'customerId' | 'createdAt'>): Customer {
    const customerId = `CUST-${Date.now()}`;
    const customer: Customer = { customerId, createdAt: new Date().toISOString(), ...data };
    this.customers.set(customerId, customer);
    return customer;
  }

  // LEADS
  public getLeads(statusFilter?: LeadStatus): Lead[] {
    const all = Array.from(this.leads.values());
    return statusFilter ? all.filter((l) => l.status === statusFilter) : all;
  }
  public getLead(leadId: string): Lead | undefined { return this.leads.get(leadId); }
  public createLead(data: Omit<Lead, 'leadId' | 'createdAt' | 'updatedAt'>): Lead {
    const leadId = `LEAD-${Date.now()}`;
    const now = new Date().toISOString();
    const lead: Lead = { leadId, createdAt: now, updatedAt: now, ...data };
    this.leads.set(leadId, lead);
    return lead;
  }
  public updateLeadStatus(leadId: string, status: LeadStatus, notes?: string): Lead | null {
    const lead = this.leads.get(leadId);
    if (!lead) return null;
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    if (notes) lead.notes = notes;
    return lead;
  }

  // OPPORTUNITIES
  public getOpportunities(stageFilter?: OpportunityStage): Opportunity[] {
    const all = Array.from(this.opportunities.values());
    return stageFilter ? all.filter((o) => o.stage === stageFilter) : all;
  }
  public getOpportunity(opportunityId: string): Opportunity | undefined {
    return this.opportunities.get(opportunityId);
  }
  public getPipelineValue(): number {
    return Array.from(this.opportunities.values())
      .filter((o) => o.stage !== 'CLOSED_LOST')
      .reduce((sum, o) => sum + (o.estimatedValue * o.probability) / 100, 0);
  }
  public createOpportunity(data: Omit<Opportunity, 'opportunityId' | 'createdAt' | 'updatedAt'>): Opportunity {
    const opportunityId = `OPP-${Date.now()}`;
    const now = new Date().toISOString();
    const opp: Opportunity = { opportunityId, createdAt: now, updatedAt: now, ...data };
    this.opportunities.set(opportunityId, opp);
    return opp;
  }
  public advanceOpportunityStage(opportunityId: string, stage: OpportunityStage): Opportunity | null {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return null;
    opp.stage = stage;
    opp.updatedAt = new Date().toISOString();
    if (stage === 'CLOSED_WON') opp.probability = 100;
    if (stage === 'CLOSED_LOST') opp.probability = 0;
    return opp;
  }

  // DEALS
  public getDeals(statusFilter?: DealStatus): Deal[] {
    const all = Array.from(this.deals.values());
    return statusFilter ? all.filter((d) => d.status === statusFilter) : all;
  }
  public getDeal(dealId: string): Deal | undefined { return this.deals.get(dealId); }
  public createDeal(data: Omit<Deal, 'dealId' | 'createdAt' | 'revenueRecords'>): Deal {
    const dealId = `DEAL-${Date.now()}`;
    const deal: Deal = { dealId, createdAt: new Date().toISOString(), revenueRecords: [], ...data };
    this.deals.set(dealId, deal);
    return deal;
  }

  // REVENUE
  public getRevenueRecords(): RevenueRecord[] { return Array.from(this.revenueRecords.values()); }
  public getTotalRevenue(): number {
    return Array.from(this.revenueRecords.values()).reduce((sum, r) => sum + r.amount, 0);
  }
  public getRevenueByCustomer(customerId: string): number {
    return Array.from(this.revenueRecords.values())
      .filter((r) => r.customerId === customerId)
      .reduce((sum, r) => sum + r.amount, 0);
  }
  public recordRevenue(data: Omit<RevenueRecord, 'recordId'>): RevenueRecord {
    const recordId = `REV-${Date.now()}`;
    const record: RevenueRecord = { recordId, ...data };
    this.revenueRecords.set(recordId, record);
    const deal = this.deals.get(record.dealId);
    if (deal) deal.revenueRecords.push(record);
    const customer = this.customers.get(record.customerId);
    if (customer) customer.totalRevenue += record.amount;
    this.logger.info('recordRevenue', `Revenue recorded: ${recordId} — ${record.amount} ${record.currency}`);
    return record;
  }

  // BUSINESS INTELLIGENCE (Deterministic — no LLM)
  public getBusinessFacts(): AIInsight[] {
    return [
      {
        type: 'FACT',
        label: 'Total Revenue Recognized',
        value: `IDR ${this.getTotalRevenue().toLocaleString('id-ID')}`,
        source: 'DATABASE',
      },
      {
        type: 'FACT',
        label: 'Pipeline Value (Weighted)',
        value: `IDR ${this.getPipelineValue().toLocaleString('id-ID')}`,
        source: 'DATABASE',
      },
      {
        type: 'FACT',
        label: 'Active Opportunities',
        value: String(this.getOpportunities().filter((o) => o.stage !== 'CLOSED_LOST' && o.stage !== 'CLOSED_WON').length),
        source: 'DATABASE',
      },
      {
        type: 'FACT',
        label: 'Active Deals',
        value: String(this.getDeals('ACTIVE').length),
        source: 'DATABASE',
      },
      {
        type: 'RULE_RESULT',
        label: 'At-Risk Customers',
        value: String(this.getAtRiskCustomers().length),
        source: 'RULE_ENGINE',
      },
    ];
  }

  public getBusinessRuleResults(): AIInsight[] {
    const results: AIInsight[] = [];
    const now = new Date();
    const overdueOpps = this.getOpportunities().filter(
      (o) => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST' && new Date(o.expectedCloseDate) < now
    );
    if (overdueOpps.length > 0) {
      results.push({
        type: 'RULE_RESULT',
        label: 'Overdue Opportunities',
        value: `${overdueOpps.length} opportunities past expected close date`,
        source: 'RULE_ENGINE',
      });
    }
    for (const customer of this.getAtRiskCustomers()) {
      const customerDeals = this.getDeals('ACTIVE').filter((d) => d.customerId === customer.customerId);
      if (customerDeals.length > 0) {
        results.push({
          type: 'RULE_RESULT',
          label: 'At-Risk Customer with Active Deal',
          value: `${customer.name} — ${customerDeals.length} active deal(s)`,
          source: 'RULE_ENGINE',
        });
      }
    }
    return results;
  }

  public getCachedInsights(): AIInsight[] {
    return Array.from(this.insightCache.values()).map((e) => ({ ...e.insight, cachedAt: e.cachedAt }));
  }

  public storeCachedInsight(key: string, insight: AIInsight): void {
    this.insightCache.set(key, { insight, cachedAt: new Date().toISOString() });
  }

  public invalidateInsightCache(key?: string): void {
    if (key) this.insightCache.delete(key);
    else this.insightCache.clear();
  }

  public getSnapshot(): CompanyOSSnapshot {
    const facts = this.getBusinessFacts();
    const rules = this.getBusinessRuleResults();
    const cachedAI = this.getCachedInsights();
    const activeCustomers = Array.from(this.customers.values()).filter((c) => c.health !== 'CHURNED').length;
    return {
      products: this.getProducts(),
      customers: this.getCustomers(),
      leads: this.getLeads(),
      opportunities: this.getOpportunities(),
      deals: this.getDeals(),
      revenueRecords: this.getRevenueRecords(),
      intelligence: {
        totalPipelineValue: this.getPipelineValue(),
        activeOpportunities: this.getOpportunities().filter((o) => o.stage !== 'CLOSED_LOST' && o.stage !== 'CLOSED_WON').length,
        wonDealsThisMonth: 0,
        activeCustomers,
        atRiskCustomers: this.getAtRiskCustomers().length,
        totalRevenueRecognized: this.getTotalRevenue(),
        currency: 'IDR',
        observations: [...facts, ...rules, ...cachedAI],
        generatedAt: new Date().toISOString(),
      },
      snapshotAt: new Date().toISOString(),
    };
  }

  public getTelegramSummary(): string {
    const snap = this.getSnapshot();
    const intel = snap.intelligence;
    const lines = [
      `📊 *KDI COMPANY OS — BUSINESS SUMMARY*`,
      ``,
      `*Pipeline:* IDR ${intel.totalPipelineValue.toLocaleString('id-ID')}`,
      `*Active Opportunities:* ${intel.activeOpportunities}`,
      `*Active Customers:* ${intel.activeCustomers}`,
      `*At-Risk Customers:* ${intel.atRiskCustomers}`,
      `*Total Revenue:* IDR ${intel.totalRevenueRecognized.toLocaleString('id-ID')}`,
      ``,
    ];
    const ruleResults = intel.observations.filter((o) => o.type === 'RULE_RESULT');
    if (ruleResults.length > 0) {
      lines.push(`*Warning Rule Alerts:*`);
      for (const r of ruleResults) lines.push(`• ${r.label}: ${r.value}`);
    }
    const aiInsights = intel.observations.filter((o) => o.type === 'AI_INSIGHT');
    if (aiInsights.length > 0) {
      lines.push(``, `*AI Insights (cached):*`);
      for (const ai of aiInsights) lines.push(`• ${ai.label}: ${ai.value}`);
    } else {
      lines.push(`_AI insights not yet generated. Use /intelligence to request._`);
    }
    return lines.join('\n');
  }
}
