// ==========================================================
// components/office/AgentInspectorModal.tsx
// Public vs Private Agent Inspector Modal Overlay
// ==========================================================

import React from 'react';
import type { OfficeAgentDetail } from '@kdi/types';
import { Shield, Cpu, Activity, Clock, DollarSign, Award, X } from 'lucide-react';

export interface AgentInspectorModalProps {
  agent: OfficeAgentDetail;
  isInternalMode: boolean;
  onFollowAgent?: (agent: OfficeAgentDetail) => void;
  onClose: () => void;
}

export const AgentInspectorModal: React.FC<AgentInspectorModalProps> = ({
  agent,
  isInternalMode,
  onFollowAgent,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl glass-panel rounded-2xl p-6 border border-amber-500/40 bg-slate-900 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold font-mono">
              {agent.agentId.slice(-3)}
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-100">{agent.name}</h3>
              <p className="text-xs text-amber-400 font-mono">
                {agent.agentId} • {agent.role} • {agent.grade}
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

        {/* Content Details */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Department</span>
              <span className="text-slate-200 font-semibold">{agent.department}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Current Room</span>
              <span className="text-emerald-400 font-mono font-semibold">{agent.currentLocation}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Operational Activity</span>
              <span className="text-amber-400 font-mono font-bold">{agent.activityState}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Version Sequence</span>
              <span className="text-slate-300 font-mono">v{agent.entityVersion}</span>
            </div>
          </div>

          {/* Activity Telemetry Summary */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1 font-medium flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Activity Telemetry:</span>
            </span>
            <p className="text-slate-200 leading-relaxed font-sans">{agent.currentActivity}</p>
          </div>

          {/* Internal-Only Technical Execution Metrics */}
          {isInternalMode ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-amber-400 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Internal Operational Telemetry (Confidential)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 uppercase font-mono">
                  Authorized
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Active Task</span>
                  <span className="text-slate-200 font-mono">{agent.currentTaskId || 'None (Standby)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Model</span>
                  <span className="text-slate-200 font-mono">{agent.model || 'Local Ollama'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Est. Cost (USD)</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    ${agent.costUsd?.toFixed(4) || '0.0000'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-400 text-[11px] flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Public View: Private execution traces, models, and cost ledgers are sanitized.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center">
          {onFollowAgent ? (
            <button
              onClick={() => onFollowAgent(agent)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
            >
              <span>🎯 Follow Agent (Camera)</span>
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
