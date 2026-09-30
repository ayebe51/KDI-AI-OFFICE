// ==========================================================
// components/office/ServerRoomModal.tsx
// Infrastructure Health & Server Nodes Inspector Modal
// ==========================================================

import React from 'react';
import type { ServerNode } from '@kdi/types';
import { Server, Activity, Shield, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface ServerRoomModalProps {
  serverNodes: ServerNode[];
  selectedNode?: ServerNode | null;
  onClose: () => void;
}

export const ServerRoomModal: React.FC<ServerRoomModalProps> = ({
  serverNodes,
  selectedNode,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl glass-panel rounded-2xl p-6 border border-blue-500/40 bg-slate-900 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-100">
                Server Room • Infrastructure Status
              </h3>
              <p className="text-xs text-blue-400 font-mono">
                10 Active Server Racks • Realtime Telemetry from Office Computer
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

        {/* Server Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[440px] overflow-y-auto pr-1">
          {serverNodes.map((node) => {
            const isSelected = selectedNode?.serviceId === node.serviceId;
            const isOnline = node.status === 'ONLINE';
            const isDegraded = node.status === 'DEGRADED';

            return (
              <div
                key={node.serviceId}
                className={`p-3.5 rounded-xl border transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-xs text-slate-200">{node.name}</span>
                  {isOnline ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isDegraded ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Subsystem:</span>
                    <span className="text-slate-300 font-mono text-[10px]">{node.subsystem}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Latency:</span>
                    <span className="text-emerald-400 font-mono font-bold">{node.latency} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Load:</span>
                    <span className="text-slate-300 font-mono">{node.load}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Zero-Trust: Database credentials & private tunnels are isolated.</span>
          </span>
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
