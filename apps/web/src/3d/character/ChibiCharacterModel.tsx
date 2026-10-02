// ==========================================================
// 3d/character/ChibiCharacterModel.tsx
// Cozy Indie Game Chibi Character Model for PlayCanvas React
// Renders cute chibi proportions, expressive face, pastel colors,
// idle breathing, and smooth walk/run pendulum swing.
// ==========================================================

import React, { useRef } from 'react';
import type { Entity as PcEntity } from 'playcanvas';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial, useAppEvent } from '@playcanvas/react/hooks';

export interface ChibiAppearance {
  headColor?: string;
  hairColor?: string;
  torsoColor: string;
  pantsColor?: string;
  shoesColor?: string;
  accentColor?: string;
  glasses?: boolean;
  hairStyle?: 'short' | 'ponytail' | 'curly' | 'wavy' | 'hijab';
}

export interface ChibiCharacterModelProps {
  name: string;
  roleBadge?: string;
  appearance: ChibiAppearance;
  x: number;
  y: number;
  z: number;
  rotY: number;
  animation?: 'idle' | 'walk' | 'run' | 'interact' | 'sit';
  speed?: number;
  showBadge?: boolean;
  isPlayer?: boolean;
}

export const ChibiCharacterModel: React.FC<ChibiCharacterModelProps> = ({
  name,
  roleBadge,
  appearance,
  x,
  y,
  z,
  rotY,
  animation = 'idle',
  showBadge = false,
  isPlayer = false,
}) => {
  const rootRef = useRef<PcEntity>(null);
  const timeRef = useRef(Math.random() * 10);

  // Materials
  const skinMat = useMaterial({
    diffuse: appearance.headColor || '#f8d2b8',
    gloss: 0.15,
    metalness: 0.0,
  });

  const hairMat = useMaterial({
    diffuse: appearance.hairColor || '#362312',
    gloss: 0.2,
    metalness: 0.05,
  });

  const eyeMat = useMaterial({
    diffuse: '#1a181b',
    gloss: 0.8,
  });

  const blushMat = useMaterial({
    diffuse: '#f29e8e',
    opacity: 0.6,
    blendType: 2,
    gloss: 0.1,
  });

  const torsoMat = useMaterial({
    diffuse: appearance.torsoColor,
    gloss: 0.25,
    metalness: 0.02,
  });

  const pantsMat = useMaterial({
    diffuse: appearance.pantsColor || '#3b4252',
    gloss: 0.2,
  });

  const shoesMat = useMaterial({
    diffuse: appearance.shoesColor || '#2e3440',
    gloss: 0.4,
  });

  const accentMat = useMaterial({
    diffuse: appearance.accentColor || '#f59e0b',
    emissive: appearance.accentColor || '#f59e0b',
    emissiveIntensity: 0.25,
    gloss: 0.6,
  });

  const shadowMat = useMaterial({
    diffuse: '#181520',
    opacity: 0.35,
    blendType: 2,
    gloss: 0.0,
  });

  const ringMat = useMaterial({
    diffuse: appearance.accentColor || '#38bdf8',
    emissive: appearance.accentColor || '#38bdf8',
    emissiveIntensity: 0.7,
    gloss: 0.8,
  });

  useAppEvent('update', (dt: number) => {
    timeRef.current += dt;
    const t = timeRef.current;
    if (!rootRef.current) return;

    rootRef.current.setLocalPosition(x, y, z);
    rootRef.current.setLocalEulerAngles(0, rotY, 0);

    const isMoving = animation === 'walk' || animation === 'run';
    const freq = animation === 'run' ? 12 : 7;
    const amp = isMoving ? 0.06 : 0.015;

    // Head & Torso Bob
    const bob = Math.sin(t * freq) * amp;
    const sway = Math.cos(t * freq * 0.5) * (isMoving ? 2 : 0.5);

    const torso = rootRef.current.findByName('ChibiTorso');
    if (torso) {
      torso.setLocalPosition(0, 0.55 + bob, 0);
      torso.setLocalEulerAngles(0, 0, sway);
    }

    const head = rootRef.current.findByName('ChibiHeadGroup');
    if (head) {
      head.setLocalPosition(0, 1.08 + bob * 1.2, 0);
      head.setLocalEulerAngles(0, 0, -sway * 0.7);
    }

    // Pendulum swing
    const armSwing = isMoving ? Math.sin(t * freq) * 26 : Math.sin(t * 2) * 2;
    const legSwing = isMoving ? Math.sin(t * freq) * 32 : 0;

    const leftArm = rootRef.current.findByName('LeftArm');
    if (leftArm) leftArm.setLocalEulerAngles(-armSwing, 0, 14);

    const rightArm = rootRef.current.findByName('RightArm');
    if (rightArm) rightArm.setLocalEulerAngles(armSwing, 0, -14);

    const leftLeg = rootRef.current.findByName('LeftLeg');
    if (leftLeg) leftLeg.setLocalEulerAngles(legSwing, 0, 0);

    const rightLeg = rootRef.current.findByName('RightLeg');
    if (rightLeg) rightLeg.setLocalEulerAngles(-legSwing, 0, 0);
  });

  return (
    <Entity ref={rootRef} name={`Chibi-${name}`} position={[x, y, z]}>
      {/* 1. Soft blob shadow underneath */}
      <Entity name="ChibiShadow" position={[0, 0.015, 0]} scale={[0.7, 0.01, 0.7]}>
        <Render type="cylinder" material={shadowMat} />
      </Entity>

      {/* 2. Interactive Selection Ring for Player */}
      {isPlayer && (
        <Entity name="PlayerSelectionRing" position={[0, 0.02, 0]} scale={[0.85, 0.012, 0.85]}>
          <Render type="cylinder" material={ringMat} />
        </Entity>
      )}

      {/* 3. Legs & Shoes */}
      <Entity name="LeftLeg" position={[-0.12, 0.22, 0]} scale={[0.13, 0.44, 0.13]}>
        <Render type="capsule" material={pantsMat} castShadows={true} />
      </Entity>
      <Entity name="RightLeg" position={[0.12, 0.22, 0]} scale={[0.13, 0.44, 0.13]}>
        <Render type="capsule" material={pantsMat} castShadows={true} />
      </Entity>

      <Entity name="LeftShoe" position={[-0.12, 0.05, 0.04]} scale={[0.15, 0.09, 0.22]}>
        <Render type="box" material={shoesMat} castShadows={true} />
      </Entity>
      <Entity name="RightShoe" position={[0.12, 0.05, 0.04]} scale={[0.15, 0.09, 0.22]}>
        <Render type="box" material={shoesMat} castShadows={true} />
      </Entity>

      {/* 4. Torso with cozy outfit */}
      <Entity name="ChibiTorso" position={[0, 0.55, 0]} scale={[0.36, 0.42, 0.26]}>
        <Render type="box" material={torsoMat} castShadows={true} />
      </Entity>

      {/* Collar / Badge Accent */}
      <Entity name="CollarAccent" position={[0, 0.72, 0.12]} scale={[0.16, 0.06, 0.04]}>
        <Render type="box" material={accentMat} />
      </Entity>

      {/* 5. Arms & Hands */}
      <Entity name="LeftArm" position={[-0.24, 0.62, 0]} scale={[0.11, 0.34, 0.11]}>
        <Render type="capsule" material={torsoMat} castShadows={true} />
      </Entity>
      <Entity name="RightArm" position={[0.24, 0.62, 0]} scale={[0.11, 0.34, 0.11]}>
        <Render type="capsule" material={torsoMat} castShadows={true} />
      </Entity>

      <Entity name="LeftHand" position={[-0.24, 0.43, 0]} scale={[0.1, 0.1, 0.1]}>
        <Render type="sphere" material={skinMat} />
      </Entity>
      <Entity name="RightHand" position={[0.24, 0.43, 0]} scale={[0.1, 0.1, 0.1]}>
        <Render type="sphere" material={skinMat} />
      </Entity>

      {/* 6. Chibi Head Group — Big, cute, expressive head */}
      <Entity name="ChibiHeadGroup" position={[0, 1.08, 0]}>
        {/* Main Head Sphere */}
        <Entity name="HeadSphere" scale={[0.42, 0.4, 0.38]}>
          <Render type="sphere" material={skinMat} castShadows={true} />
        </Entity>

        {/* Hair Cap & Fringe */}
        <Entity name="HairMain" position={[0, 0.08, -0.04]} scale={[0.44, 0.34, 0.4]}>
          <Render type="sphere" material={hairMat} castShadows={true} />
        </Entity>

        {/* Front hair fringe / bangs */}
        <Entity name="HairBangs" position={[0, 0.16, 0.16]} scale={[0.38, 0.12, 0.16]}>
          <Render type="box" material={hairMat} />
        </Entity>

        {/* Eyes (left & right) */}
        <Entity name="EyeLeft" position={[-0.11, 0.02, 0.18]} scale={[0.045, 0.055, 0.03]}>
          <Render type="sphere" material={eyeMat} />
        </Entity>
        <Entity name="EyeRight" position={[0.11, 0.02, 0.18]} scale={[0.045, 0.055, 0.03]}>
          <Render type="sphere" material={eyeMat} />
        </Entity>

        {/* Blush Cheeks */}
        <Entity name="BlushLeft" position={[-0.16, -0.06, 0.16]} scale={[0.07, 0.035, 0.02]}>
          <Render type="sphere" material={blushMat} />
        </Entity>
        <Entity name="BlushRight" position={[0.16, -0.06, 0.16]} scale={[0.07, 0.035, 0.02]}>
          <Render type="sphere" material={blushMat} />
        </Entity>

        {/* Eyeglasses if applicable */}
        {appearance.glasses && (
          <Entity name="GlassesFrame" position={[0, 0.02, 0.19]} scale={[0.34, 0.08, 0.02]}>
            <Render type="box" material={eyeMat} />
          </Entity>
        )}
      </Entity>
    </Entity>
  );
};
