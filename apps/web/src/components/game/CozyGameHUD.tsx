// ==========================================================
// components/game/CozyGameHUD.tsx
// Ultra-Clean Minimal Game HUD for Cozy Isometric 3D Office
// Shows:
// 1. Top-left location & clock pill (e.g. "📍 Lobby | 09:42 WIB")
// 2. Floor quick-switcher ("L1", "L2", "Rooftop")
// 3. Live telemetry indicator ("🟢 Live")
// 4. Center contextual prompt ("[E] ...") with soft breathing glow
// 5. Mini player avatar card
// 6. Discreet dismissible controls helper
// 7. Small non-intrusive "[👑 OWNER]" button (if authorized)
// ==========================================================

import React, { useState, useEffect } from 'react';
import type { PlayableCharacter } from '../../3d/character/CharacterTypes.js';
import type { FloorId } from '../../3d/world/WorldDefinitions.js';
import { FLOOR_METAS } from '../../3d/world/WorldDefinitions.js';

export interface CozyGameHUDProps {
  playerCharacter: PlayableCharacter;
  currentFloor: FloorId | 'YARD';
  locationLabel: string;
  nearbyPrompt: string | null;
  onInteract: () => void;
  onOpenElevator: () => void;
  onSwitchFloor: (floor: any) => void;
  wsConnected: boolean;
  isOwner: boolean;
  onOpenOwnerPanel: () => void;
  onLoginOwner?: () => void;
  onChangeCharacter: () => void;
  isOverviewMode: boolean;
  onToggleOverviewMode: () => void;
}

export const CozyGameHUD: React.FC<CozyGameHUDProps> = ({
  playerCharacter,
  currentFloor,
  locationLabel,
  nearbyPrompt,
  onInteract,
  onOpenElevator,
  onSwitchFloor,
  wsConnected,
  isOwner,
  onOpenOwnerPanel,
  onLoginOwner,
  onChangeCharacter,
  isOverviewMode,
  onToggleOverviewMode,
}) => {
  // Live clock state
  const [timeString, setTimeString] = useState('');
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeString(`${hours}:${minutes} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide controls tutorial after 10 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowTutorial(false), 10_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* ────────────────────────────────────────────────────────── */}
      {/* TOP BAR: Minimal Location Pill + Floor Nav + Owner Button  */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="absolute top-[68px] left-4 right-4 flex items-center justify-between z-30">
        {/* Top-Left: Minimal Location & Time Pill */}
        <div
          className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border border-slate-700/60 shadow-lg"
          style={{
            background: 'rgba(21, 24, 33, 0.85)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
              {locationLabel}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400 font-mono text-xs">
            {timeString}
          </span>
        </div>

        {/* Top-Right: Floor Switcher, Live Telemetry & Owner Button */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Floor Quick Navigation Pill */}
          <div
            className="flex items-center p-1 rounded-2xl border border-slate-700/60 shadow-lg"
            style={{
              background: 'rgba(21, 24, 33, 0.85)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {[
              { id: 'YARD', label: 'Yard', name: 'Halaman Depan & Kopi Corner' },
              { id: 'GROUND', label: 'L1', name: 'Lantai 1 • Lobby & Engineering' },
              { id: 'FLOOR_2', label: 'L2', name: 'Lantai 2 • Creative Studio' },
              { id: 'ROOFTOP', label: 'Rooftop', name: 'Rooftop Lounge & Garden' },
            ].map((f) => {
              const isActive = f.id === currentFloor;
              return (
                <button
                  key={f.id}
                  onClick={() => onSwitchFloor(f.id)}
                  title={f.name}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Elevator button */}
          <button
            onClick={onOpenElevator}
            title="Buka Menu Lift"
            className="px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
            style={{
              background: 'rgba(21, 24, 33, 0.85)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span>🛗</span>
            <span className="hidden sm:inline">Lift</span>
          </button>

          {/* Live Telemetry Dot */}
          <div
            className="px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg flex items-center gap-2 text-xs"
            style={{
              background: 'rgba(21, 24, 33, 0.85)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-300 hidden md:inline text-[11px]">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Owner Mode Button / Guest Login Button */}
          {isOwner ? (
            <button
              onClick={onOpenOwnerPanel}
              className="px-3.5 py-1.5 rounded-2xl border border-amber-500/50 shadow-lg text-xs font-bold text-amber-300 hover:text-slate-950 bg-amber-500/20 hover:bg-amber-400 transition flex items-center gap-1.5"
            >
              <span>👑</span>
              <span>OWNER</span>
            </button>
          ) : (
            onLoginOwner && (
              <button
                onClick={onLoginOwner}
                className="px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg text-xs font-semibold text-slate-300 hover:text-amber-300 transition flex items-center gap-1.5"
                style={{
                  background: 'rgba(21, 24, 33, 0.85)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <span>🔐</span>
                <span className="hidden sm:inline">Login Owner</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* CENTER: Contextual Interaction Prompt [E]                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {nearbyPrompt && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-28 sm:bottom-32 pointer-events-auto animate-in fade-in"
          style={{ animation: 'breathePrompt 2s ease-in-out infinite' }}
        >
          <button
            onClick={onInteract}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border-2 border-amber-400/80 shadow-2xl transition hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(15, 17, 23, 0.92)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
            }}
          >
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs font-mono flex items-center justify-center shadow-md">
              E
            </span>
            <span className="text-white text-xs sm:text-sm font-bold tracking-wide">
              {nearbyPrompt}
            </span>
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* BOTTOM BAR: Mini Player Card + Tutorial + Quick Controls   */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        {/* Bottom-Left: Mini Player Card */}
        <div
          className="pointer-events-auto flex items-center gap-3 p-2.5 pr-4 rounded-2xl border border-slate-700/60 shadow-lg"
          style={{
            background: 'rgba(21, 24, 33, 0.85)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* CSS Chibi Mini Avatar */}
          <div style={{ position: 'relative', width: 34, height: 42, flexShrink: 0 }}>
            {/* Torso */}
            <div style={{
              position: 'absolute', left: 7, top: 16, width: 20, height: 22,
              borderRadius: 5, background: playerCharacter.appearance.torsoColor,
            }} />
            {/* Head */}
            <div style={{
              position: 'absolute', left: 9, top: 2, width: 16, height: 16,
              borderRadius: '50%', background: playerCharacter.appearance.headColor || '#f9d2be',
            }} />
          </div>

          <div>
            <div className="text-white text-xs sm:text-sm font-bold leading-tight">
              {playerCharacter.name}
            </div>
            <div className="text-[10px] text-amber-400 font-mono">
              {playerCharacter.role}
            </div>
          </div>

          <button
            onClick={onChangeCharacter}
            title="Ganti Karakter"
            className="ml-2 text-slate-400 hover:text-white text-xs p-1 hover:bg-slate-800 rounded-lg transition"
          >
            🎮
          </button>
        </div>

        {/* Bottom-Right: Short Tutorial Helper (Dismissible) */}
        {showTutorial && (
          <div
            className="pointer-events-auto hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl border border-slate-700/60 text-xs shadow-lg text-slate-300"
            style={{
              background: 'rgba(21, 24, 33, 0.85)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span>⌨️ <b className="text-white font-semibold">WASD</b> Gerak</span>
            <span>🖱️ <b className="text-white font-semibold">Drag / Wheel</b> Kamera</span>
            <span>⚡ <b className="text-amber-400 font-semibold">E</b> Interaksi</span>
            <button
              onClick={() => setShowTutorial(false)}
              className="text-slate-500 hover:text-slate-300 ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes breathePrompt {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, -4px) scale(1.03); }
        }
      `}</style>
    </div>
  );
};
