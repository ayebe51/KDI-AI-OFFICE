// ==========================================================
// apps/web/src/office/scene/themeRegistry.ts
// KDI Virtual Office Floor Theme Configuration
// Maps tileset atlases, anchors, and room spawn points.
// ==========================================================

import officeTilesetUrl from '../assets/tilesets/office-tileset.png?url';
import a5FloorsWallsUrl from '../assets/tilesets/a5-office-floors-walls.png?url';
import interiorsUrl from '../assets/tilesets/interiors.png?url';
import officeMapRaw from '../assets/maps/office.tmj?raw';
import { KDI_CAST, DEFAULT_CHARACTER, type KdiCharacterName } from './kdiCast';

export interface Tile { x: number; y: number; }
export type Facing = 'up' | 'down' | 'left' | 'right';

export interface TilesetEntry {
  url: string;
  embedded?: boolean;
  firstgid?: number;
  image?: string;
  imagewidth?: number;
  imageheight?: number;
  tilewidth?: number;
  tileheight?: number;
  columns?: number;
  tilecount?: number;
}

export interface MonitorConfig {
  offTopLeftGid: number;
  onGids: ReadonlyArray<readonly [number, number, number]>;
}

export interface CoffeeConfig {
  trayTile: Tile;
  trayStand: Tile;
  machineStand: Tile;
  sinkTile: Tile;
  sinkStand: Tile;
  maxCups: number;
}

export interface AnchorConfig {
  calendar: Tile;
  taskBoard: Tile;
  serverRack: Tile;
}

export interface ThemeConfig {
  id: string;
  name: string;
  mapRaw: string;
  tilesets: TilesetEntry[];
  primarySeatNames: string[];
  cafeSeatNames: string[];
  cafeStands: Array<[string, 'counter' | 'vending' | 'table']>;
  monitor: MonitorConfig;
  coffee: CoffeeConfig;
  anchors: AnchorConfig;
  palette: {
    background: number;
  };
}

export const KDI_OFFICE_THEME: ThemeConfig = {
  id: 'kdi-office',
  name: 'KDI Living Virtual Office',
  mapRaw: officeMapRaw,
  tilesets: [
    { url: officeTilesetUrl, embedded: true },
    {
      url: a5FloorsWallsUrl,
      firstgid: 257,
      image: 'a5-office-floors-walls.png',
      imagewidth: 128,
      imageheight: 64,
      tilewidth: 16,
      tileheight: 16,
      columns: 8,
      tilecount: 32,
    },
    {
      url: interiorsUrl,
      firstgid: 289,
      image: 'interiors.png',
      imagewidth: 256,
      imageheight: 1040,
      tilewidth: 16,
      tileheight: 16,
      columns: 16,
      tilecount: 1040,
    },
  ],
  primarySeatNames: [
    'desk-ceo',       // Seat 0: KDI AI Orchestrator Executive Office
    'desk-jim',       // Seat 1: Farhan (Engineering Desk 1)
    'desk-pam',       // Seat 2: Rian (Engineering Desk 2)
    'desk-dwight',    // Seat 3: Ahmad (Systems Architecture Desk)
    'desk-angela',    // Seat 4: Nadia (QA & Security Desk)
    'desk-kevin',     // Seat 5: Maya (Product & Planning Desk)
    'desk-oscar',     // Seat 6: Naya (Lobby / Client Relations)
    'pc-1', 'pc-2', 'pc-3', 'pc-4', 'pc-5', 'pc-6', 'pc-7', 'pc-8',
  ],
  cafeSeatNames: ['seat-cafe-1', 'seat-cafe-2', 'seat-cafe-3', 'seat-cafe-4'],
  cafeStands: [
    ['stand-coffee', 'counter'],
    ['stand-vending', 'vending'],
    ['stand-water', 'counter'],
  ],
  monitor: {
    offTopLeftGid: 365,
    onGids: [
      [367, 0, 0], [368, 1, 0],
      [383, 0, 1], [384, 1, 1],
    ],
  },
  coffee: {
    trayTile: { x: 25, y: 15 },
    trayStand: { x: 25, y: 16 },
    machineStand: { x: 26, y: 18 },
    sinkTile: { x: 28, y: 15 },
    sinkStand: { x: 28, y: 16 },
    maxCups: 4,
  },
  anchors: {
    calendar: { x: 3, y: 2 },
    taskBoard: { x: 12, y: 4 },
    serverRack: { x: 18, y: 2 },
  },
  palette: {
    background: 0x0f172a, // Slate 900
  },
};

export function getKdiTheme(): ThemeConfig {
  return KDI_OFFICE_THEME;
}
