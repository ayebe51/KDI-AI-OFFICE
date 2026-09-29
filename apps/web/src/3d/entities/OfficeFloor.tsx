// ==========================================================
// 3d/entities/OfficeFloor.tsx
// Architectural Office Base, Parquet Floor, Rug & Wall
// ==========================================================

import React from 'react';
import { BLEND_NORMAL } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export const OfficeFloor: React.FC = () => {
  // Materials using PlayCanvas useMaterial hook
  const floorMat = useMaterial({
    diffuse: '#0f172a',
    gloss: 0.2,
    metalness: 0.1,
  });

  const rugMat = useMaterial({
    diffuse: '#1e293b',
    gloss: 0.1,
    metalness: 0.05,
  });

  const wallMat = useMaterial({
    diffuse: '#090d16',
    gloss: 0.1,
  });

  const glassMat = useMaterial({
    diffuse: '#38bdf8',
    opacity: 0.35,
    blendType: BLEND_NORMAL,
    gloss: 0.9,
  });

  return (
    <Entity name="OfficeEnvironmentBase">
      {/* Main Floor Slab (14 x 14 meters) */}
      <Entity name="MainFloorSlab" position={[0, -0.025, 0]} scale={[14, 0.05, 14]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* Engineering Zone Accent Rug (4.5 x 4.5 meters) */}
      <Entity name="ZoneAccentRug" position={[0, 0.005, 0]} scale={[4.5, 0.01, 4.5]}>
        <Render type="box" material={rugMat} receiveShadows={true} />
      </Entity>

      {/* Room Architectural Back Wall */}
      <Entity name="BackWall" position={[0, 2.5, -5]} scale={[14, 5, 0.2]}>
        <Render type="box" material={wallMat} receiveShadows={true} />
      </Entity>

      {/* Decorative Cyan Glass Partition Panel */}
      <Entity name="GlassPartition" position={[0, 1.5, -4.8]} scale={[6, 2.5, 0.05]}>
        <Render type="box" material={glassMat} />
      </Entity>
    </Entity>
  );
};
