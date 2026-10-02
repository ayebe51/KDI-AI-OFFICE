// ==========================================================
// apps/web/src/components/CompanyOSView.tsx
// KDI AI Company Operating System — Business Loop Dashboard
// ==========================================================

import React, { useEffect, useState, useCallback } from 'react';

interface Product {
  productId: string;
  name: string;
  description: string;
  category: string;
  status: string;
  basePrice?: number;
  currency: string;
  tags: string[];
}

interface Customer {
  customerId: string;
  name: string;
  industry: string;
  health: 'HEALTHY' | 'AT_RISK' | 'CHURNED';
  activeProjects: number;
  totalRevenue: number;
  currency: string;
  location?: string;
}

interface Lead {
  leadId: string;
  name: string;
  company?: string;
  status: string;
  qualificationScore: number;
  estimatedValue?: number;
  currency: string;
  source: string;
}

interface Opportunity {
  opportunityId: string;
  title: string;
  stage: string;
  estimatedValue: number;
  currency: string;
  probability: number;
  expectedCloseDate: string;
}

interface Deal {
  dealId: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  customerId: string;
}

interface RevenueRecord {
  recordId: string;
  amount: number;
  currency: string;
  type: string;
  recognizedAt: string;
}

interface AIInsight {
  type: 'FACT' | 'RULE_RESULT' | 'AI_INSIGHT';
  label: string;
  value: string;
  source: string;
  cachedAt?: string;
}

interface CompanyOSSnapshot {
  products: Product[];
  customers: Customer[];
  leads: Lead[];
  opportunities: Opportunity[];
  deals: Deal[];
  revenueRecords: RevenueRecord[];
  intelligence: {
    totalPipelineValue: number;
    activeOpportunities: number;
    wonDealsThisMonth: number;
    activeCustomers: number;
    atRiskCustomers: number;
    totalRevenueRecognized: number;
    currency: string;
    observations: AIInsight[];
    generatedAt: string;
  };
  snapshotAt: string;
}

interface Props {
  apiUrl: string;
}

const HEALTH_COLOR: Record<string, string> = {
  HEALTHY: '#22c55e',
  AT_RISK: '#f59e0b',
  CHURNED: '#ef4444',
};

const STAGE_COLOR: Record<string, string> = {
  DISCOVERY: '#6366f1',
  PROPOSAL: '#3b82f6',
  NEGOTIATION: '#f59e0b',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444',
};

const STATUS_COLOR: Record<string, string> = {
  NEW: '#94a3b8',
  CONTACTED: '#3b82f6',
  QUALIFIED: '#22c55e',
  DISQUALIFIED: '#ef4444',
  ACTIVE: '#6366f1',
  BETA: '#f59e0b',
  DEPRECATED: '#ef4444',
  PLANNED: '#94a3b8',
  COMPLETED: '#22c55e',
  ON_HOLD: '#f59e0b',
  CANCELLED: '#ef4444',
};

const INSIGHT_BADGE: Record<string, { bg: string; label: string; color: string }> = {
  FACT: { bg: 'rgba(99,102,241,0.15)', label: 'FACT', color: '#818cf8' },
  RULE_RESULT: { bg: 'rgba(251,191,36,0.15)', label: 'RULE', color: '#fbbf24' },
  AI_INSIGHT: { bg: 'rgba(34,197,94,0.15)', label: 'AI', color: '#4ade80' },
};

function formatIDR(amount: number): string {
  if (amount >= 1_000_000_000) return `IDR ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `IDR ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `IDR ${(amount / 1_000).toFixed(0)}K`;
  return `IDR ${amount}`;
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || '#94a3b8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: 'rgba(255,252,245,0.06)', border: '1px solid rgba(180,174,159,0.15)',
      borderRadius: '12px', padding: '16px 20px',
    }}>
      <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: accent || '#fffcf5', fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export function CompanyOSView({ apiUrl }: Props) {
  const [snapshot, setSnapshot] = useState<CompanyOSSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'customers' | 'leads' | 'opportunities' | 'deals' | 'revenue' | 'intelligence'>('overview');

  const fetchSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/company/snapshot`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setSnapshot(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load Company OS data');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'customers', label: 'Customers' },
    { id: 'leads', label: 'Leads' },
    { id: 'opportunities', label: 'Pipeline' },
    { id: 'deals', label: 'Deals' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'intelligence', label: 'Intelligence' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#6b7280' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading Company OS...</div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div style={{ padding: '24px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', margin: '24px' }}>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>Company OS Unavailable</div>
        <div style={{ fontSize: '13px' }}>{error}</div>
        <button onClick={fetchSnapshot} style={{ marginTop: '12px', padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          Retry
        </button>
      </div>
    );
  }

  const { products, customers, leads, opportunities, deals, revenueRecords, intelligence } = snapshot;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#e5e7eb', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#fffcf5', letterSpacing: '-0.5px' }}>
              🏢 KDI Company Operating System
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
              Product → Lead → Opportunity → Deal → Customer → Project → Revenue → Intelligence
            </p>
          </div>
          <button onClick={fetchSnapshot} style={{
            padding: '8px 16px', background: 'rgba(255,252,245,0.08)', color: '#9ca3af',
            border: '1px solid rgba(180,174,159,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
          }}>
            ↻ Refresh
          </button>
        </div>

        {/* KPI Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <MetricCard label="Pipeline (Weighted)" value={formatIDR(intelligence.totalPipelineValue)} sub={`${intelligence.activeOpportunities} active opps`} accent="#818cf8" />
          <MetricCard label="Total Revenue" value={formatIDR(intelligence.totalRevenueRecognized)} sub="All recognized" accent="#4ade80" />
          <MetricCard label="Active Customers" value={String(intelligence.activeCustomers)} sub={`${intelligence.atRiskCustomers} at-risk`} accent="#60a5fa" />
          <MetricCard label="Products" value={String(products.length)} sub="Active portfolio" />
          <MetricCard label="Active Deals" value={String(deals.filter(d => d.status === 'ACTIVE').length)} sub={`${deals.length} total`} accent="#f59e0b" />
        </div>

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,252,245,0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(180,174,159,0.12)' }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as any)}
              style={{
                padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeSection === s.id ? 'rgba(129,140,248,0.25)' : 'transparent',
                color: activeSection === s.id ? '#818cf8' : '#6b7280',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {products.map(p => (
              <div key={p.productId} style={{ background: 'rgba(255,252,245,0.05)', border: '1px solid rgba(180,174,159,0.15)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#fffcf5' }}>{p.name}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{p.category}</div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>{p.description.slice(0, 80)}...</div>
                {p.basePrice && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>
                    Base: {formatIDR(p.basePrice)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOMERS */}
      {activeSection === 'customers' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {customers.map(c => (
              <div key={c.customerId} style={{ background: 'rgba(255,252,245,0.05)', border: `1px solid ${HEALTH_COLOR[c.health]}33`, borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#fffcf5' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{c.industry}{c.location ? ` · ${c.location}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>{formatIDR(c.totalRevenue)}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{c.activeProjects} active project(s)</div>
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                      background: `${HEALTH_COLOR[c.health]}22`, color: HEALTH_COLOR[c.health],
                      border: `1px solid ${HEALTH_COLOR[c.health]}44`,
                    }}>{c.health}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEADS */}
      {activeSection === 'leads' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leads.map(l => (
              <div key={l.leadId} style={{ background: 'rgba(255,252,245,0.05)', border: '1px solid rgba(180,174,159,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fffcf5' }}>{l.name}</div>
                    {l.company && <div style={{ fontSize: '11px', color: '#6b7280' }}>{l.company}</div>}
                    <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>Source: {l.source}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      {l.estimatedValue && <div style={{ fontSize: '13px', fontWeight: 600, color: '#818cf8' }}>{formatIDR(l.estimatedValue)}</div>}
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Score: {l.qualificationScore}/100</div>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPPORTUNITIES / PIPELINE */}
      {activeSection === 'opportunities' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: '10px' }}>
            <span style={{ fontWeight: 700, color: '#818cf8' }}>Weighted Pipeline: </span>
            <span style={{ color: '#fffcf5', fontSize: '18px', fontWeight: 800 }}>{formatIDR(intelligence.totalPipelineValue)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {opportunities.map(o => (
              <div key={o.opportunityId} style={{ background: 'rgba(255,252,245,0.05)', border: `1px solid ${STAGE_COLOR[o.stage] || '#374151'}44`, borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fffcf5', marginBottom: '4px' }}>{o.title}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                        background: `${STAGE_COLOR[o.stage] || '#6b7280'}22`, color: STAGE_COLOR[o.stage] || '#6b7280',
                      }}>{o.stage}</div>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>Close: {new Date(o.expectedCloseDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80' }}>{formatIDR(o.estimatedValue)}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{o.probability}% probability</div>
                    <div style={{ fontSize: '11px', color: '#818cf8' }}>Weighted: {formatIDR(o.estimatedValue * o.probability / 100)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEALS */}
      {activeSection === 'deals' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deals.map(d => (
              <div key={d.dealId} style={{ background: 'rgba(255,252,245,0.05)', border: '1px solid rgba(180,174,159,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fffcf5' }}>{d.title}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Customer: {d.customerId}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#4ade80' }}>{formatIDR(d.value)}</div>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVENUE */}
      {activeSection === 'revenue' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px' }}>
            <span style={{ fontWeight: 700, color: '#4ade80' }}>Total Revenue Recognized: </span>
            <span style={{ color: '#fffcf5', fontSize: '18px', fontWeight: 800 }}>{formatIDR(intelligence.totalRevenueRecognized)}</span>
            <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>FACT · SOURCE: DATABASE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {revenueRecords.map(r => (
              <div key={r.recordId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,252,245,0.04)', border: '1px solid rgba(180,174,159,0.12)', borderRadius: '10px', padding: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>{r.recordId}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{r.type} · {new Date(r.recognizedAt).toLocaleDateString('id-ID')}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#4ade80' }}>{formatIDR(r.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTELLIGENCE */}
      {activeSection === 'intelligence' && (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['FACT', 'RULE_RESULT', 'AI_INSIGHT'].map(type => {
              const b = INSIGHT_BADGE[type];
              return (
                <div key={type} style={{ padding: '4px 10px', borderRadius: '6px', background: b.bg, color: b.color, fontSize: '11px', fontWeight: 700 }}>
                  {b.label}
                </div>
              );
            })}
            <span style={{ fontSize: '11px', color: '#4b5563', alignSelf: 'center', marginLeft: '4px' }}>
              Insight types: FACT (database), RULE (engine), AI (LLM Gateway · cached)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {intelligence.observations.map((obs, i) => {
              const b = INSIGHT_BADGE[obs.type];
              return (
                <div key={i} style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  background: b.bg, border: `1px solid ${b.color}33`, borderRadius: '10px', padding: '12px 16px',
                }}>
                  <div style={{
                    minWidth: '52px', padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 800,
                    background: `${b.color}33`, color: b.color, textAlign: 'center',
                  }}>{b.label}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#e5e7eb', marginBottom: '2px' }}>{obs.label}</div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>{obs.value}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#4b5563', whiteSpace: 'nowrap' }}>{obs.source}</div>
                </div>
              );
            })}

            {intelligence.observations.filter(o => o.type === 'AI_INSIGHT').length === 0 && (
              <div style={{ padding: '16px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)', borderRadius: '10px', fontSize: '12px', color: '#6b7280' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>🤖 AI Insights: PENDING</div>
                <div>Business AI insights have not been generated yet. They will appear here once generated via the AI Gateway with Ollama (local LLM).</div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#4b5563' }}>No fabricated insights are shown. AI insights are generated on-demand and cached.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', fontSize: '11px', color: '#374151' }}>
            Snapshot: {new Date(snapshot.snapshotAt).toLocaleString('id-ID')} · Generated: {new Date(intelligence.generatedAt).toLocaleString('id-ID')}
          </div>
        </div>
      )}
    </div>
  );
}
