// ==========================================================
// apps/web/src/components/workforce/BenchmarkSourceModal.tsx
// Modal displaying verified real-world source provenance & methodology
// ==========================================================

import React from 'react';
import { ExternalLink, ShieldCheck, Calendar, Globe, BookOpen, X } from 'lucide-react';
import type { SalaryBenchmarkSource } from '@kdi/types';

interface BenchmarkSourceModalProps {
  source: SalaryBenchmarkSource | null;
  onClose: () => void;
}

export function BenchmarkSourceModal({ source, onClose }: BenchmarkSourceModalProps) {
  if (!source) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'TIER_A':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'TIER_B':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'TIER_C':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'TIER_D':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      default:
        return 'bg-purple-50 text-purple-800 border-purple-300';
    }
  };

  const getTierDescription = (tier: string) => {
    switch (tier) {
      case 'TIER_A':
        return 'Tier A — Official government or national statistical publication (e.g. BPS, Kemnaker).';
      case 'TIER_B':
        return 'Tier B — Recognized professional recruitment report or enterprise salary survey (e.g. Glints, Michael Page).';
      case 'TIER_C':
        return 'Tier C — Primary job portal with verified employer salary disclosures (e.g. Jobstreet by SEEK).';
      case 'TIER_D':
        return 'Tier D — Job listing aggregation or secondary market estimates.';
      default:
        return 'Tier E — Estimated model projection (Explicitly marked ESTIMATED).';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2622]/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-[#b4ae9f] bg-[#fffcf5] p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd] rounded-xl transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#e3dccd] border border-[#b4ae9f] text-[#385747]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-[#5c554b]">
              Verified Benchmark Provenance
            </span>
            <h3 className="text-lg font-heading font-bold text-[#2a2622] leading-tight">
              {source.name}
            </h3>
          </div>
        </div>

        {/* Tier Badge & Provider */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTierColor(source.reliabilityTier)}`}>
            {source.reliabilityTier}
          </span>
          <span className="text-xs text-[#5c554b] bg-[#eee9df] px-2.5 py-1 rounded-md border border-[#b4ae9f]">
            Provider: <strong className="text-[#2a2622]">{source.provider}</strong>
          </span>
          <span className="text-xs text-[#5c554b] bg-[#eee9df] px-2.5 py-1 rounded-md border border-[#b4ae9f] flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-[#5c554b]" />
            <span>{source.region}, {source.country}</span>
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div className="p-3 rounded-xl bg-[#eee9df]/50 border border-[#b4ae9f]">
            <span className="text-[#5c554b] block mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#5c554b]" />
              <span>Publication & Retrieval Date:</span>
            </span>
            <span className="font-semibold text-[#2a2622]">
              Published {source.publicationDate} • Retrieved {source.retrievalDate}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#eee9df]/50 border border-[#b4ae9f]">
            <span className="text-[#5c554b] block mb-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#385747]" />
              <span>Effective Data Period:</span>
            </span>
            <span className="font-semibold text-[#385747]">
              {source.effectivePeriod} (Verified Active Baseline)
            </span>
          </div>
        </div>

        {/* Methodology */}
        <div className="p-4 rounded-xl bg-[#eee9df]/50 border border-[#b4ae9f] mb-6">
          <span className="text-xs font-semibold text-[#2a2622] block mb-1.5 uppercase tracking-wide">
            Methodology & Sample Criteria:
          </span>
          <p className="text-xs text-[#5c554b] leading-relaxed">
            {source.methodology}
          </p>
        </div>

        {/* Reliability Tier Explanation */}
        <div className="p-3 rounded-xl bg-[#e3dccd] border border-[#b4ae9f] mb-6 text-xs text-[#2a2622]">
          <strong>Hierarchy Level:</strong> {getTierDescription(source.reliabilityTier)}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#b4ae9f]">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#385747] hover:underline transition"
          >
            <span>Visit Official Benchmark Publication</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2622] hover:bg-[#385747] text-[#fffcf5] rounded-xl text-xs font-semibold transition"
          >
            Close Provenance
          </button>
        </div>
      </div>
    </div>
  );
}
