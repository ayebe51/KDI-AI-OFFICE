// ==========================================================
// 3d/world/WorldDefinitions.ts
// Data-Driven Floor, Room, NPC, and Interactable Definitions
// ==========================================================

export type FloorId = 'GROUND' | 'FLOOR_2' | 'ROOFTOP';

export interface FloorMeta {
  id: FloorId;
  name: string;
  shortLabel: string;
  tagline: string;
  spawnPoint: [number, number, number];
  liftPosition: [number, number, number];
  ambientColor: string;
  sunIntensity: number;
}

export const FLOOR_METAS: Record<FloorId, FloorMeta> = {
  GROUND: {
    id: 'GROUND',
    name: 'Lantai 1 • Ground Floor & Yard',
    shortLabel: 'L1',
    tagline: 'Front Yard, Lobby, Sales, CEO Suite & Infrastructure',
    spawnPoint: [0, 0, 24],
    liftPosition: [7.5, 0, 16],
    ambientColor: '#fff9ee',
    sunIntensity: 2.1,
  },
  FLOOR_2: {
    id: 'FLOOR_2',
    name: 'Lantai 2 • Creative Open Space',
    shortLabel: 'L2',
    tagline: 'Social Media, Finance, Sleep Capsules & Studio',
    spawnPoint: [5.5, 0, 15],
    liftPosition: [7.5, 0, 16],
    ambientColor: '#f7faff',
    sunIntensity: 2.0,
  },
  ROOFTOP: {
    id: 'ROOFTOP',
    name: 'Lantai 3 • Rooftop Lounge & Garden',
    shortLabel: 'Rooftop',
    tagline: 'Bar, Fire Pit, Bean Bags & Fairy Lights',
    spawnPoint: [5.5, 0, 15],
    liftPosition: [7.5, 0, 16],
    ambientColor: '#fff0db',
    sunIntensity: 1.6,
  },
};

export interface WorldInteractable {
  id: string;
  floor: FloorId;
  label: string;
  prompt: string;
  position: [number, number, number];
  type:
    | 'LIFT'
    | 'NAYA'
    | 'PORTFOLIO'
    | 'FOOD_CART'
    | 'CEO_DESK'
    | 'SERVER'
    | 'WHITEBOARD'
    | 'PRAYER'
    | 'COFFEE'
    | 'STUDIO'
    | 'SLEEP_POD';
}

export const WORLD_INTERACTABLES: WorldInteractable[] = [
  // LIFT on each floor
  {
    id: 'lift_ground',
    floor: 'GROUND',
    label: 'Lift Lantai',
    prompt: 'Naik Lift',
    position: [7.5, 0, 16],
    type: 'LIFT',
  },
  {
    id: 'lift_floor2',
    floor: 'FLOOR_2',
    label: 'Lift Lantai',
    prompt: 'Naik Lift',
    position: [7.5, 0, 16],
    type: 'LIFT',
  },
  {
    id: 'lift_rooftop',
    floor: 'ROOFTOP',
    label: 'Lift Lantai',
    prompt: 'Naik Lift',
    position: [7.5, 0, 16],
    type: 'LIFT',
  },

  // GROUND FLOOR
  {
    id: 'npc_food_cart',
    floor: 'GROUND',
    label: 'Kopi Corner Pak Joko',
    prompt: 'Pesan Kopi & Camilan (Pak Joko)',
    position: [-6, 0, 27],
    type: 'FOOD_CART',
  },
  {
    id: 'portfolio_kiosk',
    floor: 'GROUND',
    label: 'Kiosk Portofolio Proyek KDI',
    prompt: 'Eksplorasi Portofolio',
    position: [-3.5, 0, 17],
    type: 'PORTFOLIO',
  },
  {
    id: 'npc_naya',
    floor: 'GROUND',
    label: 'Naya (Account Manager)',
    prompt: 'Bicara dengan Naya',
    position: [6.5, 0, 8],
    type: 'NAYA',
  },
  {
    id: 'ceo_computer',
    floor: 'GROUND',
    label: 'Workstation CEO Room',
    prompt: 'Buka Menu Manajemen & Command Center',
    position: [-12, 0, 16],
    type: 'CEO_DESK',
  },
  {
    id: 'server_room_rack',
    floor: 'GROUND',
    label: 'Cluster Server & Database',
    prompt: 'Periksa Status Server',
    position: [12, 0, -16],
    type: 'SERVER',
  },
  {
    id: 'whiteboard_room',
    floor: 'GROUND',
    label: 'Papan Tulis Kolaborasi',
    prompt: 'Buka Whiteboard',
    position: [12, 0, 0],
    type: 'WHITEBOARD',
  },
  {
    id: 'musholla_sanctuary',
    floor: 'GROUND',
    label: 'Musholla & Ruang Doa',
    prompt: 'Informasi Shalat / Doa',
    position: [12, 0, -8],
    type: 'PRAYER',
  },
  {
    id: 'pantry_coffee',
    floor: 'GROUND',
    label: 'Mesin Espresso Pantry',
    prompt: 'Ambil Kopi Hangat',
    position: [12, 0, 8],
    type: 'COFFEE',
  },

  // FLOOR 2
  {
    id: 'studio_rig',
    floor: 'FLOOR_2',
    label: 'Studio Konten & Podcast',
    prompt: 'Periksa Rig Studio',
    position: [6, 0, -4],
    type: 'STUDIO',
  },
  {
    id: 'sleep_pod_1',
    floor: 'FLOOR_2',
    label: 'Kapsul Istirahat',
    prompt: 'Rehat di Kapsul',
    position: [-8, 0, -4],
    type: 'SLEEP_POD',
  },
];
