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
    <div className="space-y-6 text-[#2a2622]">
      {/* 4-Pillar Comparative Bar Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <BarChart3 className="w-5 h-5 text-[#385747]" />
            <h4 className="text-sm font-heading font-bold text-[#2a2622]">
              Multi-Perspective Cost & Valuation Comparison
            </h4>
          </div>
          <span className="text-[11px] text-[#5c554b] font-mono">
            Currency: {threeView.currency} / Monthly
          </span>
        </div>

        <div className="space-y-5">
          {/* 1. Actual Human Compensation */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#2a2622]">
                1. Actual Human Total Compensation (Confidential Baseline)
              </span>
              <span className="font-mono text-[#2a2622] font-bold">
                Rp {threeView.actualHumanCompensationMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-[#eee9df] rounded-lg overflow-hidden p-0.5 border border-[#b4ae9f]">
              <div
                className="h-full bg-[#2a2622] rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.actualHumanCompensationMonthly)}%` }}
              />
            </div>
          </div>

          {/* 2. Illustrative Market Workforce Benchmark */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#385747] font-semibold flex items-center space-x-1">
                <span>2. Illustrative Market Workforce Benchmark ({threeView.equivalentFte} FTE)</span>
              </span>
              <span className="font-mono text-[#385747] font-bold">
                Rp {threeView.equivalentMarketBenchmarkMedianMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-[#eee9df] rounded-lg overflow-hidden p-0.5 border border-[#b4ae9f]">
              <div
                className="h-full bg-[#385747] rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.equivalentMarketBenchmarkMedianMonthly)}%` }}
              />
            </div>
          </div>

          {/* 3. AI Operating Infrastructure Cost */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#c2410c] font-semibold">
                3. Actual AI Operating Cost (LLM Inference + Tools + Infrastructure)
              </span>
              <span className="font-mono text-[#c2410c] font-bold">
                Rp {threeView.aiActualOperatingCostMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-[#eee9df] rounded-lg overflow-hidden p-0.5 border border-[#b4ae9f]">
              <div
                className="h-full bg-[#c2410c] rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.aiActualOperatingCostMonthly)}%` }}
              />
            </div>
          </div>

          {/* 4. Total Combined AI Cost (Virtual Comp + Operating) */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#5c554b]">
                4. Simulated Virtual Agent Compensation (Internal Simulation)
              </span>
              <span className="font-mono text-[#2a2622] font-bold">
                Rp {threeView.aiVirtualCompensationMonthly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="h-6 w-full bg-[#eee9df] rounded-lg overflow-hidden p-0.5 border border-[#b4ae9f]">
              <div
                className="h-full bg-[#b4ae9f] rounded-md transition-all duration-500"
                style={{ width: `${getWidthPercent(threeView.aiVirtualCompensationMonthly)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f] text-[11px] text-[#5c554b] flex items-start space-x-2">
          <Info className="w-4 h-4 text-[#385747] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#2a2622]">Analytical Partitioning:</strong> Perspective 2 reflects market salary replacement for equivalent human roles. Perspective 3 reflects monthly hard cloud/LLM costs. Perspective 4 is an internal simulation benchmark for agent capability. They are partitioned to prevent accidental conflation.
          </span>
        </div>
      </div>

      {/* Role Composition Matrix Distribution */}
      <div className="glass-panel p-6 rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] shadow-xs">
        <div className="flex items-center space-x-2.5 mb-4">
          <PieChart className="w-5 h-5 text-[#385747]" />
          <h4 className="text-sm font-heading font-bold text-[#2a2622]">
            Workload Role Composition & Capacity Multiplier
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.equivalentRoles.map((role) => {
            const rolePercent = Math.round(
              (role.illustrativeValueMedian / profile.illustrativeWorkforceValue.monthlyMedian) * 100
            );

            return (
              <div key={role.marketRoleId} className="p-3 rounded-xl bg-[#f8f5ee] border border-[#b4ae9f]">
                <div className="flex justify-between items-baseline mb-1">
                  <strong className="text-xs font-semibold text-[#2a2622]">
                    {role.marketRoleTitle}
                  </strong>
                  <span className="text-xs font-mono font-bold text-[#385747]">
                    {rolePercent}% ({role.equivalentFte} FTE)
                  </span>
                </div>

                <div className="w-full bg-[#eee9df] h-2 rounded-full overflow-hidden mb-2 border border-[#b4ae9f]/40">
                  <div
                    className="bg-[#385747] h-full rounded-full transition-all duration-500"
                    style={{ width: `${rolePercent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#5c554b] font-mono">
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
