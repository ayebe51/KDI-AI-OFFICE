// ==========================================================
// 3d/camera/OfficeCamera.tsx
// PlayCanvas Camera Entity with Orbit Controls
// ==========================================================

import React, { useMemo } from 'react';
import { Vec3 } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Camera } from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';

export interface OfficeCameraProps {
  initialPosition?: [number, number, number];
  targetPosition?: [number, number, number];
  fov?: number;
}

export const OfficeCamera: React.FC<OfficeCameraProps> = ({
  initialPosition = [3.5, 3.2, 4.5],
  targetPosition = [0, 0.8, 0],
  fov = 45,
}) => {
  const pivotPoint = useMemo(
    () => new Vec3(targetPosition[0], targetPosition[1], targetPosition[2]),
    [targetPosition]
  );

  return (
    <Entity name="OfficeCamera" position={initialPosition}>
      <Camera
        fov={fov}
        nearClip={0.1}
        farClip={100}
        clearColor="#090d16"
      />
      <OrbitControls
        distanceMin={2}
        distanceMax={14}
        distance={6}
        pitchAngleMin={5}
        pitchAngleMax={85}
        inertiaFactor={0.08}
        pivotPoint={pivotPoint}
        frameOnStart={false}
      />
    </Entity>
  );
};
