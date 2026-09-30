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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'TIER_B':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'TIER_C':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'TIER_D':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Verified Benchmark Provenance
            </span>
            <h3 className="text-lg font-heading font-bold text-slate-100 leading-tight">
              {source.name}
            </h3>
          </div>
        </div>

        {/* Tier Badge & Provider */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTierColor(source.reliabilityTier)}`}>
            {source.reliabilityTier}
          </span>
          <span className="text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
            Provider: <strong className="text-slate-100">{source.provider}</strong>
          </span>
          <span className="text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50 flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{source.region}, {source.country}</span>
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <span className="text-slate-400 block mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Publication & Retrieval Date:</span>
            </span>
            <span className="font-semibold text-slate-200">
              Published {source.publicationDate} • Retrieved {source.retrievalDate}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <span className="text-slate-400 block mb-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Effective Data Period:</span>
            </span>
            <span className="font-semibold text-emerald-400">
              {source.effectivePeriod} (Verified Active Baseline)
            </span>
          </div>
        </div>

        {/* Methodology */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 mb-6">
          <span className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wide">
            Methodology & Sample Criteria:
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {source.methodology}
          </p>
        </div>

        {/* Reliability Tier Explanation */}
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 mb-6 text-xs text-blue-300">
          <strong>Hierarchy Level:</strong> {getTierDescription(source.reliabilityTier)}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition"
          >
            <span>Visit Official Benchmark Publication</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Provenance
          </button>
        </div>
      </div>
    </div>
  );
}
