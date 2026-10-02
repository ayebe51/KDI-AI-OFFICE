// ==========================================================
// 3d/floors/RooftopGarden.tsx
// Rooftop Environment: Cozy Rooftop Bar, Fire Pit with Glowing Embers,
// Pastel Bean Bags, Pergola, Potted Greenery, and Warm Fairy Lights
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render, Light } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { LiftEntity } from '../entities/LiftEntity.js';
import { ChibiCharacterModel } from '../character/ChibiCharacterModel.js';

export interface RooftopGardenProps {
  onCallLift?: () => void;
  onSitFirepit?: () => void;
  onOrderDrink?: () => void;
}

export const RooftopGarden: React.FC<RooftopGardenProps> = ({
  onCallLift,
  onSitFirepit,
  onOrderDrink,
}) => {
  // Materials
  const deckWoodMat = useMaterial({ diffuse: '#9c8069', gloss: 0.35 });
  const turfMat = useMaterial({ diffuse: '#6b9080', gloss: 0.1 });
  const stoneMat = useMaterial({ diffuse: '#434c5e', gloss: 0.2 });
  const fireGlowMat = useMaterial({
    diffuse: '#f2994a',
    emissive: '#e85d5d',
    emissiveIntensity: 1.6,
    gloss: 0.8,
  });
  const barCounterMat = useMaterial({ diffuse: '#6b4f3a', gloss: 0.5 });
  const barStoolMat = useMaterial({ diffuse: '#d4a373', gloss: 0.3 });
  const railingGlassMat = useMaterial({
    diffuse: '#a8dadc',
    opacity: 0.35,
    blendType: 2,
    gloss: 0.8,
  });
  const railingPostMat = useMaterial({ diffuse: '#2e3440', gloss: 0.5 });

  // Pastel Bean Bags
  const beanBagSageMat = useMaterial({ diffuse: '#a3b18a', gloss: 0.2 });
  const beanBagBlushMat = useMaterial({ diffuse: '#f28482', gloss: 0.2 });
  const beanBagCreamMat = useMaterial({ diffuse: '#fdfbf7', gloss: 0.2 });
  const beanBagTealMat = useMaterial({ diffuse: '#2fa39a', gloss: 0.2 });

  // Fairy Lights warm golden bulbs
  const fairyBulbMat = useMaterial({
    diffuse: '#ffea9f',
    emissive: '#ffd166',
    emissiveIntensity: 2.2,
    gloss: 0.9,
  });
  const pergolaWoodMat = useMaterial({ diffuse: '#5c3d2e', gloss: 0.3 });

  // Planter
  const potMat = useMaterial({ diffuse: '#d4a373', gloss: 0.3 });
  const plantMat = useMaterial({ diffuse: '#2a9d8f', gloss: 0.3 });

  return (
    <Entity name="RooftopRoot">
      {/* ── 1. ROOFTOP DECK & TURF FOUNDATION ── */}
      <Entity name="RooftopDeck" position={[0, 0.015, 6]} scale={[28, 0.02, 28]}>
        <Render type="box" material={deckWoodMat} receiveShadows={true} />
      </Entity>

      {/* Center Astroturf Area */}
      <Entity name="RooftopTurf" position={[0, 0.02, 4]} scale={[16, 0.01, 16]}>
        <Render type="box" material={turfMat} receiveShadows={true} />
      </Entity>

      {/* Safety Glass Perimeter Railings */}
      <Entity name="RailingNorth" position={[0, 0.6, -7.8]} scale={[27.6, 1.2, 0.1]}>
        <Render type="box" material={railingGlassMat} />
      </Entity>
      <Entity name="RailingWest" position={[-13.8, 0.6, 6]} scale={[0.1, 1.2, 27.6]}>
        <Render type="box" material={railingGlassMat} />
      </Entity>
      <Entity name="RailingEast" position={[13.8, 0.6, 6]} scale={[0.1, 1.2, 27.6]}>
        <Render type="box" material={railingGlassMat} />
      </Entity>

      {/* ── 2. CENTRAL FIRE PIT WITH GLOWING EMBERS ── */}
      <Entity
        name="FirePitArea"
        position={[0, 0, 4]}
        onClick={onSitFirepit}
        onPointerDown={onSitFirepit}
      >
        {/* Stone Outer Ring */}
        <Entity name="StoneRing" position={[0, 0.25, 0]} scale={[2.4, 0.5, 2.4]}>
          <Render type="cylinder" material={stoneMat} castShadows={true} />
        </Entity>
        {/* Inner Glowing Fire Embers */}
        <Entity name="FireEmbers" position={[0, 0.38, 0]} scale={[1.6, 0.35, 1.6]}>
          <Render type="cylinder" material={fireGlowMat} />
          {/* Warm Cozy Firelight */}
          <Light type="omni" color="#f2994a" intensity={2.4} range={10} />
        </Entity>

        {/* ── 3. PASTEL BEAN BAGS CIRCLED AROUND FIRE PIT ── */}
        <Entity name="BeanBag1" position={[-2.4, 0.3, 0]} scale={[1.1, 0.55, 1.1]}>
          <Render type="sphere" material={beanBagSageMat} castShadows={true} />
        </Entity>
        <Entity name="BeanBag2" position={[2.4, 0.3, 0]} scale={[1.1, 0.55, 1.1]}>
          <Render type="sphere" material={beanBagBlushMat} castShadows={true} />
        </Entity>
        <Entity name="BeanBag3" position={[0, 0.3, -2.4]} scale={[1.1, 0.55, 1.1]}>
          <Render type="sphere" material={beanBagCreamMat} castShadows={true} />
        </Entity>
        <Entity name="BeanBag4" position={[0, 0.3, 2.4]} scale={[1.1, 0.55, 1.1]}>
          <Render type="sphere" material={beanBagTealMat} castShadows={true} />
        </Entity>

        {/* Diagonal Bean Bags */}
        <Entity name="BeanBag5" position={[-1.7, 0.3, -1.7]} scale={[1.0, 0.5, 1.0]}>
          <Render type="sphere" material={beanBagCreamMat} />
        </Entity>
        <Entity name="BeanBag6" position={[1.7, 0.3, 1.7]} scale={[1.0, 0.5, 1.0]}>
          <Render type="sphere" material={beanBagSageMat} />
        </Entity>
      </Entity>

      {/* ── 4. ROOFTOP BAR COUNTER (x: -8, z: 4) ── */}
      <Entity
        name="RooftopBarArea"
        position={[-8.5, 0, 4]}
        onClick={onOrderDrink}
        onPointerDown={onOrderDrink}
      >
        {/* Wooden Bar Counter */}
        <Entity name="BarCounter" position={[0, 0.55, 0]} scale={[1.6, 1.1, 4.4]}>
          <Render type="box" material={barCounterMat} castShadows={true} />
        </Entity>
        {/* Bar Counter Ledge */}
        <Entity name="BarLedge" position={[0.1, 1.15, 0]} scale={[1.8, 0.08, 4.6]}>
          <Render type="box" material={barCounterMat} />
        </Entity>

        {/* 3 High Bar Stools */}
        <Entity name="Stool1" position={[1.4, 0.45, -1.3]} scale={[0.5, 0.9, 0.5]}>
          <Render type="cylinder" material={barStoolMat} />
        </Entity>
        <Entity name="Stool2" position={[1.4, 0.45, 0]} scale={[0.5, 0.9, 0.5]}>
          <Render type="cylinder" material={barStoolMat} />
        </Entity>
        <Entity name="Stool3" position={[1.4, 0.45, 1.3]} scale={[0.5, 0.9, 0.5]}>
          <Render type="cylinder" material={barStoolMat} />
        </Entity>

        {/* Warm hanging bar lantern */}
        <Entity name="BarLantern" position={[0, 2.2, 0]} scale={[0.2, 0.3, 0.2]}>
          <Render type="box" material={fairyBulbMat} />
          <Light type="omni" color="#ffd166" intensity={1.4} range={6} />
        </Entity>

        {/* Barista / Bartender Chibi NPC */}
        <ChibiCharacterModel
          name="Danang"
          roleBadge="Rooftop Lounge Host"
          appearance={{
            headColor: '#f9d2be',
            hairColor: '#18181b',
            torsoColor: '#059669', // Emerald tropical linen shirt
            pantsColor: '#2e3440',
            shoesColor: '#1c1917',
            accentColor: '#34d399',
          }}
          x={-0.6}
          y={0}
          z={0}
          rotY={90}
          animation="idle"
        />
      </Entity>

      {/* ── 5. PERGOLA & WARM FAIRY LIGHTS ── */}
      <Entity name="PergolaFairyLights" position={[0, 0, 4]}>
        {/* 4 Wooden Corner Posts */}
        <Entity name="PostNW" position={[-4.5, 1.8, -4.5]} scale={[0.18, 3.6, 0.18]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>
        <Entity name="PostNE" position={[4.5, 1.8, -4.5]} scale={[0.18, 3.6, 0.18]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>
        <Entity name="PostSW" position={[-4.5, 1.8, 4.5]} scale={[0.18, 3.6, 0.18]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>
        <Entity name="PostSE" position={[4.5, 1.8, 4.5]} scale={[0.18, 3.6, 0.18]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>

        {/* Overhead Beams */}
        <Entity name="BeamN" position={[0, 3.55, -4.5]} scale={[9.2, 0.15, 0.15]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>
        <Entity name="BeamS" position={[0, 3.55, 4.5]} scale={[9.2, 0.15, 0.15]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>
        <Entity name="BeamW" position={[-4.5, 3.55, 0]} scale={[0.15, 0.15, 9.2]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>
        <Entity name="BeamE" position={[4.5, 3.55, 0]} scale={[0.15, 0.15, 9.2]}>
          <Render type="box" material={pergolaWoodMat} />
        </Entity>

        {/* Hanging Warm Fairy Light Bulbs across the beams */}
        {[-3, -1.5, 0, 1.5, 3].map((pos, idx) => (
          <React.Fragment key={idx}>
            {/* North string bulbs */}
            <Entity name={`FairyN_${idx}`} position={[pos, 3.3, -4.5]} scale={[0.12, 0.16, 0.12]}>
              <Render type="sphere" material={fairyBulbMat} />
            </Entity>
            {/* South string bulbs */}
            <Entity name={`FairyS_${idx}`} position={[pos, 3.3, 4.5]} scale={[0.12, 0.16, 0.12]}>
              <Render type="sphere" material={fairyBulbMat} />
            </Entity>
            {/* Center catenary drape */}
            <Entity name={`FairyC_${idx}`} position={[pos, 3.1 - Math.abs(pos) * 0.05, 0]} scale={[0.12, 0.16, 0.12]}>
              <Render type="sphere" material={fairyBulbMat} />
            </Entity>
          </React.Fragment>
        ))}

        {/* Soft Warm Ambient Fairy Light Glow */}
        <Entity name="FairyGlowCenter" position={[0, 3.2, 0]}>
          <Light type="omni" color="#ffe8a3" intensity={1.8} range={14} />
        </Entity>
      </Entity>

      {/* Decorative Planter Boxes */}
      <Entity name="RooftopPlant1" position={[-12, 0, -6]}>
        <Entity name="Pot" position={[0, 0.45, 0]} scale={[0.8, 0.9, 0.8]}>
          <Render type="cylinder" material={potMat} />
        </Entity>
        <Entity name="Foliage" position={[0, 1.2, 0]} scale={[1.2, 1.0, 1.2]}>
          <Render type="sphere" material={plantMat} />
        </Entity>
      </Entity>
      <Entity name="RooftopPlant2" position={[12, 0, -6]}>
        <Entity name="Pot" position={[0, 0.45, 0]} scale={[0.8, 0.9, 0.8]}>
          <Render type="cylinder" material={potMat} />
        </Entity>
        <Entity name="Foliage" position={[0, 1.2, 0]} scale={[1.2, 1.0, 1.2]}>
          <Render type="sphere" material={plantMat} />
        </Entity>
      </Entity>

      {/* ── 6. LIFT on Rooftop (x: 7.5, z: 16) ── */}
      <LiftEntity
        position={[7.5, 0, 16]}
        rotation={[0, -90, 0]}
        currentFloorLabel="R"
        onCallLift={onCallLift}
      />
    </Entity>
  );
};
