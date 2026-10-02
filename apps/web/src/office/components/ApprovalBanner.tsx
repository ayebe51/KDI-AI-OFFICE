// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// ApprovalBanner: Human-in-the-Loop policy gate visualization
// Conforms to Section 19: UI never bypasses KDI Policy Engine
// ==========================================================

import React, { useState } from 'react';
import { useKdiOfficeStore } from '../state/kdiOfficeStore';

interface ApprovalBannerProps {
  apiUrl?: string;
}

export const ApprovalBanner: React.FC<ApprovalBannerProps> = ({ apiUrl = 'http://localhost:3000' }) => {
  const approvals = useKdiOfficeStore((s) => s.snapshot.approvals);
  const resolveApproval = useKdiOfficeStore((s) => s.resolveApproval);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');

  if (pendingApprovals.length === 0) return null;

  const current = pendingApprovals[0];

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    setSubmittingId(current.id);
    try {
      await fetch(`${apiUrl}/api/v1/autonomy/approvals/${current.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: `Resolved from KDI Office UI (${decision})` }),
      });
    } catch {
      // Allow local projection update if backend offline in preview
    } finally {
      resolveApproval(current.id, decision);
      setSubmittingId(null);
    }
  };

  const isCritical = current.risk === 'CRITICAL' || current.risk === 'HIGH';

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-2xl bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-xl p-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 font-bold text-lg">
            ⚠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                APPROVAL REQUIRED (POLICY GATE)
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  isCritical ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                RISK: {current.risk}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-100 mt-1">{current.action}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{current.reason}</p>
            {current.expectedImpact && (
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="text-slate-400 font-medium">Impact:</span> {current.expectedImpact}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            disabled={submittingId === current.id}
            onClick={() => handleDecision('REJECTED')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-medium border border-slate-700 transition"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={submittingId === current.id}
            onClick={() => handleDecision('APPROVED')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold shadow-lg shadow-amber-600/20 transition"
          >
            {submittingId === current.id ? 'Submitting...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};
