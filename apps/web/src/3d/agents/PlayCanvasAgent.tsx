// ==========================================================
// 3d/agents/PlayCanvasAgent.tsx
// PlayCanvas 3D Agent Entity (ENGINEER-001)
// Responsive to backend state, procedural mesh & animations
// ==========================================================

import React, { useRef, useMemo, useCallback } from 'react';
import type { Entity as PcEntity } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial, useAppEvent } from '@playcanvas/react/hooks';
import type { AgentState } from '@kdi/types';
import { Agent3DStateAdapter } from '../adapters/Agent3DStateAdapter.js';
import type { SelectedAgentDetail } from '../state/types.js';

export interface PlayCanvasAgentProps {
  agentId?: string;
  name?: string;
  role?: string;
  department?: string;
  state: AgentState;
  activitySummary?: string;
  position?: [number, number, number];
  onSelect?: (detail: SelectedAgentDetail) => void;
}

export const PlayCanvasAgent: React.FC<PlayCanvasAgentProps> = ({
  agentId = 'AGT-ENG-001',
  name = 'Farhan (AI Engineer)',
  role = 'SOFTWARE_ENGINEER',
  department = 'Engineering Floor • RM-05',
  state,
  activitySummary,
  position = [0, 0, 0.35],
  onSelect,
}) => {
  const avatarGroupRef = useRef<PcEntity>(null);
  const timeRef = useRef<number>(0);

  // Derive visual configuration from state adapter
  const visualConfig = useMemo(() => Agent3DStateAdapter.toVisualConfig(state), [state]);
  const isWorking = visualConfig.visualState === 'WORKING';

  // Real-time animation loop using PlayCanvas update event
  useAppEvent('update', (dt: number) => {
    timeRef.current += dt;
    if (avatarGroupRef.current) {
      const t = timeRef.current;
      // Procedural animation:
      // WORKING: energetic cadence (typing/focus)
      // IDLE: relaxed breathing rhythm
      const bobbingSpeed = isWorking ? 4.5 : 1.5;
      const bobbingAmplitude = isWorking ? 0.02 : 0.008;
      const offsetY = Math.sin(t * bobbingSpeed) * bobbingAmplitude;

      avatarGroupRef.current.setLocalPosition(
        position[0],
        position[1] + offsetY,
        position[2]
      );
    }
  });

  // Torso material reflecting state color
  const torsoMat = useMaterial({
    diffuse: visualConfig.color,
    gloss: 0.6,
    metalness: 0.15,
  });

  // Stylized head material
  const headMat = useMaterial({
    diffuse: '#fcd34d',
    gloss: 0.5,
  });

  // Glowing programmer visor / glasses reflecting state emissive glow
  const visorMat = useMaterial({
    diffuse: visualConfig.emissiveColor,
    emissive: visualConfig.emissiveColor,
    emissiveIntensity: visualConfig.emissiveIntensity,
    gloss: 0.9,
  });

  // Holographic status ring above head
  const statusRingMat = useMaterial({
    diffuse: visualConfig.color,
    emissive: visualConfig.color,
    emissiveIntensity: 0.8,
    gloss: 0.8,
  });

  // Click & pointer interaction handler
  const handleInteraction = useCallback(() => {
    onSelect?.({
      agentId,
      name,
      role,
      department,
      state,
      visualState: visualConfig.visualState,
      currentTask: activitySummary || visualConfig.activityDescription,
      activitySummary: activitySummary || visualConfig.activityDescription,
      isPublicSafe: true, // Only public safe attributes exposed
    });
  }, [agentId, name, role, department, state, visualConfig, activitySummary, onSelect]);

  return (
    <Entity
      ref={avatarGroupRef}
      name={`Agent-${agentId}`}
      position={position}
      onClick={handleInteraction}
      onPointerDown={handleInteraction}
    >
      {/* 1. Torso */}
      <Entity name="AgentTorso" position={[0, 0.85, 0]} scale={[0.36, 0.6, 0.28]}>
        <Render type="capsule" material={torsoMat} castShadows={true} />
      </Entity>

      {/* 2. Head */}
      <Entity name="AgentHead" position={[0, 1.25, 0]} scale={[0.26, 0.26, 0.26]}>
        <Render type="sphere" material={headMat} castShadows={true} />
      </Entity>

      {/* 3. Glowing Visor / Programmer Glasses */}
      <Entity name="AgentVisor" position={[0, 1.26, 0.12]} scale={[0.2, 0.05, 0.08]}>
        <Render type="box" material={visorMat} />
      </Entity>

      {/* 4. Overhead Holographic Status Halo Ring */}
      <Entity name="AgentStatusHalo" position={[0, 1.5, 0]} scale={[0.3, 0.03, 0.3]}>
        <Render type="cylinder" material={statusRingMat} />
      </Entity>
    </Entity>
  );
};
