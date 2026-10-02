// ==========================================================
// apps/web/src/components/workforce/WhatIfSimulator.tsx
// Interactive Scenario Simulator for Workload Allocation, Overlap & FTE
// ==========================================================

import React, { useState } from 'react';
import { Sliders, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight, Check, Plus, Trash2 } from 'lucide-react';
import type { WorkloadProfile, Responsibility, WorkloadRoleMapping } from '@kdi/types';

interface WhatIfSimulatorProps {
  baseProfile: WorkloadProfile;
  onApplyScenario?: (recalculated: WorkloadProfile) => void;
}

export function WhatIfSimulator({ baseProfile }: WhatIfSimulatorProps) {
  // Local state for scenario allocations & overlap
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const m of baseProfile.mappings) {
      map[m.mappingId] = m.allocationPercentage;
    }
    return map;
  });

  const [overlaps, setOverlaps] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const m of baseProfile.mappings) {
      map[m.mappingId] = m.overlapFactor;
    }
    return map;
  });

  const [activeMappings, setActiveMappings] = useState<WorkloadRoleMapping[]>(() => [...baseProfile.mappings]);

  // Recalculate scenario metrics locally in real-time
  const calculateSimulatedMetrics = () => {
    let totalFte = 0;
    let totalMedian = 0;

    for (const m of activeMappings) {
      const alloc = allocations[m.mappingId] ?? m.allocationPercentage;
      const overlap = overlaps[m.mappingId] ?? m.overlapFactor;
      const effectiveFte = Math.round(((alloc / 100) * (1 - overlap)) * 100) / 100;

      // Find matching equivalent role benchmark median
      const equiv = baseProfile.equivalentRoles.find((r) => r.marketRoleId === m.marketRoleId);
      const fullTimeMedian = equiv?.benchmark.salaryMedian || 5000000;
      const monthlyMedian = Math.round(fullTimeMedian * effectiveFte);

      totalFte += effectiveFte;
      totalMedian += monthlyMedian;
    }

    const baselineMedian = baseProfile.illustrativeWorkforceValue.monthlyMedian;
    const baselineFte = baseProfile.totalEquivalentFte;
    const fteDelta = Math.round((totalFte - baselineFte) * 10) / 10;
    const valueDelta = totalMedian - baselineMedian;
    const actualMonthly = baseProfile.actualCompensation.totalMonthly;
    const simulatedGap = Math.max(0, totalMedian - actualMonthly);

    return {
      totalFte: Math.round(totalFte * 10) / 10,
      totalMedian,
      fteDelta,
      valueDelta,
      simulatedGap,
    };
  };

  const sim = calculateSimulatedMetrics();

  const handleReset = () => {
    const mapAlloc: Record<string, number> = {};
    const mapOverlap: Record<string, number> = {};
    for (const m of baseProfile.mappings) {
      mapAlloc[m.mappingId] = m.allocationPercentage;
      mapOverlap[m.mappingId] = m.overlapFactor;
    }
    setAllocations(mapAlloc);
    setOverlaps(mapOverlap);
    setActiveMappings([...baseProfile.mappings]);
  };

  const handleToggleMapping = (mappingId: string) => {
    if (activeMappings.some((m) => m.mappingId === mappingId)) {
      if (activeMappings.length <= 1) return; // Keep at least one
      setActiveMappings(activeMappings.filter((m) => m.mappingId !== mappingId));
    } else {
      const orig = baseProfile.mappings.find((m) => m.mappingId === mappingId);
      if (orig) setActiveMappings([...activeMappings, orig]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="p-4 rounded-2xl bg-[#e3dccd] border border-[#b4ae9f] flex items-start space-x-3 text-xs text-[#2a2622]">
        <Sliders className="w-5 h-5 text-[#385747] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold uppercase tracking-wider block text-[#2a2622]">
            WHAT-IF SIMULATION SANDBOX
          </span>
          <p className="text-[#5c554b] leading-relaxed">
            Adjust functional workload allocations and domain overlap factors below. Dynamic calculations show the immediate impact on equivalent headcount (FTE), illustrative replacement valuation, and benchmark gap.
          </p>
        </div>
      </div>

      {/* Realtime Simulation Outcome KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide">
            Simulated Equivalent Capacity
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-[#2a2622]">{sim.totalFte}</span>
            <span className="text-xs text-[#5c554b] font-medium">FTE</span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px]">
            {sim.fteDelta > 0 ? (
              <span className="text-[#385747] flex items-center font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{sim.fteDelta} FTE vs Baseline
              </span>
            ) : sim.fteDelta < 0 ? (
              <span className="text-[#c2410c] flex items-center font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> {sim.fteDelta} FTE vs Baseline
              </span>
            ) : (
              <span className="text-[#5c554b]">Baseline unchanged (3.2 FTE)</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide">
            Illustrative Monthly Value
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-bold font-mono text-[#385747]">
              Rp {sim.totalMedian.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-1 text-[11px]">
            {sim.valueDelta > 0 ? (
              <span className="text-[#385747] flex items-center font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +Rp {sim.valueDelta.toLocaleString('id-ID')}
              </span>
            ) : sim.valueDelta < 0 ? (
              <span className="text-[#c2410c] flex items-center font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> -Rp {Math.abs(sim.valueDelta).toLocaleString('id-ID')}
              </span>
            ) : (
              <span className="text-[#5c554b]">Matches baseline median</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide">
            Simulated Benchmark Gap
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-bold font-mono text-[#2a2622]">
              Rp {sim.simulatedGap.toLocaleString('id-ID')}
            </span>
          </div>
          <span className="text-[11px] text-[#5c554b] mt-2 block">
            Actual: Rp {baseProfile.actualCompensation.totalMonthly.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#fffcf5] border border-[#b4ae9f] shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#5c554b] block mb-1 uppercase tracking-wide">
            Scenario Control
          </span>
          <button
            onClick={handleReset}
            className="w-full py-2 px-3 rounded-xl bg-[#eee9df] hover:bg-[#e3dccd] text-[#2a2622] border border-[#b4ae9f] text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>
        </div>
      </div>

      {/* Sliders & Toggles Table */}
      <div className="p-5 rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] shadow-xs">
        <h4 className="text-sm font-semibold text-[#2a2622] mb-4 flex items-center justify-between">
          <span>Functional Roles & Allocation Parameters</span>
          <span className="text-xs text-[#5c554b] font-normal">
            {activeMappings.length} of {baseProfile.mappings.length} Roles Active
          </span>
        </h4>

        <div className="space-y-4">
          {baseProfile.mappings.map((m) => {
            const isActive = activeMappings.some((x) => x.mappingId === m.mappingId);
            const currentAlloc = allocations[m.mappingId] ?? m.allocationPercentage;
            const currentOverlap = overlaps[m.mappingId] ?? m.overlapFactor;
            const effectiveFte = Math.round(((currentAlloc / 100) * (1 - currentOverlap)) * 100) / 100;

            const equiv = baseProfile.equivalentRoles.find((r) => r.marketRoleId === m.marketRoleId);
            const fullTimeMedian = equiv?.benchmark.salaryMedian || 5000000;
            const valueMedian = Math.round(fullTimeMedian * effectiveFte);

            return (
              <div
                key={m.mappingId}
                className={`p-4 rounded-xl border transition ${
                  isActive
                    ? 'bg-[#eee9df]/50 border-[#b4ae9f]'
                    : 'bg-[#eee9df]/20 border-[#b4ae9f]/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleMapping(m.mappingId)}
                      className={`p-1.5 rounded-lg border transition ${
                        isActive
                          ? 'bg-[#385747] border-[#385747] text-[#fffcf5]'
                          : 'bg-[#e3dccd] border-[#b4ae9f] text-[#5c554b]'
                      }`}
                      title={isActive ? 'Deactivate from scenario' : 'Activate in scenario'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <strong className="text-xs font-semibold text-[#2a2622] block">
                        {m.marketRoleTitle}
                      </strong>
                      <span className="text-[11px] text-[#5c554b] font-mono">
                        Full-Time Benchmark: Rp {fullTimeMedian.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-[#385747] block">
                      Rp {valueMedian.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-[#5c554b] font-mono">
                      Effective: {effectiveFte} FTE
                    </span>
                  </div>
                </div>

                {isActive && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#b4ae9f]/60 text-xs">
                    {/* Allocation Slider */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#5c554b]">Workload Allocation:</span>
                        <span className="font-semibold text-[#2a2622]">{currentAlloc}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={currentAlloc}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            [m.mappingId]: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-[#385747] h-1.5 bg-[#e3dccd] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Overlap Mitigation Slider */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#5c554b]">Overlap Mitigation:</span>
                        <span className="font-semibold text-[#2a2622]">{(currentOverlap * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={currentOverlap}
                        onChange={(e) =>
                          setOverlaps({
                            ...overlaps,
                            [m.mappingId]: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#385747] h-1.5 bg-[#e3dccd] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
