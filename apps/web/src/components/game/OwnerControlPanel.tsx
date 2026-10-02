// ==========================================================
// components/game/OwnerControlPanel.tsx
// Owner Mode Controller & Command Center Overlay for 3D Office
// Exposes: Command Center, Agents, Objectives, Tasks, Projects,
// Approvals, Workforce Mirror, Finance, GraphRAG, System Health, Autonomy
// ==========================================================

import React, { useState } from 'react';
import { CommandCenter } from '../CommandCenter.js';
import { WorkforceValuationDashboard } from '../workforce/index.js';
import { GraphMemoryConsole } from '../GraphMemoryConsole.js';
import { SystemHealth } from '../SystemHealth.js';
import { AgentRuntimeConsole } from '../AgentRuntimeConsole.js';
import { EngineeringConsole } from '../EngineeringConsole.js';

export interface OwnerControlPanelProps {
  apiUrl: string;
  token?: string | null;
  username: string;
  isOverviewMode: boolean;
  onToggleOverviewMode: () => void;
  onClose: () => void;
}

export type OwnerTab =
  | 'COMMAND_CENTER'
  | 'WORKFORCE'
  | 'AUTONOMY'
  | 'GRAPH_MEMORY'
  | 'SYSTEM_HEALTH'
  | 'AGENT_RUNTIME'
  | 'ENGINEERING';

export const OwnerControlPanel: React.FC<OwnerControlPanelProps> = ({
  apiUrl,
  token,
  username,
  isOverviewMode,
  onToggleOverviewMode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>('COMMAND_CENTER');

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in text-slate-100">
      {/* Top Owner Header Bar */}
      <header className="px-6 py-3.5 border-b border-amber-500/30 bg-slate-900/90 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                  KDI EXECUTIVE OWNER SUITE
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {username} (Owner)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block tracking-wider uppercase">
                Autonomous Workforce Governance • Financial Audit • GraphRAG
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('COMMAND_CENTER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'COMMAND_CENTER'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🏛️ Command Center
            </button>

            <button
              onClick={() => setActiveTab('WORKFORCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'WORKFORCE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚖️ Workforce & Valuation
            </button>

            <button
              onClick={() => setActiveTab('GRAPH_MEMORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'GRAPH_MEMORY'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🕸️ Graph Memory
            </button>

            <button
              onClick={() => setActiveTab('SYSTEM_HEALTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'SYSTEM_HEALTH'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛡️ Infrastructure
            </button>

            <button
              onClick={() => setActiveTab('AGENT_RUNTIME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'AGENT_RUNTIME'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Runtime
            </button>

            <button
              onClick={() => setActiveTab('ENGINEERING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ENGINEERING'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛠️ Engineering
            </button>
          </nav>
        </div>

        {/* Right Tools & Exit */}
        <div className="flex items-center gap-3">
          {/* Bird's-Eye Overview Toggle */}
          <button
            onClick={onToggleOverviewMode}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isOverviewMode
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <span>🔭</span>
            <span>{isOverviewMode ? 'Exit Bird\'s Eye' : 'Office Overview'}</span>
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>Tutup (Kembali ke 3D)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'COMMAND_CENTER' && (
          <CommandCenter apiUrl={apiUrl} />
        )}

        {activeTab === 'WORKFORCE' && (
          <WorkforceValuationDashboard apiUrl={apiUrl} />
        )}

        {activeTab === 'GRAPH_MEMORY' && (
          <GraphMemoryConsole apiUrl={apiUrl} token={token || undefined} />
        )}

        {activeTab === 'SYSTEM_HEALTH' && (
          <SystemHealth apiUrl={apiUrl} />
        )}

        {activeTab === 'AGENT_RUNTIME' && (
          <AgentRuntimeConsole apiUrl={apiUrl} />
        )}

        {activeTab === 'ENGINEERING' && (
          <EngineeringConsole apiUrl={apiUrl} />
        )}
      </main>
    </div>
  );
};
