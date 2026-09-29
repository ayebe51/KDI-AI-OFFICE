import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentState } from '@kdi/types';

interface AgentAvatarProps {
  state: AgentState;
  name: string;
  role: string;
  activitySummary?: string;
  position?: [number, number, number];
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  state,
  name,
  role,
  activitySummary,
  position = [0, 0, 0],
}) => {
  const isWorking = state === 'WORKING';
  const avatarGroup = useRef<THREE.Group>(null);
  const monitorGlow = useRef<THREE.MeshStandardMaterial>(null);

  // Subtle breathing / animation frame
  useFrame((stateThree) => {
    if (avatarGroup.current) {
      const t = stateThree.clock.getElapsedTime();
      // Subtle hovering or head bobbing
      avatarGroup.current.position.y = position[1] + (isWorking ? Math.sin(t * 4) * 0.02 : Math.sin(t * 1.5) * 0.01);
    }
  });

  return (
    <group position={position}>
      {/* ===================================== */}
      {/* 1. Office Desk & Equipment            */}
      {/* ===================================== */}
      {/* Desk Surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Desk Metal Legs */}
      <mesh position={[-0.8, 0.375, -0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 0.75]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.8, 0.375, -0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 0.75]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.8, 0.375, 0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 0.75]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.8, 0.375, 0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 0.75]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Primary Monitor */}
      <group position={[0, 1.15, -0.2]}>
        <mesh>
          <boxGeometry args={[0.7, 0.45, 0.03]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Monitor Screen Glow - Turns emerald green when WORKING, cyan/amber when IDLE */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.66, 0.41]} />
          <meshStandardMaterial
            ref={monitorGlow}
            color={isWorking ? '#10b981' : '#38bdf8'}
            emissive={isWorking ? '#059669' : '#0284c7'}
            emissiveIntensity={isWorking ? 0.9 : 0.4}
            roughness={0.2}
          />
        </mesh>
        {/* Monitor Stand */}
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* Ergonomic Office Chair */}
      <group position={[0, 0, 0.4]}>
        {/* Chair Seat */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        {/* Chair Backrest */}
        <mesh position={[0, 0.85, 0.22]}>
          <boxGeometry args={[0.5, 0.65, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        {/* Chair Base */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} />
        </mesh>
      </group>

      {/* ===================================== */}
      {/* 2. Stylized Low-Poly AI Avatar Figure */}
      {/* ===================================== */}
      <group ref={avatarGroup} position={[0, 0, 0.35]}>
        {/* Torso */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.18, 0.35, 4, 8]} />
          <meshStandardMaterial
            color={isWorking ? '#10b981' : '#3b82f6'}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.5} />
        </mesh>

        {/* Programmer Visor / Glasses with glow */}
        <mesh position={[0, 1.27, 0.11]}>
          <boxGeometry args={[0.18, 0.05, 0.06]} />
          <meshStandardMaterial
            color={isWorking ? '#34d399' : '#60a5fa'}
            emissive={isWorking ? '#10b981' : '#2563eb'}
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>

      {/* ===================================== */}
      {/* 3. Overhead Holographic Status Badge  */}
      {/* ===================================== */}
      <group position={[0, 1.75, 0]}>
        <Text
          position={[0, 0.18, 0]}
          fontSize={0.12}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#0f172a"
        >
          {name}
        </Text>
        <Text
          position={[0, 0, 0]}
          fontSize={0.09}
          color={isWorking ? '#34d399' : '#38bdf8'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#0f172a"
        >
          {`[ ${role} • ${state} ]`}
        </Text>
        {activitySummary && (
          <Text
            position={[0, -0.15, 0]}
            fontSize={0.07}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.0}
            textAlign="center"
          >
            {activitySummary}
          </Text>
        )}
      </group>
    </group>
  );
};
