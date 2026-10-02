// ==========================================================
// 3d-r3f/floors/OfficeFloor3D.tsx
// High-Fidelity Ground Floor Office Interior in React Three Fiber
// - Low-Cutaway Perimeter Walls (Unobstructed Isometric Camera View)
// - Office Interior Ceiling Lights Grid (Bright & Warm 24/7)
// - Single Nearest NPC Selector (Zero Badge Overlap)
// - Enclosed Executive Manager Suite (Rian - Master Orchestrator, 100% Visible)
// - 4-Seater Modular Tech Pod (Farhan, Dimas, Hana, Ahmad, Ergonomic & Unblocked)
// - Ruang Rapat Utama (Glass Executive Boardroom, 6 Chairs, Smart TV 75", Whiteboard)
// - Musholla KDI (Serene Prayer Room, Shaf Carpet, Shoe Rack, Qibla Indicator)
// - Pantry KDI Lengkap (Kitchen Cabinets, Sink, 2-Door Fridge, Microwave, Barstools)
// - Wall-Flush Stainless Steel Elevator & Lobby Reception (Citra Host)
// ==========================================================

import React from 'react';
import { Html, Text } from '@react-three/drei';
import { CozyBox, CozyMat } from '../materials/CozyMaterials.js';
import { ChibiAvatar3D } from '../character/ChibiAvatar3D.js';

export interface OfficeFloor3DProps {
  playerPos?: [number, number, number];
  onTalkNaya?: () => void;
  onOpenPortfolio?: () => void;
  onOpenCEOCommand?: () => void;
  onCallLift?: () => void;
  onExitToYard?: () => void;
  onSelectAgent?: (id: string) => void;
  onTalkRian?: () => void;
  onTalkDimas?: () => void;
  onTalkHana?: () => void;
  onTalkAhmad?: () => void;
}

export const OfficeFloor3D: React.FC<OfficeFloor3DProps> = ({
  playerPos,
  onTalkNaya,
  onOpenPortfolio,
  onOpenCEOCommand,
  onCallLift,
  onExitToYard,
  onSelectAgent,
  onTalkRian,
  onTalkDimas,
  onTalkHana,
  onTalkAhmad,
}) => {
  // ── SINGLE NEAREST NPC SELECTOR: Mathematically guarantees max 1 NPC badge at any time ──
  const [px, , pz] = playerPos ?? [0, 0, 8.5];

  const distCitra = Math.hypot(px - 0, pz - (-7.0));
  const distRian = Math.hypot(px - (-10.3), pz - 6.5);
  const distFarhan = Math.hypot(px - 7.1, pz - (-0.4));
  const distDimas = Math.hypot(px - 9.5, pz - (-0.4));
  const distHana = Math.hypot(px - 7.1, pz - 3.2);
  const distAhmad = Math.hypot(px - 9.5, pz - 3.2);
  const distNaya = Math.hypot(px - (-8.5), pz - (-1.5));

  const npcs = [
    { id: 'citra', dist: distCitra, max: 2.2 },
    { id: 'rian', dist: distRian, max: 2.5 },
    { id: 'farhan', dist: distFarhan, max: 1.6 },
    { id: 'dimas', dist: distDimas, max: 1.6 },
    { id: 'hana', dist: distHana, max: 1.6 },
    { id: 'ahmad', dist: distAhmad, max: 1.6 },
    { id: 'naya', dist: distNaya, max: 2.2 },
  ];
  const activeNpc = npcs
    .filter((n) => n.dist < n.max)
    .sort((a, b) => a.dist - b.dist)[0]?.id ?? null;

  const isNearCitra = activeNpc === 'citra';
  const isNearRian = activeNpc === 'rian';
  const isNearFarhan = activeNpc === 'farhan';
  const isNearDimas = activeNpc === 'dimas';
  const isNearHana = activeNpc === 'hana';
  const isNearAhmad = activeNpc === 'ahmad';
  const isNearNaya = activeNpc === 'naya';

  const isNearLift = Math.hypot(px - 7.5, pz - (-11.2)) < 2.5;
  const isNearKios = Math.hypot(px - (-4.8), pz - (-6.5)) < 2.2;
  const isNearExit = Math.hypot(px - 0, pz - 11.0) < 2.2;

  return (
    <group position={[0, 0, 0]}>
      {/* ── 0. INTERIOR CEILING LIGHTS GRID (Bright, warm & inviting 24/7) ── */}
      <group position={[0, 3.4, 0]}>
        {/* Lobby lights */}
        <pointLight position={[0, 0, -7.5]} color="#fffbeb" intensity={1.8} distance={9} />
        <pointLight position={[-4.5, 0, -6.5]} color="#f0f9ff" intensity={1.2} distance={7} />
        {/* Central corridor downlights */}
        <pointLight position={[0, 0, 0]} color="#fff7ed" intensity={1.5} distance={8} />
        <pointLight position={[0, 0, 5.5]} color="#fff7ed" intensity={1.4} distance={8} />
        {/* Tech Pod downlights */}
        <pointLight position={[8.3, 0, -0.4]} color="#f0fdf4" intensity={1.6} distance={8} />
        <pointLight position={[8.3, 0, 3.0]} color="#f0fdf4" intensity={1.5} distance={8} />
        {/* Ruang Manager downlights */}
        <pointLight position={[-9.5, 0, 6.0]} color="#fef3c7" intensity={1.6} distance={8} />
        <pointLight position={[-11.5, 0, 4.0]} color="#fff7ed" intensity={1.0} distance={6} />
        {/* Ruang Rapat downlights */}
        <pointLight position={[9.2, 0, 7.5]} color="#f8fafc" intensity={1.7} distance={8} />
        {/* Musholla downlight */}
        <pointLight position={[-10.5, 0, -9.2]} color="#fef3c7" intensity={1.4} distance={7} />
        {/* Pantry downlight */}
        <pointLight position={[12.2, 0, 1.0]} color="#fed7aa" intensity={1.4} distance={6} />
      </group>

      {/* ── 1. DIORAMA BASE & UNOBSTRUCTED PERIMETER WALLS ── */}
      {/* Thick Foundation Plinth */}
      <CozyBox size={[28.8, 0.8, 24.8]} pos={[0, -0.41, 0]} color="#1b1626" r={0.06} receive />

      {/* Main Ground Floor Parquet */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.008, 0]} receiveShadow>
        <planeGeometry args={[28, 24]} />
        <CozyMat color="#f5efe6" rough={0.7} />
      </mesh>

      {/* Paved Central Corridor Floor Runner (From South Entrance to Reception) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.004, 2.5]} receiveShadow>
        <planeGeometry args={[4.2, 17.5]} />
        <CozyMat color="#334155" rough={0.65} />
      </mesh>
      {/* Golden Edge Borders for Central Corridor */}
      {[-2.1, 2.1].map((bx) => (
        <mesh key={bx} rotation-x={-Math.PI / 2} position={[bx, -0.003, 2.5]}>
          <planeGeometry args={[0.08, 17.5]} />
          <CozyMat color="#d4af37" metal={0.6} />
        </mesh>
      ))}

      {/* ── WALL ARCHITECTURE: FULL HEIGHT ON BACK, LOW CUTAWAY IN FRONT ── */}
      {/* North Wall (Back Wall: z = -12) - Full Height 4.4m */}
      <CozyBox size={[28.4, 4.4, 0.4]} pos={[0, 2.2, -12.2]} color="#f8fafc" r={0.03} cast receive />
      {/* North Wall Acoustic Oak Slat Wood Accent behind Reception */}
      {[-3.0, -2.5, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((sx) => (
        <mesh key={sx} position={[sx, 2.2, -11.96]} castShadow>
          <boxGeometry args={[0.12, 4.3, 0.05]} />
          <CozyMat color="#c9a27a" rough={0.6} />
        </mesh>
      ))}

      {/* West Wall (x = -14) - Full Height 4.4m */}
      <CozyBox size={[0.4, 4.4, 24.4]} pos={[-14.2, 2.2, 0]} color="#f8fafc" r={0.03} cast receive />
      {/* Clerestory Windows on West Wall */}
      {[-7, 0, 7].map((wz) => (
        <group key={wz} position={[-13.98, 3.2, wz]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 1.2, 3.4]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <mesh position={[0.04, 0, 0]}>
            <planeGeometry args={[3.2, 1.0]} />
            <CozyMat color="#bae6fd" transparent opacity={0.4} />
          </mesh>
        </group>
      ))}

      {/* East Wall (x = 14) - North Half Full Height, South Half Low Cutaway */}
      <CozyBox size={[0.4, 4.4, 12.0]} pos={[14.2, 2.2, -6.0]} color="#f8fafc" r={0.03} cast receive />
      {/* South half of East Wall is low cutaway diorama curb (0.45m high) */}
      <CozyBox size={[0.4, 0.45, 12.4]} pos={[14.2, 0.225, 6.0]} color="#1e293b" r={0.03} cast receive />

      {/* South Wall (Front Wall: z = 12) - Low Cutaway Diorama Curb (0.45m high) */}
      <group position={[0, 0, 12]}>
        {/* Left Low Curb Section */}
        <CozyBox size={[11.2, 0.45, 0.35]} pos={[-8.4, 0.225, 0.2]} color="#1e293b" r={0.03} cast receive />
        {/* Right Low Curb Section */}
        <CozyBox size={[11.2, 0.45, 0.35]} pos={[8.4, 0.225, 0.2]} color="#1e293b" r={0.03} cast receive />

        {/* Center Entrance Portal Frame & Automatic Glass Doors */}
        <group position={[0, 0, 0]} onClick={onExitToYard}>
          <CozyBox size={[0.2, 3.2, 0.35]} pos={[-2.7, 1.6, 0.1]} color="#0f172a" r={0.03} cast />
          <CozyBox size={[0.2, 3.2, 0.35]} pos={[2.7, 1.6, 0.1]} color="#0f172a" r={0.03} cast />
          <CozyBox size={[5.6, 0.35, 0.35]} pos={[0, 3.0, 0.1]} color="#0f172a" r={0.03} cast />

          {/* Automatic Double Sliding Glass Doors */}
          {[-1.15, 1.15].map((gx) => (
            <group key={gx} position={[gx, 1.4, 0.05]}>
              <mesh>
                <boxGeometry args={[2.0, 2.6, 0.04]} />
                <CozyMat color="#bae6fd" transparent opacity={0.35} rough={0.05} />
              </mesh>
              <mesh position={[gx > 0 ? -0.85 : 0.85, 0, -0.05]}>
                <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
                <CozyMat color="#e2e8f0" metal={0.8} />
              </mesh>
            </group>
          ))}

          {/* Motion Sensor */}
          <mesh position={[0, 2.9, -0.1]}>
            <boxGeometry args={[0.35, 0.1, 0.1]} />
            <CozyMat color="#38bdf8" />
          </mesh>

          {/* Large Lobby Welcome Rug */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, -1.2]} receiveShadow>
            <planeGeometry args={[3.8, 1.6]} />
            <CozyMat color="#1e293b" rough={0.85} />
          </mesh>
          <Text
            position={[0, 0.02, -1.2]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.16}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.08}
          >
            KDI AI OFFICE
          </Text>

          {/* Interactive Exit Badge (Compact & Proportional) */}
          {isNearExit && (
            <Html position={[0, 1.8, -0.8]} center distanceFactor={11} occlude zIndexRange={[100, 0]}>
              <div
                style={{ transform: 'scale(0.55)', transformOrigin: 'bottom center' }}
                className="flex items-center gap-1.5 whitespace-nowrap select-none pointer-events-none animate-in fade-in zoom-in-95 duration-200 shadow-xl"
              >
                <span className="rounded-full px-3 py-1 text-[13px] font-bold text-white bg-slate-900/90 shadow-lg border border-slate-700 backdrop-blur-sm">
                  🚪 Keluar ke Halaman Depan
                </span>
                <span className="rounded-lg bg-amber-400 text-slate-950 px-2 py-0.5 text-[11px] font-black shadow-md border border-amber-300">
                  E
                </span>
              </div>
            </Html>
          )}
        </group>
      </group>

      {/* ── 2. RECEPTION LOBBY & 3D NEON SIGNBOARD (Center North: z = -7.5) ── */}
      <group position={[0, 0, -7.5]}>
        {/* Reception Counter Desk (Lower height 0.46m so Citra is 100% visible!) */}
        <CozyBox size={[4.0, 0.46, 0.85]} pos={[0, 0.23, 0]} color="#cdb296" r={0.08} cast receive />
        <CozyBox size={[4.2, 0.05, 0.95]} pos={[0, 0.485, 0]} color="#fffaf0" r={0.03} cast />

        {/* Guest Terminal Monitor on Counter */}
        <group position={[1.2, 0.51, 0.05]}>
          <mesh position={[0, 0.14, 0]} rotation-y={-0.2} castShadow>
            <boxGeometry args={[0.44, 0.26, 0.03]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.14, 0.018]} rotation-y={-0.2}>
            <planeGeometry args={[0.40, 0.22]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.02, 0.04, 0.06, 8]} />
            <CozyMat color="#64748b" metal={0.6} />
          </mesh>
        </group>

        {/* Citra NPC: Front Desk Host (Elevated platform & forward position: 100% full view!) */}
        <ChibiAvatar3D
          look={{
            skin: '#f3cfa0',
            hair: '#262626',
            hairStyle: 'long',
            top: '#0284c7',
            pants: '#1e293b',
            outfit: 'polo',
          }}
          motion={{ speed: 0, wave: true }}
          position={[0, 0.20, -0.38]}
          rotationY={0}
          name="Citra (Office Host)"
          role="Front Desk Ambassador"
          accentColor="#0284c7"
          isInteractable
          isNearby={isNearCitra}
        />

        {/* Lobby Waiting Sofas */}
        {[-3.6, 3.6].map((sx) => (
          <group key={sx} position={[sx, 0, 1.5]} rotation-y={sx > 0 ? -Math.PI / 2 : Math.PI / 2}>
            <CozyBox size={[1.8, 0.42, 0.8]} pos={[0, 0.21, 0]} color="#334155" r={0.08} cast receive />
            <CozyBox size={[1.8, 0.46, 0.22]} pos={[0, 0.58, -0.32]} color="#334155" r={0.08} cast />
          </group>
        ))}

        {/* Potted Plants Flanking Lobby */}
        {[-2.6, 2.6].map((px) => (
          <group key={px} position={[px, 0, -0.5]}>
            <mesh position={[0, 0.24, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.18, 0.48, 16]} />
              <CozyMat color="#ffffff" rough={0.3} />
            </mesh>
            <mesh position={[0, 0.65, 0]} castShadow>
              <sphereGeometry args={[0.38, 14, 10]} />
              <CozyMat color="#16a34a" rough={0.8} />
            </mesh>
          </group>
        ))}

        {/* Center Circular Carpet */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 1.5]} receiveShadow>
          <circleGeometry args={[1.9, 32]} />
          <CozyMat color="#e2e8f0" rough={0.8} />
        </mesh>
      </group>

      {/* ── 3. GLOWING 3D KDI NEON SIGNBOARD (Mounted on North Wall at z = -12) ── */}
      <group position={[0, 3.2, -11.95]}>
        <CozyBox size={[7.4, 1.4, 0.12]} pos={[0, 0, 0]} color="#0f172a" r={0.06} cast />
        <Text
          position={[0, 0.22, 0.1]}
          fontSize={0.25}
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
          position={[0, -0.18, 0.1]}
          fontSize={0.105}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.07}
          outlineWidth={0.007}
          outlineColor="#0f172a"
        >
          AUTONOMOUS AI VIRTUAL HEADQUARTERS
        </Text>
        <pointLight position={[0, 0, 0.4]} color="#fef08a" intensity={0.9} distance={5} />
      </group>

      {/* ── 4. WALL-FLUSH INTEGRATED ELEVATOR LIFT (North Wall Right: x = 7.5, z = -12) ── */}
      <group position={[7.5, 0, -11.9]} onClick={onCallLift} onPointerDown={onCallLift}>
        <CozyBox size={[3.0, 3.4, 0.28]} pos={[0, 1.7, 0.1]} color="#1e293b" r={0.04} cast receive />
        {[-0.62, 0.62].map((ex) => (
          <group key={ex} position={[ex, 1.4, 0.18]}>
            <mesh>
              <boxGeometry args={[1.15, 2.6, 0.05]} />
              <CozyMat color="#94a3b8" metal={0.8} rough={0.25} />
            </mesh>
          </group>
        ))}

        {/* Digital Floor Screen */}
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
            L1 ▲ L2
          </Text>
        </group>

        {isNearLift && (
          <Html position={[0, 3.2, 0.2]} center distanceFactor={11} occlude zIndexRange={[100, 0]}>
            <div
              style={{ transform: 'scale(0.55)', transformOrigin: 'bottom center' }}
              className="flex items-center gap-1.5 whitespace-nowrap select-none pointer-events-none animate-in fade-in zoom-in-95 duration-200 shadow-xl"
            >
              <span className="rounded-full px-3 py-1 text-[13px] font-bold text-white bg-slate-900/90 shadow-md border border-slate-700 backdrop-blur-sm">
                🛗 Lift Lantai
              </span>
              <span className="rounded-lg bg-amber-400 text-slate-950 px-2 py-0.5 text-[11px] font-black shadow-md border border-amber-300">
                E
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 5. PORTFOLIO SHOWCASE DISPLAY KIOSK (Lobby Left: x = -4.8, z = -6.5) ── */}
      <group position={[-4.8, 0, -6.5]} onClick={onOpenPortfolio} onPointerDown={onOpenPortfolio}>
        <CozyBox size={[1.4, 1.0, 0.6]} pos={[0, 0.5, 0]} color="#334155" r={0.06} cast receive />
        <mesh position={[0, 1.08, 0]} rotation-x={-0.45} castShadow>
          <boxGeometry args={[1.2, 0.72, 0.05]} />
          <CozyMat color="#0f172a" />
        </mesh>
        <mesh position={[0, 1.08, 0.03]} rotation-x={-0.45}>
          <planeGeometry args={[1.1, 0.65]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {isNearKios && (
          <Html position={[0, 1.55, 0]} center distanceFactor={11} occlude zIndexRange={[100, 0]}>
            <div
              style={{ transform: 'scale(0.55)', transformOrigin: 'bottom center' }}
              className="flex items-center gap-1.5 whitespace-nowrap select-none pointer-events-none animate-in fade-in zoom-in-95 duration-200 shadow-xl"
            >
              <span className="rounded-full px-3 py-1 text-[13px] font-bold text-white bg-sky-600/90 shadow-md backdrop-blur-sm">
                Kios Portofolio
              </span>
              <span className="rounded-lg bg-amber-400 text-slate-950 px-2 py-0.5 text-[11px] font-black shadow-md border border-amber-300">
                E
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 6. MUSHOLLA KDI (Northwest Quiet Wing: x = -10.5, z = -9.2) ── */}
      <group position={[-10.5, 0, -9.2]}>
        {/* Soft Green Shaf Prayer Carpet */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
          <planeGeometry args={[5.2, 4.4]} />
          <CozyMat color="#15803d" rough={0.8} />
        </mesh>
        {/* Golden Shaf Lines pointing toward Qibla (Northwest) */}
        {[-1.2, 0, 1.2].map((sz) => (
          <mesh key={sz} rotation-x={-Math.PI / 2} position={[0, 0.006, sz]}>
            <planeGeometry args={[4.8, 0.06]} />
            <CozyMat color="#fef08a" />
          </mesh>
        ))}

        {/* East Architectural Slat Wood Privacy Screen */}
        <group position={[2.7, 0, 0]}>
          {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((pz) => (
            <mesh key={pz} position={[0, 1.4, pz]} castShadow>
              <boxGeometry args={[0.08, 2.8, 0.12]} />
              <CozyMat color="#cdb296" rough={0.6} />
            </mesh>
          ))}
          <CozyBox size={[0.25, 0.3, 4.2]} pos={[0, 0.15, 0]} color="#1e293b" r={0.04} cast />
        </group>

        {/* Shoe Rack at Musholla Entrance */}
        <group position={[1.8, 0, 2.1]}>
          <CozyBox size={[1.4, 0.45, 0.4]} pos={[0, 0.225, 0]} color="#78350f" r={0.03} cast />
          {/* Miniature shoes on rack */}
          {[-0.4, 0, 0.4].map((sx, si) => (
            <mesh key={si} position={[sx, 0.47, 0]}>
              <boxGeometry args={[0.16, 0.04, 0.24]} />
              <CozyMat color={si === 0 ? '#1e293b' : si === 1 ? '#c2410c' : '#0369a1'} />
            </mesh>
          ))}
        </group>

        {/* 3D Signage & Qibla Direction Indicator */}
        <group position={[0, 2.8, -2.1]}>
          <Text fontSize={0.16} color="#fbbf24" anchorX="center" anchorY="middle" letterSpacing={0.08}>
            MUSHOLLA KDI
          </Text>
          <Text position={[0, -0.22, 0]} fontSize={0.10} color="#a7f3d0" anchorX="center" anchorY="middle">
            ▲ ARAH KIBLAT (BARAT LAUT)
          </Text>
        </group>
      </group>

      {/* ── 7. RUANGAN MANAGER TERTUTUP & ORCHESTRATOR SUITE (Southwest: x = -9.5, z = 6.0) ── */}
      <group position={[-9.5, 0, 6.0]}>
        {/* Walnut Executive Carpet Area */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
          <planeGeometry args={[8.0, 7.8]} />
          <CozyMat color="#475569" rough={0.8} />
        </mesh>

        {/* Low Modern Glass Rail Partitions (Height 1.3m: 100% Camera Visibility!) */}
        {/* North Glass Partition */}
        <group position={[0, 0.65, -3.9]}>
          <mesh castShadow>
            <boxGeometry args={[8.0, 1.3, 0.06]} />
            <CozyMat color="#bae6fd" transparent opacity={0.35} rough={0.05} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[8.1, 0.04, 0.08]} />
            <CozyMat color="#1e293b" />
          </mesh>
        </group>

        {/* East Glass Partition with Doorway */}
        <group position={[3.9, 0.65, -1.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 1.3, 4.0]} />
            <CozyMat color="#bae6fd" transparent opacity={0.35} rough={0.05} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[0.08, 0.04, 4.1]} />
            <CozyMat color="#1e293b" />
          </mesh>
        </group>

        {/* Suite Name Signplate */}
        <group position={[3.85, 1.8, 1.5]} rotation-y={-Math.PI / 2}>
          <mesh castShadow>
            <boxGeometry args={[2.2, 0.24, 0.02]} />
            <CozyMat color="#1e293b" />
          </mesh>
          <Text position={[0, 0, 0.015]} fontSize={0.09} color="#fbbf24" anchorX="center" anchorY="middle" letterSpacing={0.06}>
            ORCHESTRATOR & MANAGER SUITE
          </Text>
        </group>

        {/* Executive L-Desk & Furniture for Rian */}
        <group position={[-0.8, 0, 0.5]} onClick={onTalkRian || onOpenCEOCommand} onPointerDown={onTalkRian || onOpenCEOCommand}>
          {/* Main Executive Desk (Proportional height 0.48m) */}
          <CozyBox size={[2.6, 0.44, 0.9]} pos={[0, 0.22, 0]} color="#1e293b" r={0.04} cast receive />
          <CozyBox size={[2.7, 0.04, 1.0]} pos={[0, 0.46, 0]} color="#c9a27a" r={0.03} cast />

          {/* L-Shape Side Credenza */}
          <CozyBox size={[0.8, 0.40, 1.4]} pos={[-1.0, 0.20, 0.7]} color="#1e293b" r={0.04} cast receive />
          <CozyBox size={[0.85, 0.04, 1.45]} pos={[-1.0, 0.42, 0.7]} color="#c9a27a" r={0.03} cast />

          {/* Curved Monitoring Screen on Credenza (Angled cleanly, NEVER blocks Rian!) */}
          <group position={[-1.0, 0.62, 0.9]} rotation-y={-0.35}>
            <mesh position={[0, 0.16, 0]} castShadow>
              <boxGeometry args={[0.9, 0.34, 0.03]} />
              <CozyMat color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.16, 0.02]}>
              <planeGeometry args={[0.86, 0.30]} />
              <meshBasicMaterial color="#0284c7" />
            </mesh>
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.02, 0.04, 0.12, 8]} />
              <CozyMat color="#64748b" metal={0.6} />
            </mesh>
          </group>

          {/* Director High-Back Chair (Backrest lowered so Rian's head & shoulders are 100% visible!) */}
          <group position={[0, 0, -0.42]}>
            <CozyBox size={[0.50, 0.06, 0.48]} pos={[0, 0.24, 0]} color="#0f172a" r={0.04} cast />
            <CozyBox size={[0.48, 0.36, 0.08]} pos={[0, 0.46, -0.20]} color="#0f172a" r={0.04} cast />
          </group>

          {/* 2 Visitor Stools in front of desk */}
          {[-0.65, 0.65].map((vx) => (
            <group key={vx} position={[vx, 0, 0.95]} rotation-y={Math.PI}>
              <CozyBox size={[0.38, 0.05, 0.38]} pos={[0, 0.22, 0]} color="#334155" r={0.04} cast />
            </group>
          ))}

          {/* Bookshelf along West Wall */}
          <group position={[-2.6, 0, 0]}>
            <CozyBox size={[0.5, 2.4, 2.2]} pos={[0, 1.2, 0]} color="#1e293b" r={0.04} cast receive />
          </group>

          {/* Rian NPC Avatar: Seated (Elevated y = 0.36: 100% Unobstructed, Majestic Presence!) */}
          <ChibiAvatar3D
            look={{
              skin: '#f9d2be',
              hair: '#1e293b',
              hairStyle: 'short',
              top: '#3b82f6',
              pants: '#334155',
              outfit: 'suit',
            }}
            motion={{ speed: 0, sit: true, typing: true }}
            position={[0, 0.36, -0.38]}
            rotationY={0.2}
            name="Rian (AI Engineering Manager)"
            role="Master Orchestrator"
            accentColor="#3b82f6"
            isInteractable
            isNearby={isNearRian}
            onClick={onTalkRian || onOpenCEOCommand}
          />
        </group>
      </group>

      {/* ── 8. MODULAR TECH SQUAD WORKSTATIONS (East Wing: x = 8.3, z = -0.4) ── */}
      <group position={[8.3, 0, -0.4]}>
        {/* Tech Area Modular Carpet Flooring */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0.8]} receiveShadow>
          <planeGeometry args={[9.4, 6.4]} />
          <CozyMat color="#0f172a" rough={0.75} />
        </mesh>

        {/* ── ROW 1 (NORTH): Farhan (Lead AI) & Dimas (Senior Fullstack) ── */}
        <group position={[0, 0, -0.8]}>
          <CozyBox size={[4.4, 0.04, 0.9]} pos={[0, 0.46, 0]} color="#f8fafc" r={0.03} cast receive />
          {/* Steel Frame Legs */}
          {[-2.0, 2.0].map((lx) =>
            [-0.35, 0.35].map((lz) => (
              <mesh key={`${lx}-${lz}`} position={[lx, 0.23, lz]} castShadow>
                <boxGeometry args={[0.04, 0.46, 0.04]} />
                <CozyMat color="#0f172a" />
              </mesh>
            ))
          )}

          {/* Desk 1: Farhan (AI Lead) */}
          <group position={[-1.1, 0, 0]}>
            {/* Low-Profile Ultrawide Monitor (Angled to side, never covers face!) */}
            <group position={[-0.6, 0.65, -0.2]} rotation-y={0.35}>
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.74, 0.32, 0.03]} />
                <CozyMat color="#0f172a" />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[0.70, 0.28]} />
                <meshBasicMaterial color="#059669" />
              </mesh>
            </group>

            {/* Keyboard & Mousepad */}
            <mesh position={[0, 0.49, -0.1]}>
              <boxGeometry args={[0.40, 0.01, 0.15]} />
              <CozyMat color="#1e293b" />
            </mesh>

            {/* Chair */}
            <CozyBox size={[0.44, 0.06, 0.44]} pos={[0, 0.22, -0.42]} color="#1e293b" r={0.03} cast />
            <CozyBox size={[0.42, 0.34, 0.05]} pos={[0, 0.42, -0.58]} color="#1e293b" r={0.03} cast />

            {/* Farhan NPC Avatar (Elevated y = 0.36: 100% Unobstructed!) */}
            <ChibiAvatar3D
              look={{
                skin: '#e8b58a',
                hair: '#2b1d14',
                hairStyle: 'spiky',
                top: '#10b981',
                pants: '#2b2d3a',
                outfit: 'hoodie',
                glasses: true,
              }}
              motion={{ speed: 0, sit: true, typing: true }}
              position={[0, 0.36, -0.35]}
              rotationY={0.2}
              name="Farhan (Lead AI Engineer)"
              role="AI Core Engineer"
              accentColor="#10b981"
              isInteractable
              isNearby={isNearFarhan}
              onClick={() => onSelectAgent?.('AGT-ENG-001')}
            />
          </group>

          {/* Desk 2: Dimas (Senior Fullstack) */}
          <group position={[1.1, 0, 0]}>
            <group position={[-0.6, 0.65, -0.2]} rotation-y={0.35}>
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.74, 0.32, 0.03]} />
                <CozyMat color="#0f172a" />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[0.70, 0.28]} />
                <meshBasicMaterial color="#0284c7" />
              </mesh>
            </group>

            <mesh position={[0, 0.49, -0.1]}>
              <boxGeometry args={[0.40, 0.01, 0.15]} />
              <CozyMat color="#1e293b" />
            </mesh>

            <CozyBox size={[0.44, 0.06, 0.44]} pos={[0, 0.22, -0.42]} color="#1e293b" r={0.03} cast />
            <CozyBox size={[0.42, 0.34, 0.05]} pos={[0, 0.42, -0.58]} color="#1e293b" r={0.03} cast />

            <ChibiAvatar3D
              look={{
                skin: '#f2c29b',
                hair: '#1f2937',
                hairStyle: 'spiky',
                top: '#1d4ed8',
                pants: '#334155',
                outfit: 'polo',
              }}
              motion={{ speed: 0, sit: true, typing: true }}
              position={[0, 0.36, -0.35]}
              rotationY={0.2}
              name="Dimas (Senior Fullstack)"
              role="Web & Backend Engineer"
              accentColor="#1d4ed8"
              isInteractable
              isNearby={isNearDimas}
              onClick={onTalkDimas}
            />
          </group>
        </group>

        {/* ── ROW 2 (SOUTH): Hana (QA Lead) & Ahmad (System Architect) ── */}
        <group position={[0, 0, 2.2]}>
          <CozyBox size={[4.4, 0.04, 0.9]} pos={[0, 0.46, 0]} color="#f8fafc" r={0.03} cast receive />
          {[-2.0, 2.0].map((lx) =>
            [-0.35, 0.35].map((lz) => (
              <mesh key={`${lx}-${lz}`} position={[lx, 0.23, lz]} castShadow>
                <boxGeometry args={[0.04, 0.46, 0.04]} />
                <CozyMat color="#0f172a" />
              </mesh>
            ))
          )}

          {/* Desk 3: Hana (QA Specialist) */}
          <group position={[-1.1, 0, 0]}>
            <group position={[-0.6, 0.65, -0.2]} rotation-y={0.35}>
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.74, 0.32, 0.03]} />
                <CozyMat color="#0f172a" />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[0.70, 0.28]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
            </group>

            <mesh position={[0, 0.49, -0.1]}>
              <boxGeometry args={[0.40, 0.01, 0.15]} />
              <CozyMat color="#1e293b" />
            </mesh>

            <CozyBox size={[0.44, 0.06, 0.44]} pos={[0, 0.22, -0.42]} color="#1e293b" r={0.03} cast />
            <CozyBox size={[0.42, 0.34, 0.05]} pos={[0, 0.42, -0.58]} color="#1e293b" r={0.03} cast />

            <ChibiAvatar3D
              look={{
                skin: '#f9d2be',
                hair: '#451a03',
                hairStyle: 'long',
                top: '#eab308',
                pants: '#1e293b',
                outfit: 'polo',
              }}
              motion={{ speed: 0, sit: true, typing: true }}
              position={[0, 0.36, -0.35]}
              rotationY={0.2}
              name="Hana (QA Specialist)"
              role="Test Automation Lead"
              accentColor="#eab308"
              isInteractable
              isNearby={isNearHana}
              onClick={onTalkHana}
            />
          </group>

          {/* Desk 4: Ahmad (Principal Architect) */}
          <group position={[1.1, 0, 0]}>
            <group position={[-0.6, 0.65, -0.2]} rotation-y={0.35}>
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.74, 0.32, 0.03]} />
                <CozyMat color="#0f172a" />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[0.70, 0.28]} />
                <meshBasicMaterial color="#8b5cf6" />
              </mesh>
            </group>

            <mesh position={[0, 0.49, -0.1]}>
              <boxGeometry args={[0.40, 0.01, 0.15]} />
              <CozyMat color="#1e293b" />
            </mesh>

            <CozyBox size={[0.44, 0.06, 0.44]} pos={[0, 0.22, -0.42]} color="#1e293b" r={0.03} cast />
            <CozyBox size={[0.42, 0.34, 0.05]} pos={[0, 0.42, -0.58]} color="#1e293b" r={0.03} cast />

            <ChibiAvatar3D
              look={{
                skin: '#f9d2be',
                hair: '#374151',
                hairStyle: 'short',
                top: '#6366f1',
                pants: '#1e293b',
                outfit: 'suit',
              }}
              motion={{ speed: 0, sit: true, typing: true }}
              position={[0, 0.36, -0.35]}
              rotationY={0.2}
              name="Ahmad (System Architect)"
              role="Cloud DevOps Lead"
              accentColor="#6366f1"
              isInteractable
              isNearby={isNearAhmad}
              onClick={onTalkAhmad}
            />
          </group>
        </group>
      </group>

      {/* ── 9. PANTRY KDI LENGKAP & BREAK BAR (East Wall: x = 12.5, z = 1.0) ── */}
      <group position={[12.5, 0, 1.0]}>
        {/* Tile Floor Mat */}
        <mesh rotation-x={-Math.PI / 2} position={[-0.4, 0.003, 0]} receiveShadow>
          <planeGeometry args={[2.4, 4.4]} />
          <CozyMat color="#e2e8f0" rough={0.7} />
        </mesh>

        {/* L-Shaped Kitchen Base Cabinets with White Marble Top */}
        <CozyBox size={[0.9, 0.82, 3.2]} pos={[0.5, 0.41, 0]} color="#334155" r={0.04} cast receive />
        <CozyBox size={[0.96, 0.04, 3.3]} pos={[0.5, 0.84, 0]} color="#f8fafc" r={0.02} cast />

        {/* Stainless Steel Kitchen Sink & Chrome Faucet */}
        <group position={[0.45, 0.86, 0.6]}>
          <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.5, 0.38]} />
            <CozyMat color="#64748b" metal={0.8} />
          </mesh>
          <mesh position={[0.2, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.28, 8]} />
            <CozyMat color="#cbd5e1" metal={0.9} />
          </mesh>
        </group>

        {/* Commercial Espresso Machine on Counter */}
        <group position={[0.4, 0.88, -0.6]}>
          <CozyBox size={[0.42, 0.32, 0.48]} pos={[0, 0.16, 0]} color="#0f172a" r={0.03} cast />
          <mesh position={[-0.15, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
            <CozyMat color="#cbd5e1" metal={0.9} />
          </mesh>
        </group>

        {/* Dual-Door Dark Stainless Refrigerator */}
        <group position={[0.45, 0, -1.8]}>
          <CozyBox size={[0.85, 1.9, 0.8]} pos={[0, 0.95, 0]} color="#1e293b" r={0.04} cast receive />
          {/* Vertical Door Handles */}
          <mesh position={[-0.44, 1.0, 0.2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
            <CozyMat color="#94a3b8" metal={0.8} />
          </mesh>
        </group>

        {/* High Bar Stools for Coffee Break */}
        {[-0.5, 0.5].map((sz) => (
          <group key={sz} position={[-0.5, 0, sz]}>
            <mesh position={[0, 0.48, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.16, 0.05, 14]} />
              <CozyMat color="#cdb296" />
            </mesh>
            <mesh position={[0, 0.24, 0]} castShadow>
              <cylinderGeometry args={[0.018, 0.024, 0.48, 6]} />
              <CozyMat color="#0f172a" />
            </mesh>
          </group>
        ))}

        {/* Server Cluster Rack positioned right next to tech entry */}
        <group position={[0.45, 0, 2.2]}>
          <CozyBox size={[0.9, 2.2, 0.7]} pos={[0, 1.1, 0]} color="#0f172a" r={0.05} cast receive />
          {[-0.2, 0.2].map((lx) =>
            [0.5, 0.8, 1.1, 1.4, 1.7].map((ly) => (
              <mesh key={`${lx}-${ly}`} position={[lx, ly, 0.36]}>
                <sphereGeometry args={[0.02, 6, 6]} />
                <meshBasicMaterial color={ly > 1.2 ? '#38bdf8' : '#10b981'} />
              </mesh>
            ))
          )}
        </group>
      </group>

      {/* ── 10. RUANG RAPAT UTAMA / BOARDROOM (Southeast Wing: x = 9.2, z = 7.5) ── */}
      <group position={[9.2, 0, 7.5]}>
        {/* Boardroom Midnight Slate Carpet */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
          <planeGeometry args={[7.4, 6.4]} />
          <CozyMat color="#1e293b" rough={0.8} />
        </mesh>

        {/* Glass Partitions on North & West with Frosted Band */}
        {/* North Glass Partition */}
        <group position={[0, 0.85, -3.2]}>
          <mesh castShadow>
            <boxGeometry args={[7.4, 1.7, 0.06]} />
            <CozyMat color="#bae6fd" transparent opacity={0.35} rough={0.05} />
          </mesh>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[7.4, 0.6]} />
            <CozyMat color="#f1f5f9" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[7.5, 0.04, 0.08]} />
            <CozyMat color="#0f172a" />
          </mesh>
        </group>

        {/* West Glass Partition with Doorway */}
        <group position={[-3.7, 0.85, 0.6]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 1.7, 3.8]} />
            <CozyMat color="#bae6fd" transparent opacity={0.35} rough={0.05} />
          </mesh>
          <mesh position={[-0.035, 0, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[3.8, 0.6]} />
            <CozyMat color="#f1f5f9" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.08, 0.04, 3.9]} />
            <CozyMat color="#0f172a" />
          </mesh>
        </group>

        {/* Room Signplate above Door */}
        <group position={[-3.65, 1.9, -2.0]} rotation-y={Math.PI / 2}>
          <mesh castShadow>
            <boxGeometry args={[1.8, 0.22, 0.02]} />
            <CozyMat color="#0f172a" />
          </mesh>
          <Text position={[0, 0, 0.015]} fontSize={0.08} color="#38bdf8" anchorX="center" anchorY="middle" letterSpacing={0.06}>
            RUANG RAPAT INOVASI
          </Text>
        </group>

        {/* Conference Table (3.6m x 1.2m, Walnut & Dark Chrome) */}
        <CozyBox size={[3.4, 0.05, 1.2]} pos={[0, 0.48, 0]} color="#292524" r={0.04} cast receive />
        {[-1.2, 1.2].map((lx) => (
          <mesh key={lx} position={[lx, 0.24, 0]} castShadow>
            <boxGeometry args={[0.06, 0.46, 0.8]} />
            <CozyMat color="#0f172a" metal={0.7} />
          </mesh>
        ))}

        {/* Central Speakerphone Puck */}
        <mesh position={[0, 0.51, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.025, 16]} />
          <CozyMat color="#0f172a" />
        </mesh>

        {/* 6 Ergonomic Conference Chairs */}
        {[-1.0, 0, 1.0].map((cx) => (
          <React.Fragment key={cx}>
            {/* North Row Chairs */}
            <group position={[cx, 0, -0.75]}>
              <CozyBox size={[0.42, 0.06, 0.42]} pos={[0, 0.22, 0]} color="#334155" r={0.04} cast />
              <CozyBox size={[0.40, 0.32, 0.05]} pos={[0, 0.40, -0.18]} color="#334155" r={0.03} cast />
            </group>
            {/* South Row Chairs */}
            <group position={[cx, 0, 0.75]} rotation-y={Math.PI}>
              <CozyBox size={[0.42, 0.06, 0.42]} pos={[0, 0.22, 0]} color="#334155" r={0.04} cast />
              <CozyBox size={[0.40, 0.32, 0.05]} pos={[0, 0.40, -0.18]} color="#334155" r={0.03} cast />
            </group>
          </React.Fragment>
        ))}

        {/* 75" Presentation Smart TV mounted on East Wall */}
        <group position={[3.55, 1.6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 1.0, 1.8]} />
            <CozyMat color="#0f172a" />
          </mesh>
          <mesh position={[-0.035, 0, 0]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[1.74, 0.94]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
          <Text position={[-0.04, 0.2, 0]} rotation-y={-Math.PI / 2} fontSize={0.09} color="#ffffff" anchorX="center" anchorY="middle">
            KDI AI ENGINE • SPRINT REVIEW
          </Text>
          <Text position={[-0.04, -0.1, 0]} rotation-y={-Math.PI / 2} fontSize={0.065} color="#67e8f9" anchorX="center" anchorY="middle">
            Model Routing: Active | 99.98% SLA
          </Text>
        </group>

        {/* Whiteboard on North Wall */}
        <group position={[-1.2, 1.4, -3.15]}>
          <mesh castShadow>
            <boxGeometry args={[1.8, 0.85, 0.03]} />
            <CozyMat color="#f8fafc" />
          </mesh>
          {[-0.4, 0, 0.4].map((px, pi) => (
            <mesh key={pi} position={[px, 0.1 * (pi % 2 === 0 ? 1 : -1), 0.02]}>
              <planeGeometry args={[0.18, 0.18]} />
              <CozyMat color={pi === 0 ? '#fef08a' : pi === 1 ? '#a7f3d0' : '#fbcfe8'} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ── 11. SALES & CLIENT SOLUTIONS POD (West Wing: x = -8.5, z = -1.5) ── */}
      <group position={[-8.5, 0, -1.5]}>
        {/* Sales Pod Carpet Area */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow>
          <planeGeometry args={[7.2, 5.2]} />
          <CozyMat color="#fef3c7" rough={0.8} />
        </mesh>

        {/* Department Billboard / KPI Board (True 3D Typography - Never covers screen!) */}
        <group position={[0, 2.3, -2.5]}>
          <CozyBox size={[3.2, 0.9, 0.06]} pos={[0, 0, 0]} color="#0f172a" r={0.04} cast />
          <Text position={[0, 0.2, 0.04]} fontSize={0.11} color="#f59e0b" anchorX="center" anchorY="middle" letterSpacing={0.08}>
            SALES & CLIENT SOLUTIONS
          </Text>
          <Text position={[0, -0.14, 0.04]} fontSize={0.09} color="#38bdf8" anchorX="center" anchorY="middle" letterSpacing={0.06}>
            Leads: 32  •  Proposals: 18  •  Deals: 12
          </Text>
        </group>

        {/* Naya's Consultation Desk */}
        <group position={[0, 0, 0]} onClick={onTalkNaya} onPointerDown={onTalkNaya}>
          <CozyBox size={[2.2, 0.44, 0.9]} pos={[0, 0.22, 0]} color="#f1f5f9" r={0.04} cast receive />
          <CozyBox size={[2.3, 0.04, 0.95]} pos={[0, 0.46, 0]} color="#f1f5f9" r={0.03} cast />

          {/* Client Presentation Screen (Low profile, never blocks Naya!) */}
          <group position={[-0.7, 0.65, -0.2]} rotation-y={0.35}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[0.68, 0.32, 0.03]} />
              <CozyMat color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.64, 0.28]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </group>

          {/* Laptop on the right side */}
          <group position={[0.65, 0.48, -0.1]}>
            <mesh position={[0, 0.01, 0]} castShadow>
              <boxGeometry args={[0.38, 0.02, 0.25]} />
              <CozyMat color="#cbd5e1" metal={0.6} />
            </mesh>
          </group>

          {/* Chair */}
          <CozyBox size={[0.44, 0.06, 0.44]} pos={[0, 0.22, -0.42]} color="#1e293b" r={0.03} cast />
          <CozyBox size={[0.42, 0.34, 0.05]} pos={[0, 0.42, -0.58]} color="#1e293b" r={0.03} cast />

          {/* Visitor Stool */}
          <group position={[0.6, 0, 0.85]} rotation-y={Math.PI}>
            <CozyBox size={[0.38, 0.05, 0.38]} pos={[0, 0.22, 0]} color="#334155" r={0.04} cast />
          </group>

          {/* Naya NPC Avatar (Elevated y = 0.36: 100% Unobstructed!) */}
          <ChibiAvatar3D
            look={{
              skin: '#eabd90',
              hair: '#2b1b17',
              hairStyle: 'short',
              top: '#f59e0b',
              pants: '#1e293b',
              outfit: 'polo',
            }}
            motion={{ speed: 0, sit: true, typing: true }}
            position={[0, 0.36, -0.35]}
            rotationY={0.2}
            name="Naya (Account Manager)"
            role="Client Solutions Consultant"
            accentColor="#f59e0b"
            isInteractable
            isNearby={isNearNaya}
            onClick={onTalkNaya}
          />
        </group>
      </group>
    </group>
  );
};
