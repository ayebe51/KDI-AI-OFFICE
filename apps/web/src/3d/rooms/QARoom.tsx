// ==========================================================
// 3d/rooms/QARoom.tsx
// QA & Testing Suite with Test Execution Matrix Screens
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { OfficeDesk } from '../entities/OfficeDesk.js';

export interface QARoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const QARoom: React.FC<QARoomProps> = ({
  position = [-12, 0, -8],
  onSelectRoom,
}) => {
  const floorMat = useMaterial({ diffuse: '#090d16', gloss: 0.3 });
  const testMatrixMat = useMaterial({
    diffuse: '#06b6d4',
    emissive: '#0891b2',
    emissiveIntensity: 0.6,
  });

  return (
    <Entity
      name="Room-RM-QA"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      <Entity name="QAFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 5.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* QA Engineer Desk */}
      <OfficeDesk
        position={[0, 0, 0]}
        isWorking={false}
        screenEmissiveColor="#06b6d4"
        screenEmissiveIntensity={0.6}
      />

      {/* Wall Automated Test Dashboard */}
      <Entity name="TestMatrixDisplay" position={[0, 1.8, -2.6]} scale={[3.4, 1.5, 0.04]}>
        <Render type="box" material={testMatrixMat} />
      </Entity>
    </Entity>
  );
};
