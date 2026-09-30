// ==========================================================
// 3d/rooms/MushollaRoom.tsx
// Musholla Prayer Sanctuary with Mihrab, Sajadah Rugs & Qur'an Shelf
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import type { OfficePrayerSession } from '@kdi/types';

export interface MushollaRoomProps {
  position?: [number, number, number];
  activePrayer?: OfficePrayerSession | null;
  onSelectRoom?: () => void;
}

export const MushollaRoom: React.FC<MushollaRoomProps> = ({
  position = [12, 0, -8],
  activePrayer,
  onSelectRoom,
}) => {
  // Emerald green prayer carpet material
  const carpetMat = useMaterial({
    diffuse: '#064e3b',
    gloss: 0.2,
  });

  // Sajadah Individual Prayer Rugs Material with gold trim
  const sajadahMat = useMaterial({
    diffuse: '#047857',
    emissive: activePrayer ? '#10b981' : '#065f46',
    emissiveIntensity: activePrayer ? 0.35 : 0.05,
    gloss: 0.3,
  });

  // Mihrab arch warm white marble material
  const mihrabMat = useMaterial({
    diffuse: '#f8fafc',
    emissive: '#10b981',
    emissiveIntensity: 0.15,
    gloss: 0.7,
  });

  // Dark teak wood shelf material
  const woodMat = useMaterial({
    diffuse: '#451a03',
    gloss: 0.5,
  });

  // Wudu tile material
  const tileMat = useMaterial({
    diffuse: '#0284c7',
    gloss: 0.8,
  });

  // Privacy lattice partition screen material
  const latticeMat = useMaterial({
    diffuse: '#78350f',
    gloss: 0.4,
  });

  return (
    <Entity
      name="Room-RM-MUSHOLLA"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Emerald Floor Rug */}
      <Entity name="MushollaFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 5.6]}>
        <Render type="box" material={carpetMat} receiveShadows={true} />
      </Entity>

      {/* 2. Mihrab Niche (West Wall facing Qiblah) */}
      <Entity name="MihrabGroup" position={[-3.6, 0, 0]}>
        <Entity name="MihrabArchLeft" position={[0, 1.4, -0.9]} scale={[0.3, 2.8, 0.2]}>
          <Render type="box" material={mihrabMat} />
        </Entity>
        <Entity name="MihrabArchRight" position={[0, 1.4, 0.9]} scale={[0.3, 2.8, 0.2]}>
          <Render type="box" material={mihrabMat} />
        </Entity>
        <Entity name="MihrabArchTop" position={[0, 2.7, 0]} scale={[0.3, 0.2, 2.0]}>
          <Render type="box" material={mihrabMat} />
        </Entity>
        {/* Soft Mihrab Ambient Light Pillar */}
        <Entity name="MihrabAura" position={[0.1, 1.4, 0]} scale={[0.1, 2.6, 1.6]}>
          <Render type="box" material={sajadahMat} />
        </Entity>
      </Entity>

      {/* 3. Imam Sajadah Mat */}
      <Entity name="ImamSajadah" position={[-2.6, 0.025, 0]} scale={[0.8, 0.01, 1.4]}>
        <Render type="box" material={sajadahMat} />
      </Entity>

      {/* 4. Jamaah Saff (Row 1) */}
      <Entity name="SaffRow1Group" position={[-1.2, 0.025, 0]}>
        {[-1.1, 0, 1.1].map((z, idx) => (
          <Entity key={`sajadah-r1-${idx}`} name={`Sajadah-R1-${idx}`} position={[0, 0, z]} scale={[0.75, 0.01, 0.95]}>
            <Render type="box" material={sajadahMat} />
          </Entity>
        ))}
      </Entity>

      {/* 5. Jamaah Saff (Row 2) */}
      <Entity name="SaffRow2Group" position={[0.4, 0.025, 0]}>
        {[-1.1, 0, 1.1].map((z, idx) => (
          <Entity key={`sajadah-r2-${idx}`} name={`Sajadah-R2-${idx}`} position={[0, 0, z]} scale={[0.75, 0.01, 0.95]}>
            <Render type="box" material={sajadahMat} />
          </Entity>
        ))}
      </Entity>

      {/* 6. Qur'an Bookshelf on East Wall */}
      <Entity name="QuranShelf" position={[3.4, 0.9, -1.5]} scale={[0.4, 1.8, 1.8]}>
        <Render type="box" material={woodMat} castShadows={true} />
      </Entity>

      {/* 7. Wooden Privacy Screen Partition */}
      <Entity name="PartitionScreen" position={[2.0, 1.0, 1.6]} scale={[0.08, 2.0, 2.2]}>
        <Render type="box" material={latticeMat} />
      </Entity>

      {/* 8. Wudu Foot Wash Basin Area (Behind Partition) */}
      <Entity name="WuduBasin" position={[3.2, 0.2, 2.0]} scale={[0.8, 0.4, 1.2]}>
        <Render type="box" material={tileMat} />
      </Entity>
    </Entity>
  );
};
