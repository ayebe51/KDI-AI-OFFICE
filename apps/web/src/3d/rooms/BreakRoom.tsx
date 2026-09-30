// ==========================================================
// 3d/rooms/BreakRoom.tsx
// Wellness Lounge & Break Area with Plush Couches & Indoor Plants
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface BreakRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const BreakRoom: React.FC<BreakRoomProps> = ({
  position = [12, 0, 16],
  onSelectRoom,
}) => {
  // Warm carpet material
  const carpetMat = useMaterial({
    diffuse: '#451a03',
    gloss: 0.15,
  });

  // Plush velvet sofa material
  const sofaMat = useMaterial({
    diffuse: '#d97706',
    gloss: 0.35,
  });

  // Coffee table dark wood material
  const woodMat = useMaterial({
    diffuse: '#292524',
    gloss: 0.6,
  });

  // Indoor plant green leaves material
  const plantMat = useMaterial({
    diffuse: '#15803d',
    gloss: 0.4,
  });

  // Ceramic planter pot material
  const potMat = useMaterial({
    diffuse: '#f8fafc',
    gloss: 0.8,
  });

  return (
    <Entity
      name="Room-RM-BREAK"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Lounge Floor Carpet */}
      <Entity name="BreakRug" position={[0, 0.015, 0]} scale={[7.6, 0.02, 7.6]}>
        <Render type="box" material={carpetMat} receiveShadows={true} />
      </Entity>

      {/* 2. Main 3-Seater Sofa */}
      <Entity name="MainSofaGroup" position={[0, 0, -1.8]}>
        {/* Seat cushion */}
        <Entity name="SofaSeat" position={[0, 0.4, 0]} scale={[3.2, 0.35, 1.1]}>
          <Render type="box" material={sofaMat} castShadows={true} />
        </Entity>
        {/* Backrest */}
        <Entity name="SofaBackrest" position={[0, 0.85, -0.42]} scale={[3.2, 0.65, 0.28]}>
          <Render type="box" material={sofaMat} castShadows={true} />
        </Entity>
        {/* Armrest Left */}
        <Entity name="SofaArmLeft" position={[-1.65, 0.6, 0]} scale={[0.26, 0.45, 1.1]}>
          <Render type="box" material={sofaMat} castShadows={true} />
        </Entity>
        {/* Armrest Right */}
        <Entity name="SofaArmRight" position={[1.65, 0.6, 0]} scale={[0.26, 0.45, 1.1]}>
          <Render type="box" material={sofaMat} castShadows={true} />
        </Entity>
      </Entity>

      {/* 3. Low Lounge Coffee Table */}
      <Entity name="CoffeeTableSurface" position={[0, 0.35, 0.2]} scale={[2.0, 0.06, 1.2]}>
        <Render type="box" material={woodMat} castShadows={true} receiveShadows={true} />
      </Entity>
      <Entity name="CoffeeTableLeg1" position={[-0.9, 0.175, -0.5]} scale={[0.06, 0.35, 0.06]}>
        <Render type="box" material={woodMat} />
      </Entity>
      <Entity name="CoffeeTableLeg2" position={[0.9, 0.175, -0.5]} scale={[0.06, 0.35, 0.06]}>
        <Render type="box" material={woodMat} />
      </Entity>
      <Entity name="CoffeeTableLeg3" position={[-0.9, 0.175, 0.5]} scale={[0.06, 0.35, 0.06]}>
        <Render type="box" material={woodMat} />
      </Entity>
      <Entity name="CoffeeTableLeg4" position={[0.9, 0.175, 0.5]} scale={[0.06, 0.35, 0.06]}>
        <Render type="box" material={woodMat} />
      </Entity>

      {/* 4. Indoor Architectural Fiddle Leaf Fig Plant */}
      <Entity name="PlantPot" position={[2.8, 0.3, 2.5]} scale={[0.7, 0.6, 0.7]}>
        <Render type="cylinder" material={potMat} castShadows={true} />
      </Entity>
      <Entity name="PlantFoliage" position={[2.8, 1.2, 2.5]} scale={[1.1, 1.4, 1.1]}>
        <Render type="sphere" material={plantMat} />
      </Entity>
    </Entity>
  );
};
