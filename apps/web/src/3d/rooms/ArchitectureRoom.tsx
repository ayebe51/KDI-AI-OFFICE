// ==========================================================
// 3d/rooms/ArchitectureRoom.tsx
// System Architecture Lab with Drafting Blueprint Table & System Diagrams
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface ArchitectureRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const ArchitectureRoom: React.FC<ArchitectureRoomProps> = ({
  position = [-12, 0, 0],
  onSelectRoom,
}) => {
  // Slate floor
  const floorMat = useMaterial({ diffuse: '#0f172a', gloss: 0.3 });
  // Blueprint Drafting Table
  const draftingTableMat = useMaterial({ diffuse: '#1e293b', gloss: 0.6 });
  const blueprintPaperMat = useMaterial({
    diffuse: '#0284c7',
    emissive: '#0369a1',
    emissiveIntensity: 0.4,
    gloss: 0.8,
  });
  const steelMat = useMaterial({ diffuse: '#64748b', metalness: 0.8, gloss: 0.7 });
  // Large Architecture CAD Display
  const cadDisplayMat = useMaterial({
    diffuse: '#8b5cf6',
    emissive: '#7c3aed',
    emissiveIntensity: 0.6,
  });

  return (
    <Entity
      name="Room-RM-ARCHITECTURE"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Floor Rug */}
      <Entity name="ArchFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 7.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* 2. Angled Drafting Blueprint Table */}
      <Entity name="DraftingTableGroup" position={[0, 0.85, 0]}>
        <Entity name="DraftingSurface" scale={[2.4, 0.06, 1.4]} rotation={[12, 0, 0]}>
          <Render type="box" material={draftingTableMat} castShadows={true} />
        </Entity>
        <Entity name="BlueprintSheet" position={[0, 0.04, 0]} scale={[2.1, 0.01, 1.1]} rotation={[12, 0, 0]}>
          <Render type="box" material={blueprintPaperMat} />
        </Entity>
        {/* Legs */}
        <Entity name="DraftingLeg1" position={[-1.0, -0.42, -0.5]} scale={[0.06, 0.85, 0.06]}>
          <Render type="cylinder" material={steelMat} />
        </Entity>
        <Entity name="DraftingLeg2" position={[1.0, -0.42, -0.5]} scale={[0.06, 0.85, 0.06]}>
          <Render type="cylinder" material={steelMat} />
        </Entity>
        <Entity name="DraftingLeg3" position={[-1.0, -0.42, 0.5]} scale={[0.06, 0.85, 0.06]}>
          <Render type="cylinder" material={steelMat} />
        </Entity>
        <Entity name="DraftingLeg4" position={[1.0, -0.42, 0.5]} scale={[0.06, 0.85, 0.06]}>
          <Render type="cylinder" material={steelMat} />
        </Entity>
      </Entity>

      {/* 3. Wall Architecture CAD & Diagram Display */}
      <Entity name="ArchitectureWallScreen" position={[-3.6, 1.8, 0]} scale={[0.04, 1.8, 3.2]}>
        <Render type="box" material={cadDisplayMat} />
      </Entity>
    </Entity>
  );
};
