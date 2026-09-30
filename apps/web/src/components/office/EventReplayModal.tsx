// ==========================================================
// components/office/EventReplayModal.tsx
// Interactive Deterministic Event Replay Console
// ==========================================================

import React, { useState } from 'react';
import type { AgentOfficeEvent } from '@kdi/types';
import { OfficeWorldStore } from '../../3d/state/OfficeWorldStore.js';
import { Play, RotateCcw, FastForward, CheckCircle, X } from 'lucide-react';

export interface EventReplayModalProps {
  apiUrl: string;
  onClose: () => void;
}

export const EventReplayModal: React.FC<EventReplayModalProps> = ({ apiUrl, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [log, setLog] = useState<string[]>([]);

  const handleStartReplay = async () => {
    setIsPlaying(true);
    setLog((prev) => ['Fetching deterministic replay event stream from backend...', ...prev]);

    try {
      const res = await fetch(`${apiUrl}/office/events/replay`);
      const json = await res.json();
      const events: AgentOfficeEvent[] = json.data || [];

      setLog((prev) => [
        `Loaded ${events.length} recorded events with strict sequence versioning. Starting playback at ${speed}x...`,
        ...prev,
      ]);

      const store = OfficeWorldStore.getInstance();
      await store.replayEvents(events, speed, (current, total) => {
        setProgress({ current, total });
        const curEvent = events[current - 1];
        if (curEvent) {
          setLog((prev) => [
            `[${curEvent.eventId}] ${curEvent.agentId} -> ${curEvent.activityState} (${curEvent.currentLocation}) v${curEvent.entityVersion}`,
            ...prev.slice(0, 15),
          ]);
        }
      });

      setLog((prev) => ['✓ Event replay completed successfully.', ...prev]);
    } catch (err: any) {
      setLog((prev) => [`Replay error: ${err.message}`, ...prev]);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl glass-panel rounded-2xl p-6 border border-cyan-500/40 bg-slate-900 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-100">
                Office Event Replay Console
              </h3>
              <p className="text-xs text-cyan-400 font-mono">
                Deterministic Visual Reproduction of Recorded System Events
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

        {/* Controls */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleStartReplay}
              disabled={isPlaying}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center space-x-2 transition ${
                isPlaying
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPlaying ? 'Replaying...' : 'Start Replay'}</span>
            </button>

            <button
              onClick={() => setSpeed(speed === 1.0 ? 2.0 : 1.0)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-mono flex items-center space-x-1"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>{speed}x Speed</span>
            </button>
          </div>

          {progress.total > 0 && (
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              Step {progress.current} / {progress.total}
            </span>
          )}
        </div>

        {/* Replay Log */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 h-44 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-300">
          {log.length === 0 ? (
            <span className="text-slate-500">Ready to replay deterministic event log.</span>
          ) : (
            log.map((line, idx) => (
              <div key={idx} className="leading-relaxed">
                {line}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
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
