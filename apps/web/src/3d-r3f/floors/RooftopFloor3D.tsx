// ==========================================================
// 3d-r3f/floors/RooftopFloor3D.tsx
// High-Fidelity Rooftop Garden & Lounge in React Three Fiber
// Wooden Deck, Glass Railing, Fire Pit, Bean Bags, Bar (Danang) & Fairy Lights
// ==========================================================

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CozyBox, CozyMat } from '../materials/CozyMaterials.js';
import { ChibiAvatar3D } from '../character/ChibiAvatar3D.js';

export interface RooftopFloor3DProps {
  onCallLift?: () => void;
  onOrderDrink?: () => void;
  onSitFirepit?: () => void;
}

export const RooftopFloor3D: React.FC<RooftopFloor3DProps> = ({
  onCallLift,
  onOrderDrink,
  onSitFirepit,
}) => {
  const fireEmberRef = useRef<THREE.Group>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);

  // Animated fire flicker
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fireEmberRef.current) {
      fireEmberRef.current.children.forEach((c, idx) => {
        const scale = 1 + 0.18 * Math.sin(t * (7 + 2 * idx) + idx);
        c.scale.set(scale, scale * (1 + 0.1 * Math.sin(11 * t + idx)), scale);
      });
    }
    if (fireLightRef.current) {
      fireLightRef.current.intensity = 1.6 + 0.4 * Math.sin(12 * t) + 0.2 * Math.sin(23 * t);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. ROOFTOP WOODEN DECK (26 x 14) ── */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[26, 14]} />
        <CozyMat color="#c79a6b" rough={0.8} />
      </mesh>
      {/* Under-deck dark concrete base */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
        <planeGeometry args={[27, 15]} />
        <CozyMat color="#475569" rough={0.9} />
      </mesh>

      {/* ── 2. GLASS BALUSTRADE PERIMETER RAILING ── */}
      {[
        { pos: [0, 0, -6.9] as [number, number, number], size: [26, 0.9, 0.05] as [number, number, number], rot: 0 },
        { pos: [0, 0, 6.9] as [number, number, number], size: [26, 0.9, 0.05] as [number, number, number], rot: 0 },
        { pos: [-12.9, 0, 0] as [number, number, number], size: [14, 0.9, 0.05] as [number, number, number], rot: Math.PI / 2 },
        { pos: [12.9, 0, 0] as [number, number, number], size: [14, 0.9, 0.05] as [number, number, number], rot: Math.PI / 2 },
      ].map((r, i) => (
        <group key={i} position={r.pos} rotation-y={r.rot}>
          {/* Glass Railing Pane */}
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[r.size[0], r.size[1], r.size[2]]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.3} roughness={0.1} />
          </mesh>
          {/* Chrome Top Rail */}
          <mesh position={[0, 1.12, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, r.size[0], 8]} />
            <CozyMat color="#e2e8f0" metal={0.8} rough={0.2} />
          </mesh>
        </group>
      ))}

      {/* ── 3. FIRE PIT & BEAN BAGS (Center West, x = -4, z = 0) ── */}
      <group position={[-4, 0, 0]}>
        {/* Circular Stone Blocks */}
        {Array.from({ length: 12 }, (_, idx) => {
          const angle = (idx / 12) * Math.PI * 2;
          return (
            <mesh
              key={idx}
              position={[1.1 * Math.cos(angle), 0.2, 1.1 * Math.sin(angle)]}
              rotation-y={-angle}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.45, 0.35, 0.25]} />
              <CozyMat color="#78716c" rough={0.9} />
            </mesh>
          );
        })}

        {/* Ash Pit Base */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
          <circleGeometry args={[0.95, 20]} />
          <CozyMat color="#292524" rough={1} />
        </mesh>

        {/* Animated Glowing Fire Embers */}
        <group ref={fireEmberRef} position={[0, 0.25, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.35, 12, 10]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[-0.12, 0.2, 0.08]}>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={1.5} />
          </mesh>
          <mesh position={[0.15, 0.18, -0.05]}>
            <sphereGeometry args={[0.26, 10, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.1} />
          </mesh>
        </group>
        <pointLight ref={fireLightRef} position={[0, 0.6, 0]} color="#fb923c" intensity={1.8} distance={8} castShadow />

        {/* Pastel Bean Bags encircling the fire pit */}
        {[
          { pos: [-1.8, 0, 0.8] as [number, number, number], color: '#e8765d' },
          { pos: [-1.4, 0, -1.6] as [number, number, number], color: '#2a9d8f' },
          { pos: [0.8, 0, -1.8] as [number, number, number], color: '#e9c46a' },
          { pos: [1.6, 0, 0.6] as [number, number, number], color: '#c77dff' },
        ].map((bg, bgi) => (
          <group key={bgi} position={bg.pos} onClick={onSitFirepit}>
            <mesh position={[0, 0.28, 0]} scale={[1, 0.65, 1]} castShadow receiveShadow>
              <sphereGeometry args={[0.48, 20, 16]} />
              <CozyMat color={bg.color} rough={0.95} />
            </mesh>
            <mesh position={[0, 0.45, -0.15]} scale={[0.9, 0.8, 0.6]} castShadow>
              <sphereGeometry args={[0.34, 16, 12]} />
              <CozyMat color={bg.color} rough={0.95} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 4. ROOFTOP TEAK BAR & DANANG NPC (Northwest, x = -8, z = -4.5) ── */}
      <group position={[-8, 0, -4.5]}>
        {/* Main Bar Counter */}
        <CozyBox size={[4.2, 1.05, 1.0]} pos={[0, 0.52, 0]} color="#8a5a3c" r={0.06} cast receive />
        <CozyBox size={[4.4, 0.08, 1.15]} pos={[0, 1.08, 0]} color="#f7efe2" r={0.04} cast />

        {/* Bar Shelf with Bottles */}
        <group position={[0, 1.4, -1.2]}>
          <CozyBox size={[3.8, 0.06, 0.35]} pos={[0, 0, 0]} color="#5c3d2e" r={0.02} />
          {[-1.2, -0.6, 0, 0.6, 1.2].map((bx, bxi) => (
            <mesh key={bxi} position={[bx, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 0.25, 10]} />
              <CozyMat color={['#38bdf8', '#fbbf24', '#f43f5e', '#34d399', '#a78bfa'][bxi]} rough={0.2} metal={0.3} />
            </mesh>
          ))}
        </group>

        {/* Budi NPC: Rooftop Lounge Host (Elevated y=0.22 behind bar counter) */}
        <ChibiAvatar3D
          look={{
            skin: '#d9a066',
            hair: '#1f1b1a',
            hairStyle: 'spiky',
            top: '#e07a5f',
            pants: '#1e293b',
            outfit: 'polo',
          }}
          motion={{ speed: 0, wave: true }}
          position={[0, 0.22, -0.6]}
          rotationY={0}
          name="Budi (Rooftop Host)"
          role="Community & Lounge Host"
          accentColor="#e07a5f"
          isInteractable
          onClick={onOrderDrink}
        />
      </group>

      {/* ── 5. WOODEN PERGOLA WITH WARM HANGING FAIRY LIGHTS (East Side, x = 1.5) ── */}
      <group position={[1.5, 0, 0]}>
        {/* 4 Wooden Corner Posts */}
        {[
          [-3.5, -4.5],
          [3.5, -4.5],
          [-3.5, 4.5],
          [3.5, 4.5],
        ].map(([px, pz], idx) => (
          <CozyBox key={idx} size={[0.2, 3.2, 0.2]} pos={[px, 1.6, pz]} color="#78350f" r={0.02} cast />
        ))}
        {/* Overhead Pergola Beams */}
        {[-3.5, -1.8, 0, 1.8, 3.5].map((bz, idx) => (
          <CozyBox key={idx} size={[7.6, 0.15, 0.15]} pos={[0, 3.2, bz]} color="#78350f" r={0.02} cast />
        ))}

        {/* Warm Glowing Hanging Fairy Lights */}
        {[-2.5, -0.8, 0.8, 2.5].map((lx) =>
          [-2.5, 0, 2.5].map((lz) => (
            <group key={`${lx}-${lz}`} position={[lx, 2.85, lz]}>
              <mesh castShadow>
                <sphereGeometry args={[0.07, 10, 8]} />
                <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={1.4} />
              </mesh>
              <pointLight color="#fef08a" intensity={0.35} distance={3} />
            </group>
          ))
        )}
      </group>

      {/* ── 6. ARCHITECTURAL ELEVATOR PENTHOUSE (Aligned with shaft at x = 7.5, North edge z = -5.8) ── */}
      <group
        position={[7.5, 0, -5.8]}
        onClick={onCallLift}
        onPointerDown={onCallLift}
      >
        {/* Solid Elevator Penthouse Housing Structure */}
        <CozyBox size={[3.2, 3.4, 2.0]} pos={[0, 1.7, -0.9]} color="#1e293b" r={0.04} cast receive />
        {/* Penthouse Roof Overhang & Canopy */}
        <CozyBox size={[3.5, 0.18, 2.3]} pos={[0, 3.45, -0.85]} color="#0f172a" r={0.03} cast />
        <CozyBox size={[3.4, 0.08, 0.8]} pos={[0, 3.1, 0.4]} color="#334155" r={0.03} cast />

        {/* Double Sliding Brushed Stainless Steel Doors */}
        {[-0.6, 0.6].map((ex) => (
          <group key={ex} position={[ex, 1.35, 0.12]}>
            <mesh castShadow>
              <boxGeometry args={[1.05, 2.5, 0.04]} />
              <CozyMat color="#94a3b8" metal={0.8} rough={0.25} />
            </mesh>
          </group>
        ))}

        {/* Digital Cyan Floor Display */}
        <group position={[0, 2.85, 0.18]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.28, 0.04]} />
            <CozyMat color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.74, 0.22]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
        </group>

        {/* Wall Call Button Panel */}
        <group position={[1.4, 1.3, 0.14]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.4, 0.04]} />
            <CozyMat color="#334155" metal={0.7} />
          </mesh>
          <mesh position={[0, 0.06, 0.025]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[0, -0.06, 0.025]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        </group>

        <pointLight position={[0, 3.0, 0.5]} color="#e0f2fe" intensity={0.8} distance={4.5} />

        {/* Scaled Crisp Lift Badge */}
        <Html position={[0, 3.3, 0.2]} center distanceFactor={11} occlude style={{ transform: 'scale(0.55)' }}>
          <div className="flex items-center gap-1.5 whitespace-nowrap select-none pointer-events-none">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white bg-slate-900 shadow-md border border-slate-700">
              🛗 Lift Lantai
            </span>
            <span className="rounded-md bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[10px] font-black shadow-md">
              E
            </span>
          </div>
        </Html>
      </group>
    </group>
  );
};
