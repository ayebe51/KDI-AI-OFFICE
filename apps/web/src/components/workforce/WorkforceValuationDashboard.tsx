// ==========================================================
// apps/web/src/components/workforce/WorkforceValuationDashboard.tsx
// Master Console for Phase 8 AI Workforce, Market Benchmark & Workload Valuation
// ==========================================================

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Users,
  Cpu,
  Layers,
  FileText,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Download,
  Info,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type {
  WorkloadProfile,
  SalaryBenchmarkSource,
  VirtualEmployee,
  ThreeViewComparison,
} from '@kdi/types';
import { BenchmarkSourceModal } from './BenchmarkSourceModal';
import { WhatIfSimulator } from './WhatIfSimulator';
import { WorkforceComparisonChart } from './WorkforceComparisonChart';
import { ExportReportModal } from './ExportReportModal';

interface WorkforceValuationDashboardProps {
  apiUrl: string;
}

export function WorkforceValuationDashboard({ apiUrl }: WorkforceValuationDashboardProps) {
  const [activeView, setActiveView] = useState<'workload_mirror' | 'ai_workforce' | 'three_view' | 'what_if'>('workload_mirror');
  const [profile, setProfile] = useState<WorkloadProfile | null>(null);
  const [sources, setSources] = useState<SalaryBenchmarkSource[]>([]);
  const [virtualEmployees, setVirtualEmployees] = useState<VirtualEmployee[]>([]);
  const [threeView, setThreeView] = useState<ThreeViewComparison | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [activeSourceModal, setActiveSourceModal] = useState<SalaryBenchmarkSource | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchWorkforceData();
  }, [apiUrl]);

  const fetchWorkforceData = async () => {
    setLoading(true);
    try {
      const [profRes, srcRes, empRes, threeRes] = await Promise.all([
        fetch(`${apiUrl}/workforce/profiles/prf_human_operator_01`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${apiUrl}/workforce/sources`).then((r) => (r.ok ? r.json() : { data: [] })),
        fetch(`${apiUrl}/workforce/virtual-employees`).then((r) => (r.ok ? r.json() : { data: [] })),
        fetch(`${apiUrl}/workforce/three-view`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (profRes) setProfile(profRes);
      if (srcRes?.data) setSources(srcRes.data);
      if (empRes?.data) setVirtualEmployees(empRes.data);
      if (threeRes) setThreeView(threeRes);
    } catch (err) {
      console.error('Error fetching workforce data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceForRole = (sourceId: string): SalaryBenchmarkSource | null => {
    return sources.find((s) => s.sourceId === sourceId) || null;
  };

  if (loading || !profile || !threeView) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#2a2622] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#5c554b] font-mono">Loading Workforce Valuation Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full text-[#2a2622]">
      {/* Dashboard Top Header */}
      <div className="glass-panel p-6 rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] text-[#2a2622] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eee9df] text-[#2a2622] border border-[#b4ae9f] uppercase tracking-wider font-mono">
              Phase 8 Core System
            </span>
            <span className="text-xs text-[#5c554b] font-mono">
              2026 Indonesian Regional & Remote Benchmarks
            </span>
          </div>
          <h2 className="text-xl font-heading font-bold text-[#2a2622] leading-tight">
            Workforce Valuation, Salary Benchmark & Workload Mirror
          </h2>
          <p className="text-xs text-[#5c554b] mt-1">
            Separation of Real-World Market Workforce Valuation from Autonomous AI Virtual Workforce Operating Costs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#2a2622] hover:bg-[#385747] text-[#fffcf5] text-xs font-semibold flex items-center space-x-2 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#fffcf5]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Mandatory Governance Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-[#385747]/10 border border-[#385747]/30 text-xs text-[#2a2622] flex items-start space-x-3">
        <Info className="w-5 h-5 text-[#385747] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block font-semibold uppercase tracking-wider text-[#385747] font-mono">
            Methodological Notice & Legal Governance Disclaimer
          </strong>
          <p className="text-[#5c554b] leading-relaxed">
            All salary benchmarks and workforce valuations presented herein represent an{' '}
            <strong className="text-[#2a2622]">
              illustrative market replacement valuation for equivalent job roles
            </strong>{' '}
            based on verified 2026 published surveys (BPS Jawa Tengah, Glints, Michael Page, and Jobstreet by SEEK). This analysis reflects functional composition and market replacement value; it does NOT constitute an employment contract, guaranteed salary entitlement, or accusation of underpayment.
          </p>
        </div>
      </div>

      {/* Primary Perspective Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#eee9df] border border-[#b4ae9f]">
        <button
          onClick={() => setActiveView('workload_mirror')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'workload_mirror'
              ? 'bg-[#2a2622] text-[#fffcf5] shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Workload Mirror & Valuation (Human Model)</span>
        </button>

        <button
          onClick={() => setActiveView('ai_workforce')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'ai_workforce'
              ? 'bg-[#2a2622] text-[#fffcf5] shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>AI Virtual Workforce & Operating Cost</span>
        </button>

        <button
          onClick={() => setActiveView('three_view')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'three_view'
              ? 'bg-[#2a2622] text-[#fffcf5] shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Multi-Perspective Comparative Matrix</span>
        </button>

        <button
          onClick={() => setActiveView('what_if')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'what_if'
              ? 'bg-[#2a2622] text-[#fffcf5] shadow-xs'
              : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>What-If Scenario Sandbox</span>
        </button>
      </div>

      {/* ========================================================== */}
      {/* VIEW 1: REAL-WORLD WORKLOAD MIRROR & VALUATION */}
      {/* ========================================================== */}
      {activeView === 'workload_mirror' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Workforce Capacity
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-[#2a2622]">1 Human</span>
                <span className="text-xs text-[#385747] font-semibold">→ 6 Roles</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Total Equivalent: <strong className="text-[#2a2622]">{profile.totalEquivalentFte} FTE</strong>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Illustrative Monthly Value
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-[#385747]">
                  Rp {profile.illustrativeWorkforceValue.monthlyMedian.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#5c554b] font-mono">/ mo</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Range: Rp {(profile.illustrativeWorkforceValue.monthlyMin / 1000000).toFixed(1)}M –{' '}
                {(profile.illustrativeWorkforceValue.monthlyMax / 1000000).toFixed(1)}M
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Actual Compensation
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-[#2a2622]">
                  Rp {profile.actualCompensation.totalMonthly.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#5c554b] font-mono">/ mo</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Base: Rp {(profile.actualCompensation.baseSalary / 1000000).toFixed(1)}M + Allow: Rp{' '}
                {(profile.actualCompensation.allowances / 1000).toFixed(0)}K
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Illustrative Benchmark Gap
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-[#c2410c]">
                  Rp {profile.illustrativeGap.monthlyMedian.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#5c554b] font-mono">/ mo</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Annualized Median: Rp {(profile.illustrativeGap.annualizedMedian / 1000000).toFixed(1)}M / year
              </span>
            </div>
          </div>

          {/* Functional Responsibilities -> Mapped Roles Matrix */}
          <div className="glass-panel p-6 rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-heading font-bold text-[#2a2622]">
                  Workload Mirror: Responsibility to Equivalent Role Mapping
                </h3>
                <p className="text-xs text-[#5c554b]">
                  Mapping individual operational responsibilities into standardized market roles with double-counting mitigation.
                </p>
              </div>
              <span className="text-xs font-mono text-[#385747] bg-[#385747]/10 px-3 py-1 rounded-full border border-[#385747]/20 font-semibold">
                Double-Counting Mitigated: 0.1 Overlap Factor Applied
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.responsibilities.map((resp) => {
                const mapping = profile.mappings.find((m) => m.responsibilityId === resp.responsibilityId);
                const roleVal = profile.equivalentRoles.find((r) => r.marketRoleId === mapping?.marketRoleId);
                const source = roleVal ? getSourceForRole(roleVal.benchmark.sourceId) : null;

                return (
                  <div
                    key={resp.responsibilityId}
                    className="p-4 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] flex flex-col justify-between space-y-4 hover:border-[#2a2622] transition shadow-xs"
                  >
                    <div>
                      {/* Responsibility Title & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <strong className="text-xs font-semibold text-[#2a2622] leading-snug">
                          {resp.title}
                        </strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#eee9df] text-[#2a2622] border border-[#b4ae9f] shrink-0">
                          {resp.frequency} • {resp.estimatedHoursPerWeek}h/wk
                        </span>
                      </div>

                      <p className="text-[11px] text-[#5c554b] mb-3 leading-relaxed">
                        {resp.description}
                      </p>

                      {/* Skills & Tools chips */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {resp.skills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-[#fffcf5] text-[#2a2622] text-[10px] border border-[#b4ae9f] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Mapped Role Section */}
                      <div className="p-3 rounded-lg bg-[#fffcf5] border border-[#b4ae9f] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5c554b] font-medium">Mapped Role:</span>
                          <strong className="text-[#2a2622] font-semibold">
                            {mapping?.marketRoleTitle || 'Web Administrator'}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#5c554b]">Match Confidence:</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#385747]/10 text-[#385747] border border-[#385747]/20 font-mono">
                            {mapping?.matchConfidence || 'HIGH'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#5c554b]">Workload Allocation & Overlap:</span>
                          <span className="font-mono text-[#2a2622]">
                            {mapping?.allocationPercentage}% ({roleVal?.equivalentFte} FTE)
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#b4ae9f] text-[11px]">
                          <span className="text-[#5c554b]">Illustrative Valuation:</span>
                          <span className="font-mono text-[#385747] font-bold">
                            Rp {roleVal?.illustrativeValueMedian.toLocaleString('id-ID')} / mo
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Source Provenance Link */}
                    {source && (
                      <div className="pt-2 border-t border-[#b4ae9f] flex items-center justify-between text-[11px]">
                        <span className="text-[#5c554b] truncate max-w-[200px] font-mono">
                          Source: <strong className="text-[#2a2622]">{source.provider}</strong>
                        </span>
                        <button
                          onClick={() => setActiveSourceModal(source)}
                          className="text-[#385747] hover:text-[#2a2622] flex items-center space-x-1 font-semibold transition"
                        >
                          <span>{source.reliabilityTier} Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW 2: AI VIRTUAL WORKFORCE & OPERATING COST */}
      {/* ========================================================== */}
      {activeView === 'ai_workforce' && (
        <div className="space-y-6">
          {/* AI Workforce Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Virtual AI Staff
              </span>
              <span className="text-2xl font-bold font-mono text-[#2a2622]">
                {virtualEmployees.length} Autonomous Agents
              </span>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Engineering, Architecture, QA, Product
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Simulated Virtual Compensation
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-[#2a2622]">
                  Rp {threeView.aiVirtualCompensationMonthly.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#5c554b] font-mono">/ mo</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Base + Allowances + Performance Incentives
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Actual AI Operating Cost
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-[#c2410c]">
                  Rp {threeView.aiActualOperatingCostMonthly.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#5c554b] font-mono">/ mo</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                LLM Tokens + Tool APIs + Cloud Infrastructure
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-xs">
              <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide font-mono">
                Total Combined AI Cost
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-[#385747]">
                  Rp {threeView.totalAiCostMonthly.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-[#5c554b] font-mono">/ mo</span>
              </div>
              <span className="text-[11px] text-[#5c554b] mt-2 block font-mono">
                Virtual Compensation + Operating Runtime
              </span>
            </div>
          </div>

          {/* Virtual Employees Roster */}
          <div className="glass-panel p-6 rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] shadow-xs">
            <h3 className="text-base font-heading font-bold text-[#2a2622] mb-4">
              Autonomous Digital Employee Profiles & Operating Cost Center
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {virtualEmployees.map((emp) => (
                <div
                  key={emp.agentId}
                  className="p-4 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] flex flex-col justify-between space-y-4 hover:border-[#2a2622] transition shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2a2622] text-[#fffcf5] font-bold text-xs flex items-center justify-center">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <strong className="text-xs font-semibold text-[#2a2622] block">
                            {emp.name}
                          </strong>
                          <span className="text-[10px] text-[#5c554b] font-mono">{emp.grade}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#eee9df] text-[#2a2622] border border-[#b4ae9f]">
                        {emp.department}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#5c554b] font-medium mb-3">
                      {emp.internalRoleTitle}
                    </p>

                    <div className="space-y-1.5 text-xs bg-[#fffcf5] p-2.5 rounded-lg border border-[#b4ae9f]">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#5c554b]">Virtual Salary:</span>
                        <span className="font-mono text-[#2a2622]">
                          Rp {emp.virtualCompensation.totalMonthly.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#5c554b]">Monthly LLM Cost:</span>
                        <span className="font-mono text-[#c2410c]">
                          ${emp.operatingCost.llmCostUsd} (Rp{' '}
                          {(emp.operatingCost.llmCostUsd * 16000).toLocaleString('id-ID')})
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#5c554b]">Tool & Infra Cost:</span>
                        <span className="font-mono text-[#c2410c]">
                          ${emp.operatingCost.toolCostUsd + emp.operatingCost.infrastructureCostUsd}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[#b4ae9f] text-[11px]">
                        <span className="text-[#2a2622] font-semibold">Total Cost:</span>
                        <span className="font-mono text-[#385747] font-bold">
                          Rp {emp.totalCostMonthlyIdr.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#5c554b] flex items-center justify-between pt-2 border-t border-[#b4ae9f] font-mono">
                    <span>Verified Tasks: {emp.verifiedTasksCount}</span>
                    <span>Projects: {emp.activeProjects.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW 3: MULTI-PERSPECTIVE COMPARATIVE MATRIX */}
      {/* ========================================================== */}
      {activeView === 'three_view' && (
        <WorkforceComparisonChart threeView={threeView} profile={profile} />
      )}

      {/* ========================================================== */}
      {/* VIEW 4: WHAT-IF SCENARIO SANDBOX */}
      {/* ========================================================== */}
      {activeView === 'what_if' && (
        <WhatIfSimulator baseProfile={profile} />
      )}

      {/* Benchmark Source Modal */}
      {activeSourceModal && (
        <BenchmarkSourceModal
          source={activeSourceModal}
          onClose={() => setActiveSourceModal(null)}
        />
      )}

      {/* Export Report Modal */}
      {showExportModal && (
        <ExportReportModal
          profile={profile}
          apiUrl={apiUrl}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
