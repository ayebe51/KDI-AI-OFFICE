// ==========================================================
// apps/web/src/office/scene/kdiPortraitArt.ts
// Procedural Pixel Art Generator for KDI AI Office Cast
// Custom pixel busts and in-scene walking sprites (18x28 bust, 18x32 scene).
// Original Indonesian tech workforce recipes. Zero 3rd party IP.
// ==========================================================

export type KdiCharacterName =
  | 'orchestrator'
  | 'farhan'
  | 'rian'
  | 'ahmad'
  | 'nadia'
  | 'maya'
  | 'naya';

export const PORTRAIT_W = 18;
export const PORTRAIT_H = 28;
export const SCENE_W = 18;
export const SCENE_H = 32;

const OUTLINE: RGB = [30, 36, 48];
const HX0 = 4, HX1 = 13; // head skin columns

type RGB = [number, number, number];
type Buf = Uint8ClampedArray;

let CUR_W = PORTRAIT_W, CUR_H = PORTRAIT_H;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
function shades(rgb: RGB, dl = 1.25, dd = 0.65): [RGB, RGB, RGB] {
  return [
    [clamp(rgb[0] * dl), clamp(rgb[1] * dl), clamp(rgb[2] * dl)],
    [rgb[0], rgb[1], rgb[2]],
    [clamp(rgb[0] * dd), clamp(rgb[1] * dd), clamp(rgb[2] * dd)],
  ];
}

function set(buf: Buf, x: number, y: number, c: RGB, a = 255): void {
  if (x < 0 || x >= CUR_W || y < 0 || y >= CUR_H) return;
  const i = (y * CUR_W + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = a;
}

function alphaAt(buf: Buf, x: number, y: number): number {
  if (x < 0 || x >= CUR_W || y < 0 || y >= CUR_H) return 0;
  return buf[(y * CUR_W + x) * 4 + 3];
}

function rect(buf: Buf, x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(buf, x, y, c);
}

// ─── Palettes ────────────────────────────────────────────────────────────────
interface SkinPal { hi: RGB; base: RGB; sh: RGB; line: RGB; }
const SKIN: Record<string, SkinPal> = {
  light: { hi: [255, 226, 196], base: [245, 204, 172], sh: [210, 160, 128], line: [168, 114, 84] },
  tan:   { hi: [238, 192, 148], base: [218, 170, 124], sh: [180, 132, 92],  line: [142, 96, 64] },
  brown: { hi: [186, 138, 98],  base: [162, 118, 82],  sh: [128, 90, 60],   line: [94, 62, 42] },
};

// ─── Head & Facial Features ──────────────────────────────────────────────────
function drawHead(buf: Buf, skin: string): void {
  const s = SKIN[skin] || SKIN.tan;
  for (let y = 4; y <= 16; y++) {
    for (let x = HX0; x <= HX1; x++) {
      if (((x === HX0 || x === HX1) && (y === 4 || y === 5 || y === 16)) || ((x === 5 || x === 12) && y === 4)) continue;
      set(buf, x, y, s.base);
    }
  }
  for (let y = 6; y < 12; y++) set(buf, 5, y, s.hi);
  set(buf, 6, 5, s.hi); set(buf, 7, 5, s.hi);
  for (let y = 6; y < 15; y++) set(buf, 12, y, s.sh);
  for (const x of [7, 8, 9, 10, 11]) set(buf, x, 16, s.sh);
  for (const ex of [HX0 - 1, HX1 + 1]) { set(buf, ex, 9, s.base); set(buf, ex, 10, s.base); set(buf, ex, 11, s.sh); }
  rect(buf, 7, 17, 10, 18, s.sh); rect(buf, 7, 17, 9, 17, s.base);
}

function drawFace(buf: Buf, skin: string, brow: 'flat' | 'confident' | 'soft', mouth: 'neutral' | 'smile' | 'grin', blush: boolean, lashes = false): void {
  const s = SKIN[skin] || SKIN.tan;
  const white: RGB = [252, 250, 246], pup: RGB = [32, 38, 48];
  for (const [a, b, p] of [[5, 6, 6], [10, 11, 10]] as const) {
    set(buf, a, 9, white); set(buf, b, 9, white); set(buf, p, 9, pup);
  }
  if (lashes) {
    const lash: RGB = [48, 36, 42], glint: RGB = [255, 255, 255];
    for (const x of [5, 6, 10, 11]) set(buf, x, 8, lash);
    set(buf, 4, 8, lash); set(buf, 12, 8, lash);
    set(buf, 5, 9, glint); set(buf, 10, 9, glint);
  }
  if (brow === 'flat') for (const x of [5, 6, 10, 11]) set(buf, x, 7, s.line);
  else if (brow === 'confident') { set(buf, 5, 8, s.line); set(buf, 6, 7, s.line); set(buf, 10, 7, s.line); set(buf, 11, 8, s.line); }
  else if (brow === 'soft') { for (const x of [5, 11]) set(buf, x, 7, s.line); for (const x of [6, 10]) set(buf, x, 7, s.sh); }

  set(buf, 8, 11, s.sh); set(buf, 8, 12, s.sh); set(buf, 7, 12, s.sh);

  const lip: RGB = [190, 92, 92];
  if (mouth === 'smile' || mouth === 'grin') {
    set(buf, 8, 14, lip); set(buf, 9, 14, lip);
    set(buf, 7, 13, lip); set(buf, 10, 13, lip);
    if (mouth === 'grin') { set(buf, 8, 14, [255, 255, 255]); set(buf, 9, 14, [255, 255, 255]); }
  } else {
    set(buf, 7, 14, lip); set(buf, 8, 14, lip); set(buf, 9, 14, lip); set(buf, 10, 14, lip);
  }

  if (blush) {
    const bColor: RGB = [240, 150, 150];
    set(buf, 4, 11, bColor, 180); set(buf, 13, 11, bColor, 180);
  }
}

function drawGlasses(buf: Buf, color: RGB = [45, 55, 72]): void {
  rect(buf, 4, 8, 7, 10, color);
  rect(buf, 10, 8, 13, 10, color);
  set(buf, 8, 9, color); set(buf, 9, 9, color);
  // Clear lens holes
  set(buf, 5, 9, [255, 255, 255], 160);
  set(buf, 6, 9, [255, 255, 255], 160);
  set(buf, 11, 9, [255, 255, 255], 160);
  set(buf, 12, 9, [255, 255, 255], 160);
}

// ─── Hairstyles ──────────────────────────────────────────────────────────────
function drawShortHair(buf: Buf, c: RGB): void {
  const [hi, mid, sh] = shades(c);
  rect(buf, 4, 2, 13, 5, mid);
  rect(buf, 3, 4, 4, 7, sh);
  rect(buf, 13, 4, 14, 7, sh);
  for (let x = 6; x <= 10; x++) set(buf, x, 2, hi);
}

function drawSidePartHair(buf: Buf, c: RGB): void {
  const [hi, mid, sh] = shades(c);
  rect(buf, 4, 2, 13, 5, mid);
  rect(buf, 3, 3, 5, 8, mid);
  rect(buf, 12, 4, 14, 8, sh);
  for (let x = 6; x <= 11; x++) set(buf, x, 2, hi);
  set(buf, 5, 3, sh); // part line
}

function drawFramedHair(buf: Buf, c: RGB): void {
  const [hi, mid, sh] = shades(c);
  rect(buf, 4, 2, 13, 5, mid);
  rect(buf, 3, 4, 5, 15, sh);
  rect(buf, 12, 4, 14, 15, sh);
  for (let x = 6; x <= 11; x++) set(buf, x, 2, hi);
}

function drawHijab(buf: Buf, c: RGB): void {
  const [hi, mid, sh] = shades(c);
  // Hood encircling head
  rect(buf, 3, 2, 14, 5, mid);
  rect(buf, 2, 4, 4, 16, sh);
  rect(buf, 13, 4, 15, 16, sh);
  // Under chin wrap
  rect(buf, 5, 16, 12, 19, mid);
  for (let x = 6; x <= 11; x++) set(buf, x, 2, hi);
}

// ─── Clothing ────────────────────────────────────────────────────────────────
function drawSuit(buf: Buf, suitC: RGB, shirtC: RGB, tieC: RGB): void {
  const [hi, mid, sh] = shades(suitC);
  rect(buf, 4, 18, 13, 27, mid);
  // Lapels & collar
  rect(buf, 3, 19, 4, 27, sh);
  rect(buf, 13, 19, 14, 27, sh);
  // White/light inner shirt V
  rect(buf, 8, 18, 9, 21, shirtC);
  // Tie
  rect(buf, 8, 19, 9, 24, tieC);
  set(buf, 8, 18, hi); set(buf, 9, 18, hi);
}

function drawShirt(buf: Buf, shirtC: RGB): void {
  const [hi, mid, sh] = shades(shirtC);
  rect(buf, 4, 18, 13, 27, mid);
  rect(buf, 3, 19, 4, 27, sh);
  rect(buf, 13, 19, 14, 27, sh);
  for (let x = 6; x <= 11; x++) set(buf, x, 18, hi);
  // Collar buttons
  set(buf, 8, 20, [255, 255, 255]);
  set(buf, 8, 23, [255, 255, 255]);
}

function drawHoodie(buf: Buf, hoodieC: RGB): void {
  const [hi, mid, sh] = shades(hoodieC);
  rect(buf, 3, 18, 14, 27, mid);
  rect(buf, 2, 19, 4, 27, sh);
  rect(buf, 13, 19, 15, 27, sh);
  // Kangaroo pouch
  rect(buf, 6, 23, 11, 26, sh);
  // Strings
  set(buf, 7, 20, [255, 255, 255]); set(buf, 7, 21, [255, 255, 255]);
  set(buf, 10, 20, [255, 255, 255]); set(buf, 10, 21, [255, 255, 255]);
  for (let x = 6; x <= 11; x++) set(buf, x, 18, hi);
}

function drawBlouse(buf: Buf, blouseC: RGB): void {
  const [hi, mid, sh] = shades(blouseC);
  rect(buf, 4, 18, 13, 27, mid);
  rect(buf, 3, 19, 4, 27, sh);
  rect(buf, 13, 19, 14, 27, sh);
  // V neckline
  set(buf, 8, 18, hi); set(buf, 9, 18, hi);
}

// ─── Scene Walking Legs & Body ───────────────────────────────────────────────
function drawSceneLegs(buf: Buf, pantsC: RGB, phase: number): void {
  const [hi, mid, sh] = shades(pantsC);
  const shoes: RGB = [32, 36, 44];
  rect(buf, 5, 27, 7, 30, mid);
  rect(buf, 10, 27, 12, 30, mid);
  // Step left or right offset
  if (phase === 1) { // step left forward
    rect(buf, 5, 27, 7, 29, hi);
    rect(buf, 4, 30, 7, 31, shoes);
    rect(buf, 10, 31, 12, 31, shoes);
  } else if (phase === 2) { // step right forward
    rect(buf, 10, 27, 12, 29, hi);
    rect(buf, 5, 31, 7, 31, shoes);
    rect(buf, 10, 30, 13, 31, shoes);
  } else { // stand
    rect(buf, 5, 31, 7, 31, shoes);
    rect(buf, 10, 31, 12, 31, shoes);
  }
}

// ─── Outline Pass ────────────────────────────────────────────────────────────
function outlinePass(buf: Buf): void {
  const pts: [number, number][] = [];
  for (let y = 0; y < CUR_H; y++) {
    for (let x = 0; x < CUR_W; x++) {
      if (alphaAt(buf, x, y) !== 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (alphaAt(buf, x + dx, y + dy) === 255) { pts.push([x, y]); break; }
      }
    }
  }
  for (const [x, y] of pts) set(buf, x, y, OUTLINE);
}

// ─── KDI Character Recipes ───────────────────────────────────────────────────
interface KdiRecipe {
  skin: string;
  hairStyle: 'short' | 'sidePart' | 'framed' | 'hijab';
  hairColor: RGB;
  cloth: 'suit' | 'shirt' | 'hoodie' | 'blouse';
  clothC: RGB;
  accentC?: RGB;
  tieC?: RGB;
  pantsC: RGB;
  brow?: 'flat' | 'confident' | 'soft';
  mouth?: 'neutral' | 'smile' | 'grin';
  glasses?: boolean;
  lashes?: boolean;
  blush?: boolean;
}

export const KDI_RECIPES: Record<KdiCharacterName, KdiRecipe> = {
  orchestrator: {
    skin: 'tan',
    hairStyle: 'sidePart',
    hairColor: [40, 32, 26],
    cloth: 'suit',
    clothC: [30, 42, 68], // Dark Executive Navy
    accentC: [240, 244, 250],
    tieC: [37, 99, 235], // KDI Electric Blue
    pantsC: [24, 32, 48],
    brow: 'confident',
    mouth: 'neutral',
  },
  farhan: {
    skin: 'tan',
    hairStyle: 'short',
    hairColor: [44, 34, 28],
    cloth: 'shirt',
    clothC: [16, 185, 129], // Emerald Tech Shirt
    pantsC: [38, 46, 56],
    glasses: true,
    brow: 'flat',
    mouth: 'smile',
  },
  rian: {
    skin: 'light',
    hairStyle: 'short',
    hairColor: [55, 42, 34],
    cloth: 'hoodie',
    clothC: [139, 92, 246], // Violet WebGL Hoodie
    pantsC: [42, 40, 52],
    brow: 'confident',
    mouth: 'grin',
  },
  ahmad: {
    skin: 'tan',
    hairStyle: 'sidePart',
    hairColor: [36, 30, 26],
    cloth: 'shirt',
    clothC: [14, 165, 233], // Sky Blue Architect Shirt
    pantsC: [40, 45, 55],
    glasses: true,
    brow: 'flat',
    mouth: 'neutral',
  },
  nadia: {
    skin: 'tan',
    hairStyle: 'hijab',
    hairColor: [245, 158, 11], // Amber/Warm Gold Hijab
    cloth: 'blouse',
    clothC: [217, 119, 6],
    pantsC: [45, 42, 48],
    glasses: true,
    lashes: true,
    blush: true,
    brow: 'confident',
    mouth: 'smile',
  },
  maya: {
    skin: 'light',
    hairStyle: 'framed',
    hairColor: [62, 45, 35],
    cloth: 'blouse',
    clothC: [236, 72, 153], // Pink / Rose Product Blouse
    pantsC: [46, 44, 54],
    lashes: true,
    blush: true,
    brow: 'soft',
    mouth: 'smile',
  },
  naya: {
    skin: 'light',
    hairStyle: 'framed',
    hairColor: [50, 38, 30],
    cloth: 'suit',
    clothC: [20, 184, 166], // Teal Account Management Blazer
    accentC: [255, 255, 255],
    tieC: [13, 148, 136],
    pantsC: [35, 45, 50],
    lashes: true,
    blush: true,
    brow: 'soft',
    mouth: 'smile',
  },
};

function composeBust(r: KdiRecipe): Buf {
  CUR_W = PORTRAIT_W; CUR_H = PORTRAIT_H;
  const buf = new Uint8ClampedArray(PORTRAIT_W * PORTRAIT_H * 4);

  // Clothing layer
  if (r.cloth === 'suit') drawSuit(buf, r.clothC, r.accentC || [255, 255, 255], r.tieC || [200, 50, 50]);
  else if (r.cloth === 'shirt') drawShirt(buf, r.clothC);
  else if (r.cloth === 'hoodie') drawHoodie(buf, r.clothC);
  else drawBlouse(buf, r.clothC);

  // Head and face
  drawHead(buf, r.skin);
  drawFace(buf, r.skin, r.brow || 'flat', r.mouth || 'neutral', r.blush || false, r.lashes || false);
  if (r.glasses) drawGlasses(buf);

  // Hair
  if (r.hairStyle === 'hijab') drawHijab(buf, r.hairColor);
  else if (r.hairStyle === 'sidePart') drawSidePartHair(buf, r.hairColor);
  else if (r.hairStyle === 'framed') drawFramedHair(buf, r.hairColor);
  else drawShortHair(buf, r.hairColor);

  outlinePass(buf);
  return buf;
}

function composeSceneSprite(r: KdiRecipe, phase: number, back: boolean): Buf {
  CUR_W = SCENE_W; CUR_H = SCENE_H;
  const buf = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);

  // Body and legs
  if (r.cloth === 'suit') drawSuit(buf, r.clothC, r.accentC || [255, 255, 255], r.tieC || [200, 50, 50]);
  else if (r.cloth === 'shirt') drawShirt(buf, r.clothC);
  else if (r.cloth === 'hoodie') drawHoodie(buf, r.clothC);
  else drawBlouse(buf, r.clothC);

  drawSceneLegs(buf, r.pantsC, phase);

  // Head
  drawHead(buf, r.skin);
  if (!back) {
    drawFace(buf, r.skin, r.brow || 'flat', r.mouth || 'neutral', r.blush || false, r.lashes || false);
    if (r.glasses) drawGlasses(buf);
  }

  // Hair / Hijab (both front and back)
  if (r.hairStyle === 'hijab') drawHijab(buf, r.hairColor);
  else if (r.hairStyle === 'sidePart') drawSidePartHair(buf, r.hairColor);
  else if (r.hairStyle === 'framed') drawFramedHair(buf, r.hairColor);
  else drawShortHair(buf, r.hairColor);

  outlinePass(buf);
  return buf;
}

// ─── Caches & Public Render APIs ─────────────────────────────────────────────
const bustCache = new Map<KdiCharacterName, Buf>();
const sceneFrameCache = new Map<KdiCharacterName, { front: Buf[]; back: Buf[] }>();

export function getKdiBust(name: KdiCharacterName): Buf {
  let buf = bustCache.get(name);
  if (!buf) {
    const r = KDI_RECIPES[name] || KDI_RECIPES.farhan;
    buf = composeBust(r);
    bustCache.set(name, buf);
  }
  return buf;
}

export function getKdiSceneFrames(name: KdiCharacterName): { front: Buf[]; back: Buf[] } {
  let frames = sceneFrameCache.get(name);
  if (!frames) {
    const r = KDI_RECIPES[name] || KDI_RECIPES.farhan;
    frames = {
      front: [
        composeSceneSprite(r, 0, false),
        composeSceneSprite(r, 1, false),
        composeSceneSprite(r, 2, false),
      ],
      back: [
        composeSceneSprite(r, 0, true),
        composeSceneSprite(r, 1, true),
        composeSceneSprite(r, 2, true),
      ],
    };
    sceneFrameCache.set(name, frames);
  }
  return frames;
}

/**
 * Paints a character's static portrait onto a 2D HTML canvas at given scale.
 */
export function paintKdiPortrait(ctx: CanvasRenderingContext2D, name: KdiCharacterName, scale = 2): void {
  const buf = getKdiBust(name);
  const imgData = ctx.createImageData(PORTRAIT_W, PORTRAIT_H);
  imgData.data.set(buf);

  // If scale is 1, direct putImageData
  if (scale === 1) {
    ctx.putImageData(imgData, 0, 0);
    return;
  }

  // Otherwise, use an offscreen canvas for crisp nearest-neighbor upscaling
  const offscreen = document.createElement('canvas');
  offscreen.width = PORTRAIT_W;
  offscreen.height = PORTRAIT_H;
  const offCtx = offscreen.getContext('2d')!;
  offCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, PORTRAIT_W * scale, PORTRAIT_H * scale);
}
