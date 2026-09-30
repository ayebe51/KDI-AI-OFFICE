// ==========================================================
// 3d/rooms/PortfolioGallery.tsx
// First-Class Portfolio Gallery with Showcase Pedestals & Holographic Displays
// ==========================================================

import React from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import type { OfficeProjectItem } from '@kdi/types';

export interface PortfolioGalleryProps {
  position?: [number, number, number];
  projects?: OfficeProjectItem[];
  onSelectProject?: (project: OfficeProjectItem) => void;
  onSelectRoom?: () => void;
}

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  position = [0, 0, 24],
  projects = [],
  onSelectProject,
  onSelectRoom,
}) => {
  // Gallery museum polished black floor
  const floorMat = useMaterial({
    diffuse: '#090d16',
    metalness: 0.5,
    gloss: 0.9,
  });

  // Showcase pedestal white quartz
  const pedestalMat = useMaterial({
    diffuse: '#f8fafc',
    gloss: 0.8,
  });

  // Project holographic display screen material
  const screenMat = useMaterial({
    diffuse: '#ec4899',
    emissive: '#db2777',
    emissiveIntensity: 0.7,
    gloss: 0.9,
  });

  // Display project cards along pedestal line
  const defaultProjects: OfficeProjectItem[] = [
    {
      id: 'prj_01J9X8KONEKSI',
      name: 'Koneksi Santri',
      category: 'Web Application',
      description: 'Integrated digital management ecosystem for Islamic boarding schools',
      status: 'DEVELOPMENT',
      activeAgents: 3,
      currentTasks: 7,
      techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      year: '2026',
      featured: true,
      visibility: 'PUBLIC',
    },
    {
      id: 'prj_02J9X8OFFICE',
      name: 'KDI AI Office',
      category: 'AI Digital Twin',
      description: 'Living virtual office & autonomous multi-agent software engineering workspace',
      status: 'ACTIVE',
      activeAgents: 5,
      currentTasks: 12,
      techStack: ['NestJS', 'React', 'PlayCanvas', 'Neo4j', 'Redis'],
      year: '2026',
      featured: true,
      visibility: 'PUBLIC',
    },
  ];

  const items = projects.length > 0 ? projects : defaultProjects;

  return (
    <Entity
      name="Room-RM-PORTFOLIO"
      position={position}
      onClick={onSelectRoom}
      onPointerDown={onSelectRoom}
    >
      {/* 1. Museum Polished Floor */}
      <Entity name="PortfolioFloor" position={[0, 0.015, 0]} scale={[15.6, 0.02, 7.6]}>
        <Render type="box" material={floorMat} receiveShadows={true} />
      </Entity>

      {/* 2. Gallery Pedestals and Project Showcase Displays */}
      {items.map((proj, idx) => {
        const xOffset = (idx - (items.length - 1) / 2) * 4.5;

        return (
          <Entity
            key={proj.id}
            name={`Pedestal-${proj.id}`}
            position={[xOffset, 0, 0]}
            onClick={(e) => {
              e?.stopPropagation?.();
              onSelectProject?.(proj);
            }}
            onPointerDown={(e) => {
              e?.stopPropagation?.();
              onSelectProject?.(proj);
            }}
          >
            {/* Base Pedestal Column */}
            <Entity name="PedestalBase" position={[0, 0.45, 0]} scale={[1.2, 0.9, 1.2]}>
              <Render type="box" material={pedestalMat} castShadows={true} />
            </Entity>

            {/* Glowing Project Card Display Screen */}
            <Entity
              name="ProjectHoloDisplay"
              position={[0, 1.35, 0]}
              scale={[1.4, 0.85, 0.06]}
              rotation={[10, 0, 0]}
            >
              <Render type="box" material={screenMat} />
            </Entity>
          </Entity>
        );
      })}
    </Entity>
  );
};
