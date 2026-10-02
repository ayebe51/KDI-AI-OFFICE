// ==========================================================
// 3d/scene/OfficeLighting.tsx
// Bright Warm Daylight Office Lighting
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Light } from '@playcanvas/react/components';

export const OfficeLighting: React.FC = () => {
  return (
    <Entity name="OfficeLightingRoot">
      {/* Primary Sun / Skylight — bright warm white */}
      <Entity name="SunLight" position={[8, 14, 8]} rotation={[50, -30, 0]}>
        <Light
          type="directional"
          color="#fffdf5"
          intensity={2.2}
          castShadows={true}
          shadowDistance={40}
          shadowResolution={1024}
          shadowBias={0.04}
        />
      </Entity>

      {/* Strong ambient sky fill — makes everything bright */}
      <Entity name="SkyAmbient" position={[0, 10, 0]}>
        <Light
          type="omni"
          color="#ddeeff"
          intensity={1.8}
          range={80}
          castShadows={false}
        />
      </Entity>

      {/* Ceiling office panel lights — warm white */}
      <Entity name="OfficePanel1" position={[0, 4.5, 8]}>
        <Light type="omni" color="#fff8e7" intensity={1.2} range={20} castShadows={false} />
      </Entity>
      <Entity name="OfficePanel2" position={[0, 4.5, -4]}>
        <Light type="omni" color="#fff8e7" intensity={1.2} range={20} castShadows={false} />
      </Entity>
      <Entity name="OfficePanel3" position={[-12, 4.5, 0]}>
        <Light type="omni" color="#fff8e7" intensity={1.0} range={18} castShadows={false} />
      </Entity>
      <Entity name="OfficePanel4" position={[12, 4.5, 0]}>
        <Light type="omni" color="#fff8e7" intensity={1.0} range={18} castShadows={false} />
      </Entity>

      {/* Soft fill from opposite side to reduce harsh shadows */}
      <Entity name="FillLight" position={[-6, 6, -6]} rotation={[30, 150, 0]}>
        <Light
          type="directional"
          color="#cce8ff"
          intensity={0.7}
          castShadows={false}
        />
      </Entity>
    </Entity>
  );
};
