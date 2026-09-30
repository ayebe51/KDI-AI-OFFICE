// ==========================================================
// 3d/rooms/ManagementRoom.tsx
// Executive Management Suite for AI Leadership & Resource Planning
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface ManagementRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const ManagementRoom: React.FC<ManagementRoomProps> = ({
  position = [-12, 0, 16],
  onSelectRoom,
}) => {
  // Deep navy wool executive carpet material
  const carpetMat = useMaterial({
    diffuse: '#0f172a',
    gloss: 0.2,
  });

  // Executive walnut wood desk material
  const walnutMat = useMaterial({
    diffuse: '#451a03',
    gloss: 0.7,
  });

  // Gold brushed metal accents
  const goldMat = useMaterial({
    diffuse: '#eab308',
    metalness: 0.85,
    gloss: 0.8,
  });

  // Executive leather chair
  const leatherMat = useMaterial({
    diffuse: '#1c1917',
    gloss: 0.4,
  });

  // Strategy wall monitor
  const screenMat = useMaterial({
    diffuse: '#3b82f6',
    emissive: '#1d4ed8',
    emissiveIntensity: 0.5,
  });

  return (
    <Entity
      name="Room-RM-MANAGEMENT"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Executive Carpet Floor */}
      <Entity name="ManagementRug" position={[0, 0.015, 0]} scale={[7.6, 0.02, 7.6]}>
        <Render type="box" material={carpetMat} receiveShadows={true} />
      </Entity>

      {/* 2. Executive L-Shaped Walnut Desk */}
      <Entity name="ExecutiveDeskMain" position={[0, 0.75, 0]} scale={[2.6, 0.08, 1.2]}>
        <Render type="box" material={walnutMat} castShadows={true} receiveShadows={true} />
      </Entity>
      <Entity name="DeskLegGold1" position={[-1.2, 0.375, -0.5]} scale={[0.06, 0.75, 0.06]}>
        <Render type="box" material={goldMat} />
      </Entity>
      <Entity name="DeskLegGold2" position={[1.2, 0.375, -0.5]} scale={[0.06, 0.75, 0.06]}>
        <Render type="box" material={goldMat} />
      </Entity>
      <Entity name="DeskLegGold3" position={[-1.2, 0.375, 0.5]} scale={[0.06, 0.75, 0.06]}>
        <Render type="box" material={goldMat} />
      </Entity>
      <Entity name="DeskLegGold4" position={[1.2, 0.375, 0.5]} scale={[0.06, 0.75, 0.06]}>
        <Render type="box" material={goldMat} />
      </Entity>

      {/* 3. Executive High-Back Chair */}
      <Entity name="ExecutiveChair" position={[0, 0, -0.6]}>
        <Entity position={[0, 0.5, 0]} scale={[0.65, 0.1, 0.6]}>
          <Render type="box" material={leatherMat} castShadows={true} />
        </Entity>
        <Entity position={[0, 0.95, -0.26]} scale={[0.6, 0.8, 0.08]}>
          <Render type="box" material={leatherMat} castShadows={true} />
        </Entity>
      </Entity>

      {/* 4. Strategy & Metrics Wall Display Panel */}
      <Entity name="StrategyDisplay" position={[0, 1.8, 3.6]} scale={[3.2, 1.6, 0.04]}>
        <Render type="box" material={screenMat} />
      </Entity>

      {/* 5. Credenza Bookshelf */}
      <Entity name="Credenza" position={[-3.2, 0.6, 0]} scale={[0.6, 1.2, 2.4]}>
        <Render type="box" material={walnutMat} castShadows={true} />
      </Entity>
    </Entity>
  );
};
