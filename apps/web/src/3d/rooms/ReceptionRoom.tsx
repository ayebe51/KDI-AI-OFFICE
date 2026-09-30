// ==========================================================
// 3d/rooms/ReceptionRoom.tsx
// Public Reception & Entry Lobby with Welcome Kiosk & Corporate Emblem
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface ReceptionRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const ReceptionRoom: React.FC<ReceptionRoomProps> = ({
  position = [0, 0, 16],
  onSelectRoom,
}) => {
  // Polished terrazzo marble lobby floor
  const floorMat = useMaterial({
    diffuse: '#1e293b',
    metalness: 0.2,
    gloss: 0.8,
  });

  // Reception desk quartz counter
  const counterMat = useMaterial({
    diffuse: '#0284c7',
    gloss: 0.85,
  });

  // Corporate gold emblem accent
  const emblemMat = useMaterial({
    diffuse: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: 0.8,
    metalness: 0.8,
    gloss: 0.9,
  });

  // Guest lounge seating
  const loungeSeatMat = useMaterial({
    diffuse: '#334155',
    gloss: 0.4,
  });

  // Digital Directory Kiosk Screen
  const kioskScreenMat = useMaterial({
    diffuse: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.6,
  });

  return (
    <Entity
      name="Room-RM-RECEPTION"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Polished Lobby Floor */}
      <Entity name="ReceptionFloor" position={[0, 0.015, 0]} scale={[11.6, 0.02, 7.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* 2. Curved Corporate Reception Desk */}
      <Entity name="ReceptionDeskChassis" position={[0, 0.55, 0]} scale={[3.8, 1.1, 1.4]}>
        <Render type="box" material={counterMat} castShadows={true} />
      </Entity>
      <Entity name="DeskCounterLedge" position={[0, 1.15, 0.2]} scale={[4.0, 0.08, 0.6]}>
        <Render type="box" material={counterMat} />
      </Entity>

      {/* 3. Corporate KDI Holographic Emblem on Front of Desk */}
      <Entity name="CorporateEmblem" position={[0, 0.6, 0.72]} scale={[1.2, 0.4, 0.04]}>
        <Render type="box" material={emblemMat} />
      </Entity>

      {/* 4. Interactive Office Directory Kiosk */}
      <Entity name="DirectoryKioskPedestal" position={[-3.8, 0.6, 1.5]} scale={[0.5, 1.2, 0.4]}>
        <Render type="box" material={loungeSeatMat} castShadows={true} />
      </Entity>
      <Entity name="DirectoryKioskDisplay" position={[-3.8, 1.3, 1.45]} scale={[0.65, 0.45, 0.05]}>
        <Render type="box" material={kioskScreenMat} />
      </Entity>

      {/* 5. Guest Lounge Armchairs (Left & Right) */}
      <Entity name="LoungeChairLeft" position={[-3.8, 0.35, -1.8]} scale={[1.2, 0.7, 1.0]}>
        <Render type="box" material={loungeSeatMat} castShadows={true} />
      </Entity>
      <Entity name="LoungeChairRight" position={[3.8, 0.35, -1.8]} scale={[1.2, 0.7, 1.0]}>
        <Render type="box" material={loungeSeatMat} castShadows={true} />
      </Entity>
    </Entity>
  );
};
