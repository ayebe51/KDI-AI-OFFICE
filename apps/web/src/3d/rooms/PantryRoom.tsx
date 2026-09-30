// ==========================================================
// 3d/rooms/PantryRoom.tsx
// Pantry Refreshment Station with Espresso Machine, Water Cooler & Tables
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';

export interface PantryRoomProps {
  position?: [number, number, number];
  onSelectRoom?: () => void;
}

export const PantryRoom: React.FC<PantryRoomProps> = ({
  position = [12, 0, 8],
  onSelectRoom,
}) => {
  // Tile floor material
  const tileMat = useMaterial({
    diffuse: '#1e293b',
    gloss: 0.7,
  });

  // Kitchen counter white quartz surface material
  const counterMat = useMaterial({
    diffuse: '#f1f5f9',
    gloss: 0.85,
  });

  // Base cabinetry warm wood material
  const cabinetMat = useMaterial({
    diffuse: '#78350f',
    gloss: 0.4,
  });

  // Stainless steel espresso machine material
  const stainlessMat = useMaterial({
    diffuse: '#94a3b8',
    metalness: 0.9,
    gloss: 0.85,
  });

  // Glowing coffee machine status LED
  const coffeeLedMat = useMaterial({
    diffuse: '#f59e0b',
    emissive: '#f59e0b',
    emissiveIntensity: 0.8,
  });

  // Ceramic coffee mugs
  const mugMat = useMaterial({
    diffuse: '#38bdf8',
    gloss: 0.9,
  });

  // Cafe table & stools
  const tableMat = useMaterial({
    diffuse: '#334155',
    gloss: 0.6,
  });

  return (
    <Entity
      name="Room-RM-PANTRY"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Floor Tile */}
      <Entity name="PantryFloor" position={[0, 0.015, 0]} scale={[7.6, 0.02, 5.6]}>
        <Render type="box" material={tileMat} receiveShadows={true} />
      </Entity>

      {/* 2. Kitchen Counter (North Wall) */}
      <Entity name="CounterCabinet" position={[0, 0.45, -2.2]} scale={[6.0, 0.9, 1.0]}>
        <Render type="box" material={cabinetMat} castShadows={true} />
      </Entity>
      <Entity name="CounterQuartzTop" position={[0, 0.93, -2.2]} scale={[6.2, 0.06, 1.1]}>
        <Render type="box" material={counterMat} receiveShadows={true} />
      </Entity>

      {/* 3. High-End Espresso Machine */}
      <Entity name="EspressoMachineChassis" position={[-1.2, 1.2, -2.2]} scale={[0.8, 0.5, 0.6]}>
        <Render type="box" material={stainlessMat} castShadows={true} />
      </Entity>
      {/* Espresso Lamp */}
      <Entity name="EspressoPowerLamp" position={[-1.2, 1.4, -1.89]} scale={[0.06, 0.06, 0.04]}>
        <Render type="sphere" material={coffeeLedMat} />
      </Entity>

      {/* 4. Ceramic Mugs */}
      <Entity name="CoffeeMug1" position={[-0.5, 1.05, -2.0]} scale={[0.12, 0.16, 0.12]}>
        <Render type="cylinder" material={mugMat} />
      </Entity>
      <Entity name="CoffeeMug2" position={[-0.3, 1.05, -2.1]} scale={[0.12, 0.16, 0.12]}>
        <Render type="cylinder" material={mugMat} />
      </Entity>

      {/* 5. Water Cooler / Dispenser */}
      <Entity name="WaterCooler" position={[2.2, 0.8, -2.2]} scale={[0.45, 1.6, 0.45]}>
        <Render type="box" material={stainlessMat} castShadows={true} />
      </Entity>

      {/* 6. Central Cafe High-Top Table */}
      <Entity name="CafeTableTop" position={[0, 1.0, 1.0]} scale={[1.8, 0.06, 1.8]}>
        <Render type="cylinder" material={tableMat} castShadows={true} />
      </Entity>
      <Entity name="CafeTableStem" position={[0, 0.5, 1.0]} scale={[0.1, 1.0, 0.1]}>
        <Render type="cylinder" material={stainlessMat} />
      </Entity>
      <Entity name="CafeTableBase" position={[0, 0.02, 1.0]} scale={[0.9, 0.04, 0.9]}>
        <Render type="cylinder" material={stainlessMat} />
      </Entity>

      {/* 7. Bar Stools */}
      {[-0.9, 0.9].map((x, i) => (
        <Entity key={`stool-${i}`} name={`Stool-${i}`} position={[x, 0, 1.0]}>
          <Entity position={[0, 0.7, 0]} scale={[0.4, 0.06, 0.4]}>
            <Render type="cylinder" material={counterMat} />
          </Entity>
          <Entity position={[0, 0.35, 0]} scale={[0.06, 0.7, 0.06]}>
            <Render type="cylinder" material={stainlessMat} />
          </Entity>
        </Entity>
      ))}
    </Entity>
  );
};
