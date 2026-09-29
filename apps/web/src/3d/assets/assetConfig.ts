// ==========================================================
// 3d/assets/assetConfig.ts
// Asset Configuration, Metadata, and GLTF/GLB Load Strategies
// ==========================================================

export interface ModelAssetMetadata {
  id: string;
  name: string;
  url: string;
  format: 'glb' | 'gltf' | 'procedural';
  polygonCount: number;
  byteSize: number;
  license: string;
  licenseAuthor: string;
  isOptimizedForWeb: boolean;
}

export const OFFICE_3D_ASSETS: Record<string, ModelAssetMetadata> = {
  DEMO_AGENT: {
    id: 'asset-agent-eng-001',
    name: 'Software Engineer Low-Poly Avatar',
    url: '/assets/models/agent_marker.glb',
    format: 'procedural', // Can load external GLB when available, falls back to procedural
    polygonCount: 840,
    byteSize: 24500,
    license: 'MIT / CC0 Open Asset',
    licenseAuthor: 'KDI AI Office Technical Spike',
    isOptimizedForWeb: true,
  },
  DESK_EQUIPMENT: {
    id: 'asset-desk-station',
    name: 'Modular Acoustic Workstation Desk',
    url: '/assets/models/office_desk.glb',
    format: 'procedural',
    polygonCount: 420,
    byteSize: 18200,
    license: 'MIT / CC0 Open Asset',
    licenseAuthor: 'KDI AI Office Technical Spike',
    isOptimizedForWeb: true,
  },
};
