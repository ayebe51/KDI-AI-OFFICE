// ==========================================================
// 3d-r3f/CozyOfficeAppR3F.tsx
// High-Fidelity Cozy Isometric Virtual Office App powered by React Three Fiber
// 100% Identical Visual Fidelity to Reference, 100% Original KDI Identities
// ==========================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CozyLighting, type LightingPhase } from './lighting/CozyLighting.js';
import { IsometricFollowCamera } from './camera/IsometricFollowCamera.js';
import { ChibiAvatar3D, type ChibiLook } from './character/ChibiAvatar3D.js';
import { YardFloor3D } from './floors/YardFloor3D.js';
import { OfficeFloor3D } from './floors/OfficeFloor3D.js';
import { OpenSpaceFloor3D } from './floors/OpenSpaceFloor3D.js';
import { RooftopFloor3D } from './floors/RooftopFloor3D.js';
import { GameToast } from '../components/game/GameToast.js';

import { CozyGameHUD } from '../components/game/CozyGameHUD.js';
import { ElevatorModal } from '../components/game/ElevatorModal.js';
import { NayaDialogueModal } from '../components/game/NayaDialogueModal.js';
import { CozyPortfolioModal } from '../components/game/CozyPortfolioModal.js';
import { FoodCartModal } from '../components/game/FoodCartModal.js';
import { CEORoomModal } from '../components/game/CEORoomModal.js';
import { OwnerControlPanel } from '../components/game/OwnerControlPanel.js';

import type { PlayableCharacter } from '../3d/character/CharacterTypes.js';
import type { FloorId } from '../3d/world/WorldDefinitions.js';

export type R3FFloor = 'YARD' | 'GROUND' | 'FLOOR_2' | 'ROOFTOP';

export interface CozyOfficeAppR3FProps {
  character: PlayableCharacter;
  apiUrl?: string;
  wsUrl?: string;
  token?: string | null;
  username?: string;
  wsConnected?: boolean;
  isOwner?: boolean;
  onExitGame?: () => void;
  onLoginOwner?: () => void;
  onChangeCharacter?: () => void;
  onOpenModuleDirect?: (mod: string) => void;
}

// ── Module-level constants & helpers ───────────────────────────────────────────────

/** Consistent interaction trigger radius (world units) for all interactables */
const INTERACT_RADIUS = 2.8;

/** Returns the lighting phase appropriate for the current real-world hour */
const getInitialLightingPhase = (): LightingPhase => {
  const hour = new Date().getHours();
  if (hour >= 17 && hour < 19) return 'sunset';
  if (hour >= 19 || hour < 6) return 'night';
  return 'day';
};

type CollisionZone = [number, number, number, number]; // [minX, maxX, minZ, maxZ]
const COLLISION_ZONES: Record<string, CollisionZone[]> = {
  GROUND: [
    // 1. Outer Perimeter Walls
    [-15.0,  15.0, -13.0, -11.6], // North Wall
    [-15.0, -13.6, -12.0,  12.0], // West Wall
    [ 13.6,  15.0, -12.0,  12.0], // East Wall
    [-15.0,  -2.2,  11.6,  13.0], // South Wall Left of door
    [  2.2,  15.0,  11.6,  13.0], // South Wall Right of door

    // 2. Reception Desk & Citra
    [-2.5,   2.5,  -8.4,  -6.8],  // Reception Desk

    // 3. Wall-Flush Elevator
    [ 5.8,   9.2, -12.2, -11.4],  // Elevator

    // 4. Kios Portofolio
    [-5.6,  -4.0,  -7.2,  -5.8],  // Kios

    // 5. Ruangan Manager Tertutup (Partisi Kaca & L-Desk)
    [-14.0, -5.5,   1.9,   2.3],  // North glass wall of manager room
    [-5.8,  -5.2,   2.0,   6.2],  // East glass wall section (leaving doorway open at [6.2, 8.8]!)
    [-12.0, -8.0,   4.5,   7.5],  // Rian's Executive L-Desk

    // 6. Tech Squad 4-Seater Island Pod
    [ 5.8,  10.6,  -0.5,   2.5],  // 4-Seater Modular Island Desk (Farhan, Dimas, Hana, Ahmad)

    // 7. Sales Pod (Naya Desk)
    [-10.0, -7.0,  -2.2,  -0.8],  // Naya Desk

    // 8. Ruang Rapat Utama (Boardroom)
    [ 6.5,  12.0,   5.2,   9.8],  // Conference table and chairs

    // 9. Musholla KDI
    [-12.8, -8.2, -11.5,  -7.2],  // Slat screen & prayer space

    // 10. Pantry KDI Lengkap
    [ 11.2, 13.6,  -0.8,   2.8],  // Cabinets, fridge, espresso bar
  ],
  FLOOR_2: [
    [-14.0,  14.0, -10.0, -8.6], // North Wall
    [-14.0, -12.6,  -9.0,  9.0], // West Wall
    [ 12.6,  14.0,  -9.0,  9.0], // East Wall
    [-14.0,  14.0,   8.6, 10.0], // South Mezzanine Railing
    [-9.5,   -4.5,  -1.8,  1.2], // Creative Design Desk (Alya)
    [-11.5,  -4.0,  -3.8, -2.5], // Studio Green Screen & Tripod
    [-2.5,    3.5,  -6.8, -4.5], // Sleep Wellness Pods
    [ 4.5,    8.5,   0.5,  2.8], // L-Shaped Sectional Lounge Sofa
    [ 9.5,   12.0,  -1.8,  2.0], // Bar Counter & Danang
    [ 5.8,    9.2,  -9.5, -8.5], // Floor 2 Wall-Flush Elevator
  ],
  ROOFTOP: [
    [ 5.9,    9.1,  -7.0, -4.5], // Elevator Penthouse structure
    [-10.2,  -5.8,  -5.5, -3.5], // Teak Bar & Budi
    [-5.5,   -2.5,  -1.5,  1.5], // Firepit & Bean Bags
  ],
  YARD: [
    [-7.8,  -4.6,  -6.0, -4.0], // Food Cart Pak Joko (Courtyard)
    [-16.0, -2.5, -11.0, -8.0], // Building Facade West
    [  2.5, 16.0, -11.0, -8.0], // Building Facade East (Walkway open at [-2.5, 2.5]!)
  ],
};

function isCollidingWithZone(x: number, z: number, floor: string, margin = 0.35): boolean {
  for (const [minX, maxX, minZ, maxZ] of (COLLISION_ZONES[floor] ?? [])) {
    if (x > minX - margin && x < maxX + margin && z > minZ - margin && z < maxZ + margin)
      return true;
  }
  return false;
}

const SPAWN_POINTS: Record<R3FFloor, [number, number, number]> = {
  YARD: [0, 0, 4.5],
  GROUND: [0, 0, 8.5],
  FLOOR_2: [7.5, 0, -6.5],
  ROOFTOP: [7.5, 0, -4.0],
};

export const CozyOfficeAppR3F: React.FC<CozyOfficeAppR3FProps> = ({
  character,
  apiUrl = 'http://localhost:3000',
  wsUrl = 'ws://localhost:3000/ws/v1/events',
  token,
  username = 'Operator',
  wsConnected = false,
  isOwner = false,
  onExitGame,
  onLoginOwner,
  onChangeCharacter,
  onOpenModuleDirect,
}) => {
  const [currentFloor, setCurrentFloor] = useState<R3FFloor>('GROUND');
  const [lightingPhase, setLightingPhase] = useState<LightingPhase>(getInitialLightingPhase);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>(() => SPAWN_POINTS.GROUND);
  const [playerRotationY, setPlayerRotationY] = useState(0);
  const [playerSpeed, setPlayerSpeed] = useState(0);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Modals state
  const [showElevatorModal, setShowElevatorModal] = useState(false);
  const [showNayaModal, setShowNayaModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showFoodCartModal, setShowFoodCartModal] = useState(false);
  const [showCEORoomModal, setShowCEORoomModal] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);

  // Input management
  const keysRef = useRef({ forward: false, backward: false, left: false, right: false, run: false });
  // Ref to always have current floor inside the movement loop closure (empty deps)
  const currentFloorRef = useRef<R3FFloor>('GROUND');

  // Map PlayableCharacter to ChibiLook
  const playerLook: ChibiLook = useMemo(() => {
    switch (character.character_id) {
      case 'char_kirana':
        return { skin: '#f3cfa0', hair: '#3a2418', hairStyle: 'long', top: '#2a9d8f', pants: '#1e293b', outfit: 'hoodie', glasses: true };
      case 'char_bagas':
        return { skin: '#c68642', hair: '#1a1a1a', hairStyle: 'short', top: '#e76f51', pants: '#3a3f4b', outfit: 'polo' };
      case 'char_tiara':
        return { skin: '#eabd90', hair: '#7a4fa3', hairStyle: 'hijab', top: '#c77dff', pants: '#1e293b', outfit: 'polo' };
      case 'char_pengunjung':
        return { skin: '#f2c29b', hair: '#1f1b1a', hairStyle: 'short', top: '#3b82f6', pants: '#1f2640', outfit: 'suit' };
      case 'char_arka':
      default:
        return { skin: '#e8b58a', hair: '#2b1d14', hairStyle: 'spiky', top: '#2f5d9e', pants: '#2b2d3a', outfit: 'hoodie' };
    }
  }, [character.character_id]);

  // Movement loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const { forward, backward, left, right, run } = keysRef.current;
      let dx = 0;
      let dz = 0;

      // Isometric diagonal movement aligned with camera angle (45-degree rotation)
      if (forward) { dx -= 1; dz -= 1; }
      if (backward) { dx += 1; dz += 1; }
      if (left) { dx -= 1; dz += 1; }
      if (right) { dx += 1; dz -= 1; }

      const len = Math.hypot(dx, dz);
      if (len > 0) {
        const speed = (run ? 6.5 : 4.0) * dt;
        const normX = (dx / len) * speed;
        const normZ = (dz / len) * speed;

        setPlayerPos(([px, py, pz]) => {
          // Boundary clamps per floor (expanded to allow reaching elevator z=-11.2 and exit z=10.8)
          const nx = Math.max(-13.5, Math.min(13.5, px + normX));
          const nz = Math.max(-11.5, Math.min(11.2, pz + normZ));
          // AABB collision: try X, then Z independently so player can slide along walls
          const nextX = isCollidingWithZone(nx, pz, currentFloorRef.current) ? px : nx;
          const nextZ = isCollidingWithZone(px, nz, currentFloorRef.current) ? pz : nz;
          return [nextX, py, nextZ];
        });

        const targetRot = Math.atan2(dx, dz);
        setPlayerRotationY(targetRot);
        setPlayerSpeed(run ? 2 : 1);
      } else {
        setPlayerSpeed(0);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysRef.current.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysRef.current.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysRef.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysRef.current.right = true;
      if (e.shiftKey) keysRef.current.run = true;

      if (e.code === 'KeyE') {
        handleInteractTrigger();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysRef.current.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysRef.current.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysRef.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysRef.current.right = false;
      if (!e.shiftKey) keysRef.current.run = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [currentFloor, playerPos]);

  // Sync currentFloor to ref so the movement loop (empty deps) always reads current value
  useEffect(() => { currentFloorRef.current = currentFloor; }, [currentFloor]);

  // Auto-update lighting phase every 5 minutes based on real-world clock
  useEffect(() => {
    const interval = setInterval(() => setLightingPhase(getInitialLightingPhase()), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Proximity Detection
  const [px, , pz] = playerPos;

  const nearbyPrompt = useMemo(() => {
    if (currentFloor === 'YARD') {
      if (Math.hypot(px - (-6.2), pz - (-5.0)) < INTERACT_RADIUS) return 'Pesan Kopi & Camilan (Pak Joko)';
      if (Math.hypot(px - 0,      pz - (-8.5)) < INTERACT_RADIUS) return 'Masuk ke Lobi Kantor';
    }
    if (currentFloor === 'GROUND') {
      if (Math.hypot(px - (-10.3), pz - 6.5)   < INTERACT_RADIUS) return 'Konsultasi Orchestrator & Task Pipeline (Rian)';
      if (Math.hypot(px - 7.1,     pz - (-0.4)) < INTERACT_RADIUS) return 'Tanya Status Model & Inference (Farhan)';
      if (Math.hypot(px - 9.5,     pz - (-0.4)) < INTERACT_RADIUS) return 'Cek Status Web & API Deploy (Dimas)';
      if (Math.hypot(px - 7.1,     pz - 3.2)   < INTERACT_RADIUS) return 'Audit Laporan QA & Test Suites (Hana)';
      if (Math.hypot(px - 9.5,     pz - 3.2)   < INTERACT_RADIUS) return 'Inspeksi Cloud Architecture (Ahmad)';
      if (Math.hypot(px - 0,       pz - (-7.0)) < INTERACT_RADIUS) return 'Tanya Panduan Kantor KDI (Citra)';
      if (Math.hypot(px - (-8.5),  pz - (-1.5)) < INTERACT_RADIUS) return 'Bicara dengan Naya (Account Manager)';
      if (Math.hypot(px - 9.2,     pz - 7.5)   < INTERACT_RADIUS) return 'Inspeksi Ruang Rapat Utama (Boardroom)';
      if (Math.hypot(px - (-10.5), pz - (-9.2)) < INTERACT_RADIUS) return 'Musholla KDI (Area Ibadah)';
      if (Math.hypot(px - 12.2,    pz - 1.0)   < INTERACT_RADIUS) return 'Pantry KDI (Espresso Bar)';
      if (Math.hypot(px - (-4.8),  pz - (-6.5)) < INTERACT_RADIUS) return 'Buka Kios Portofolio KDI';
      if (Math.hypot(px - 7.5,     pz - (-11.2)) < INTERACT_RADIUS) return 'Gunakan Lift Lantai';
      if (Math.hypot(px - 0,       pz - 10.8)   < INTERACT_RADIUS) return 'Keluar ke Halaman Depan (Food Cart)';
    }
    if (currentFloor === 'FLOOR_2') {
      if (Math.hypot(px - (-6.3), pz - (-0.4)) < INTERACT_RADIUS) return 'Konsultasi UI/UX & Brand Design (Alya)';
      if (Math.hypot(px - 9.5,    pz - 1.0)    < INTERACT_RADIUS) return 'Diskusi Kampanye Brand & Coffee (Danang)';
      if (Math.hypot(px - 0.5,    pz - (-5.5)) < INTERACT_RADIUS) return 'Istirahat di Sleep Wellness Pod';
      if (Math.hypot(px - 7.5,    pz - (-8.2)) < INTERACT_RADIUS) return 'Gunakan Lift Lantai';
    }
    if (currentFloor === 'ROOFTOP') {
      if (Math.hypot(px - (-8),  pz - (-4.5)) < INTERACT_RADIUS) return 'Pesan Minuman (Budi)';
      if (Math.hypot(px - (-4),  pz - 0)      < INTERACT_RADIUS) return 'Duduk di Area Api Unggun';
      if (Math.hypot(px - 7.5,   pz - (-5.8)) < INTERACT_RADIUS) return 'Gunakan Lift Lantai';
    }
    return null;
  }, [currentFloor, px, pz]);

  const handleInteractTrigger = useCallback(() => {
    if (currentFloor === 'YARD') {
      if (Math.hypot(px - (-6.2), pz - (-5.0)) < INTERACT_RADIUS) { setShowFoodCartModal(true); }
      else if (Math.hypot(px - 0, pz - (-8.5)) < INTERACT_RADIUS) {
        setCurrentFloor('GROUND'); setPlayerPos(SPAWN_POINTS.GROUND);
      }
    } else if (currentFloor === 'GROUND') {
      if      (Math.hypot(px - (-10.3), pz - 6.5)   < INTERACT_RADIUS) { setShowCEORoomModal(true); }
      else if (Math.hypot(px - 7.1,     pz - (-0.4)) < INTERACT_RADIUS) {
        setToast({ msg: 'Farhan (Lead AI): Model routing, vector indexing, dan prompt pipelines 100% operational.', type: 'info' });
      }
      else if (Math.hypot(px - 9.5,     pz - (-0.4)) < INTERACT_RADIUS) {
        setToast({ msg: 'Dimas (Senior Fullstack): Service API NestJS & Web Frontend R3F running optimal tanpa latency.', type: 'info' });
      }
      else if (Math.hypot(px - 7.1,     pz - 3.2)   < INTERACT_RADIUS) {
        setToast({ msg: 'Hana (QA Lead): Seluruh test suite PASS 100%. 0 critical bugs terdeteksi.', type: 'success' });
      }
      else if (Math.hypot(px - 9.5,     pz - 3.2)   < INTERACT_RADIUS) {
        setToast({ msg: 'Ahmad (System Architect): Cluster infrastruktur & Neo4j vector store berstatus healthy.', type: 'info' });
      }
      else if (Math.hypot(px - 0,       pz - (-7.0)) < INTERACT_RADIUS) {
        setToast({ msg: 'Citra: Selamat datang di KDI! Kios Portofolio di kiri, Ruang Manager di barat daya, Ruang Rapat di tenggara, Musholla di barat laut, dan Pantry di timur.', type: 'info' });
      }
      else if (Math.hypot(px - (-8.5),  pz - (-1.5)) < INTERACT_RADIUS) { setShowNayaModal(true); }
      else if (Math.hypot(px - 9.2,     pz - 7.5)   < INTERACT_RADIUS) {
        setToast({ msg: 'Ruang Rapat Utama KDI: Dilengkapi 75" Smart TV 4K, Smart Whiteboard, dan meja konferensi 6-seater untuk sprint review dan client pitch.', type: 'info' });
      }
      else if (Math.hypot(px - (-10.5), pz - (-9.2)) < INTERACT_RADIUS) {
        setToast({ msg: 'Musholla KDI: Tempat ibadah tenang & bersih dengan partisi kisi kayu, karpet hijau shaf empuk, dan penunjuk arah kiblat.', type: 'success' });
      }
      else if (Math.hypot(px - 12.2,    pz - 1.0)   < INTERACT_RADIUS) {
        setToast({ msg: 'Pantry KDI Lengkap: Mesin espresso Italia, kulkas 2 pintu, microwave, dan bar counter siap sedia menyuplai kafein tim KDI.', type: 'info' });
      }
      else if (Math.hypot(px - (-4.8),  pz - (-6.5)) < INTERACT_RADIUS) { setShowPortfolioModal(true); }
      else if (Math.hypot(px - 7.5,     pz - (-11.2)) < INTERACT_RADIUS) { setShowElevatorModal(true); }
      else if (Math.hypot(px - 0,       pz - 10.8)   < INTERACT_RADIUS) {
        setCurrentFloor('YARD'); setPlayerPos(SPAWN_POINTS.YARD);
      }
    } else if (currentFloor === 'FLOOR_2') {
      if      (Math.hypot(px - (-6.3), pz - (-0.4)) < INTERACT_RADIUS) {
        setToast({ msg: 'Alya (Creative Lead): Design system KDI v2.4 siap. Komponen UI/UX Figma dan aset 3D R3F sudah tersinkronisasi 100%.', type: 'info' });
      }
      else if (Math.hypot(px - 9.5,    pz - 1.0)    < INTERACT_RADIUS) {
        setToast({ msg: 'Danang (Marketing Lead): Coffee break sambil pantau analitik public launch KDI AI Office! Engagement naik 40%.', type: 'success' });
      }
      else if (Math.hypot(px - 0.5,    pz - (-5.5)) < INTERACT_RADIUS) {
        setToast({ msg: 'Sleep Wellness Pod: Mode relaksasi aktif. Energi & fokus developer pulih 100%! 💤✨', type: 'info' });
      }
      else if (Math.hypot(px - 7.5,    pz - (-8.2)) < INTERACT_RADIUS) { setShowElevatorModal(true); }
    } else if (currentFloor === 'ROOFTOP') {
      if      (Math.hypot(px - (-8),  pz - (-4.5)) < INTERACT_RADIUS) { setShowFoodCartModal(true); }
      else if (Math.hypot(px - 7.5,   pz - (-5.8)) < INTERACT_RADIUS) { setShowElevatorModal(true); }
    }
  }, [currentFloor, px, pz]);

  const handleSwitchFloor = useCallback((target: R3FFloor | FloorId) => {
    setShowElevatorModal(false);
    const labels: Record<string, string> = {
      YARD:    'Halaman Depan — Kopi Corner & Parkir',
      GROUND:  'Lantai 1 — Lobby & Engineering',
      FLOOR_2: 'Lantai 2 — Creative Studio',
      ROOFTOP: 'Rooftop — Garden & Fire Pit',
    };
    setTransitionLabel(labels[target] ?? '');
    setIsTransitioning(true);
    setTimeout(() => {
      if (target === 'YARD')    { setCurrentFloor('YARD');    setPlayerPos(SPAWN_POINTS.YARD); }
      if (target === 'GROUND')  { setCurrentFloor('GROUND');  setPlayerPos(SPAWN_POINTS.GROUND); }
      if (target === 'FLOOR_2') { setCurrentFloor('FLOOR_2'); setPlayerPos(SPAWN_POINTS.FLOOR_2); }
      if (target === 'ROOFTOP') { setCurrentFloor('ROOFTOP'); setPlayerPos(SPAWN_POINTS.ROOFTOP); }
      setTimeout(() => setIsTransitioning(false), 400);
    }, 500);
  }, []);

  /** Sky / canvas background — contextual to floor & lighting phase */
  const skyColor = useMemo(() => {
    if (currentFloor === 'YARD') {
      if (lightingPhase === 'night')  return '#0d1117';
      if (lightingPhase === 'sunset') return '#ff9a4f';
      return '#c8e6f5';
    }
    return lightingPhase === 'night' ? '#120f1c' : '#1b1626';
  }, [currentFloor, lightingPhase]);

  const locationLabel = useMemo(() => {
    if (currentFloor === 'YARD') return 'Halaman Depan & Kopi Corner Pak Joko';
    if (currentFloor === 'FLOOR_2') return 'Lantai 2 • Creative Studio & Sleep Pods';
    if (currentFloor === 'ROOFTOP') return 'Rooftop • Garden, Bar & Fire Pit';
    if (px < -4) return 'Sales Pod & Konsultasi Klien (Naya)';
    if (px > 4) return 'Engineering Floor & Server Clusters';
    if (pz > 4) return 'CEO Executive Suite';
    return 'Lobi Resepsionis & Signage KDI';
  }, [currentFloor, px, pz]);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ minHeight: '100vh', background: skyColor }}>
      {/* 3D Canvas Viewport powered by React Three Fiber */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 30, near: 0.1, far: 100, position: [7.3, 10.5, 10.2] }}
        gl={{ antialias: true, alpha: false }}
        className="touch-none w-full h-full"
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[skyColor, 26, 48]} />

        {/* 1. Cozy Lighting Rig */}
        <CozyLighting phase={lightingPhase} />

        {/* 2. Isometric Follow Camera */}
        <IsometricFollowCamera targetPosition={playerPos} isOverviewMode={isOverviewMode} />

        {/* 3. Active Floor Environments */}
        {currentFloor === 'YARD' && (
          <YardFloor3D
            onOpenFoodCart={() => setShowFoodCartModal(true)}
            onEnterLobby={() => {
              setCurrentFloor('GROUND');
              setPlayerPos(SPAWN_POINTS.GROUND);
            }}
          />
        )}

        {currentFloor === 'GROUND' && (
          <OfficeFloor3D
            playerPos={playerPos}
            onTalkNaya={() => setShowNayaModal(true)}
            onOpenPortfolio={() => setShowPortfolioModal(true)}
            onOpenCEOCommand={() => setShowCEORoomModal(true)}
            onCallLift={() => setShowElevatorModal(true)}
            onExitToYard={() => {
              setCurrentFloor('YARD');
              setPlayerPos(SPAWN_POINTS.YARD);
            }}
            onTalkRian={() => setShowCEORoomModal(true)}
            onTalkDimas={() => setToast({ msg: 'Dimas (Senior Fullstack): Service API NestJS & Web Frontend R3F running optimal tanpa latency.', type: 'info' })}
            onTalkHana={() => setToast({ msg: 'Hana (QA Lead): Seluruh test suite PASS 100%. 0 critical bugs terdeteksi.', type: 'success' })}
            onTalkAhmad={() => setToast({ msg: 'Ahmad (System Architect): Cluster infrastruktur & Neo4j vector store berstatus healthy.', type: 'info' })}
            onSelectAgent={(agentId) => {
              if (agentId === 'AGT-ENG-001') {
                setToast({ msg: 'Farhan (AI Lead): Model router & inference pipeline beroperasi pada kapasitas penuh.', type: 'info' });
              }
            }}
          />
        )}

        {currentFloor === 'FLOOR_2' && (
          <OpenSpaceFloor3D
            playerPos={playerPos}
            onCallLift={() => setShowElevatorModal(true)}
            onInspectStudio={() => setToast({ msg: 'Alya (Creative Lead): Studio set siap untuk shooting demo UI produk KDI AI!', type: 'info' })}
            onTalkAlya={() => setToast({ msg: 'Alya (Creative Lead): Design system KDI v2.4 siap. Komponen UI/UX Figma dan aset 3D R3F sudah tersinkronisasi 100%.', type: 'info' })}
            onTalkDanang={() => setToast({ msg: 'Danang (Marketing Lead): Coffee break sambil pantau analitik public launch KDI AI Office! Engagement naik 40%.', type: 'success' })}
            onRestSleepPod={() => setToast({ msg: 'Sleep Wellness Pod: Mode relaksasi aktif. Energi & fokus developer pulih 100%! 💤✨', type: 'info' })}
          />
        )}

        {currentFloor === 'ROOFTOP' && (
          <RooftopFloor3D
            onCallLift={() => setShowElevatorModal(true)}
            onOrderDrink={() => setShowFoodCartModal(true)}
            onSitFirepit={() => {}}
          />
        )}

        {/* 4. Player Chibi Avatar */}
        <ChibiAvatar3D
          look={playerLook}
          motion={{ speed: playerSpeed }}
          position={playerPos}
          rotationY={playerRotationY}
        />
      </Canvas>

      {/* Ultra-Clean Cozy Game HUD Overlay */}
      <CozyGameHUD
        playerCharacter={character}
        currentFloor={currentFloor}
        locationLabel={locationLabel}
        nearbyPrompt={nearbyPrompt}
        onInteract={handleInteractTrigger}
        onOpenElevator={() => setShowElevatorModal(true)}
        onSwitchFloor={handleSwitchFloor}
        wsConnected={wsConnected}
        isOwner={isOwner}
        onOpenOwnerPanel={() => setShowOwnerPanel(true)}
        onLoginOwner={onLoginOwner}
        onChangeCharacter={onChangeCharacter}
        isOverviewMode={isOverviewMode}
        onToggleOverviewMode={() => setIsOverviewMode((prev) => !prev)}
      />

      {/* Floor Transition Overlay */}
      {isTransitioning && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
          style={{
            background: 'rgba(10, 7, 20, 0.92)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeInOut 0.9s ease-in-out forwards',
          }}
        >
          <div className="text-4xl mb-3">🛗</div>
          <div className="text-white text-sm font-bold tracking-widest uppercase opacity-80 text-center">
            {transitionLabel}
          </div>
          <div className="mt-4 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400"
                style={{ animation: `bounceDot 0.6s ${i * 0.15}s ease-in-out infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* In-Game Toast Notification */}
      {toast && (
        <GameToast
          message={toast.msg}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Contextual React Modals */}
      {showElevatorModal && (
        <ElevatorModal
          currentFloor={currentFloor === 'YARD' ? 'GROUND' : currentFloor}
          onSelectFloor={handleSwitchFloor}
          onClose={() => setShowElevatorModal(false)}
        />
      )}

      {showNayaModal && (
        <NayaDialogueModal
          apiUrl={apiUrl}
          token={token}
          onClose={() => setShowNayaModal(false)}
        />
      )}

      {showPortfolioModal && (
        <CozyPortfolioModal
          onClose={() => setShowPortfolioModal(false)}
          onOpenNayaOffer={() => {
            setShowPortfolioModal(false);
            setShowNayaModal(true);
          }}
        />
      )}

      {showFoodCartModal && (
        <FoodCartModal onClose={() => setShowFoodCartModal(false)} />
      )}

      {showCEORoomModal && (
        <CEORoomModal
          isOwner={isOwner}
          onOpenModule={(mod) => {
            setShowCEORoomModal(false);
            if (mod === 'command') {
              setShowOwnerPanel(true);
            } else if (onOpenModuleDirect) {
              onOpenModuleDirect(mod);
            }
          }}
          onClose={() => setShowCEORoomModal(false)}
        />
      )}

      {showOwnerPanel && (
        <OwnerControlPanel
          apiUrl={apiUrl}
          token={token}
          username={username}
          isOverviewMode={isOverviewMode}
          onToggleOverviewMode={() => setIsOverviewMode((prev) => !prev)}
          onClose={() => setShowOwnerPanel(false)}
        />
      )}
    </div>
  );
};
