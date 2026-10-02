// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// AgentStrip: Interactive workforce roster strip
// ==========================================================

import React, { useRef, useEffect } from 'react';
import { useKdiOfficeStore } from '../state/kdiOfficeStore';
import { paintCastPortrait, type KdiCharacterName } from '../scene/kdiCast';
import type { OfficeAgentStatus } from '../types';

function getStatusBadge(status: OfficeAgentStatus): { label: string; bg: string; text: string; dot: string } {
  switch (status) {
    case 'CODING':
      return { label: 'CODING', bg: 'bg-emerald-950/80 border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' };
    case 'TESTING':
      return { label: 'TESTING', bg: 'bg-amber-950/80 border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' };
    case 'PLANNING':
      return { label: 'PLANNING', bg: 'bg-pink-950/80 border-pink-500/40', text: 'text-pink-400', dot: 'bg-pink-400' };
    case 'DEBUGGING':
      return { label: 'DEBUGGING', bg: 'bg-rose-950/80 border-rose-500/40', text: 'text-rose-400', dot: 'bg-rose-400 animate-pulse' };
    case 'REVIEWING':
      return { label: 'REVIEWING', bg: 'bg-sky-950/80 border-sky-500/40', text: 'text-sky-400', dot: 'bg-sky-400' };
    case 'MEETING':
      return { label: 'MEETING', bg: 'bg-purple-950/80 border-purple-500/40', text: 'text-purple-400', dot: 'bg-purple-400' };
    case 'BLOCKED':
      return { label: 'BLOCKED', bg: 'bg-red-950/80 border-red-500/40', text: 'text-red-400', dot: 'bg-red-500' };
    case 'COMPLETED':
      return { label: 'COMPLETED', bg: 'bg-teal-950/80 border-teal-500/40', text: 'text-teal-400', dot: 'bg-teal-400' };
    case 'IDLE':
    default:
      return { label: 'IDLE', bg: 'bg-slate-900/80 border-slate-700/40', text: 'text-slate-400', dot: 'bg-slate-500' };
  }
}

interface AgentCardProps {
  id: string;
  displayName: string;
  role: string;
  characterKey: KdiCharacterName;
  status: OfficeAgentStatus;
  currentTaskTitle?: string;
  isSelected: boolean;
  onSelect: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  displayName,
  role,
  characterKey,
  status,
  currentTaskTitle,
  isSelected,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badge = getStatusBadge(status);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintCastPortrait(ctx, characterKey, 1.5);
  }, [characterKey]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all backdrop-blur-md cursor-pointer ${
        isSelected
          ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
          : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
      }`}
    >
      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-950/80 border border-slate-700/50 flex-shrink-0 flex items-center justify-center">
        <canvas ref={canvasRef} width={24} height={24} className="image-rendering-pixelated" />
      </div>

      <div className="flex flex-col min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 truncate">{displayName}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${badge.bg} ${badge.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{currentTaskTitle || role}</p>
      </div>
    </button>
  );
};

export const AgentStrip: React.FC = () => {
  const agents = useKdiOfficeStore((s) => s.snapshot.agents);
  const selectedAgentId = useKdiOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useKdiOfficeStore((s) => s.selectAgent);

  const agentList = Object.values(agents);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto no-scrollbar backdrop-blur-md">
      <div className="flex items-center gap-1.5 mr-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        KDI Agents ({agentList.length})
      </div>
      {agentList.map((agent) => (
        <AgentCard
          key={agent.id}
          id={agent.id}
          displayName={agent.displayName}
          role={agent.role}
          characterKey={agent.characterKey}
          status={agent.status}
          currentTaskTitle={agent.currentTaskTitle}
          isSelected={selectedAgentId === agent.id}
          onSelect={() => selectAgent(selectedAgentId === agent.id ? null : agent.id)}
        />
      ))}
    </div>
  );
};
