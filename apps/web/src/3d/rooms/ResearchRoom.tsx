// ==========================================================
// 3d/rooms/ResearchRoom.tsx
// AI Research & Knowledge Lab with Graph Memory Library
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { OfficeDesk } from '../entities/OfficeDesk.js';

export interface ResearchRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const ResearchRoom: React.FC<ResearchRoomProps> = ({
  position = [0, 0, -16],
  onSelectRoom,
}) => {
  const floorMat = useMaterial({ diffuse: '#0f172a', gloss: 0.25 });
  const shelfMat = useMaterial({ diffuse: '#334155', gloss: 0.5 });
  const graphDisplayMat = useMaterial({
    diffuse: '#a855f7',
    emissive: '#9333ea',
    emissiveIntensity: 0.6,
  });

  return (
    <Entity
      name="Room-RM-RESEARCH"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      <Entity name="ResearchFloor" position={[0, 0.015, 0]} scale={[9.6, 0.02, 7.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* Research Scientist Desk */}
      <OfficeDesk
        position={[0, 0, 0]}
        isWorking={true}
        screenEmissiveColor="#a855f7"
        screenEmissiveIntensity={0.8}
      />

      {/* Knowledge Library Shelves (Left & Right) */}
      <Entity name="LibraryShelfLeft" position={[-4.2, 1.2, 0]} scale={[0.6, 2.4, 3.2]}>
        <Render type="box" material={shelfMat} castShadows={true} />
      </Entity>
      <Entity name="LibraryShelfRight" position={[4.2, 1.2, 0]} scale={[0.6, 2.4, 3.2]}>
        <Render type="box" material={shelfMat} castShadows={true} />
      </Entity>

      {/* GraphRAG Knowledge Graph Topology Wall Screen */}
      <Entity name="GraphTopologyScreen" position={[0, 1.9, -3.6]} scale={[4.2, 1.8, 0.04]}>
        <Render type="box" material={graphDisplayMat} />
      </Entity>
    </Entity>
  );
};
