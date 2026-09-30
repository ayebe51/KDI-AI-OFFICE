// ==========================================================
// components/office/WhiteboardModal.tsx
// Interactive Whiteboard Modal displaying Structured Meeting & Architecture
// ==========================================================

import React from 'react';
import type { OfficeMeeting } from '@kdi/types';
import { Presentation, CheckCircle, FileText, X } from 'lucide-react';

export interface WhiteboardModalProps {
  meeting?: OfficeMeeting | null;
  onClose: () => void;
}

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ meeting, onClose }) => {
  const whiteboard = meeting?.whiteboardData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-indigo-500/40 bg-slate-900 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-100">
                {whiteboard?.title || 'Interactive Architectural Whiteboard'}
              </h3>
              <p className="text-xs text-indigo-400 font-mono">
                {meeting ? `Active Session: ${meeting.title}` : 'Conference Room RM-MEETING'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs max-h-[460px] overflow-y-auto pr-1">
          {whiteboard ? (
            <>
              {whiteboard.sections.map((section, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-heading font-semibold text-slate-200 block text-sm text-indigo-300">
                    {section.heading}
                  </span>
                  <ul className="space-y-1.5 text-slate-300">
                    {section.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start space-x-2">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Decisions */}
              {meeting?.decisions && meeting.decisions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <span className="font-heading font-semibold text-emerald-400 block text-sm flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Consensus Decisions</span>
                  </span>
                  <ul className="space-y-1 text-slate-200">
                    {meeting.decisions.map((dec, dIdx) => (
                      <li key={dIdx} className="flex items-center space-x-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{dec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <p>No active conference session currently in progress.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Whiteboard dynamically renders structured diagrams when agents initiate meetings.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Whiteboard
          </button>
        </div>
      </div>
    </div>
  );
};
