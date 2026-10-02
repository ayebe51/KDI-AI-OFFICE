// ==========================================================
// 3d-r3f/camera/IsometricFollowCamera.tsx
// High-Fidelity Isometric Camera with Smooth Target Tracking
// ==========================================================

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface IsometricFollowCameraProps {
  targetPosition: [number, number, number];
  isOverviewMode?: boolean;
}

export const IsometricFollowCamera: React.FC<IsometricFollowCameraProps> = ({
  targetPosition,
  isOverviewMode = false,
}) => {
  const { camera } = useThree();
  const currentTargetRef = useRef(new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2]));

  useFrame((_, dt) => {
    const lerpFactor = Math.min(1, 5 * dt);

    // Target smooth tracking
    const destTarget = new THREE.Vector3(targetPosition[0], targetPosition[1] + 0.8, targetPosition[2]);
    currentTargetRef.current.lerp(destTarget, lerpFactor);

    // Camera offset: [7.3, 10.5, 10.2] is the exact reference isometric vector!
    const distScale = isOverviewMode ? 2.4 : 1.0;
    const destCamPos = new THREE.Vector3(
      currentTargetRef.current.x + 7.3 * distScale,
      currentTargetRef.current.y + (10.5 - 0.8) * distScale,
      currentTargetRef.current.z + 10.2 * distScale
    );

    camera.position.lerp(destCamPos, lerpFactor);
    camera.lookAt(currentTargetRef.current);
  });

  return null;
};
