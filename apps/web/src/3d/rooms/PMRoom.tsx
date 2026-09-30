// ==========================================================
// 3d/rooms/PMRoom.tsx
// Product Management Room with Product Strategy Desk & Roadmap Board
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface PMRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const PMRoom: React.FC<PMRoomProps> = ({
  position = [-12, 0, 8],
  onSelectRoom,
}) => {
  const floorMat = useMaterial({ diffuse: '#0f172a', gloss: 0.2 });
  const deskMat = useMaterial({ diffuse: '#1e293b', gloss: 0.6 });
  const roadmapMat = useMaterial({
    diffuse: '#f97316',
    emissive: '#ea580c',
    emissiveIntensity: 0.4,
  });

  return (
    <Entity
      name="Room-RM-PM"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      <Entity name="PMFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 5.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* Desk */}
      <Entity name="PMDesk" position={[0, 0.75, 0]} scale={[2.2, 0.08, 1.1]}>
        <Render type="box" material={deskMat} castShadows={true} />
      </Entity>

      {/* Roadmap Pinboard Screen */}
      <Entity name="RoadmapBoard" position={[0, 1.6, -2.6]} scale={[3.2, 1.4, 0.04]}>
        <Render type="box" material={roadmapMat} />
      </Entity>
    </Entity>
  );
};
