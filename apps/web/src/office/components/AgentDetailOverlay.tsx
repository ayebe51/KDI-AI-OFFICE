// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// AgentDetailOverlay: Inspector panel for selected AI employee
// ==========================================================

import React, { useRef, useEffect } from 'react';
import { useKdiOfficeStore } from '../state/kdiOfficeStore';
import { paintCastPortrait } from '../scene/kdiCast';

export const AgentDetailOverlay: React.FC = () => {
  const selectedAgentId = useKdiOfficeStore((s) => s.selectedAgentId);
  const snapshot = useKdiOfficeStore((s) => s.snapshot);
  const selectAgent = useKdiOfficeStore((s) => s.selectAgent);
  const openTerminal = useKdiOfficeStore((s) => s.openTerminal);
  const terminalLogs = useKdiOfficeStore((s) => s.terminalLogs);

  const portraitRef = useRef<HTMLCanvasElement>(null);

  const agent = selectedAgentId ? snapshot.agents[selectedAgentId] : null;

  useEffect(() => {
    if (!agent || !portraitRef.current) return;
    const ctx = portraitRef.current.getContext('2d');
    if (!ctx) return;
    paintCastPortrait(ctx, agent.characterKey, 4);
  }, [agent]);

  if (!agent) return null;

  const logs = terminalLogs[agent.id] || [
    `[${agent.displayName.toUpperCase()}] Standing by for autonomous orchestrator instructions.`,
  ];

  return (
    <div className="absolute top-14 right-4 z-30 w-96 max-h-[calc(100%-4.5rem)] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-right-4">
      {/* Header with portrait and close button */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 to-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center overflow-hidden shadow-inner">
            <canvas ref={portraitRef} width={64} height={64} className="image-rendering-pixelated" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">{agent.displayName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                {agent.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{agent.role}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {agent.id}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => selectAgent(null)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {/* Body details */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] text-xs">
        {/* Department & Office Zone */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 font-mono text-[11px]">
          <div>
            <span className="text-slate-500 block text-[10px]">DEPARTMENT</span>
            <span className="text-slate-300 font-semibold">{agent.department}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">ROOM / ZONE</span>
            <span className="text-slate-300 font-semibold">{agent.room}</span>
          </div>
        </div>

        {/* Current Activity */}
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Current Activity
          </span>
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 font-mono text-xs">
            {agent.activity || 'Idle at desk'}
          </div>
        </div>

        {/* Assigned Task */}
        {agent.currentTaskId && (
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Active Task
            </span>
            <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-cyan-400 font-bold">{agent.currentTaskId}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300">
                  IN PROGRESS
                </span>
              </div>
              <p className="text-slate-200 font-medium">{agent.currentTaskTitle || 'Autonomous task execution'}</p>
            </div>
          </div>
        )}

        {/* Active Tools */}
        {agent.toolsInUse && agent.toolsInUse.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Active Tool Integrations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {agent.toolsInUse.map((tool) => (
                <span
                  key={tool}
                  className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px] flex items-center gap-1"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Execution Logs (Sanitized) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Execution Telemetry
            </span>
            <button
              type="button"
              onClick={() => openTerminal(agent.id)}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
            >
              Expand Terminal &gt;
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-black/80 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed max-h-32 overflow-y-auto space-y-1">
            {logs.slice(-4).map((line, idx) => (
              <div key={idx} className="truncate text-slate-400 hover:text-slate-200">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500">KDI Phase 10 Runtime</span>
        <button
          type="button"
          onClick={() => openTerminal(agent.id)}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-md shadow-cyan-600/20 transition flex items-center gap-1.5"
        >
          <span>🖥</span> Live Terminal
        </button>
      </div>
    </div>
  );
};
