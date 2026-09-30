// ==========================================================
// 3d/rooms/EngineeringFloor.tsx
// Open-Plan Engineering Floor with Pods for Frontend, Backend, DevOps & General
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { OfficeDesk } from '../entities/OfficeDesk.js';
import type { OfficeAgentDetail } from '@kdi/types';

export interface EngineeringFloorProps {
  position?: [number, number, number];
  agents?: OfficeAgentDetail[];
  onSelectRoom?: () => void;
}

export const EngineeringFloor: React.FC<EngineeringFloorProps> = ({
  position = [0, 0, 0],
  agents = [],
  onSelectRoom,
}) => {
  // Acoustic dark charcoal carpet with emerald weave
  const floorCarpetMat = useMaterial({
    diffuse: '#090d16',
    gloss: 0.2,
  });

  // Pod divider glass screen
  const podDividerMat = useMaterial({
    diffuse: '#10b981',
    opacity: 0.25,
    blendType: 2, // BLEND_NORMAL
    gloss: 0.8,
  });

  // Pod labels glow
  const podGlowMat = useMaterial({
    diffuse: '#059669',
    emissive: '#10b981',
    emissiveIntensity: 0.6,
  });

  // Find engineer activity state for screen illumination
  const engineer = agents.find((a) => a.agentId === 'AGT-ENG-001');
  const isWorking = engineer ? engineer.activityState === 'CODING' || engineer.activityState === 'TESTING' || engineer.activityState === 'WORKING' : false;

  return (
    <Entity
      name="Room-RM-ENGINEERING"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Main Floor Plate */}
      <Entity name="EngineeringFloorRug" position={[0, 0.015, 0]} scale={[13.6, 0.02, 13.6]}>
        <Render type="box" material={floorCarpetMat} receiveShadows={true} />
      </Entity>

      {/* 2. Central Primary Engineering Workstation (Farhan's Desk) */}
      <OfficeDesk
        position={[0, 0, 0]}
        isWorking={isWorking}
        screenEmissiveColor={isWorking ? '#10b981' : '#0284c7'}
        screenEmissiveIntensity={isWorking ? 0.9 : 0.4}
      />

      {/* 3. Pod A: Frontend Engineering Desk */}
      <OfficeDesk
        position={[-3.6, 0, 3.2]}
        isWorking={false}
        screenEmissiveColor="#38bdf8"
        screenEmissiveIntensity={0.5}
      />

      {/* 4. Pod B: Backend Engineering Desk */}
      <OfficeDesk
        position={[3.6, 0, 3.2]}
        isWorking={false}
        screenEmissiveColor="#10b981"
        screenEmissiveIntensity={0.5}
      />

      {/* 5. Pod C: DevOps & Infrastructure Pod */}
      <OfficeDesk
        position={[-3.6, 0, -3.2]}
        isWorking={false}
        screenEmissiveColor="#f59e0b"
        screenEmissiveIntensity={0.5}
      />

      {/* 6. Pod D: QA / Testing Pod */}
      <OfficeDesk
        position={[3.6, 0, -3.2]}
        isWorking={false}
        screenEmissiveColor="#06b6d4"
        screenEmissiveIntensity={0.5}
      />

      {/* 7. Low Acoustic Dividers between pods */}
      <Entity name="DividerEastWest" position={[0, 0.6, 0]} scale={[11.0, 1.2, 0.08]}>
        <Render type="box" material={podDividerMat} />
      </Entity>
      <Entity name="DividerNorthSouth" position={[0, 0.6, 0]} scale={[0.08, 1.2, 11.0]}>
        <Render type="box" material={podDividerMat} />
      </Entity>
    </Entity>
  );
};
