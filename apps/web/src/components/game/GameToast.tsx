// ==========================================================
// components/game/GameToast.tsx
// Lightweight in-game toast notification (auto-dismiss)
// ==========================================================

import React, { useEffect } from 'react';

interface GameToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  onDismiss: () => void;
  duration?: number;
}

export const GameToast: React.FC<GameToastProps> = ({
  message,
  type = 'info',
  onDismiss,
  duration = 2500,
}) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  const colors = {
    info:    { border: 'rgba(56,189,248,0.4)',   text: '#7dd3fc' },
    success: { border: 'rgba(16,185,129,0.4)',   text: '#6ee7b7' },
    error:   { border: 'rgba(244,63,94,0.4)',    text: '#fda4af' },
  }[type];

  return (
    <div
      className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-xs font-semibold z-30 animate-in slide-in-from-bottom-4 fade-in"
      style={{
        background: 'rgba(15, 18, 26, 0.92)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${colors.border}`,
        color: colors.text,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  );
};
