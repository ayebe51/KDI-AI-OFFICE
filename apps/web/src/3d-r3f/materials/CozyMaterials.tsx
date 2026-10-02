// ==========================================================
// 3d-r3f/materials/CozyMaterials.tsx
// High-Fidelity Cozy Materials & Rounded Geometries using R3F & Drei
// ==========================================================

import React from 'react';
import { RoundedBox } from '@react-three/drei';

export interface CozyBoxProps {
  size: [number, number, number];
  pos?: [number, number, number];
  color: string;
  r?: number;
  rough?: number;
  metal?: number;
  cast?: boolean;
  receive?: boolean;
  children?: React.ReactNode;
  onClick?: (e: any) => void;
  onPointerDown?: (e: any) => void;
}

/** Rounded Box helper matching the cozy game reference with soft bevels */
export const CozyBox: React.FC<CozyBoxProps> = ({
  size,
  pos = [0, 0, 0],
  color,
  r = 0.06,
  rough = 0.75,
  metal = 0,
  cast = true,
  receive = true,
  children,
  onClick,
  onPointerDown,
}) => {
  const radius = Math.min(r, ...size.map((v) => v / 2 - 0.001));

  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={3}
      position={pos}
      castShadow={cast}
      receiveShadow={receive}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
      {children}
    </RoundedBox>
  );
};

export interface CozyMatProps {
  color: string;
  rough?: number;
  metal?: number;
  transparent?: boolean;
  opacity?: number;
}

export const CozyMat: React.FC<CozyMatProps> = ({
  color,
  rough = 0.75,
  metal = 0,
  transparent = false,
  opacity = 1,
}) => (
  <meshStandardMaterial
    color={color}
    roughness={rough}
    metalness={metal}
    transparent={transparent}
    opacity={opacity}
  />
);
