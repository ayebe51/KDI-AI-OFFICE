// ==========================================================
// 3d/rooms/WhiteboardEntity.tsx
// 3D Interactive Whiteboard displaying structured meeting/architecture data
// ==========================================================

import React, { useMemo } from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import type { OfficeMeeting } from '@kdi/types';

export interface WhiteboardEntityProps {
  position?: [number, number, number];
  activeMeeting?: OfficeMeeting | null;
  onClick?: () => void;
}

export const WhiteboardEntity: React.FC<WhiteboardEntityProps> = ({
  position = [12, 0, -4.8],
  activeMeeting,
  onClick,
}) => {
  // Whiteboard frame material
  const frameMat = useMaterial({
    diffuse: '#334155',
    metalness: 0.8,
    gloss: 0.7,
  });

  // Whiteboard board surface material with subtle glow when meeting is active
  const boardMat = useMaterial({
    diffuse: activeMeeting ? '#f8fafc' : '#e2e8f0',
    emissive: activeMeeting ? '#0284c7' : '#0f172a',
    emissiveIntensity: activeMeeting ? 0.25 : 0.05,
    gloss: 0.9,
  });

  // Tray / Marker holder material
  const trayMat = useMaterial({
    diffuse: '#475569',
    metalness: 0.9,
    gloss: 0.8,
  });

  // Markers
  const blueMarkerMat = useMaterial({ diffuse: '#0284c7', gloss: 0.7 });
  const greenMarkerMat = useMaterial({ diffuse: '#10b981', gloss: 0.7 });

  const title = useMemo(() => {
    if (activeMeeting?.whiteboardData?.title) {
      return activeMeeting.whiteboardData.title;
    }
    return activeMeeting ? activeMeeting.title : 'KDI AI Architecture & Strategy';
  }, [activeMeeting]);

  return (
    <Entity
      name="WhiteboardUnit"
      position={position}
      onClick={onClick}
      onPointerDown={onClick}
    >
      {/* 1. Outer Aluminum Frame */}
      <Entity name="WhiteboardFrame" position={[0, 1.8, 0]} scale={[3.8, 2.2, 0.08]}>
        <Render type="box" material={frameMat} castShadows={true} />
      </Entity>

      {/* 2. Magnetic Enamel Whiteboard Surface */}
      <Entity name="WhiteboardSurface" position={[0, 1.8, 0.045]} scale={[3.6, 2.0, 0.02]}>
        <Render type="box" material={boardMat} />
      </Entity>

      {/* 3. Lower Marker & Eraser Tray */}
      <Entity name="MarkerTray" position={[0, 0.68, 0.12]} scale={[3.2, 0.04, 0.18]}>
        <Render type="box" material={trayMat} />
      </Entity>

      {/* 4. Dry Erase Markers */}
      <Entity name="BlueMarker" position={[-0.4, 0.72, 0.12]} scale={[0.03, 0.03, 0.14]}>
        <Render type="cylinder" material={blueMarkerMat} />
      </Entity>
      <Entity name="GreenMarker" position={[-0.2, 0.72, 0.12]} scale={[0.03, 0.03, 0.14]}>
        <Render type="cylinder" material={greenMarkerMat} />
      </Entity>

      {/* 5. Architectural Stand Legs */}
      <Entity name="StandLegLeft" position={[-1.6, 0.35, 0]} scale={[0.06, 0.7, 0.06]}>
        <Render type="cylinder" material={frameMat} castShadows={true} />
      </Entity>
      <Entity name="StandLegRight" position={[1.6, 0.35, 0]} scale={[0.06, 0.7, 0.06]}>
        <Render type="cylinder" material={frameMat} castShadows={true} />
      </Entity>
      <Entity name="StandFootLeft" position={[-1.6, 0.03, 0]} scale={[0.08, 0.06, 0.8]}>
        <Render type="box" material={frameMat} />
      </Entity>
      <Entity name="StandFootRight" position={[1.6, 0.03, 0]} scale={[0.08, 0.06, 0.8]}>
        <Render type="box" material={frameMat} />
      </Entity>
    </Entity>
  );
};
