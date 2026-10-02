// ==========================================================
// 3d-r3f/character/ChibiAvatar3D.tsx
// High-Fidelity Procedural Chibi Character with Walk & Idle Animations
// ==========================================================

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CozyBox, CozyMat } from '../materials/CozyMaterials.js';

export interface ChibiLook {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'spiky' | 'long' | 'hijab';
  top: string;
  pants: string;
  outfit?: 'polo' | 'hoodie' | 'suit' | 'blazer';
  glasses?: boolean;
}

export interface ChibiMotion {
  speed: number;
  sit?: boolean;
  typing?: boolean;
  wave?: boolean;
}

export interface ChibiAvatar3DProps {
  look: ChibiLook;
  motion?: ChibiMotion;
  position?: [number, number, number];
  rotationY?: number;
  name?: string;
  role?: string;
  accentColor?: string;
  isInteractable?: boolean;
  isNearby?: boolean;
  onClick?: () => void;
}

export const ChibiAvatar3D: React.FC<ChibiAvatar3DProps> = ({
  look,
  motion = { speed: 0 },
  position = [0, 0, 0],
  rotationY = 0,
  name,
  role,
  accentColor = '#2563eb',
  isInteractable = false,
  isNearby = false,
  onClick,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const walkCycleRef = useRef(0);
  const moveSmoothRef = useRef(0);

  // Procedural soft blob shadow texture
  const shadowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  useFrame(({ clock }, dt) => {
    const speed = motion.speed || 0;
    const isSitting = Boolean(motion.sit);

    // Smooth movement factor
    moveSmoothRef.current += ((speed > 0.1 && !isSitting ? 1 : 0) - moveSmoothRef.current) * Math.min(1, 10 * dt);
    walkCycleRef.current += dt * (6 + 3 * speed);

    const m = moveSmoothRef.current;
    const s = Math.sin(walkCycleRef.current);
    const time = clock.elapsedTime;

    if (isSitting) {
      // Sitting posture: legs extend forward horizontally onto the chair
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      const typeSwing = motion.typing ? 0.12 * Math.sin(18 * time) : 0;
      // Arms reach forward onto the desk
      if (leftArmRef.current) leftArmRef.current.rotation.x = -1.25 + typeSwing;
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -1.25 - typeSwing;
        rightArmRef.current.rotation.z = 0;
      }
      // Keep torso naturally seated without sinking into floor/chair
      if (bodyRef.current) bodyRef.current.position.y = 0;
      if (headRef.current) headRef.current.rotation.z = motion.typing ? 0 : 0.05 * Math.sin(1.3 * time);
    } else {
      // Walking / Idle Animation
      const idleBob = 0.015 * Math.sin(2.2 * time) * (1 - m);
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.7 * s * m;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.7 * s * m;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8 * s * m;

      if (rightArmRef.current) {
        const isWaving = Boolean(motion.wave) && m < 0.1;
        if (isWaving) {
          rightArmRef.current.rotation.x = -2.6;
          rightArmRef.current.rotation.z = 0.35 + 0.3 * Math.sin(9 * time);
        } else {
          rightArmRef.current.rotation.x = 0.8 * s * m;
          rightArmRef.current.rotation.z = 0;
        }
      }

      if (bodyRef.current) {
        bodyRef.current.position.y = 0.05 * Math.abs(s) * m;
        bodyRef.current.scale.y = 1 + idleBob;
      }
      if (headRef.current) {
        headRef.current.rotation.z = 0.05 * s * m;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* 1. Soft Floor Shadow Blob */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <planeGeometry args={[0.85, 0.85]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>

      {/* 2. Character Body Container */}
      <group ref={bodyRef}>
        {/* Legs: Left & Right */}
        <group ref={leftLegRef} position={[-0.085, 0.26, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.12, 6, 12]} />
            <CozyMat color={look.pants} />
          </mesh>
          <CozyBox
            size={[0.13, 0.08, 0.18]}
            pos={[0, -0.21, 0.03]}
            color="#15181e"
            r={0.035}
            rough={0.5}
            cast
          />
        </group>

        <group ref={rightLegRef} position={[0.085, 0.26, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.12, 6, 12]} />
            <CozyMat color={look.pants} />
          </mesh>
          <CozyBox
            size={[0.13, 0.08, 0.18]}
            pos={[0, -0.21, 0.03]}
            color="#15181e"
            r={0.035}
            rough={0.5}
            cast
          />
        </group>

        {/* Torso with RoundedBox */}
        <CozyBox
          size={[0.38, 0.34, 0.28]}
          pos={[0, 0.43, 0]}
          color={look.top}
          r={0.1}
          rough={0.7}
          cast
        />

        {/* Collar / Tie detail */}
        {look.outfit === 'suit' && (
          <mesh position={[0, 0.47, 0.145]}>
            <boxGeometry args={[0.08, 0.16, 0.01]} />
            <CozyMat color="#c0392b" />
          </mesh>
        )}
        {look.outfit === 'polo' && (
          <mesh position={[0, 0.52, 0.142]}>
            <boxGeometry args={[0.16, 0.05, 0.01]} />
            <CozyMat color="#ffffff" />
          </mesh>
        )}

        {/* Arms: Left & Right */}
        <group ref={leftArmRef} position={[-0.225, 0.55, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.14, 6, 12]} />
            <CozyMat color={look.top} />
          </mesh>
          <mesh position={[0, -0.21, 0.01]} castShadow>
            <sphereGeometry args={[0.055, 14, 10]} />
            <CozyMat color={look.skin} />
          </mesh>
        </group>

        <group ref={rightArmRef} position={[0.225, 0.55, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.14, 6, 12]} />
            <CozyMat color={look.top} />
          </mesh>
          <mesh position={[0, -0.21, 0.01]} castShadow>
            <sphereGeometry args={[0.055, 14, 10]} />
            <CozyMat color={look.skin} />
          </mesh>
        </group>

        {/* Head Container */}
        <group ref={headRef} position={[0, 0.9, 0]}>
          {/* Head Sphere (unless covered by hijab) */}
          {look.hairStyle !== 'hijab' ? (
            <mesh castShadow>
              <sphereGeometry args={[0.31, 32, 24]} />
              <CozyMat color={look.skin} rough={0.6} />
            </mesh>
          ) : (
            /* Hijab full wrap */
            <group>
              <mesh castShadow>
                <sphereGeometry args={[0.34, 32, 24]} />
                <CozyMat color={look.hair} rough={0.7} />
              </mesh>
              {/* Face Opening */}
              <mesh position={[0, 0, 0.12]}>
                <sphereGeometry args={[0.24, 24, 16]} />
                <CozyMat color={look.skin} rough={0.6} />
              </mesh>
            </group>
          )}

          {/* Hair Styles */}
          {look.hairStyle === 'short' && (
            <mesh position={[0, 0.06, -0.04]} castShadow>
              <sphereGeometry args={[0.32, 24, 16]} />
              <CozyMat color={look.hair} rough={0.8} />
            </mesh>
          )}
          {look.hairStyle === 'spiky' && (
            <group position={[0, 0.12, 0]}>
              <mesh castShadow>
                <coneGeometry args={[0.28, 0.35, 7]} />
                <CozyMat color={look.hair} rough={0.8} />
              </mesh>
            </group>
          )}
          {look.hairStyle === 'long' && (
            <group>
              <mesh position={[0, 0.06, -0.04]} castShadow>
                <sphereGeometry args={[0.32, 24, 16]} />
                <CozyMat color={look.hair} rough={0.8} />
              </mesh>
              <mesh position={[0, -0.15, -0.16]} castShadow>
                <capsuleGeometry args={[0.12, 0.28, 8, 12]} />
                <CozyMat color={look.hair} rough={0.8} />
              </mesh>
            </group>
          )}

          {/* Eyes (Cute black round eyes) */}
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.285]}>
              <sphereGeometry args={[0.032, 12, 8]} />
              <meshBasicMaterial color="#1a1a1f" />
            </mesh>
          ))}

          {/* Blush Cheeks */}
          {[-0.16, 0.16].map((x) => (
            <mesh key={`blush-${x}`} position={[x, -0.06, 0.26]} rotation-y={x > 0 ? 0.3 : -0.3}>
              <circleGeometry args={[0.042, 16]} />
              <meshBasicMaterial color="#ff8fa3" transparent opacity={0.65} />
            </mesh>
          ))}

          {/* Glasses */}
          {look.glasses && (
            <group position={[0, 0.02, 0.29]}>
              {[-0.1, 0.1].map((x) => (
                <mesh key={`lens-${x}`} position={[x, 0, 0]}>
                  <ringGeometry args={[0.04, 0.052, 16]} />
                  <meshBasicMaterial color="#2b2f3a" />
                </mesh>
              ))}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.06, 0.012, 0.01]} />
                <meshBasicMaterial color="#2b2f3a" />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* 3. Overhead Nameplate for NPCs — Only displayed when player is nearby */}
      {name && isNearby && (
        <Html position={[0, 1.45, 0]} center distanceFactor={11} occlude zIndexRange={[100, 0]}>
          <div
            style={{ transform: 'scale(0.55)', transformOrigin: 'bottom center' }}
            className="flex items-center gap-1.5 whitespace-nowrap pointer-events-none select-none animate-in fade-in zoom-in-95 duration-200 shadow-xl"
          >
            <span
              className="rounded-full px-3 py-1 text-[13px] font-heading font-bold text-white shadow-md border border-white/25 backdrop-blur-sm"
              style={{ backgroundColor: accentColor }}
            >
              {name}
            </span>
            {isInteractable && (
              <span className="rounded-lg bg-amber-400 text-slate-950 px-2 py-0.5 text-[11px] font-black shadow-md border border-amber-300">
                E
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
