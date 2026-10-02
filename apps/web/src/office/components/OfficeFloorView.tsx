// ==========================================================
// KDI AI OFFICE — EXACT FRONTEND TRANSPLANT (KDI STUDIO)
// OfficeFloorView: Mounts the authentic 4-floor 3D office
// ==========================================================

import React, { useState } from 'react';
import { Maximize2, ExternalLink } from 'lucide-react';

interface OfficeFloorViewProps {
  apiUrl?: string;
  wsUrl?: string;
}

export const OfficeFloorView: React.FC<OfficeFloorViewProps> = ({
  apiUrl = 'http://localhost:3000',
  wsUrl = 'ws://localhost:3000/ws/v1/events',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`w-full h-full relative overflow-hidden bg-[#ebe5d8] ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Floating utility pills to open standalone or toggle expand */}
      <div className="absolute top-3 right-3 z-30 flex items-center space-x-2 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-300 shadow-sm text-xs font-mono text-stone-700">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-stone-800">KDI Studio</span>
        </span>
        <span className="text-stone-300">|</span>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          className="hover:text-stone-900 flex items-center space-x-1 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{isFullscreen ? "Shrink" : "Expand"}</span>
        </button>
        <span className="text-stone-300">|</span>
        <a
          href="/office"
          target="_blank"
          rel="noreferrer"
          title="Open Standalone Office at /office"
          className="hover:text-stone-900 flex items-center space-x-1 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>/office</span>
        </a>
      </div>

      {/* Transplanted KDI Studio 3D Frontend */}
      <iframe
        id="kdi-studio-frame"
        src="/office/"
        title="KDI Studio"
        className="w-full h-full border-0 block"
        allow="autoplay; fullscreen"
      />
    </div>
  );
};
