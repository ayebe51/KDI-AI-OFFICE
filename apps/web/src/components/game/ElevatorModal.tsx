// ==========================================================
// components/game/ElevatorModal.tsx
// Game-Like Cozy Elevator Navigation UI with Floor Transition
// ==========================================================

import React, { useState } from 'react';
import type { FloorId } from '../../3d/world/WorldDefinitions.js';
import { FLOOR_METAS } from '../../3d/world/WorldDefinitions.js';

export interface ElevatorModalProps {
  currentFloor: FloorId;
  onSelectFloor: (floor: FloorId) => void;
  onClose: () => void;
}

export const ElevatorModal: React.FC<ElevatorModalProps> = ({
  currentFloor,
  onSelectFloor,
  onClose,
}) => {
  const [transitioningFloor, setTransitioningFloor] = useState<FloorId | null>(null);

  const handleChooseFloor = (floor: FloorId) => {
    if (floor === currentFloor) {
      onClose();
      return;
    }

    setTransitioningFloor(floor);
    // Elevator movement delay for smooth game feel
    setTimeout(() => {
      onSelectFloor(floor);
      setTransitioningFloor(null);
      onClose();
    }, 700);
  };

  const floors: FloorId[] = ['ROOFTOP', 'FLOOR_2', 'GROUND'];

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !transitioningFloor) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60"
        style={{
          background: 'linear-gradient(165deg, #1e222d 0%, #151821 100%)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
        }}
      >
        {/* Elevator Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold text-base shadow-inner">
              🛗
            </div>
            <div>
              <h3 className="text-white text-base font-bold tracking-tight">Lift Kantor KDI</h3>
              <p className="text-slate-400 text-xs">Pilih lantai tujuan eksplorasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={Boolean(transitioningFloor)}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Transitioning chime feedback */}
        {transitioningFloor && (
          <div className="py-8 px-6 flex flex-col items-center justify-center space-y-3 animate-pulse">
            <div className="text-2xl">🔔</div>
            <div className="text-sky-300 text-sm font-semibold">
              Menuju ke {FLOOR_METAS[transitioningFloor].name}…
            </div>
            <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-sky-400 to-amber-400 animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Floor Selection Buttons */}
        {!transitioningFloor && (
          <div className="p-5 space-y-2.5">
            {floors.map((f) => {
              const meta = FLOOR_METAS[f];
              const isCurrent = f === currentFloor;

              return (
                <button
                  key={f}
                  onClick={() => handleChooseFloor(f)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/50 hover:border-sky-400/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-mono'
                          : 'bg-slate-900 border-slate-700 text-slate-300 font-mono group-hover:border-sky-400 group-hover:text-sky-300'
                      }`}
                    >
                      {meta.shortLabel}
                    </span>
                    <div>
                      <div className="text-sm font-semibold group-hover:text-white transition">
                        {meta.name}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {meta.tagline}
                      </div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Di Sini
                    </span>
                  ) : (
                    <span className="text-slate-500 group-hover:text-sky-400 text-xs transition">
                      Pergi →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Koneksi Digital Inovasi Headquarters</span>
          <span className="font-mono text-sky-400/80">3 Lantai Virtual</span>
        </div>
      </div>
    </div>
  );
};
