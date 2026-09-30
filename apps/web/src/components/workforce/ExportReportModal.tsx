// ==========================================================
// apps/web/src/components/workforce/ExportReportModal.tsx
// Modal for exporting Workload Valuation reports to JSON, CSV & Markdown
// ==========================================================

import React, { useState } from 'react';
import { Download, FileText, CheckCircle2, Copy, X } from 'lucide-react';
import type { WorkloadProfile } from '@kdi/types';

interface ExportReportModalProps {
  profile: WorkloadProfile;
  apiUrl: string;
  onClose: () => void;
}

export function ExportReportModal({ profile, apiUrl, onClose }: ExportReportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'csv' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    try {
      const res = await fetch(`${apiUrl}/workforce/export/${profile.profileId}?format=${selectedFormat}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.content], {
          type:
            selectedFormat === 'json'
              ? 'application/json'
              : selectedFormat === 'csv'
              ? 'text/csv'
              : 'text/markdown',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export download failed:', err);
    }
  };

  const handleCopyContent = async () => {
    try {
      const res = await fetch(`${apiUrl}/workforce/export/${profile.profileId}?format=${selectedFormat}`);
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Copy content failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
          aria-label="Close export modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Workload Valuation Export
            </span>
            <h3 className="text-lg font-heading font-bold text-slate-100 leading-tight">
              Export Comprehensive Audit Report
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Exports all active functional responsibilities, normalized market roles, verified salary benchmarks, allocation factors, equivalent headcount FTE, and illustrative valuation ranges with full source provenance citations.
        </p>

        {/* Format Selector */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wide">
            Select Output Format:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'markdown', title: 'Markdown / PDF', desc: 'Formatted briefing doc' },
              { id: 'csv', title: 'CSV Table', desc: 'Spreadsheet tabular data' },
              { id: 'json', title: 'Raw JSON', desc: 'API machine-readable' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id as any)}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedFormat === f.id
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <strong className="text-xs block font-semibold text-slate-100">{f.title}</strong>
                <span className="text-[10px] block mt-0.5 text-slate-400">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Legal notice inclusion reminder */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 mb-6 leading-relaxed">
          <strong className="text-slate-200 block mb-1">Mandatory Governance Notice:</strong>
          All generated export documents embed standard KDI governance headers, methodology notes, and legal disclaimers stating that valuation ranges represent illustrative replacement capacity and not legal wage claims.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
          <button
            onClick={handleCopyContent}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Content'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-md shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
