// ==========================================================
// 3d/interaction/AgentOverlay.tsx
// React HUD Overlay for PlayCanvas 3D Scene
// Displays safe agent details upon interaction
// ==========================================================

import React from 'react';
import { User, Activity, X, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';
import type { SelectedAgentDetail } from '../state/types.js';

export interface AgentOverlayProps {
  selectedAgent: SelectedAgentDetail | null;
  onCloseSelected: () => void;
  onOpenDetailModal?: (agent: SelectedAgentDetail) => void;
}

export const AgentOverlay: React.FC<AgentOverlayProps> = ({
  selectedAgent,
  onCloseSelected,
  onOpenDetailModal,
}) => {
  return (
    <>
      {/* 1. Engine & Runtime Status Badge (Top-Left) */}
      <div className="absolute top-4 left-4 glass-panel px-3.5 py-1.5 rounded-xl text-xs font-medium text-emerald-400 flex items-center space-x-2 shadow-lg border border-emerald-500/20 pointer-events-none select-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-heading font-semibold">PlayCanvas React</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-300">WebGL 2.0 Scene</span>
      </div>

      {/* 2. Interactive Navigation Hints (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-xl text-xs text-slate-300 flex items-center space-x-3 pointer-events-none select-none shadow-lg border border-slate-800">
        <span className="flex items-center space-x-1.5">
          <span>🖱️</span>
          <span>Left-Click + Drag: Rotate Camera</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center space-x-1.5">
          <span>🔍</span>
          <span>Scroll: Zoom</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center space-x-1.5">
          <span>👆</span>
          <span className="text-amber-400 font-medium">Click Avatar: View Details</span>
        </span>
      </div>

      {/* 3. Selected Agent Detail Card (Top-Right Floating React Overlay) */}
      {selectedAgent && (
        <div className="absolute top-4 right-4 w-80 glass-panel rounded-2xl p-4 shadow-2xl border border-amber-500/30 bg-slate-900/90 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          {/* Card Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
                <User className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-bold text-slate-100 leading-tight">
                  {selectedAgent.name}
                </h3>
                <span className="text-[11px] font-mono text-amber-400 block">
                  {selectedAgent.agentId}
                </span>
              </div>
            </div>

            <button
              onClick={onCloseSelected}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <div className="py-3 space-y-2.5 text-xs">
            {/* Role & Department */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Role:</span>
              <span className="font-semibold text-slate-200">
                {selectedAgent.role.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Department:</span>
              <span className="text-slate-300">{selectedAgent.department}</span>
            </div>

            {/* Live State Badge */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Backend State:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  selectedAgent.state === 'WORKING'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedAgent.state === 'ERROR'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    selectedAgent.state === 'WORKING'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-blue-400'
                  }`}
                ></span>
                {selectedAgent.state}
              </span>
            </div>

            {/* Current Activity / Task */}
            <div className="pt-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">Current Activity:</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedAgent.activitySummary || 'Standing by at engineering desk'}
              </p>
            </div>

            {/* Public Safety Redaction Badge */}
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Public safe view • Private tokens and logs protected</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => onOpenDetailModal?.(selectedAgent)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-heading font-bold shadow-md transition flex items-center justify-center space-x-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Open Agent Detail</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
