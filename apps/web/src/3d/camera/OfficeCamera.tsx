// ==========================================================
// 3d/camera/OfficeCamera.tsx
// PlayCanvas Camera Entity with Orbit Controls, Room Presets & Agent Tracking
// ==========================================================

import React, { useMemo, useRef, useEffect } from 'react';
import { Vec3 } from 'playcanvas';
import type { Entity as PcEntity } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Camera } from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';
import { useAppEvent } from '@playcanvas/react/hooks';
import type { OfficeAgentDetail } from '@kdi/types';

export type CameraPresetId =
  | 'RECEPTION'
  | 'ENGINEERING'
  | 'MEETING'
  | 'MUSHOLLA'
  | 'SERVER'
  | 'PORTFOLIO'
  | 'MANAGEMENT'
  | 'ARCHITECTURE'
  | 'FREE';

export interface OfficeCameraProps {
  preset?: CameraPresetId;
  followedAgent?: OfficeAgentDetail | null;
  fov?: number;
}

export const CAMERA_PRESETS: Record<
  CameraPresetId,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  RECEPTION: { position: [0, 5.5, 23], target: [0, 1.0, 16] },
  ENGINEERING: { position: [4.5, 6.2, 5.5], target: [0, 0.8, 0] },
  MEETING: { position: [12, 5.8, 5.8], target: [12, 1.0, 0] },
  MUSHOLLA: { position: [12, 5.0, -3.2], target: [12, 0.8, -8] },
  SERVER: { position: [12, 5.5, -11.5], target: [12, 1.2, -16] },
  PORTFOLIO: { position: [0, 6.5, 31], target: [0, 1.0, 24] },
  MANAGEMENT: { position: [-12, 5.5, 22], target: [-12, 1.0, 16] },
  ARCHITECTURE: { position: [-12, 5.5, 5.5], target: [-12, 1.0, 0] },
  FREE: { position: [0, 18, 18], target: [0, 0, 4] },
};

export const OfficeCamera: React.FC<OfficeCameraProps> = ({
  preset = 'RECEPTION',
  followedAgent,
  fov = 45,
}) => {
  const cameraRef = useRef<PcEntity>(null);
  const targetPosRef = useRef<Vec3>(new Vec3(0, 1.0, 16));
  const currentPosRef = useRef<Vec3>(new Vec3(0, 5.5, 23));

  // Determine target coordinates from preset or followed agent
  useEffect(() => {
    if (followedAgent) {
      targetPosRef.current.set(
        followedAgent.position[0],
        followedAgent.position[1] + 1.0,
        followedAgent.position[2]
      );
      currentPosRef.current.set(
        followedAgent.position[0] + 3.0,
        followedAgent.position[1] + 3.5,
        followedAgent.position[2] + 4.0
      );
    } else {
      const config = CAMERA_PRESETS[preset] || CAMERA_PRESETS.RECEPTION;
      targetPosRef.current.set(config.target[0], config.target[1], config.target[2]);
      currentPosRef.current.set(config.position[0], config.position[1], config.position[2]);
    }

    if (cameraRef.current) {
      cameraRef.current.setLocalPosition(currentPosRef.current);
    }
  }, [preset, followedAgent]);

  // Smooth lerp camera tracking when following agent
  useAppEvent('update', (dt: number) => {
    if (followedAgent && cameraRef.current) {
      const desiredTargetX = followedAgent.position[0];
      const desiredTargetY = followedAgent.position[1] + 1.0;
      const desiredTargetZ = followedAgent.position[2];

      const lerpFactor = Math.min(dt * 3.0, 1.0);
      targetPosRef.current.x += (desiredTargetX - targetPosRef.current.x) * lerpFactor;
      targetPosRef.current.y += (desiredTargetY - targetPosRef.current.y) * lerpFactor;
      targetPosRef.current.z += (desiredTargetZ - targetPosRef.current.z) * lerpFactor;
    }
  });

  const pivotPoint = useMemo(
    () => new Vec3(targetPosRef.current.x, targetPosRef.current.y, targetPosRef.current.z),
    [preset, followedAgent]
  );

  return (
    <Entity ref={cameraRef} name="OfficeCamera" position={[currentPosRef.current.x, currentPosRef.current.y, currentPosRef.current.z]}>
      <Camera
        fov={fov}
        nearClip={0.1}
        farClip={180}
        clearColor="#090d16"
      />
      <OrbitControls
        distanceMin={2}
        distanceMax={35}
        distance={7}
        pitchAngleMin={5}
        pitchAngleMax={85}
        inertiaFactor={0.08}
        pivotPoint={pivotPoint}
        frameOnStart={false}
      />
    </Entity>
  );
};
