// ==========================================================
// apps/web/src/components/workforce/WorkforceComparisonChart.tsx
// Visual comparative analytics & functional role distribution bars
// ==========================================================

import React from 'react';
import { BarChart3, PieChart, Info } from 'lucide-react';
import type { ThreeViewComparison, WorkloadProfile } from '@kdi/types';

interface WorkforceComparisonChartProps {
  threeView: ThreeViewComparison;
  profile: WorkloadProfile;
}

export function WorkforceComparisonChart({ threeView, profile }: WorkforceComparisonChartProps) {
  // Comparative bar maximum baseline for visual scaling (using highest value)
  const maxBaseline = Math.max(
    threeView.actualHumanCompensationMonthly,
    threeView.equivalentMarketBenchmarkMedianMonthly,
    threeView.totalAiCostMonthly,
    threeView.aiActualOperatingCostMonthly
  ) * 1.15;

  const getWidthPercent = (val: number) => {
    return Math.max(4, Math.min(100, Math.round((val / maxBaseline) * 100)));
  };

  return (
    <div className="space-y-6">
      {/* 4-Pillar Comparative Bar Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-heading font-bold text-slate-100">
              Multi-Perspective Cost & Valuation Comparison
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Currency: {threeView.currency} / Monthly
          </span>
        </div>

        <div className="space-y-5">
          {/* 1. Actual Human Compensation */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-300">
                1. Actual Human Total Compensation (Confidential Baseline)
              </span>
              <span className="font-mono text-slate-100 font-bold">
                Rp {threeView.actualHumanCompensationMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950/80 rounded-lg overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-slate-600 to-slate-400 rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.actualHumanCompensationMonthly)}%` }}
              />
            </div>
          </div>

          {/* 2. Illustrative Market Workforce Benchmark */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-emerald-400 flex items-center space-x-1">
                <span>2. Illustrative Market Workforce Benchmark ({threeView.equivalentFte} FTE)</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                Rp {threeView.equivalentMarketBenchmarkMedianMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950/80 rounded-lg overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.equivalentMarketBenchmarkMedianMonthly)}%` }}
              />
            </div>
          </div>

          {/* 3. AI Operating Infrastructure Cost */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-amber-400">
                3. Actual AI Operating Cost (LLM Inference + Tools + Infrastructure)
              </span>
              <span className="font-mono text-amber-400 font-bold">
                Rp {threeView.aiActualOperatingCostMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950/80 rounded-lg overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.aiActualOperatingCostMonthly)}%` }}
              />
            </div>
          </div>

          {/* 4. Total Combined AI Cost (Virtual Comp + Operating) */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-cyan-400">
                4. Simulated Virtual Agent Compensation (Internal Simulation)
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                Rp {threeView.aiVirtualCompensationMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950/80 rounded-lg overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.aiVirtualCompensationMonthly)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong>Analytical Partitioning:</strong> Perspective 2 reflects market salary replacement for equivalent human roles. Perspective 3 reflects monthly hard cloud/LLM costs. Perspective 4 is an internal simulation benchmark for agent capability. They are partitioned to prevent accidental conflation.
          </span>
        </div>
      </div>

      {/* Role Composition Matrix Distribution */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center space-x-2.5 mb-4">
          <PieChart className="w-5 h-5 text-cyan-400" />
          <h4 className="text-sm font-heading font-bold text-slate-100">
            Workload Role Composition & Capacity Multiplier
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.equivalentRoles.map((role) => {
            const rolePercent = Math.round(
              (role.illustrativeValueMedian / profile.illustrativeWorkforceValue.monthlyMedian) * 100
            );

            return (
              <div key={role.marketRoleId} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex justify-between items-baseline mb-1">
                  <strong className="text-xs font-semibold text-slate-100">
                    {role.marketRoleTitle}
                  </strong>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {rolePercent}% ({role.equivalentFte} FTE)
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${rolePercent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Valuation: Rp {role.illustrativeValueMedian.toLocaleString('id-ID')}</span>
                  <span>Benchmark: Rp {role.benchmark.salaryMedian.toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
