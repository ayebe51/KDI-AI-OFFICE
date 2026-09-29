import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AgentAvatar } from './AgentAvatar';
import type { AgentState } from '@kdi/types';

interface OfficeCanvasProps {
  demoAgentState: AgentState;
  demoAgentActivity: string;
}

export const OfficeCanvas: React.FC<OfficeCanvasProps> = ({
  demoAgentState,
  demoAgentActivity,
}) => {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
      <Canvas
        shadows
        camera={{ position: [3.5, 3.2, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Soft Background */}
        <color attach="background" args={['#090d16']} />

        {/* Lighting Configuration: Warm Professional Tone */}
        <ambientLight intensity={0.65} color="#e2e8f0" />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          color="#fef3c7" // Warm light
        />
        <pointLight position={[-4, 4, -4]} intensity={0.4} color="#38bdf8" />

        {/* Orbit Camera Controls */}
        <OrbitControls
          makeDefault
          minDistance={2}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2.1} // Prevent going below floor
          target={[0, 0.8, 0]}
          enableDamping
          dampingFactor={0.05}
        />

        {/* ========================================= */}
        {/* 1. Office Floor & Architectural Base      */}
        {/* ========================================= */}
        {/* Main Office Parquet Floor */}
        <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Engineering Zone Accent Rug */}
        <mesh position={[0, 0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.5, 4.5]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Architectural Grid Lines */}
        <gridHelper
          args={[14, 28, '#334155', '#1e293b']}
          position={[0, 0.02, 0]}
        />

        {/* Room Architectural Back Wall */}
        <mesh position={[0, 2.5, -5]} receiveShadow>
          <boxGeometry args={[14, 5, 0.2]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} />
        </mesh>

        {/* Decorative Glass Partition Panel */}
        <mesh position={[0, 1.5, -4.8]}>
          <boxGeometry args={[6, 2.5, 0.05]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transmission={0.85}
            opacity={0.3}
            transparent
            roughness={0.1}
            ior={1.4}
          />
        </mesh>

        {/* ========================================= */}
        {/* 2. Interactive Demo Agent (ENGINEER)      */}
        {/* ========================================= */}
        <AgentAvatar
          name="Farhan (AI Engineer)"
          role="SOFTWARE_ENGINEER"
          state={demoAgentState}
          activitySummary={demoAgentActivity}
          position={[0, 0, 0]}
        />
      </Canvas>

      {/* Floating 3D Control Hints Overlay */}
      <div className="absolute bottom-4 left-4 glass-panel px-3 py-2 rounded-lg text-xs text-slate-400 flex items-center space-x-3 pointer-events-none">
        <span>🖱️ Left-Click + Drag: Rotate Camera</span>
        <span>•</span>
        <span>Scroll: Zoom In/Out</span>
        <span>•</span>
        <span>Right-Click + Drag: Pan</span>
      </div>

      <div className="absolute top-4 left-4 glass-panel px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>React Three Fiber • WebGL 2.0 Digital Twin Active</span>
      </div>
    </div>
  );
};
