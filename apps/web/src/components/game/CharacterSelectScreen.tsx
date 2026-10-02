// ==========================================================
// components/game/CharacterSelectScreen.tsx
// Cozy Indie Game Character Selection Screen
// Flow: KDI AI OFFICE → CHOOSE YOUR CHARACTER → Preview → ENTER OFFICE
// ==========================================================

import React, { useState } from 'react';
import { PLAYABLE_CHARACTERS, type PlayableCharacter } from '../../3d/character/CharacterTypes.js';

interface CharacterSelectScreenProps {
  onSelect: (character: PlayableCharacter) => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({ onSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(PLAYABLE_CHARACTERS[0].character_id);
  const [customName, setCustomName] = useState<string>('');
  const [entering, setEntering] = useState(false);

  const selectedChar = PLAYABLE_CHARACTERS.find((c) => c.character_id === selectedId) || PLAYABLE_CHARACTERS[0];

  const handleEnter = () => {
    setEntering(true);
    const finalChar: PlayableCharacter = {
      ...selectedChar,
      name: customName.trim() || selectedChar.name,
    };
    setTimeout(() => {
      onSelect(finalChar);
    }, 750);
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-4 select-none overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, #1f2533 0%, #10131a 100%)',
      }}
    >
      {/* Ambient background warm glows */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '15%',
          left: '20%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '15%',
          right: '20%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Header Branding */}
      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 shadow-md mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-300 font-mono text-xs uppercase tracking-widest">
            Koneksi Digital Inovasi
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          PILIH KARAKTER VIRTUAL
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
          Masuki kantor virtual 3D KDI AI Office dan jelajahi ruang kerja tim digital.
        </p>
      </div>

      {/* Main Character Selection Stage */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
        {/* Character Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-3.5 w-full mb-8">
          {PLAYABLE_CHARACTERS.map((char) => {
            const isSelected = char.character_id === selectedId;
            const isHovered = char.character_id === hoveredId;

            return (
              <button
                key={char.character_id}
                onClick={() => {
                  setSelectedId(char.character_id);
                  if (!customName) setCustomName(char.name);
                }}
                onMouseEnter={() => setHoveredId(char.character_id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative p-5 rounded-3xl border text-center transition-all duration-300 flex flex-col items-center justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-slate-800/90 shadow-2xl scale-105 -translate-y-1'
                    : isHovered
                    ? 'border-slate-600 bg-slate-800/60 scale-102'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
                style={{
                  boxShadow: isSelected
                    ? `0 12px 30px -8px ${char.appearance.torsoColor}55, 0 0 20px ${char.appearance.torsoColor}33`
                    : '0 4px 16px rgba(0,0,0,0.3)',
                }}
              >
                {/* Chibi Character Preview */}
                <div className="w-20 h-28 relative flex items-center justify-center my-2">
                  {/* Shadow blob */}
                  <div className="absolute bottom-0 w-14 h-3 bg-black/40 rounded-full blur-[2px]" />

                  {/* Legs */}
                  <div
                    className="absolute bottom-3 w-3.5 h-6 rounded-full"
                    style={{ left: 22, backgroundColor: '#1e293b' }}
                  />
                  <div
                    className="absolute bottom-3 w-3.5 h-6 rounded-full"
                    style={{ right: 22, backgroundColor: '#1e293b' }}
                  />

                  {/* Body Torso */}
                  <div
                    className="absolute bottom-8 w-11 h-10 rounded-2xl shadow-md transition-transform"
                    style={{
                      backgroundColor: char.appearance.torsoColor,
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />

                  {/* Cute Big Chibi Head */}
                  <div
                    className="absolute top-2 w-12 h-12 rounded-full shadow-md flex items-center justify-center"
                    style={{ backgroundColor: char.appearance.headColor || '#f9d2be' }}
                  >
                    {/* Hair cap */}
                    <div
                      className="absolute -top-1.5 w-12 h-7 rounded-t-full"
                      style={{ backgroundColor: char.appearance.hairColor || '#362312' }}
                    />
                    {/* Cute eyes */}
                    <div className="relative z-10 flex gap-3 mt-2">
                      <div className="w-1.5 h-2 bg-slate-900 rounded-full" />
                      <div className="w-1.5 h-2 bg-slate-900 rounded-full" />
                    </div>
                    {/* Blush cheeks */}
                    <div className="absolute bottom-2 left-1.5 w-2.5 h-1.5 rounded-full bg-pink-300/60" />
                    <div className="absolute bottom-2 right-1.5 w-2.5 h-1.5 rounded-full bg-pink-300/60" />
                  </div>
                </div>

                {/* Character Name & Role */}
                <div className="mt-2 w-full">
                  <div className="text-white text-sm font-bold truncate">
                    {char.name}
                  </div>
                  <div
                    className="text-[10px] font-semibold tracking-wide uppercase mt-0.5 truncate"
                    style={{ color: char.appearance.accentColor || '#38bdf8' }}
                  >
                    {char.role}
                  </div>
                </div>

                {isSelected && (
                  <span className="absolute -top-2.5 bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                    DIPILIH
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Name Input & Confirmation */}
        <div
          className="w-full max-w-md p-5 rounded-3xl border border-slate-700/60 shadow-xl flex flex-col items-center space-y-4"
          style={{ background: 'rgba(21, 24, 33, 0.9)', backdropFilter: 'blur(16px)' }}
        >
          <div className="w-full">
            <label className="block text-slate-400 text-xs font-medium mb-1.5 text-center">
              Nama Karakter Kamu di Kantor:
            </label>
            <input
              type="text"
              value={customName || selectedChar.name}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Masukkan nama kamu…"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl py-2.5 px-4 text-center text-white font-bold text-sm outline-none transition"
              maxLength={24}
            />
          </div>

          <button
            onClick={handleEnter}
            disabled={entering}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all transform hover:scale-102 active:scale-98 flex items-center justify-center gap-2"
          >
            {entering ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Menyiapkan Kantor Virtual…</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>MASUK KANTOR KDI (3D)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
