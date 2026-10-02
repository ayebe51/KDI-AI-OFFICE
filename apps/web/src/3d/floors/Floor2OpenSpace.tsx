// ==========================================================
// 3d/floors/Floor2OpenSpace.tsx
// Floor 2 Environment: Creative Open Space, Social Media Hub,
// Finance Area, Sleep Capsules, Media Studio & Lift
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render, Light } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { LiftEntity } from '../entities/LiftEntity.js';
import { ChibiCharacterModel } from '../character/ChibiCharacterModel.js';

export interface Floor2OpenSpaceProps {
  onCallLift?: () => void;
  onInspectStudio?: () => void;
  onInspectSleepPod?: () => void;
}

export const Floor2OpenSpace: React.FC<Floor2OpenSpaceProps> = ({
  onCallLift,
  onInspectStudio,
  onInspectSleepPod,
}) => {
  // Materials
  const floorWoodMat = useMaterial({ diffuse: '#efe2c8', gloss: 0.35 });
  const dividerMat = useMaterial({ diffuse: '#d8dee9', gloss: 0.2 });
  const deskMat = useMaterial({ diffuse: '#b08968', gloss: 0.3 });
  const chairMat = useMaterial({ diffuse: '#2fa39a', gloss: 0.3 });
  const techMat = useMaterial({ diffuse: '#2e3440', metalness: 0.4, gloss: 0.6 });
  const screenMat = useMaterial({
    diffuse: '#8b5cf6',
    emissive: '#7c3aed',
    emissiveIntensity: 0.6,
  });
  const capsuleMat = useMaterial({ diffuse: '#fdfbf7', gloss: 0.4 });
  const capsuleWarmGlow = useMaterial({
    diffuse: '#fff3b0',
    emissive: '#ffd166',
    emissiveIntensity: 0.8,
  });
  const studioBackdropMat = useMaterial({ diffuse: '#2a9d8f', gloss: 0.1 });
  const softboxGlowMat = useMaterial({
    diffuse: '#ffffff',
    emissive: '#fffdf5',
    emissiveIntensity: 1.5,
  });
  const plantPotMat = useMaterial({ diffuse: '#d4a373', gloss: 0.3 });
  const plantLeafMat = useMaterial({ diffuse: '#2a9d8f', gloss: 0.3 });

  return (
    <Entity name="Floor2Root">
      {/* Floor Foundation */}
      <Entity name="Floor2Plank" position={[0, 0.015, 6]} scale={[28, 0.02, 28]}>
        <Render type="box" material={floorWoodMat} receiveShadows={true} />
      </Entity>

      {/* Decorative Partition Dividers */}
      <Entity name="Divider1" position={[-1, 1.2, 6]} scale={[0.15, 2.4, 16]}>
        <Render type="box" material={dividerMat} />
      </Entity>

      {/* ── 1. SOCIAL MEDIA & CONTENT AREA (Left side, x: -7, z: 12) ── */}
      <Entity name="SocialMediaArea" position={[-7.5, 0, 12]}>
        {/* Collaborative Pod Desks */}
        <Entity name="SocialDeskRound" position={[0, 0.4, 0]} scale={[3.2, 0.75, 3.2]}>
          <Render type="cylinder" material={deskMat} castShadows={true} />
        </Entity>

        {/* Monitors & Tablets */}
        <Entity name="Tablet1" position={[-0.8, 0.8, 0.6]} scale={[0.5, 0.04, 0.4]}>
          <Render type="box" material={techMat} />
        </Entity>
        <Entity name="Screen1" position={[0.8, 1.05, 0]} rotation={[0, -30, 0]} scale={[0.65, 0.45, 0.04]}>
          <Render type="box" material={screenMat} />
        </Entity>

        {/* Chairs around desk */}
        <Entity name="Chair1" position={[-1.2, 0.35, 1.2]} scale={[0.6, 0.7, 0.6]}>
          <Render type="box" material={chairMat} />
        </Entity>
        <Entity name="Chair2" position={[1.2, 0.35, -1.2]} scale={[0.6, 0.7, 0.6]}>
          <Render type="box" material={chairMat} />
        </Entity>

        {/* Social Media Content Creator NPC */}
        <ChibiCharacterModel
          name="Alya"
          roleBadge="Creative Content Strategist"
          appearance={{
            headColor: '#f9d2be',
            hairColor: '#312e81',
            torsoColor: '#ec4899',
            pantsColor: '#3a3f4b',
            shoesColor: '#1c1917',
            accentColor: '#f472b6',
          }}
          x={-1.2}
          y={0}
          z={1.2}
          rotY={45}
          animation="idle"
        />

        {/* Moodboard Stand */}
        <Entity name="Moodboard" position={[0, 1.4, -2.4]} scale={[2.6, 1.6, 0.08]}>
          <Render type="box" material={dividerMat} />
        </Entity>
      </Entity>

      {/* ── 2. FINANCE AREA (Right side, x: 6.5, z: 8) ── */}
      <Entity name="FinanceArea" position={[6.5, 0, 8]}>
        <Entity name="FinanceDesk" position={[0, 0.4, 0]} scale={[2.2, 0.75, 1.1]}>
          <Render type="box" material={deskMat} castShadows={true} />
        </Entity>
        {/* Dual Screen & Calculator */}
        <Entity name="FinanceScreen" position={[0, 1.05, -0.2]} scale={[0.7, 0.45, 0.04]}>
          <Render type="box" material={screenMat} />
        </Entity>
        <Entity name="Calculator" position={[-0.5, 0.8, 0.2]} scale={[0.2, 0.03, 0.25]}>
          <Render type="box" material={techMat} />
        </Entity>
        {/* Document Trays & Filing Cabinets */}
        <Entity name="FilingCabinet" position={[1.6, 0.65, -0.2]} scale={[0.65, 1.3, 0.8]}>
          <Render type="box" material={techMat} />
        </Entity>
        <Entity name="FinanceChair" position={[0, 0.35, 0.6]} scale={[0.6, 0.7, 0.6]}>
          <Render type="box" material={chairMat} />
        </Entity>
      </Entity>

      {/* ── 3. SLEEP CAPSULES (Left side, x: -7.5, z: -2) ── */}
      <Entity
        name="SleepCapsulesArea"
        position={[-7.5, 0, -2]}
        onClick={onInspectSleepPod}
        onPointerDown={onInspectSleepPod}
      >
        {/* Capsule Pod 1 */}
        <Entity name="Pod1" position={[0, 1.1, -1.8]} scale={[2.2, 2.0, 1.4]}>
          <Render type="box" material={capsuleMat} castShadows={true} />
        </Entity>
        <Entity name="Pod1Glow" position={[0, 1.1, -1.05]} scale={[1.8, 1.4, 0.05]}>
          <Render type="box" material={capsuleWarmGlow} />
          <Light type="omni" color="#ffd166" intensity={0.6} range={4} />
        </Entity>

        {/* Capsule Pod 2 */}
        <Entity name="Pod2" position={[0, 1.1, 1.0]} scale={[2.2, 2.0, 1.4]}>
          <Render type="box" material={capsuleMat} castShadows={true} />
        </Entity>
        <Entity name="Pod2Glow" position={[0, 1.1, 1.75]} scale={[1.8, 1.4, 0.05]}>
          <Render type="box" material={capsuleWarmGlow} />
          <Light type="omni" color="#ffd166" intensity={0.6} range={4} />
        </Entity>
      </Entity>

      {/* ── 4. CREATIVE STUDIO (Right side, x: 6.5, z: -2) ── */}
      <Entity
        name="CreativeStudioArea"
        position={[6.5, 0, -2]}
        onClick={onInspectStudio}
        onPointerDown={onInspectStudio}
      >
        {/* Green/Teal Curved Studio Backdrop */}
        <Entity name="StudioBackdrop" position={[0, 1.6, -3.2]} scale={[5.2, 3.2, 0.1]}>
          <Render type="box" material={studioBackdropMat} />
        </Entity>

        {/* Video Camera on Tripod */}
        <Entity name="TripodLegs" position={[0, 0.65, 0]} scale={[0.4, 1.3, 0.4]}>
          <Render type="cylinder" material={techMat} />
        </Entity>
        <Entity name="StudioCameraBody" position={[0, 1.35, 0]} scale={[0.3, 0.25, 0.55]}>
          <Render type="box" material={techMat} />
        </Entity>
        <Entity name="CameraLens" position={[0, 1.35, -0.32]} scale={[0.18, 0.18, 0.2]}>
          <Render type="cylinder" material={techMat} />
        </Entity>

        {/* Softbox Studio Light Left */}
        <Entity name="SoftboxL" position={[-1.8, 1.8, -1.2]} rotation={[20, 30, 0]} scale={[0.6, 0.8, 0.2]}>
          <Render type="box" material={softboxGlowMat} />
          <Light type="omni" color="#ffffff" intensity={1.8} range={7} />
        </Entity>
        {/* Softbox Studio Light Right */}
        <Entity name="SoftboxR" position={[1.8, 1.8, -1.2]} rotation={[20, -30, 0]} scale={[0.6, 0.8, 0.2]}>
          <Render type="box" material={softboxGlowMat} />
          <Light type="omni" color="#ffffff" intensity={1.8} range={7} />
        </Entity>

        {/* Studio Host Chair */}
        <Entity name="HostChair" position={[0, 0.45, -2.0]} scale={[0.7, 0.85, 0.7]}>
          <Render type="box" material={chairMat} />
        </Entity>

        {/* Boom Microphone */}
        <Entity name="MicStand" position={[1.2, 1.2, -1.8]} scale={[0.06, 2.2, 0.06]}>
          <Render type="cylinder" material={techMat} />
        </Entity>
        <Entity name="MicHead" position={[0.8, 1.7, -2.0]} scale={[0.12, 0.24, 0.12]}>
          <Render type="cylinder" material={techMat} />
        </Entity>
      </Entity>

      {/* Decorative Potted Plants */}
      <Entity name="Floor2Plant1" position={[-1.6, 0, 17]}>
        <Entity name="Pot" position={[0, 0.4, 0]} scale={[0.6, 0.8, 0.6]}>
          <Render type="cylinder" material={plantPotMat} />
        </Entity>
        <Entity name="Foliage" position={[0, 1.0, 0]} scale={[1.0, 0.8, 1.0]}>
          <Render type="sphere" material={plantLeafMat} />
        </Entity>
      </Entity>

      {/* ── 5. LIFT on Floor 2 (x: 7.5, z: 16) ── */}
      <LiftEntity
        position={[7.5, 0, 16]}
        rotation={[0, -90, 0]}
        currentFloorLabel="2"
        onCallLift={onCallLift}
      />
    </Entity>
  );
};
