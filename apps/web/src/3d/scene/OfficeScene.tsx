// ==========================================================
// 3d/scene/OfficeScene.tsx
// PlayCanvas Office Scene Composition
// ==========================================================

import React, { useMemo } from 'react';
import type { AgentState } from '@kdi/types';
import { OfficeCamera } from '../camera/OfficeCamera.js';
import { OfficeLighting } from './OfficeLighting.js';
import { OfficeFloor } from '../entities/OfficeFloor.js';
import { OfficeDesk } from '../entities/OfficeDesk.js';
import { PlayCanvasAgent } from '../agents/PlayCanvasAgent.js';
import { Agent3DStateAdapter } from '../adapters/Agent3DStateAdapter.js';
import type { SelectedAgentDetail } from '../state/types.js';

export interface OfficeSceneProps {
  demoAgentState: AgentState;
  demoAgentActivity: string;
  onSelectAgent?: (detail: SelectedAgentDetail) => void;
}

export const OfficeScene: React.FC<OfficeSceneProps> = ({
  demoAgentState,
  demoAgentActivity,
  onSelectAgent,
}) => {
  // Derive visual config from state adapter
  const visualConfig = useMemo(
    () => Agent3DStateAdapter.toVisualConfig(demoAgentState),
    [demoAgentState]
  );
  const isWorking = visualConfig.visualState === 'WORKING';

  return (
    <>
      {/* 1. Camera with Orbit Controls */}
      <OfficeCamera
        initialPosition={[3.5, 3.2, 4.5]}
        targetPosition={[0, 0.8, 0]}
        fov={45}
      />

      {/* 2. Office Illumination Rig */}
      <OfficeLighting />

      {/* 3. Architectural Floor, Rug & Walls */}
      <OfficeFloor />

      {/* 4. Engineering Workstation Desk */}
      <OfficeDesk
        position={[0, 0, 0]}
        isWorking={isWorking}
        screenEmissiveColor={visualConfig.emissiveColor}
        screenEmissiveIntensity={visualConfig.emissiveIntensity}
      />

      {/* 5. Live Interactive Agent Avatar (ENGINEER-001) */}
      <PlayCanvasAgent
        agentId="AGT-ENG-001"
        name="Farhan (AI Engineer)"
        role="SOFTWARE_ENGINEER"
        department="Engineering Floor • RM-05"
        state={demoAgentState}
        activitySummary={demoAgentActivity}
        position={[0, 0, 0.35]}
        onSelect={onSelectAgent}
      />
    </>
  );
};
