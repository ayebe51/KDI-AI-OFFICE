import React, { useState } from 'react';
import { Play, Pause, Zap, CheckCircle2, Terminal, Users, Layers, ShieldCheck } from 'lucide-react';
import type { AgentState, WSEventEnvelope } from '@kdi/types';

interface DashboardProps {
  apiUrl: string;
  agentState: AgentState;
  agentActivity: string;
  onToggleState: () => Promise<void>;
  events: WSEventEnvelope<unknown>[];
  isConnected: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  agentState,
  agentActivity,
  onToggleState,
  events,
  isConnected,
}) => {
  const [toggling, setToggling] = useState(false);
  const isWorking = agentState === 'WORKING';

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleState();
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold tracking-wider">AI Employees</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-heading font-bold text-slate-100 mt-2">14 Personas</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Registered in Digital Catalog
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Active Office Zones</span>
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-heading font-bold text-slate-100 mt-2">18 Rooms / Zones</div>
          <div className="text-xs text-slate-400 mt-1">RM-01 to RM-19 (NavMesh Mapped)</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold tracking-wider">WebSocket Status</span>
            <Zap className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="text-2xl font-heading font-bold text-slate-100 mt-2">
            {isConnected ? 'STREAMING' : 'DISCONNECTED'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {isConnected ? 'Realtime latency < 10ms' : 'Attempting auto-reconnect...'}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Security Perimeter</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-heading font-bold text-emerald-400 mt-2">ZERO PORTS OPEN</div>
          <div className="text-xs text-slate-400 mt-1">Outbound Reverse Tunnel Ready</div>
        </div>
      </div>

      {/* Backend-Driven 3D Interactive Controller Proof Card */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-slate-900 to-slate-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Phase 1 Verification: Backend-Driven 3D Digital Twin Proof</span>
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-100 mt-2">
              Demonstration Agent: Farhan (AI Software Engineer)
            </h3>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Clicking the button sends an HTTP POST request to the NestJS API. The backend updates its deterministic state machine and broadcasts an <code className="text-amber-300 font-mono text-xs">agent.status.changed</code> WebSocket frame. The 3D avatar visual immediately shifts posture and illuminations!
            </p>
            <div className="mt-3 flex items-center space-x-4 text-xs font-mono">
              <span className="text-slate-400">Current State: <strong className={isWorking ? 'text-emerald-400' : 'text-sky-400'}>{agentState}</strong></span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Activity: <span className="text-slate-200">{agentActivity}</span></span>
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-6 py-3.5 rounded-xl font-heading font-semibold text-sm flex items-center space-x-3 transition shadow-lg disabled:opacity-50 flex-shrink-0 ${
              isWorking
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isWorking ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Transition to IDLE (Rest)</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Transition to WORKING (Code)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time WebSocket Event Log Stream */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-slate-200 font-heading font-semibold">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Realtime WebSocket Telemetry Feed (office:events)</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {events.length} events received
          </span>
        </div>

        <div className="mt-4 space-y-2 max-h-56 overflow-y-auto pr-2 font-mono text-xs">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Awaiting real-time WebSocket events from backend API...
            </div>
          ) : (
            events.map((evt, idx) => (
              <div
                key={evt.eventId || idx}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start space-x-3 text-slate-300"
              >
                <span className="text-emerald-400 font-semibold flex-shrink-0">{evt.type}</span>
                <span className="text-slate-500 flex-shrink-0">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                <span className="text-slate-400 flex-1 truncate">
                  {typeof evt.data === 'object' ? JSON.stringify(evt.data) : String(evt.data)}
                </span>
                <span className="text-slate-600 text-[10px] uppercase tracking-wider">{evt.channel}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
