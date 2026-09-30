// ==========================================================
// components/office/OfficeHUD.tsx
// Master 3D Office HUD Toolbar: Camera Presets, Demos, Modes & Status
// ==========================================================

import React, { useState } from 'react';
import type { CameraPresetId } from '../../3d/camera/OfficeCamera.js';
import type { OfficeWorldState } from '../../3d/state/OfficeWorldStore.js';
import {
  Camera,
  Play,
  RotateCcw,
  Shield,
  Layers,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
  Box,
} from 'lucide-react';

export interface OfficeHUDProps {
  worldState: OfficeWorldState;
  activeCamera: CameraPresetId;
  onSelectCamera: (preset: CameraPresetId) => void;
  onToggleInternalMode: (enabled: boolean) => void;
  onToggle2DMode: (enabled: boolean) => void;
  onTriggerDemo: (scenario: string) => void;
  onOpenReplay: () => void;
}

export const OfficeHUD: React.FC<OfficeHUDProps> = ({
  worldState,
  activeCamera,
  onSelectCamera,
  onToggleInternalMode,
  onToggle2DMode,
  onTriggerDemo,
  onOpenReplay,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  const cameras: { id: CameraPresetId; label: string }[] = [
    { id: 'RECEPTION', label: 'Reception Lobby' },
    { id: 'ENGINEERING', label: 'Engineering Floor' },
    { id: 'MEETING', label: 'Meeting Room' },
    { id: 'MUSHOLLA', label: 'Musholla Sanctuary' },
    { id: 'SERVER', label: 'Server Room' },
    { id: 'PORTFOLIO', label: 'Portfolio Gallery' },
    { id: 'MANAGEMENT', label: 'Management Suite' },
    { id: 'ARCHITECTURE', label: 'Architecture Lab' },
    { id: 'FREE', label: 'Birdseye Overhead' },
  ];

  const demos = [
    { id: 'bugfix', label: 'Demo 1: Human Assigns Bug Fix' },
    { id: 'meeting', label: 'Demo 2: Collaborative Meeting & Whiteboard' },
    { id: 'prayer', label: 'Demo 3: Scheduled Prayer (Context Preserved)' },
    { id: 'server-failure', label: 'Demo 4: Server Health Alert & Degradation' },
    { id: 'agent-error', label: 'Demo 5: Agent AST Execution Error' },
  ];

  const isConnected = worldState.connectionState === 'CONNECTED';

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between pointer-events-none gap-2">
      {/* Left: Camera Room Preset Switcher */}
      <div className="flex items-center space-x-2 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setShowCameraMenu(!showCameraMenu)}
            className="glass-panel px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center space-x-1.5 shadow-lg transition"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Camera: {cameras.find((c) => c.id === activeCamera)?.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showCameraMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 space-y-0.5 z-30">
              {cameras.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCamera(c.id);
                    setShowCameraMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition ${
                    activeCamera === c.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2D / 3D Mode Toggle */}
        <button
          onClick={() => onToggle2DMode(!worldState.is2DMode)}
          className={`glass-panel px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 shadow-lg transition pointer-events-auto ${
            worldState.is2DMode
              ? 'border-amber-500 bg-amber-500/20 text-amber-300'
              : 'border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span>{worldState.is2DMode ? 'Switch to 3D' : '2D Mode'}</span>
        </button>
      </div>

      {/* Right Controls: Demos, Replay, Privacy Toggle, Telemetry Badge */}
      <div className="flex items-center space-x-2 pointer-events-auto">
        {/* Demo Scenarios Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            className="glass-panel px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-heading font-bold flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Demo Scenarios</span>
            <ChevronDown className="w-3 h-3 text-slate-900" />
          </button>

          {showDemoMenu && (
            <div className="absolute top-full right-0 mt-1.5 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 space-y-1 z-30">
              <span className="text-[10px] text-slate-400 px-2 py-1 block uppercase font-mono tracking-wider">
                Phase 6 Canonical Scenarios:
              </span>
              {demos.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onTriggerDemo(d.id);
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 transition leading-snug"
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event Replay */}
        <button
          onClick={onOpenReplay}
          className="glass-panel px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center space-x-1.5 shadow-lg transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Event Replay</span>
        </button>

        {/* Public / Internal Mode Switcher */}
        <button
          onClick={() => onToggleInternalMode(!worldState.isInternalMode)}
          className={`glass-panel px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 shadow-lg transition ${
            worldState.isInternalMode
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700 bg-slate-900/90 text-slate-400'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{worldState.isInternalMode ? 'Internal Mode' : 'Public Mode'}</span>
        </button>

        {/* Realtime Telemetry Indicator */}
        <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-medium flex items-center space-x-1.5 shadow-lg">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400">Live WS</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span className="text-rose-400">{worldState.connectionState}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
