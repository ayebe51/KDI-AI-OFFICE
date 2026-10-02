// ==========================================================
// 3d-r3f/floors/OpenSpaceFloor3D.tsx
// High-Fidelity Floor 2: Creative Studio, Design Lab & Collaboration Lounge
// - Solid Perimeter Walls (North with Wall-Flush Elevator, West/East Windows, South Mezzanine)
// - Creative & UI/UX Design Lab (Alya - Lead Designer, iMac, Drawing Tablet, Moodboard)
// - Green Screen Studio (Softbox Lighting & Tripod Camera)
// - Brand & Collaboration Lounge (Danang - Marketing Lead, Coffee Bar, L-Sofa)
// - Futuristic Sleep Pods
// - True 3D Typography Signboard (@react-three/drei <Text>)
// ==========================================================

import React from 'react';
import { Html, Text } from '@react-three/drei';
import { CozyBox, CozyMat } from '../materials/CozyMaterials.js';
import { ChibiAvatar3D } from '../character/ChibiAvatar3D.js';

export interface OpenSpaceFloor3DProps {
  playerPos?: [number, number, number];
  onCallLift?: () => void;
  onInspectStudio?: () => void;
  onTalkAlya?: () => void;
  onTalkDanang?: () => void;
  onRestSleepPod?: () => void;
}

export const OpenSpaceFloor3D: React.FC<OpenSpaceFloor3DProps> = ({
  playerPos,
  onCallLift,
  onInspectStudio,
  onTalkAlya,
  onTalkDanang,
  onRestSleepPod,
}) => {
  const [px, , pz] = playerPos ?? [0, 0, 7];

  const distAlya = Math.hypot(px - (-6.3), pz - (-0.5));
  const distDanang = Math.hypot(px - 10.4, pz - 1.0);

  const npcs = [
    { id: 'alya', dist: distAlya, max: 2.0 },
    { id: 'danang', dist: distDanang, max: 2.0 },
  ];
  const activeNpc = npcs
    .filter((n) => n.dist < n.max)
    .sort((a, b) => a.dist - b.dist)[0]?.id ?? null;

  const isNearAlya = activeNpc === 'alya';
  const isNearDanang = activeNpc === 'danang';
  const isNearLift = Math.hypot(px - 7.5, pz - (-8.9)) < 2.5;
  const isNearSleepPods = Math.hypot(px - 0.5, pz - (-5.5)) < 2.5;

  return (
    <group position={[0, 0, 0]}>
      {/* ── 0. FLOOR 2 CEILING LIGHTS GRID (Warm & bright 24/7) ── */}
      <group position={[0, 3.4, 0]}>
        <pointLight position={[-6.5, 0, 0]} color="#fffbeb" intensity={1.6} distance={9} />
        <pointLight position={[6.5, 0, 0]} color="#e0f2fe" intensity={1.6} distance={9} />
        <pointLight position={[0, 0, -4.5]} color="#fef08a" intensity={1.3} distance={7} />
        <pointLight position={[0, 0, 4.0]} color="#fff7ed" intensity={1.3} distance={7} />
      </group>

      {/* ── 1. DIORAMA BASE & SOLID PERIMETER ARCHITECTURE ── */}
      {/* Thick Foundation Podium (Eliminates void underneath) */}
      <CozyBox size={[26.8, 0.8, 18.8]} pos={[0, -0.41, 0]} color="#1b1626" r={0.06} receive />

      {/* Main Studio Parquet Flooring */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.008, 0]} receiveShadow>
        <planeGeometry args={[26, 18]} />
        <CozyMat color="#f1f5f9" rough={0.7} />
      </mesh>

      {/* Creative Studio Zone Wood Parquet (West Wing) */}
      <mesh rotation-x={-Math.PI / 2} position={[-6.5, -0.004, 0]} receiveShadow>
        <planeGeometry args={[12.5, 17.5]} />
        <CozyMat color="#fef3c7" rough={0.65} />
      </mesh>

      {/* Collaboration Lounge Teal Carpet (East Wing) */}
      <mesh rotation-x={-Math.PI / 2} position={[6.5, -0.004, 0]} receiveShadow>
        <planeGeometry args={[12.5, 17.5]} />
        <CozyMat color="#e0f2fe" rough={0.8} />
      </mesh>

      {/* ── SOLID OUTER WALLS ── */}
      {/* North Wall (Back Wall: z = -9) */}
      <CozyBox size={[26.4, 4.4, 0.4]} pos={[0, 2.2, -9.2]} color="#f8fafc" r={0.03} cast receive />
      {/* Acoustic Wood Slats behind Creative Sign */}
      {[-2.5, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5].map((sx) => (
        <mesh key={sx} position={[sx, 2.2, -8.96]} castShadow>
          <boxGeometry args={[0.12, 4.3, 0.05]} />
          <CozyMat color="#d4a373" rough={0.6} />
        </mesh>
      ))}

      {/* West Wall (x = -13) with Panoramic Ribbon Windows */}
      <CozyBox size={[0.4, 4.4, 18.4]} pos={[-13.2, 2.2, 0]} color="#f8fafc" r={0.03} cast receive />
      {[-4.5, 0, 4.5].map((wz) => (
        <group key={wz} position={[-12.98, 2.5, wz]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 2.2, 3.8]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <mesh position={[0.04, 0, 0]}>
            <planeGeometry args={[3.6, 2.0]} />
            <CozyMat color="#bae6fd" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}

      {/* East Wall (x = 13) with Panoramic Windows */}
      <CozyBox size={[0.4, 4.4, 18.4]} pos={[13.2, 2.2, 0]} color="#f8fafc" r={0.03} cast receive />
      {[-4.5, 0, 4.5].map((ez) => (
        <group key={ez} position={[12.98, 2.5, ez]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 2.2, 3.8]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <mesh position={[-0.04, 0, 0]}>
            <planeGeometry args={[3.6, 2.0]} />
            <CozyMat color="#bae6fd" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}

      {/* South Wall (z = 9) - Modern Mezzanine Balustrade Glass Railing */}
      <group position={[0, 0, 9.0]}>
        <CozyBox size={[26.4, 0.35, 0.3]} pos={[0, 0.18, 0]} color="#1e293b" r={0.02} cast />
        {/* Glass Railing Panels */}
        {[-9, -4.5, 0, 4.5, 9].map((rx) => (
          <group key={rx} position={[rx, 0.75, 0]}>
            <mesh>
              <boxGeometry args={[4.2, 0.85, 0.04]} />
              <CozyMat color="#bae6fd" transparent opacity={0.35} rough={0.05} />
            </mesh>
            {/* Metal Railing Top Handrail */}
            <mesh position={[0, 0.44, 0]}>
              <boxGeometry args={[4.4, 0.05, 0.08]} />
              <CozyMat color="#334155" metal={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 2. FLOOR 2 3D NEON SIGNBOARD (North Wall Center: z = -9) ── */}
      <group position={[0, 3.3, -8.95]}>
        <CozyBox size={[8.2, 1.2, 0.1]} pos={[0, 0, 0]} color="#0f172a" r={0.05} cast />
        <Text
          position={[0, 0.2, 0.08]}
          fontSize={0.24}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
          outlineWidth={0.01}
          outlineColor="#1e293b"
        >
          KDI CREATIVE STUDIO & DESIGN LAB
        </Text>
        <Text
          position={[0, -0.18, 0.08]}
          fontSize={0.1}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
          outlineWidth={0.007}
          outlineColor="#0f172a"
        >
          UI/UX INNOVATION • BRAND STORYTELLING • REST WELLNESS
        </Text>
        <pointLight position={[0, 0, 0.4]} color="#fef08a" intensity={0.8} distance={4.5} />
      </group>

      {/* ── 3. WALL-FLUSH INTEGRATED ELEVATOR LIFT (Matching Floor 1 Shaft: x = 7.5, z = -9) ── */}
      <group position={[7.5, 0, -8.9]} onClick={onCallLift} onPointerDown={onCallLift}>
        <CozyBox size={[2.8, 3.4, 0.25]} pos={[0, 1.7, 0.1]} color="#1e293b" r={0.04} cast receive />

        {/* Double Sliding Brushed Stainless Steel Doors */}
        {[-0.6, 0.6].map((ex) => (
          <group key={ex} position={[ex, 1.4, 0.18]}>
            <mesh>
              <boxGeometry args={[1.1, 2.6, 0.05]} />
              <CozyMat color="#94a3b8" metal={0.8} rough={0.25} />
            </mesh>
          </group>
        ))}

        {/* Digital Cyan Floor Display */}
        <group position={[0, 2.95, 0.25]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.3, 0.04]} />
            <CozyMat color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.74, 0.24]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
          <Text position={[0, 0, 0.035]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle">
            L2 ▲ L1 / R
          </Text>
        </group>

        {/* Wall Call Button Panel */}
        <group position={[1.65, 1.35, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.16, 0.45, 0.04]} />
            <CozyMat color="#334155" metal={0.7} />
          </mesh>
          <mesh position={[0, 0.08, 0.025]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[0, -0.08, 0.025]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        </group>

        <pointLight position={[0, 3.1, 0.6]} color="#e0f2fe" intensity={0.7} distance={4} />

        {/* Clean Proximity / Click Badge */}
        {isNearLift && (
          <Html position={[0, 3.2, 0.2]} center distanceFactor={11} occlude style={{ transform: 'scale(0.55)' }}>
            <div className="flex items-center gap-1 whitespace-nowrap select-none pointer-events-none animate-in fade-in">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white bg-slate-900 shadow-md border border-slate-700">
                🛗 Lift Lantai
              </span>
              <span className="rounded-md bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[10px] font-black shadow-md">
                E
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 4. ROOM ZONING PARTITIONS (Creative Studio vs Lounge Divider at x = 0) ── */}
      <group position={[0, 0, 0]}>
        {/* Slat Wood Vertical Architectural Screen */}
        {[-2.5, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5].map((pz) => (
          <mesh key={pz} position={[0, 1.6, pz]} castShadow>
            <boxGeometry args={[0.08, 3.2, 0.12]} />
            <CozyMat color="#cdb296" rough={0.6} />
          </mesh>
        ))}
        {/* Lower Solid Planter Base with Lush Greenery */}
        <CozyBox size={[0.35, 0.4, 5.6]} pos={[0, 0.2, 0]} color="#1e293b" r={0.04} cast />
        {[-2.0, -1.0, 0, 1.0, 2.0].map((pz) => (
          <mesh key={pz} position={[0, 0.5, pz]} castShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <CozyMat color="#16a34a" />
          </mesh>
        ))}
      </group>

      {/* ── 5. CREATIVE & UI/UX DESIGN LAB (West Wing: x = -7.5, z = -1.0) ── */}
      <group position={[-7.5, 0, -1.0]}>
        {/* Studio Floor Platform Riser */}
        <CozyBox size={[9.6, 0.08, 7.5]} pos={[0, 0.04, 0]} color="#fef9c3" r={0.04} cast receive />

        {/* Green Screen Video Production Backdrop (North edge) */}
        <mesh position={[0, 1.8, -3.4]} castShadow receiveShadow>
          <planeGeometry args={[7.2, 3.4]} />
          <CozyMat color="#10b981" rough={0.95} />
        </mesh>

        {/* Studio Softbox Lighting Stand on the left */}
        <group position={[-3.6, 0, -1.5]}>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.03, 2.4, 8]} />
            <CozyMat color="#334155" />
          </mesh>
          <mesh position={[0, 2.4, 0]} rotation-x={0.3} rotation-y={0.5} castShadow>
            <boxGeometry args={[0.6, 0.8, 0.2]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <pointLight position={[0.2, 2.4, 0.2]} color="#ffffff" intensity={0.9} distance={5} />
        </group>

        {/* Studio Tripod Camera */}
        <group position={[-2.4, 0, 1.2]}>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0.65, 0]} rotation-z={x > 0 ? -0.15 : 0.15} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 1.3, 8]} />
              <CozyMat color="#1e293b" />
            </mesh>
          ))}
          <mesh position={[0, 0.65, 0.2]} rotation-x={-0.15} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 1.3, 8]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <CozyBox size={[0.35, 0.25, 0.45]} pos={[0, 1.35, 0]} color="#0f172a" r={0.04} cast />
          <mesh position={[0, 1.35, -0.26]} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.16, 16]} />
            <CozyMat color="#334155" metal={0.6} />
          </mesh>
        </group>

        {/* ── Alya's Modern UI/UX Design Workstation ── */}
        <group position={[1.2, 0, 0.5]} onClick={onTalkAlya || onInspectStudio}>
          {/* Wooden Curved Design Desk (Proportional height: 0.46m top surface) */}
          <CozyBox size={[2.4, 0.42, 0.9]} pos={[0, 0.21, 0]} color="#f1f5f9" r={0.04} cast receive />
          <CozyBox size={[2.5, 0.04, 0.95]} pos={[0, 0.44, 0]} color="#f1f5f9" r={0.03} cast />

          {/* Large Apple Studio Display mounted NW behind shoulder (Screen faces South-East, Alya 100% visible) */}
          <group position={[-0.75, 0.65, -0.2]} rotation-y={0.45}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[0.72, 0.40, 0.03]} />
              <CozyMat color="#e2e8f0" metal={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.68, 0.36]} />
              <meshBasicMaterial color="#ec4899" />
            </mesh>
            <mesh position={[0, -0.19, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
              <CozyMat color="#94a3b8" metal={0.8} />
            </mesh>
          </group>

          {/* Wacom Drawing Tablet in front of Alya */}
          <mesh position={[0, 0.47, -0.12]} rotation-x={-0.12}>
            <boxGeometry args={[0.42, 0.015, 0.28]} />
            <CozyMat color="#0f172a" />
          </mesh>

          {/* Pantone Color Swatches & Sketchbook on the right */}
          <mesh position={[0.7, 0.47, -0.12]}>
            <boxGeometry args={[0.22, 0.02, 0.3]} />
            <CozyMat color="#f43f5e" />
          </mesh>

          {/* Ergonomic Coral Studio Chair */}
          <CozyBox size={[0.46, 0.08, 0.46]} pos={[0, 0.24, -0.42]} color="#ec4899" r={0.03} cast />
          <CozyBox size={[0.44, 0.32, 0.05]} pos={[0, 0.44, -0.60]} color="#ec4899" r={0.03} cast />

          {/* Alya NPC Avatar: Seated facing South-East (Elevated y=0.36, 100% Unobstructed & Visible!) */}
          <ChibiAvatar3D
            look={{
              skin: '#f3cfa0',
              hair: '#7a4fa3',
              hairStyle: 'hijab',
              top: '#c77dff',
              pants: '#1e293b',
              outfit: 'polo',
            }}
            motion={{ speed: 0, sit: true, typing: true }}
            position={[0, 0.36, -0.38]}
            rotationY={0.2}
            name="Alya (Creative Strategist)"
            role="Content & Studio Lead"
            accentColor="#c77dff"
            isInteractable
            isNearby={isNearAlya}
            onClick={onTalkAlya || onInspectStudio}
          />
        </group>

        {/* Brainstorming Glass Board on North-East side of studio */}
        <group position={[3.2, 1.6, -1.8]}>
          <mesh castShadow>
            <boxGeometry args={[2.2, 1.8, 0.05]} />
            <CozyMat color="#bae6fd" transparent opacity={0.4} />
          </mesh>
          {/* Post-it notes on board */}
          {[-0.6, 0, 0.6].map((nx, ni) => (
            <mesh key={ni} position={[nx, 0.2 * (ni % 2 === 0 ? 1 : -1), 0.03]}>
              <planeGeometry args={[0.25, 0.25]} />
              <CozyMat color={ni === 0 ? '#fef08a' : ni === 1 ? '#a7f3d0' : '#fbcfe8'} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ── 6. FUTURISTIC SLEEP & WELLNESS PODS (North Center: x = 0.5, z = -5.5) ── */}
      <group position={[0.5, 0, -5.5]} onClick={onRestSleepPod}>
        {[-1.8, 1.8].map((px, idx) => (
          <group key={idx} position={[px, 0, 0]}>
            <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.95, 0.95, 2.4, 24]} />
              <CozyMat color="#e2e8f0" rough={0.35} />
            </mesh>
            <mesh position={[0, 0.9, 0.45]}>
              <cylinderGeometry args={[0.8, 0.8, 2.0, 20, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.65} />
            </mesh>
            <pointLight position={[0, 0.9, 0.5]} color="#fef08a" intensity={0.6} distance={3.5} />
          </group>
        ))}

        {isNearSleepPods && (
          <Html position={[0, 2.1, 0]} center distanceFactor={11} occlude style={{ transform: 'scale(0.55)' }}>
            <div className="flex items-center gap-1 whitespace-nowrap select-none pointer-events-none animate-in fade-in">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-slate-800 bg-amber-100 shadow-md border border-amber-200">
                💤 Sleep Wellness Pods
              </span>
              <span className="rounded-md bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[10px] font-black shadow-md">
                E
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 7. BRAND & COLLABORATION LOUNGE (East Wing: x = 6.8, z = 1.0) ── */}
      <group position={[6.8, 0, 1.0]}>
        {/* Modern L-Shaped Sectional Sofa Lounge */}
        <group position={[-1.2, 0, 0.8]}>
          <CozyBox size={[3.2, 0.42, 1.0]} pos={[0, 0.22, 0]} color="#1e293b" r={0.08} cast receive />
          <CozyBox size={[3.2, 0.48, 0.28]} pos={[0, 0.65, -0.42]} color="#1e293b" r={0.08} cast />
          <CozyBox size={[1.0, 0.42, 2.0]} pos={[1.1, 0.22, 1.4]} color="#1e293b" r={0.08} cast receive />

          {/* Coffee Table with Books & Magazine */}
          <group position={[0, 0, 1.2]}>
            <CozyBox size={[1.4, 0.28, 0.8]} pos={[0, 0.16, 0]} color="#d4a373" r={0.04} cast receive />
            <mesh position={[-0.2, 0.32, 0]}>
              <boxGeometry args={[0.3, 0.02, 0.22]} />
              <CozyMat color="#0284c7" />
            </mesh>
          </group>
        </group>

        {/* ── Barista Coffee Bar Counter & Danang NPC ── */}
        <group position={[3.6, 0, 0]} onClick={onTalkDanang}>
          {/* Wooden Bar Counter (Proportional height: 0.74m top surface) */}
          <CozyBox size={[1.1, 0.68, 3.2]} pos={[0, 0.34, 0]} color="#0f172a" r={0.05} cast receive />
          <CozyBox size={[1.25, 0.06, 3.3]} pos={[0, 0.71, 0]} color="#f4efe6" r={0.04} cast />

          {/* Commercial Espresso Machine on Counter */}
          <CozyBox size={[0.45, 0.38, 0.7]} pos={[-0.1, 0.93, -0.6]} color="#475569" r={0.04} cast />

          {/* High Bar Stools on the guest side (West side of counter) */}
          {[-0.8, 0.8].map((sz) => (
            <group key={sz} position={[-1.0, 0, sz]}>
              <mesh position={[0, 0.48, 0]} castShadow>
                <cylinderGeometry args={[0.20, 0.18, 0.06, 16]} />
                <CozyMat color="#d4a373" />
              </mesh>
              <mesh position={[0, 0.24, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.03, 0.48, 8]} />
                <CozyMat color="#1e293b" metal={0.8} />
              </mesh>
            </group>
          ))}

          {/* Danang NPC Avatar: Brand & Marketing Lead (Standing freely BEHIND bar counter, elevated y=0.24) */}
          <ChibiAvatar3D
            look={{
              skin: '#f9d2be',
              hair: '#18181b',
              hairStyle: 'short',
              top: '#059669',
              pants: '#1e293b',
              outfit: 'polo',
            }}
            motion={{ speed: 0, wave: true }}
            position={[0.95, 0.24, 0.2]}
            rotationY={-Math.PI / 3}
            name="Danang (Marketing Lead)"
            role="Brand & Partnership"
            accentColor="#059669"
            isInteractable
            isNearby={isNearDanang}
            onClick={onTalkDanang}
          />
        </group>
      </group>
    </group>
  );
};
