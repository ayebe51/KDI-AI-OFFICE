// ==========================================================
// 3d-r3f/lighting/CozyLighting.tsx
// Cozy Hemisphere, Directional Sun & Ambient Lighting Rig
// ==========================================================

import React from 'react';

export type LightingPhase = 'day' | 'sunset' | 'night';

export interface CozyLightingProps {
  phase?: LightingPhase;
}

export const COZY_LIGHT_CONFIGS = {
  day: {
    hemiSky: '#fff6e5',
    hemiGround: '#cfc4b4',
    hemiIntensity: 1.25,
    ambient: 0.45,
    sunColor: '#fff3e0',
    sunIntensity: 1.8,
    sunPos: [-8, 16, 8] as [number, number, number],
    skyColor: '#1b1626',
    lampIntensity: 0.2,
  },
  sunset: {
    hemiSky: '#fed7aa',
    hemiGround: '#b89980',
    hemiIntensity: 1.0,
    ambient: 0.40,
    sunColor: '#ff9a4f',
    sunIntensity: 1.45,
    sunPos: [-14, 9, 6] as [number, number, number],
    skyColor: '#1b1626',
    lampIntensity: 0.6,
  },
  night: {
    hemiSky: '#dbeafe',
    hemiGround: '#818cf8',
    hemiIntensity: 0.75,
    ambient: 0.55,
    sunColor: '#93c5fd',
    sunIntensity: 0.65,
    sunPos: [-8, 14, 7] as [number, number, number],
    skyColor: '#0f172a',
    lampIntensity: 1.0,
  },
};

export const CozyLighting: React.FC<CozyLightingProps> = ({ phase = 'day' }) => {
  const cfg = COZY_LIGHT_CONFIGS[phase] || COZY_LIGHT_CONFIGS.day;

  return (
    <>
      {/* 1. Hemisphere Light (Soft Sky vs Ground bounce) */}
      <hemisphereLight
        args={[cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity]}
      />

      {/* 2. Soft Ambient Fill Light */}
      <ambientLight intensity={cfg.ambient} />

      {/* 3. Warm Directional Sunlight with Soft PCF Shadows */}
      <directionalLight
        position={cfg.sunPos}
        intensity={cfg.sunIntensity}
        color={cfg.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
};
