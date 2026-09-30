// ==========================================================
// components/office/Office2DFallback.tsx
// High-Contrast 2D Office Mode & Accessibility Fallback
// ==========================================================

import React from 'react';
import type { OfficeWorldState } from '../../3d/state/OfficeWorldStore.js';
import type { OfficeAgentDetail, ServerNode, OfficeRoom } from '@kdi/types';
import { Box, Users, Server, MapPin, Compass, Presentation, Eye } from 'lucide-react';

export interface Office2DFallbackProps {
  worldState: OfficeWorldState;
  onSelectAgent?: (agent: OfficeAgentDetail) => void;
  onSelectServer?: (server: ServerNode) => void;
  onSelectRoom?: (room: OfficeRoom) => void;
}

export const Office2DFallback: React.FC<Office2DFallbackProps> = ({
  worldState,
  onSelectAgent,
  onSelectServer,
  onSelectRoom,
}) => {
  const agents = Array.from(worldState.agents.values());
  const rooms = Array.from(worldState.rooms.values());

  return (
    <div className="w-full h-full bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-heading font-bold text-slate-100 flex items-center space-x-2">
            <Box className="w-5 h-5 text-amber-500" />
            <span>2D Office Mode • Accessibility & High-Contrast View</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative real-time reflection of digital workforce, room occupancy, and server nodes.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold">
          2D Mode Active
        </div>
      </div>

      {/* Agents Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Digital Workforce ({agents.length} Active Agents)</span>
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="py-2.5 px-4">Agent Name</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Activity State</th>
                <th className="py-2.5 px-4">Current Task / Activity</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {agents.map((agent) => (
                <tr key={agent.agentId} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 font-semibold text-slate-100">{agent.name}</td>
                  <td className="py-2.5 px-4 font-mono text-amber-400 text-[11px]">{agent.role}</td>
                  <td className="py-2.5 px-4 text-slate-300 font-mono text-[11px]">{agent.currentLocation}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {agent.activityState}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">{agent.currentActivity}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => onSelectAgent?.(agent)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rooms Floorplan Matrix */}
      <div className="space-y-3">
        <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span>Canonical Office Rooms ({rooms.length} Modular Zones)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rooms.map((room) => (
            <div
              key={room.roomId}
              onClick={() => onSelectRoom?.(room)}
              className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 cursor-pointer transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200">{room.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{room.roomId}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">{room.description}</p>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span>Cap: {room.capacity}</span>
                <span className="text-emerald-400 font-mono">{room.visibility}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure Server Nodes */}
      <div className="space-y-3">
        <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span>Server Room Infrastructure ({worldState.serverNodes.length} Active Nodes)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {worldState.serverNodes.map((node) => (
            <div
              key={node.serviceId}
              onClick={() => onSelectServer?.(node)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 cursor-pointer transition space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-slate-200 truncate">{node.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{node.latency}ms</span>
                <span>{node.load}% load</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
