// ==========================================================
// apps/web/src/office/scene/kdiCast.ts
// KDI AI Office Cast — Roster metadata & Pixi texture frames
// Original identities: KDI AI Orchestrator, Farhan, Rian, Ahmad, Nadia, Maya, Naya.
// ==========================================================

import { Texture } from 'pixi.js';
import {
  getKdiSceneFrames,
  paintKdiPortrait,
  SCENE_W,
  SCENE_H,
  type KdiCharacterName,
} from './kdiPortraitArt';

export type { KdiCharacterName };

export interface KdiCastMember {
  name: KdiCharacterName;
  displayName: string;
  role: string;
  department: string;
  shirt: string;
  blurb: string;
  defaultRoom: string;
}

export const KDI_CAST: KdiCastMember[] = [
  {
    name: 'orchestrator',
    displayName: 'KDI AI Orchestrator',
    role: 'ORCHESTRATOR',
    department: 'Executive Leadership',
    shirt: '#2563eb', // KDI Blue
    blurb: 'Single Front Door & Organizational Coordinator',
    defaultRoom: 'RM-CEO',
  },
  {
    name: 'farhan',
    displayName: 'Farhan',
    role: 'SOFTWARE_ENGINEER',
    department: 'Engineering',
    shirt: '#10b981', // Emerald
    blurb: 'Lead Autonomous Software Engineer',
    defaultRoom: 'RM-05',
  },
  {
    name: 'rian',
    displayName: 'Rian',
    role: 'FRONTEND_ENGINEER',
    department: 'Engineering',
    shirt: '#8b5cf6', // Violet
    blurb: '3D WebGL & Frontend Engineer',
    defaultRoom: 'RM-05',
  },
  {
    name: 'ahmad',
    displayName: 'Ahmad',
    role: 'SYSTEM_ARCHITECT',
    department: 'Architecture',
    shirt: '#0ea5e9', // Sky Blue
    blurb: 'Principal Systems Architect',
    defaultRoom: 'RM-03',
  },
  {
    name: 'nadia',
    displayName: 'Nadia',
    role: 'QA_ENGINEER',
    department: 'Quality Assurance',
    shirt: '#f59e0b', // Amber
    blurb: 'QA Automation & Security Engineer',
    defaultRoom: 'RM-04',
  },
  {
    name: 'maya',
    displayName: 'Maya',
    role: 'PRODUCT_MANAGER',
    department: 'Product & Delivery',
    shirt: '#ec4899', // Pink
    blurb: 'Product & Workload Delivery Manager',
    defaultRoom: 'RM-02',
  },
  {
    name: 'naya',
    displayName: 'Naya',
    role: 'ACCOUNT_MANAGER',
    department: 'Sales & Client Relations',
    shirt: '#14b8a6', // Teal
    blurb: 'Account Manager & Client Relations',
    defaultRoom: 'RM-SALES',
  },
];

export const CAST_BY_NAME: Record<KdiCharacterName, KdiCastMember> = Object.fromEntries(
  KDI_CAST.map((c) => [c.name, c])
) as Record<KdiCharacterName, KdiCastMember>;

export const DEFAULT_CHARACTER: KdiCharacterName = 'farhan';

export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ─── Pixi Scene Frames Generation ────────────────────────────────────────────
const frameCache = new Map<KdiCharacterName, Texture[][]>();

function bufToTexture(buf: Uint8ClampedArray): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SCENE_W, SCENE_H);
  img.data.set(buf);
  ctx.putImageData(img, 0, 0);

  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

/**
 * CharacterSprite grid: 3 rows (down, up, right) x 7 frames
 * [walk1, walk2, walk3, type1, type2, read1, read2]
 */
export async function getCastFrames(name: KdiCharacterName): Promise<Texture[][]> {
  const cached = frameCache.get(name);
  if (cached) return cached;

  const { front, back } = getKdiSceneFrames(name);
  const toRow = (bufs: Uint8ClampedArray[]): Texture[] => {
    const [stand, stepL, stepR] = bufs.map(bufToTexture);
    return [stand, stepL, stepR, stand, stand, stand, stand];
  };

  const frontRow = toRow(front);
  const backRow = toRow(back);
  const frames: Texture[][] = [frontRow, backRow, frontRow]; // down, up, right

  frameCache.set(name, frames);
  return frames;
}

/**
 * Static portrait renderer for cards and modals.
 */
export async function paintCastPortrait(
  ctx: CanvasRenderingContext2D,
  name: KdiCharacterName,
  scale = 2
): Promise<void> {
  paintKdiPortrait(ctx, name, scale);
}
