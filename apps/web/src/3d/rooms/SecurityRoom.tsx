// ==========================================================
// 3d/rooms/SecurityRoom.tsx
// Security & Compliance Center with Zero-Trust Threat Displays
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { OfficeDesk } from '../entities/OfficeDesk.js';

export interface SecurityRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const SecurityRoom: React.FC<SecurityRoomProps> = ({
  position = [-12, 0, -16],
  onSelectRoom,
}) => {
  const floorMat = useMaterial({ diffuse: '#090d16', gloss: 0.2 });
  const threatRadarMat = useMaterial({
    diffuse: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.65,
  });

  return (
    <Entity
      name="Room-RM-SECURITY"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      <Entity name="SecurityFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 7.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* Security Console Desk */}
      <OfficeDesk
        position={[0, 0, 0]}
        isWorking={false}
        screenEmissiveColor="#ef4444"
        screenEmissiveIntensity={0.65}
      />

      {/* Curved Threat Radar Monitoring Panel */}
      <Entity name="ThreatRadarScreen" position={[0, 1.8, -3.6]} scale={[3.8, 1.6, 0.04]}>
        <Render type="box" material={threatRadarMat} />
      </Entity>
    </Entity>
  );
};
