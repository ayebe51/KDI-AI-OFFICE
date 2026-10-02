// ==========================================================
// 3d/rooms/Corridors.tsx
// Interconnecting Corridors, Architectural Floor Markings & Wayfinding
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export const Corridors: React.FC = () => {
  // Main corridor — light warm gray (polished concrete)
  const corridorMat = useMaterial({
    diffuse: '#e8e4de',
    metalness: 0.05,
    gloss: 0.55,
  });

  // Wayfinding floor guide stripe — warm amber
  const stripeMat = useMaterial({
    diffuse: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: 0.25,
    gloss: 0.7,
  });

  // Outer building floor foundation plate — light off-white
  const foundationMat = useMaterial({
    diffuse: '#f5f1eb',
    gloss: 0.3,
  });

  return (
    <Entity name="CorridorsAndFoundation">
      {/* 1. Large Ground Foundation Plate */}
      <Entity name="OfficeFoundation" position={[0, -0.01, 4]} scale={[48, 0.02, 56]}>
        <Render type="box" material={foundationMat} receiveShadows={true} />
      </Entity>

      {/* 2. Central North-South Main Corridor (Spine) */}
      <Entity name="MainCorridorSpine" position={[0, 0.005, 4]} scale={[3.4, 0.01, 42]}>
        <Render type="box" material={corridorMat} receiveShadows={true} />
      </Entity>

      {/* 3. East-West Corridor Junction North (z = -10) */}
      <Entity name="CorridorNorthBranch" position={[0, 0.005, -10]} scale={[24, 0.01, 3.0]}>
        <Render type="box" material={corridorMat} receiveShadows={true} />
      </Entity>

      {/* 4. East-West Corridor Junction Mid (z = 0) */}
      <Entity name="CorridorMidBranch" position={[0, 0.005, 0]} scale={[28, 0.01, 3.2]}>
        <Render type="box" material={corridorMat} receiveShadows={true} />
      </Entity>

      {/* 5. East-West Corridor Junction South (z = 10) */}
      <Entity name="CorridorSouthBranch" position={[0, 0.005, 10]} scale={[24, 0.01, 3.0]}>
        <Render type="box" material={corridorMat} receiveShadows={true} />
      </Entity>

      {/* 6. Wayfinding Floor Light Strip */}
      <Entity name="FloorLightStrip" position={[0, 0.01, 4]} scale={[0.08, 0.01, 38]}>
        <Render type="box" material={stripeMat} />
      </Entity>
    </Entity>
  );
};
