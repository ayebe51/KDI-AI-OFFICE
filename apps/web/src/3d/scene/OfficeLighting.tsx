// ==========================================================
// 3d/scene/OfficeLighting.tsx
// Lighting Configuration: Warm Professional Tone
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Light } from '@playcanvas/react/components';

export const OfficeLighting: React.FC = () => {
  return (
    <Entity name="OfficeLightingRoot">
      {/* Primary Key Light - Warm Directional Sunlight */}
      <Entity
        name="KeyLightDirectional"
        position={[5, 8, 5]}
        rotation={[45, 30, 0]}
      >
        <Light
          type="directional"
          color="#fef3c7"
          intensity={1.2}
          castShadows={true}
          shadowDistance={25}
          shadowResolution={1024}
          shadowBias={0.05}
        />
      </Entity>

      {/* Ceiling Ambient Fill Light */}
      <Entity name="CeilingFillLight" position={[0, 4.5, 0]}>
        <Light
          type="omni"
          color="#e2e8f0"
          intensity={0.45}
          range={18}
          castShadows={false}
        />
      </Entity>

      {/* Cool Tech Accent Backlight */}
      <Entity name="TechAccentLight" position={[-4, 3, -3]}>
        <Light
          type="omni"
          color="#38bdf8"
          intensity={0.35}
          range={12}
          castShadows={false}
        />
      </Entity>
    </Entity>
  );
};
