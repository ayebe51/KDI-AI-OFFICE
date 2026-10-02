// ==========================================================
// 3d-r3f/floors/YardFloor3D.tsx
// High-Fidelity Front Yard Environment in React Three Fiber
// Grass, Walkways, Fountain, Food Cart Pak Joko, Vehicles & Trees
// ==========================================================

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { CozyBox, CozyMat } from '../materials/CozyMaterials.js';
import { ChibiAvatar3D } from '../character/ChibiAvatar3D.js';

export interface YardFloor3DProps {
  onOpenFoodCart?: () => void;
  onEnterLobby?: () => void;
  playerNearCart?: boolean;
}

export const YardFloor3D: React.FC<YardFloor3DProps> = ({
  onOpenFoodCart,
  onEnterLobby,
  playerNearCart = false,
}) => {
  const fountainWaterRef = useRef<THREE.Mesh>(null);

  // Animated water shimmer
  useFrame(({ clock }) => {
    if (fountainWaterRef.current) {
      const t = clock.elapsedTime;
      fountainWaterRef.current.position.y = 0.58 + 0.015 * Math.sin(3 * t);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. GROUND TILES & PATHWAYS ── */}
      {/* Base Lawn / Grass */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[32, 20]} />
        <CozyMat color="#d8f3dc" rough={0.9} />
      </mesh>

      {/* Paved Walkway towards Office Portal */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, -1]} receiveShadow>
        <planeGeometry args={[5, 14]} />
        <CozyMat color="#efe2c8" rough={0.8} />
      </mesh>

      {/* Front Road & Sidewalk at the South Border */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 7.5]} receiveShadow>
        <planeGeometry args={[32, 3]} />
        <CozyMat color="#3a3f4b" rough={0.85} />
      </mesh>
      {/* Road White Dashes */}
      {[-10, -5, 0, 5, 10].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.006, 7.5]}>
          <planeGeometry args={[2, 0.2]} />
          <CozyMat color="#f8fafc" />
        </mesh>
      ))}

      {/* ── 2. WATER FOUNTAIN (Left courtyard: x = -7, z = 0.4) ── */}
      <group position={[-7, 0, 0.4]}>
        {/* Outer Pool Basin */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.6, 0.4, 28]} />
          <CozyMat color="#e2e8f0" rough={0.7} />
        </mesh>
        {/* Tier 2 Basin */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.8, 0.35, 20]} />
          <CozyMat color="#cbd5e1" rough={0.65} />
        </mesh>
        {/* Central Fountain Pillar */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.7, 16]} />
          <CozyMat color="#94a3b8" />
        </mesh>
        {/* Animated Water Surface */}
        <mesh ref={fountainWaterRef} rotation-x={-Math.PI / 2} position={[0, 0.58, 0]}>
          <circleGeometry args={[1.35, 28]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.2} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* ── 3. PARK BENCHES ── */}
      {[
        { pos: [-5.6, 0, -4.3] as [number, number, number], rot: 0 },
        { pos: [-3.2, 0, 3.1] as [number, number, number], rot: Math.PI },
      ].map((b, i) => (
        <group key={i} position={b.pos} rotation-y={b.rot}>
          <CozyBox size={[1.6, 0.08, 0.45]} pos={[0, 0.35, 0]} color="#cdbda4" r={0.03} cast />
          <CozyBox size={[1.6, 0.35, 0.08]} pos={[0, 0.6, -0.2]} color="#cdbda4" r={0.03} cast />
          <CozyBox size={[0.1, 0.32, 0.42]} pos={[-0.7, 0.16, 0]} color="#3a3f4b" r={0.02} cast />
          <CozyBox size={[0.1, 0.32, 0.42]} pos={[0.7, 0.16, 0]} color="#3a3f4b" r={0.02} cast />
        </group>
      ))}

      {/* ── 4. FLOWER BEDS & PLANTERS (Placed neatly under facade windows, never blocking doors!) ── */}
      {[-8.5, -4.8, 4.8, 8.5].map((x, i) => (
        <group key={i} position={[x, 0, -8.2]}>
          <CozyBox size={[2.6, 0.35, 0.55]} pos={[0, 0.18, 0]} color="#c9a27a" r={0.04} cast receive />
          {/* Green hedge */}
          <CozyBox size={[2.4, 0.38, 0.45]} pos={[0, 0.42, 0]} color="#40916c" r={0.15} cast />
        </group>
      ))}

      {/* ── 4B. GLOBE STREET LAMPS FLANKING MAIN WALKWAY (Reference Style!) ── */}
      {[-2.8, 2.8].map((lx) =>
        [-2.0, 3.2].map((lz) => (
          <group key={`${lx}-${lz}`} position={[lx, 0, lz]}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.025, 0.035, 2.2, 8]} />
              <CozyMat color="#1e293b" />
            </mesh>
            <mesh position={[0, 2.25, 0]} castShadow>
              <sphereGeometry args={[0.16, 16, 12]} />
              <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={1.2} />
            </mesh>
            <pointLight position={[0, 2.25, 0]} color="#fef08a" intensity={0.4} distance={4} />
          </group>
        ))
      )}

      {/* ── 5. PAK JOKO FOOD CART (Relocated to Left Courtyard Plaza: x = -6.2, z = -5.0) ── */}
      <group
        position={[-6.2, 0, -5.0]}
        rotation-y={0.25}
        onClick={onOpenFoodCart}
        onPointerDown={onOpenFoodCart}
      >
        {/* Main Wooden Cart Body */}
        <CozyBox size={[1.7, 0.8, 0.9]} pos={[0, 0.55, 0]} color="#8a5a3c" r={0.06} cast receive />
        <CozyBox size={[1.85, 0.08, 1.05]} pos={[0, 0.98, 0]} color="#f4efe6" r={0.04} cast />

        {/* Big Cart Wheels */}
        {[-0.6, 0.6].map((x) => (
          <group key={x} position={[x, 0.3, 0.48]}>
            <mesh rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />
              <CozyMat color="#4a3728" rough={0.7} />
            </mesh>
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.08, 0.08, 0.1, 10]} />
              <CozyMat color="#1a1a1f" />
            </mesh>
          </group>
        ))}

        {/* 4 Canopy Support Pillars */}
        {[
          [-0.8, -0.4],
          [0.8, -0.4],
          [-0.8, 0.4],
          [0.8, 0.4],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.5, pz]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 1.0, 8]} />
            <CozyMat color="#3a3f4b" metal={0.4} />
          </mesh>
        ))}

        {/* Striped Canopy Roof (Warm terracotta & cream) */}
        <CozyBox size={[1.9, 0.22, 1.15]} pos={[0, 2.05, 0]} color="#e8765d" r={0.08} cast />
        {/* Scalloped striped edge */}
        <mesh position={[0, 1.95, 0.59]} castShadow>
          <boxGeometry args={[1.9, 0.12, 0.04]} />
          <CozyMat color="#fffaf0" />
        </mesh>

        {/* Barista Kettle & Coffee Cups */}
        <mesh position={[-0.4, 1.1, 0.1]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 0.2, 12]} />
          <CozyMat color="#d97706" metal={0.5} rough={0.3} />
        </mesh>
        {[0.1, 0.35].map((cx) => (
          <mesh key={cx} position={[cx, 1.06, 0.15]} castShadow>
            <cylinderGeometry args={[0.04, 0.035, 0.08, 10]} />
            <CozyMat color="#ffffff" />
          </mesh>
        ))}

        {/* Warm Lantern hanging from canopy */}
        <group position={[0.7, 1.8, 0.45]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.16, 0.12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
          <pointLight color="#fbbf24" intensity={0.8} distance={3} />
        </group>

        {/* Pak Joko NPC (Hospitality Barista) standing behind cart */}
        <ChibiAvatar3D
          look={{
            skin: '#c98e62',
            hair: '#2a1d14',
            hairStyle: 'short',
            top: '#8a5a3c',
            pants: '#3a3f4b',
            outfit: 'polo',
          }}
          motion={{ speed: 0, wave: true }}
          position={[0, 0, -0.85]}
          rotationY={0}
          name="Pak Joko (Kopi Corner)"
          role="Cafe & Hospitality Host"
          accentColor="#d97706"
          isInteractable
          onClick={onOpenFoodCart}
        />
      </group>

      {/* ── 6. PARKED CHIBI VEHICLES (Right parking bay) ── */}
      {/* Cute Rounded Sedan (x = 4.5, z = 1.0) */}
      <group position={[4.5, 0, 1.0]} rotation-y={-Math.PI / 10}>
        {/* Car Lower Chassis */}
        <CozyBox size={[1.9, 0.45, 3.6]} pos={[0, 0.35, 0]} color="#3b82f6" r={0.15} cast receive />
        {/* Car Cabin Roof */}
        <CozyBox size={[1.6, 0.45, 2.0]} pos={[0, 0.75, -0.1]} color="#2563eb" r={0.12} cast />
        {/* Windshield */}
        <mesh position={[0, 0.72, 0.92]} rotation-x={-0.3}>
          <planeGeometry args={[1.4, 0.38]} />
          <CozyMat color="#e0f2fe" rough={0.1} />
        </mesh>
        {/* Wheels */}
        {[
          [-0.98, 0.22, 1.0],
          [0.98, 0.22, 1.0],
          [-0.98, 0.22, -1.0],
          [0.98, 0.22, -1.0],
        ].map(([wx, wy, wz], wi) => (
          <mesh key={wi} position={[wx, wy, wz]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
            <CozyMat color="#1e293b" rough={0.7} />
          </mesh>
        ))}
      </group>

      {/* Commuter Scooter (x = 8.5, z = 1.2) */}
      <group position={[8.5, 0, 1.2]} rotation-y={0.2}>
        <CozyBox size={[0.3, 0.4, 1.3]} pos={[0, 0.3, 0]} color="#f43f5e" r={0.08} cast />
        <mesh position={[0, 0.65, 0.4]} rotation-x={-0.2} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
          <CozyMat color="#475569" />
        </mesh>
        {[
          [0, 0.16, 0.55],
          [0, 0.16, -0.55],
        ].map(([sx, sy, sz], si) => (
          <mesh key={si} position={[sx, sy, sz]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.08, 14]} />
            <CozyMat color="#0f172a" />
          </mesh>
        ))}
      </group>

      {/* ── 7. LUSH TREES (Multi-sphere foliage) ── */}
      {[
        [-11.6, -1.6],
        [-3.6, -1.5],
        [-11.3, 1.5],
        [11.5, -2.5],
        [12.0, 2.5],
      ].map(([tx, tz], ti) => (
        <group key={ti} position={[tx, 0, tz]}>
          {/* Tree Trunk */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.4, 10]} />
            <CozyMat color="#78350f" rough={0.9} />
          </mesh>
          {/* Foliage Spheres */}
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[0.85, 16, 12]} />
            <CozyMat color="#16a34a" rough={0.8} />
          </mesh>
          <mesh position={[-0.3, 2.1, 0.2]} castShadow>
            <sphereGeometry args={[0.65, 14, 10]} />
            <CozyMat color="#22c55e" rough={0.8} />
          </mesh>
          <mesh position={[0.3, 2.0, -0.2]} castShadow>
            <sphereGeometry args={[0.7, 14, 10]} />
            <CozyMat color="#15803d" rough={0.8} />
          </mesh>
        </group>
      ))}

      {/* ── 8. MODERN 2-STORY OFFICE BUILDING FACADE (North Perimeter) ── */}
      <group position={[0, 0, 0]}>
        {/* Main 2-Story Building Core Volume */}
        <CozyBox size={[32.0, 7.5, 2.0]} pos={[0, 3.75, -10.0]} color="#f1f5f9" r={0.04} cast receive />

        {/* Foundation Base Plinth */}
        <CozyBox size={[32.0, 0.4, 2.2]} pos={[0, 0.2, -9.95]} color="#334155" r={0.02} />

        {/* Roof Cornice / Coping Trim */}
        <CozyBox size={[32.4, 0.35, 2.3]} pos={[0, 7.6, -9.9]} color="#1e293b" r={0.03} cast />

        {/* Intermediate Floor Spandrel Band (Separating 1st & 2nd floor) */}
        <CozyBox size={[32.2, 0.5, 2.2]} pos={[0, 3.8, -9.9]} color="#1e293b" r={0.03} cast />

        {/* 1st Floor Glass Curtain Walls (Left & Right Wings) */}
        {[-9.0, 9.0].map((bayX) => (
          <group key={bayX} position={[bayX, 1.8, -8.9]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[11.5, 2.9, 0.1]} />
              <CozyMat color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <planeGeometry args={[11.2, 2.6]} />
              <CozyMat color="#bae6fd" transparent opacity={0.65} rough={0.1} />
            </mesh>
            {/* Vertical Mullions */}
            {[-4, -2, 0, 2, 4].map((mx) => (
              <mesh key={mx} position={[mx, 0, 0.08]}>
                <boxGeometry args={[0.08, 2.8, 0.05]} />
                <CozyMat color="#1e293b" metal={0.6} />
              </mesh>
            ))}
          </group>
        ))}

        {/* 2nd Floor Repeating Ribbon Windows */}
        {[-12.0, -8.6, -5.2, -1.8, 1.8, 5.2, 8.6, 12.0].map((wx) => (
          <group key={wx} position={[wx, 5.6, -8.9]}>
            <mesh castShadow>
              <boxGeometry args={[2.6, 2.2, 0.1]} />
              <CozyMat color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <planeGeometry args={[2.4, 2.0]} />
              <CozyMat color="#7dd3fc" transparent opacity={0.55} rough={0.15} />
            </mesh>
          </group>
        ))}

        {/* ── CENTRAL ENTRANCE PORTAL & CANOPY ── */}
        <group position={[0, 0, -8.5]} onClick={onEnterLobby}>
          {/* Black Aluminium Entrance Portal Frame */}
          <CozyBox size={[5.6, 3.5, 0.35]} pos={[0, 1.75, -0.2]} color="#0f172a" r={0.04} cast />

          {/* Automatic Double Sliding Glass Doors */}
          {[-1.1, 1.1].map((dx) => (
            <group key={dx} position={[dx, 1.45, -0.05]}>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.9, 2.7, 0.05]} />
                <CozyMat color="#bae6fd" transparent opacity={0.4} rough={0.05} />
              </mesh>
              {/* Stainless Steel Vertical Door Handles */}
              <mesh position={[dx > 0 ? -0.8 : 0.8, 0, 0.06]}>
                <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
                <CozyMat color="#e2e8f0" metal={0.8} rough={0.2} />
              </mesh>
            </group>
          ))}

          {/* Motion Sensor above doors */}
          <mesh position={[0, 3.0, 0]}>
            <boxGeometry args={[0.4, 0.1, 0.12]} />
            <CozyMat color="#38bdf8" />
          </mesh>

          {/* Cantilevered Glass & Emerald Canopy Awning (Reference style!) */}
          <group position={[0, 3.4, 0.6]}>
            {/* Main Canopy Glass Roof */}
            <CozyBox size={[6.2, 0.12, 2.2]} pos={[0, 0, 0]} color="#0f766e" r={0.03} cast />
            {/* Teal/Emerald Accent Front Trim */}
            <CozyBox size={[6.3, 0.18, 0.08]} pos={[0, 0, 1.1]} color="#14b8a6" r={0.02} />
            {/* Stainless Steel Canopy Tension Support Struts */}
            {[-2.7, 2.7].map((sx) => (
              <mesh key={sx} position={[sx, 0.7, -0.3]} rotation-x={0.65} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 1.8, 8]} />
                <CozyMat color="#cbd5e1" metal={0.8} />
              </mesh>
            ))}
          </group>

          {/* 3D Typographic Signboard on the Building Fascia */}
          <group position={[0, 4.4, -0.3]}>
            <Text
              position={[0, 0.2, 0.1]}
              fontSize={0.28}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.08}
              outlineWidth={0.012}
              outlineColor="#1e293b"
            >
              KONEKSI DIGITAL INOVASI
            </Text>
            <Text
              position={[0, -0.16, 0.1]}
              fontSize={0.11}
              color="#38bdf8"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.1}
              outlineWidth={0.008}
              outlineColor="#0f172a"
            >
              BUILD • SHIP • SCALE — AI HEADQUARTERS
            </Text>
            <pointLight position={[0, 0.5, 0.8]} color="#fef08a" intensity={0.9} distance={5} />
          </group>

          {/* Welcome Doormat on the walkway */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0.8]} receiveShadow>
            <planeGeometry args={[3.6, 1.3]} />
            <CozyMat color="#1e293b" rough={0.9} />
          </mesh>
          <Text
            position={[0, 0.02, 0.8]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.13}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            KDI WELCOME
          </Text>

          {/* Entrance Downlights */}
          {[-2.2, 2.2].map((lx) => (
            <group key={lx} position={[lx, 2.6, 0.05]}>
              <mesh castShadow>
                <boxGeometry args={[0.15, 0.35, 0.12]} />
                <CozyMat color="#1e293b" />
              </mesh>
              <pointLight color="#fed7aa" intensity={0.6} distance={3} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};
