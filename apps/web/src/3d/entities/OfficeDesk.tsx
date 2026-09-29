// ==========================================================
// 3d/entities/OfficeDesk.tsx
// Workstation Desk, Equipment, Monitors with Screen Glow & Chair
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface OfficeDeskProps {
  position?: [number, number, number];
  isWorking?: boolean;
  screenEmissiveColor?: string;
  screenEmissiveIntensity?: number;
}

export const OfficeDesk: React.FC<OfficeDeskProps> = ({
  position = [0, 0, 0],
  isWorking = false,
  screenEmissiveColor = '#0284c7',
  screenEmissiveIntensity = 0.5,
}) => {
  // Desk surface material
  const deskWoodMat = useMaterial({
    diffuse: '#1e293b',
    gloss: 0.65,
    metalness: 0.2,
  });

  // Desk metal legs material
  const legMetalMat = useMaterial({
    diffuse: '#475569',
    metalness: 0.85,
    gloss: 0.8,
  });

  // Monitor frame material
  const monitorFrameMat = useMaterial({
    diffuse: '#0f172a',
    gloss: 0.5,
  });

  // Dynamic monitor screen emissive glow reflecting agent state
  const monitorScreenMat = useMaterial({
    diffuse: isWorking ? '#10b981' : '#38bdf8',
    emissive: screenEmissiveColor,
    emissiveIntensity: screenEmissiveIntensity,
    gloss: 0.8,
  });

  // Chair material
  const chairMat = useMaterial({
    diffuse: '#0f172a',
    gloss: 0.3,
  });

  return (
    <Entity name="OfficeDeskUnit" position={position}>
      {/* 1. Desk Surface */}
      <Entity name="DeskSurface" position={[0, 0.75, 0]} scale={[1.8, 0.08, 0.9]}>
        <Render type="box" material={deskWoodMat} castShadows={true} receiveShadows={true} />
      </Entity>

      {/* 2. Desk Metal Legs */}
      <Entity name="LegFrontLeft" position={[-0.8, 0.375, -0.35]} scale={[0.06, 0.75, 0.06]}>
        <Render type="cylinder" material={legMetalMat} castShadows={true} />
      </Entity>
      <Entity name="LegFrontRight" position={[0.8, 0.375, -0.35]} scale={[0.06, 0.75, 0.06]}>
        <Render type="cylinder" material={legMetalMat} castShadows={true} />
      </Entity>
      <Entity name="LegBackLeft" position={[-0.8, 0.375, 0.35]} scale={[0.06, 0.75, 0.06]}>
        <Render type="cylinder" material={legMetalMat} castShadows={true} />
      </Entity>
      <Entity name="LegBackRight" position={[0.8, 0.375, 0.35]} scale={[0.06, 0.75, 0.06]}>
        <Render type="cylinder" material={legMetalMat} castShadows={true} />
      </Entity>

      {/* 3. Primary Monitor */}
      <Entity name="PrimaryMonitorGroup" position={[0, 1.15, -0.2]}>
        {/* Bezel frame */}
        <Entity name="MonitorFrame" scale={[0.72, 0.46, 0.03]}>
          <Render type="box" material={monitorFrameMat} castShadows={true} />
        </Entity>
        {/* Screen Display Panel */}
        <Entity name="MonitorDisplay" position={[0, 0, 0.016]} scale={[0.68, 0.42, 0.005]}>
          <Render type="box" material={monitorScreenMat} />
        </Entity>
        {/* Monitor Stand Stem */}
        <Entity name="MonitorStem" position={[0, -0.28, 0]} scale={[0.04, 0.22, 0.04]}>
          <Render type="cylinder" material={legMetalMat} />
        </Entity>
      </Entity>

      {/* 4. Ergonomic Chair */}
      <Entity name="OfficeChair" position={[0, 0, 0.4]}>
        {/* Seat */}
        <Entity name="ChairSeat" position={[0, 0.5, 0]} scale={[0.55, 0.08, 0.5]}>
          <Render type="box" material={chairMat} castShadows={true} receiveShadows={true} />
        </Entity>
        {/* Backrest */}
        <Entity name="ChairBackrest" position={[0, 0.85, 0.22]} scale={[0.5, 0.65, 0.06]}>
          <Render type="box" material={chairMat} castShadows={true} />
        </Entity>
        {/* Base Cylinder */}
        <Entity name="ChairBase" position={[0, 0.25, 0]} scale={[0.08, 0.5, 0.08]}>
          <Render type="cylinder" material={legMetalMat} />
        </Entity>
      </Entity>
    </Entity>
  );
};
