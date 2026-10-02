// ==========================================================
// 3d/entities/LiftEntity.tsx
// Cozy Low-Poly Elevator Entity with Door Frame, Floor Indicator & Call Button
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface LiftEntityProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  currentFloorLabel?: string;
  onCallLift?: () => void;
}

export const LiftEntity: React.FC<LiftEntityProps> = ({
  position = [7.5, 0, 16],
  rotation = [0, 0, 0],
  currentFloorLabel = '1',
  onCallLift,
}) => {
  // Materials
  const frameMat = useMaterial({ diffuse: '#4c566a', metalness: 0.3, gloss: 0.6 });
  const doorMat = useMaterial({ diffuse: '#d8dee9', metalness: 0.1, gloss: 0.7 });
  const indicatorMat = useMaterial({
    diffuse: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.7,
    gloss: 0.9,
  });
  const buttonMat = useMaterial({
    diffuse: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: 0.8,
    gloss: 0.9,
  });

  return (
    <Entity
      name="OfficeElevator"
      position={position}
      rotation={rotation}
      onClick={onCallLift}
      onPointerDown={onCallLift}
    >
      {/* Outer Door Frame */}
      <Entity name="ElevatorFrameLeft" position={[-1.1, 1.5, 0]} scale={[0.2, 3.0, 0.3]}>
        <Render type="box" material={frameMat} castShadows={true} />
      </Entity>
      <Entity name="ElevatorFrameRight" position={[1.1, 1.5, 0]} scale={[0.2, 3.0, 0.3]}>
        <Render type="box" material={frameMat} castShadows={true} />
      </Entity>
      <Entity name="ElevatorFrameTop" position={[0, 2.9, 0]} scale={[2.4, 0.2, 0.3]}>
        <Render type="box" material={frameMat} castShadows={true} />
      </Entity>

      {/* Double Sliding Doors */}
      <Entity name="DoorLeft" position={[-0.48, 1.35, -0.05]} scale={[0.95, 2.7, 0.08]}>
        <Render type="box" material={doorMat} />
      </Entity>
      <Entity name="DoorRight" position={[0.48, 1.35, -0.05]} scale={[0.95, 2.7, 0.08]}>
        <Render type="box" material={doorMat} />
      </Entity>

      {/* Center Seam */}
      <Entity name="DoorSeam" position={[0, 1.35, 0.0]} scale={[0.02, 2.7, 0.09]}>
        <Render type="box" material={frameMat} />
      </Entity>

      {/* Floor Indicator Display above doors */}
      <Entity name="FloorIndicatorHousing" position={[0, 3.2, 0.08]} scale={[0.8, 0.35, 0.1]}>
        <Render type="box" material={frameMat} />
      </Entity>
      <Entity name="FloorIndicatorScreen" position={[0, 3.2, 0.14]} scale={[0.65, 0.22, 0.02]}>
        <Render type="box" material={indicatorMat} />
      </Entity>

      {/* Call Button Plate */}
      <Entity name="CallButtonPlate" position={[1.45, 1.35, 0.06]} scale={[0.2, 0.45, 0.06]}>
        <Render type="box" material={frameMat} />
      </Entity>
      <Entity name="CallButtonLight" position={[1.45, 1.35, 0.1]} scale={[0.08, 0.08, 0.04]}>
        <Render type="sphere" material={buttonMat} />
      </Entity>
    </Entity>
  );
};
