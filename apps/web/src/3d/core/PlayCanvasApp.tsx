// ==========================================================
// 3d/core/PlayCanvasApp.tsx
// Root PlayCanvas Application Wrapper with React Overlay & Fallbacks
// ==========================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Application } from '@playcanvas/react';
import { RESOLUTION_AUTO, FILLMODE_NONE } from 'playcanvas';
import type { AgentState } from '@kdi/types';
import { OfficeScene } from '../scene/OfficeScene.js';
import { AgentOverlay } from '../interaction/AgentOverlay.js';
import { WebGLFallback } from './WebGLFallback.js';
import type { SelectedAgentDetail } from '../state/types.js';

export interface PlayCanvasAppProps {
  demoAgentState: AgentState;
  demoAgentActivity: string;
  onOpenAgentDetail?: (agent: SelectedAgentDetail) => void;
}

/**
 * Detect WebGL support in current browser context
 */
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGL2RenderingContext && canvas.getContext('webgl2')
    ) || Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const PlayCanvasApp: React.FC<PlayCanvasAppProps> = ({
  demoAgentState,
  demoAgentActivity,
  onOpenAgentDetail,
}) => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<SelectedAgentDetail | null>(null);

  useEffect(() => {
    const supported = checkWebGLSupport();
    setIsSupported(supported);
    if (!supported) {
      setInitError('WebGL 2.0 graphics acceleration is not supported by your current browser.');
    }
  }, []);

  const handleSelectAgent = useCallback((detail: SelectedAgentDetail) => {
    setSelectedAgent(detail);
  }, []);

  const handleCloseSelected = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  const handleRetryInit = useCallback(() => {
    const supported = checkWebGLSupport();
    setIsSupported(supported);
    setInitError(supported ? null : 'WebGL 2.0 acceleration remains unavailable.');
  }, []);

  const canvasStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      display: 'block',
      outline: 'none',
    }),
    []
  );

  // If WebGL is unavailable, display high-contrast 2D fallback
  if (!isSupported || initError) {
    return (
      <WebGLFallback
        demoAgentState={demoAgentState}
        demoAgentActivity={demoAgentActivity}
        errorMessage={initError || undefined}
        onRetry={handleRetryInit}
      />
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
      {/* 1. PlayCanvas WebGL Application Container */}
      <Application
        style={canvasStyle}
        fillMode={FILLMODE_NONE}
        resolutionMode={RESOLUTION_AUTO}
        usePhysics={false}
      >
        <OfficeScene
          demoAgentState={demoAgentState}
          demoAgentActivity={demoAgentActivity}
          onSelectAgent={handleSelectAgent}
        />
      </Application>

      {/* 2. React UI HUD Overlay */}
      <AgentOverlay
        selectedAgent={selectedAgent}
        onCloseSelected={handleCloseSelected}
        onOpenDetailModal={onOpenAgentDetail}
      />
    </div>
  );
};
