// ==========================================================
// 3d/core/WebGLFallback.tsx
// Graceful 2D Fallback view when WebGL is unsupported or disabled
// ==========================================================

import React from 'react';
import { AlertTriangle, User, Activity, Cpu } from 'lucide-react';
import type { AgentState } from '@kdi/types';
import { Agent3DStateAdapter } from '../adapters/Agent3DStateAdapter.js';

export interface WebGLFallbackProps {
  demoAgentState: AgentState;
  demoAgentActivity: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export const WebGLFallback: React.FC<WebGLFallbackProps> = ({
  demoAgentState,
  demoAgentActivity,
  errorMessage = 'WebGL 2.0 hardware acceleration is not supported or was disabled in your browser environment.',
  onRetry,
}) => {
  const visualConfig = Agent3DStateAdapter.toVisualConfig(demoAgentState);

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-slate-100">
      <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-5 shadow-2xl">
        {/* Notice Header */}
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-slate-100">
              3D Digital Twin Fallback
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>

        {/* 2D Digital Twin Agent Representation */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-heading font-bold text-slate-200">
                  Farhan (AI Engineer)
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  AGT-ENG-001 • RM-05
                </span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                visualConfig.visualState === 'WORKING'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {demoAgentState}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] mb-1">
              <Activity className="w-3 h-3 text-amber-400" />
              <span className="font-medium">Active Activity:</span>
            </div>
            <p className="text-xs text-slate-300">
              {demoAgentActivity || visualConfig.activityDescription}
            </p>
          </div>
        </div>

        {/* Retry / Action button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center justify-center space-x-2"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Re-attempt WebGL 3D Initialization</span>
          </button>
        )}
      </div>
    </div>
  );
};
