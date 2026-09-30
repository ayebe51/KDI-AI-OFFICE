// ==========================================================
// components/office/PrayerModal.tsx
// Musholla Sanctuary & Prayer Schedule Inspector
// ==========================================================

import React from 'react';
import type { OfficePrayerSession } from '@kdi/types';
import { Compass, CheckCircle2, Clock, Users, X } from 'lucide-react';

export interface PrayerModalProps {
  activePrayer?: OfficePrayerSession | null;
  onClose: () => void;
}

export const PrayerModal: React.FC<PrayerModalProps> = ({ activePrayer, onClose }) => {
  const schedule = [
    { name: 'FAJR', time: '04:32 WIB', status: 'COMPLETED' },
    { name: 'DHUHR', time: '11:51 WIB', status: activePrayer?.prayerName === 'DHUHR' ? 'ACTIVE' : 'COMPLETED' },
    { name: 'ASR', time: '15:08 WIB', status: activePrayer?.prayerName === 'ASR' ? 'ACTIVE' : 'UPCOMING' },
    { name: 'MAGHRIB', time: '17:54 WIB', status: activePrayer?.prayerName === 'MAGHRIB' ? 'ACTIVE' : 'UPCOMING' },
    { name: 'ISHA', time: '19:03 WIB', status: activePrayer?.prayerName === 'ISHA' ? 'ACTIVE' : 'UPCOMING' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-panel rounded-2xl p-6 border border-emerald-500/40 bg-slate-900 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-100">
                Musholla • Islamic Prayer Schedule
              </h3>
              <p className="text-xs text-emerald-400 font-mono">
                Waktu Indonesia Barat (WIB) • Non-Blocking Task Intermission
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

        {/* Timetable List */}
        <div className="space-y-2 text-xs">
          {schedule.map((item) => (
            <div
              key={item.name}
              className={`p-3 rounded-xl border flex items-center justify-between transition ${
                item.status === 'ACTIVE'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-200">{item.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">({item.time})</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  item.status === 'ACTIVE'
                    ? 'bg-emerald-500 text-slate-950 animate-pulse'
                    : item.status === 'COMPLETED'
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-800 text-amber-400'
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Task Preservation Note */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Context Serialization:</strong> Working memory, git branch diffs, and task execution contexts are strictly preserved when agents observe scheduled prayer in the Musholla.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
