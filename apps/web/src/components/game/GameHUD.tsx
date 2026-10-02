// ==========================================================
// components/game/GameHUD.tsx
// Minimal Game-Like HUD overlay (interaction prompts, controls hint, room label)
// ==========================================================

import React, { useEffect, useState } from 'react';
import type { OfficeAgentDetail } from '@kdi/types';
import type { PlayableCharacter } from '../../3d/character/CharacterTypes.js';

interface GameHUDProps {
  playerCharacter: PlayableCharacter;
  nearbyAgent: OfficeAgentDetail | null;
  nearbyObjectLabel: string | null;
  onInteract: () => void;
  roomLabel?: string;
  wsConnected?: boolean;
  /** Called to exit 3D mode back to dashboard */
  onExitGame?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerCharacter,
  nearbyAgent,
  nearbyObjectLabel,
  onInteract,
  roomLabel,
  wsConnected = false,
  onExitGame,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Auto-hide controls after 8 seconds
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setShowControls(false), 8000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const hasInteractable = nearbyAgent || nearbyObjectLabel;

  return (
    <div className="absolute inset-0 pointer-events-none select-none">

      {/* TOP BAR — room label + status */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4">
        {/* Left: Room label */}
        <div
          className="pointer-events-none"
          style={{
            background: 'rgba(2,6,23,0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: '6px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {roomLabel && (
            <span className="text-slate-300 text-xs font-semibold tracking-wide">
              📍 {roomLabel}
            </span>
          )}
        </div>

        {/* Right: WS status + exit button */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div
            style={{
              background: 'rgba(2,6,23,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: '5px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: wsConnected ? '#10b981' : '#ef4444',
                display: 'inline-block',
                animation: wsConnected ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span className="text-xs text-slate-400">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          {onExitGame && (
            <button
              onClick={onExitGame}
              className="pointer-events-auto text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition"
              style={{
                background: 'rgba(2,6,23,0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              ✕ Dashboard
            </button>
          )}
        </div>
      </div>

      {/* CENTER — Interaction Prompt */}
      {hasInteractable && (
        <div
          className="absolute"
          style={{
            bottom: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          {nearbyAgent && (
            <div
              style={{
                background: 'rgba(2,6,23,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(234,179,8,0.3)',
                borderRadius: 12,
                padding: '8px 18px',
                textAlign: 'center',
              }}
            >
              <div className="text-amber-400 text-xs font-semibold mb-1">
                {nearbyAgent.name}
              </div>
              <div className="text-slate-400 text-[10px]">
                {nearbyAgent.role.replace(/_/g, ' ')}
              </div>
            </div>
          )}
          {nearbyObjectLabel && !nearbyAgent && (
            <div
              style={{
                background: 'rgba(2,6,23,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(14,165,233,0.3)',
                borderRadius: 12,
                padding: '6px 16px',
                textAlign: 'center',
              }}
            >
              <div className="text-sky-400 text-xs font-semibold">{nearbyObjectLabel}</div>
            </div>
          )}

          <button
            onClick={onInteract}
            className="pointer-events-auto"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234,179,8,0.15)',
              backdropFilter: 'blur(8px)',
              border: '2px solid rgba(234,179,8,0.5)',
              borderRadius: 10,
              padding: '8px 20px',
              color: '#fbbf24',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              animation: 'breathe 2s ease-in-out infinite',
            }}
          >
            <span
              style={{
                background: 'rgba(234,179,8,0.3)',
                border: '1px solid rgba(234,179,8,0.5)',
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 800,
              }}
            >
              E
            </span>
            <span>
              {nearbyAgent ? 'Bicara' : 'Periksa'}
            </span>
          </button>
        </div>
      )}

      {/* BOTTOM — Character info + Controls hint */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-5 pb-4">
        {/* Left: Character card */}
        <div
          style={{
            background: 'rgba(2,6,23,0.75)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${playerCharacter.appearance.torsoColor}44`,
            borderRadius: 14,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 160,
          }}
        >
          {/* Mini avatar */}
          <div style={{ position: 'relative', width: 32, height: 40 }}>
            <div
              style={{
                position: 'absolute',
                left: 7,
                top: 14,
                width: 18,
                height: 22,
                borderRadius: 5,
                background: playerCharacter.appearance.torsoColor,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 9,
                top: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: playerCharacter.appearance.headColor,
              }}
            />
          </div>
          <div>
            <div className="text-white text-xs font-bold">{playerCharacter.name}</div>
            <div
              className="text-[10px] font-mono"
              style={{ color: playerCharacter.appearance.accentColor }}
            >
              {playerCharacter.role}
            </div>
          </div>
        </div>

        {/* Right: Controls hint */}
        {showControls && (
          <div
            className="pointer-events-auto"
            style={{
              background: 'rgba(2,6,23,0.75)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '10px 16px',
            }}
          >
            <div className="flex items-center gap-4 text-slate-400 text-xs mb-2">
              <span>⌨️ <b className="text-slate-300">WASD</b> — Gerak</span>
              <span>🖱️ <b className="text-slate-300">Drag</b> — Kamera</span>
              <span>⚡ <b className="text-slate-300">E</b> — Interaksi</span>
              <span>⇧ <b className="text-slate-300">Shift</b> — Lari</span>
            </div>
            <button
              onClick={() => { setShowControls(false); setDismissed(true); }}
              className="text-slate-600 hover:text-slate-400 text-[10px] transition w-full text-right"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); }
          50% { box-shadow: 0 0 16px 4px rgba(234,179,8,0.25); }
        }
      `}</style>
    </div>
  );
};
