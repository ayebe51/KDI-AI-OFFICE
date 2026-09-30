// ==========================================================
// 3d/rooms/MeetingRoom.tsx
// Conference Room with Large Conference Table, Ergonomic Chairs & Whiteboard
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { WhiteboardEntity } from './WhiteboardEntity.js';
import type { OfficeMeeting } from '@kdi/types';

export interface MeetingRoomProps {
  position?: [number, number, number];
  activeMeeting?: OfficeMeeting | null;
  onSelectWhiteboard?: () => void;
  onSelectRoom?: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  position = [12, 0, 0],
  activeMeeting,
  onSelectWhiteboard,
  onSelectRoom,
}) => {
  // Conference table rich mahogany wood material
  const tableMat = useMaterial({
    diffuse: '#1e1b4b',
    metalness: 0.15,
    gloss: 0.8,
  });

  // Table brushed steel pedestal legs
  const legMat = useMaterial({
    diffuse: '#475569',
    metalness: 0.9,
    gloss: 0.85,
  });

  // Conference leather chair material
  const chairMat = useMaterial({
    diffuse: '#0f172a',
    gloss: 0.4,
  });

  // Acoustic floor carpet material
  const carpetMat = useMaterial({
    diffuse: '#1e1b4b',
    gloss: 0.15,
  });

  // Glass partition frosted material
  const glassMat = useMaterial({
    diffuse: '#6366f1',
    opacity: 0.35,
    blendType: 2, // BLEND_NORMAL
    gloss: 0.9,
  });

  return (
    <Entity
      name="Room-RM-MEETING"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Room Floor Rug */}
      <Entity name="MeetingRug" position={[0, 0.015, 0]} scale={[9.2, 0.02, 9.2]}>
        <Render type="box" material={carpetMat} receiveShadows={true} />
      </Entity>

      {/* 2. Glass Perimeter Partitions */}
      <Entity name="GlassWallNorth" position={[0, 1.6, -4.8]} scale={[9.2, 3.2, 0.08]}>
        <Render type="box" material={glassMat} />
      </Entity>
      <Entity name="GlassWallEast" position={[4.6, 1.6, 0]} scale={[0.08, 3.2, 9.2]}>
        <Render type="box" material={glassMat} />
      </Entity>
      <Entity name="GlassWallSouth" position={[0, 1.6, 4.8]} scale={[9.2, 3.2, 0.08]}>
        <Render type="box" material={glassMat} />
      </Entity>

      {/* 3. Large Executive Conference Table */}
      <Entity name="ConferenceTableSurface" position={[0, 0.75, 0]} scale={[4.8, 0.08, 2.2]}>
        <Render type="box" material={tableMat} castShadows={true} receiveShadows={true} />
      </Entity>
      <Entity name="TablePedestalLeft" position={[-1.6, 0.375, 0]} scale={[0.8, 0.75, 0.8]}>
        <Render type="cylinder" material={legMat} castShadows={true} />
      </Entity>
      <Entity name="TablePedestalRight" position={[1.6, 0.375, 0]} scale={[0.8, 0.75, 0.8]}>
        <Render type="cylinder" material={legMat} castShadows={true} />
      </Entity>

      {/* 4. Surrounding Conference Chairs (6 seats) */}
      {/* North row */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <Entity key={`chair-north-${i}`} name={`Chair-North-${i}`} position={[x, 0, -1.5]}>
          <Entity position={[0, 0.5, 0]} scale={[0.55, 0.08, 0.5]}>
            <Render type="box" material={chairMat} castShadows={true} />
          </Entity>
          <Entity position={[0, 0.85, -0.22]} scale={[0.5, 0.65, 0.06]}>
            <Render type="box" material={chairMat} castShadows={true} />
          </Entity>
        </Entity>
      ))}

      {/* South row */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <Entity key={`chair-south-${i}`} name={`Chair-South-${i}`} position={[x, 0, 1.5]}>
          <Entity position={[0, 0.5, 0]} scale={[0.55, 0.08, 0.5]}>
            <Render type="box" material={chairMat} castShadows={true} />
          </Entity>
          <Entity position={[0, 0.85, 0.22]} scale={[0.5, 0.65, 0.06]}>
            <Render type="box" material={chairMat} castShadows={true} />
          </Entity>
        </Entity>
      ))}

      {/* 5. Interactive Architectural Whiteboard */}
      <WhiteboardEntity
        position={[0, 0, -4.5]}
        activeMeeting={activeMeeting}
        onClick={onSelectWhiteboard}
      />
    </Entity>
  );
};
