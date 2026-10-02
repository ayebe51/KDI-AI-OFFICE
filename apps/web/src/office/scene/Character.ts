// ==========================================================
// apps/web/src/office/scene/Character.ts
// Living Agent Avatar for KDI Virtual Office Floor
// Driven by real-time KDI Agent Runtime state & tasks
// ==========================================================

import { Container, Graphics, Texture } from 'pixi.js';
import { CharacterSprite, type Direction, type AnimState } from './CharacterSprite';
import { findPath } from './pathfinding';
import type { TiledMapRenderer } from './TiledMapRenderer';
import { ThoughtBubble } from './ThoughtBubble';

export type CharacterAnimation = 'idle' | 'walk' | 'type' | 'read';
export type StatusGlyph = 'none' | 'blocked' | 'success' | 'compacting' | 'looping';

function lerp(a: number, b: number, t: number): number {
  const tt = Math.min(Math.max(t, 0), 1);
  return a + (b - a) * tt;
}

export function paintCup(g: Graphics, x: number, y: number): void {
  g.rect(x, y - 4, 5, 4).fill(0xf2ede2);
  g.rect(x, y - 2, 5, 1).fill(0xe8c14d);
  g.rect(x + 5, y - 3, 1, 2).fill(0xd9d2c4);
  g.rect(x, y - 4, 5, 1).fill(0xffffff);
}

const SPEED = 48; // pixels/sec (tileSize=16)
const SIT_OFFSET = 5;
const SIT_OFFSET_DOWN = 12;
const SIT_OFFSET_UP = 5;
const SIT_OFFSET_SIDE = 4;
const SEAT_LEG_CROP = 8;
const SEAT_BACK_CROP = 2;

export interface CharacterOptions {
  agentId: string;
  mapRenderer: TiledMapRenderer;
  frames: Texture[][];
  seatTile: { x: number; y: number };
  spawnTile?: { x: number; y: number };
  glowColor: number;
  seatDirection?: Direction;
  onClick?: (agentId: string) => void;
}

export class Character {
  readonly agentId: string;
  readonly sprite: CharacterSprite;

  private state: CharacterAnimation = 'idle';
  private mapRenderer: TiledMapRenderer;
  private deskTile: { x: number; y: number };
  private seatDirection: Direction;
  private px: number;
  private py: number;
  private path: { x: number; y: number }[] = [];
  private pendingWork: CharacterAnimation | null = null;
  private pendingSit = false;
  private sitting = false;
  private wandering = false;
  private idleTimer = 0;
  private idleWanderDelay = 1 + Math.random() * 3;
  private direction: Direction = 'down';
  private arrivalCallback: (() => void) | null = null;

  public isVisible = false;
  private fadeDirection: 'in' | 'out' | null = null;
  private fadeDuration = 0;
  private fadeElapsed = 0;

  private thoughtBubble: ThoughtBubble;
  private workGlow: Graphics;
  private workGlowElapsed = 0;
  private glowOn = false;

  private overlay: Graphics;
  private statusGlyph: StatusGlyph = 'none';
  private glyphElapsed = 0;
  private onClick?: (agentId: string) => void;

  private fx: Graphics;
  private fxDirty = false;
  private cheerT = -1;
  private confetti: Array<{ x: number; y: number; vx: number; vy: number; c: number }> = [];
  private carryingCup = false;
  private deskCup: Graphics;
  private deskCupOn = false;
  private cupSpot: { x: number; y: number } | null = null;
  private targetAlpha = 1;

  constructor(options: CharacterOptions) {
    this.agentId = options.agentId;
    this.mapRenderer = options.mapRenderer;
    this.sprite = new CharacterSprite(options.frames);
    this.deskTile = options.seatTile;
    this.seatDirection = options.seatDirection ?? 'down';
    this.onClick = options.onClick;

    const start = options.spawnTile ?? this.deskTile;
    const pos = this.mapRenderer.tileToPixel(start.x, start.y);
    this.px = pos.x + this.mapRenderer.tileSize / 2;
    this.py = pos.y + this.mapRenderer.tileSize;
    this.sprite.setPosition(this.px, this.py);

    this.thoughtBubble = new ThoughtBubble();
    this.thoughtBubble.setBounds(
      this.mapRenderer.width * this.mapRenderer.tileSize,
      this.mapRenderer.height * this.mapRenderer.tileSize
    );

    this.workGlow = new Graphics();
    this.workGlow.circle(0, 0, 14);
    this.workGlow.fill({ color: options.glowColor, alpha: 1 });
    this.workGlow.alpha = 0;
    this.workGlow.eventMode = 'none';

    this.overlay = new Graphics();
    this.overlay.eventMode = 'none';

    this.fx = new Graphics();
    this.fx.eventMode = 'none';

    this.deskCup = new Graphics();
    this.deskCup.eventMode = 'none';
    this.deskCup.visible = false;
  }

  getAnimation(): CharacterAnimation { return this.state; }
  getDeskTile(): { x: number; y: number } { return this.deskTile; }
  getPixelPosition(): { x: number; y: number } { return { x: this.px, y: this.py }; }
  getTilePosition(): { x: number; y: number } {
    return this.mapRenderer.pixelToTile(this.px, this.py - 1);
  }

  moveTo(tile: { x: number; y: number }): void {
    const path = findPath(this.mapRenderer, this.getTilePosition(), tile);
    if (path && path.length > 0) {
      this.sitting = false;
      this.sprite.setSeatedCrop(0);
      this.path = path;
      this.state = 'walk';
      this.sprite.setAnimation('walk', this.direction);
    }
  }

  walkToAndThen(tile: { x: number; y: number }, callback: () => void): void {
    this.arrivalCallback = callback;
    this.moveTo(tile);
    if (this.state !== 'walk') {
      this.arrivalCallback = null;
      const t = this.getTilePosition();
      if (t.x === tile.x && t.y === tile.y) callback();
    }
  }

  sitAtDesk(working: boolean): void {
    this.glowOn = working;
    this.wandering = false;
    const t = this.getTilePosition();
    if (t.x === this.deskTile.x && t.y === this.deskTile.y) {
      this.applySit();
    } else {
      this.pendingSit = true;
      this.pendingWork = null;
      this.arrivalCallback = null;
      this.moveTo(this.deskTile);
    }
  }

  private applySit(): void {
    this.applySitPose(this.seatDirection);
  }

  private applySitPose(dir: Direction): void {
    this.state = 'idle';
    this.pendingWork = null;
    this.pendingSit = false;
    this.path = [];
    this.sitting = true;
    this.direction = dir;
    this.sprite.setAnimation('idle', dir);

    let dx = 0, dy = 0;
    switch (dir) {
      case 'down':  dy = SIT_OFFSET_DOWN; break;
      case 'up':    dy = SIT_OFFSET_UP; break;
      case 'left':  dx = -SIT_OFFSET; dy = SIT_OFFSET_SIDE; break;
      case 'right': dx = SIT_OFFSET; dy = SIT_OFFSET_SIDE; break;
    }
    this.sprite.setPosition(this.px + dx, this.py + dy);
    this.sprite.setSeatedCrop(dir === 'down' ? SEAT_LEG_CROP : SEAT_BACK_CROP);
  }

  sitInPlace(dir: Direction): void {
    this.wandering = false;
    this.glowOn = false;
    this.arrivalCallback = null;
    this.applySitPose(dir);
  }

  isSitting(): boolean {
    return this.sitting;
  }

  faceDirection(dir: Direction): void {
    this.direction = dir;
    if (!this.sitting && this.state !== 'walk') {
      this.sprite.setAnimation('idle', dir);
    }
  }

  setIdle(): void {
    this.state = 'idle';
    this.pendingWork = null;
    this.pendingSit = false;
    this.sitting = false;
    this.wandering = false;
    this.path = [];
    this.glowOn = false;
    this.sprite.setSeatedCrop(0);
    this.sprite.setAnimation('idle', this.direction);
    this.sprite.setPosition(this.px, this.py);
  }

  startWandering(): void {
    if (this.wandering) return;
    this.glowOn = false;
    this.sitting = false;
    this.pendingSit = false;
    this.pendingWork = null;
    this.wandering = true;
    this.idleTimer = 0;
    this.idleWanderDelay = 0.5 + Math.random() * 2;
    this.sprite.setSeatedCrop(0);
    if (this.state !== 'walk') {
      this.state = 'idle';
      this.sprite.setAnimation('idle', this.direction);
      this.sprite.setPosition(this.px, this.py);
    }
  }

  walkToTile(tile: { x: number; y: number }): void {
    this.pendingWork = null;
    this.pendingSit = false;
    this.sitting = false;
    this.wandering = false;
    this.arrivalCallback = null;
    this.moveTo(tile);
  }

  repositionTo(tx: number, ty: number): void {
    this.deskTile = { x: tx, y: ty };
    const pos = this.mapRenderer.tileToPixel(tx, ty);
    this.px = pos.x + this.mapRenderer.tileSize / 2;
    this.py = pos.y + this.mapRenderer.tileSize;
    this.sprite.setPosition(this.px, this.py);
  }

  showThought(text: string, tool?: string): void {
    this.thoughtBubble.show(text, tool);
  }

  hideThought(): void {
    this.thoughtBubble.startLinger();
  }

  getThoughtLayout(): { x: number; y: number; w: number; h: number } | null {
    return this.thoughtBubble.getLayout(this.px, this.py);
  }

  setThoughtLift(px: number): void {
    this.thoughtBubble.setLift(px);
  }

  setBubbleZoom(z: number): void {
    this.thoughtBubble.setZoom(z);
  }

  setStatusGlyph(glyph: StatusGlyph): void {
    if (glyph === this.statusGlyph) return;
    this.statusGlyph = glyph;
    this.glyphElapsed = 0;
    if (glyph === 'none') this.overlay.clear();
  }

  cheer(): void {
    if (this.sitting) return;
    this.path = [];
    if (this.state === 'walk') {
      this.state = 'idle';
      this.sprite.setAnimation('idle', this.direction);
    }
    this.cheerT = 0;
    this.confetti = [];
    const colors = [0xffd93d, 0x10b981, 0x3b82f6, 0xec4899, 0x8b5cf6];
    for (let i = 0; i < 14; i++) {
      this.confetti.push({
        x: (Math.random() - 0.5) * 8,
        y: -22 - Math.random() * 6,
        vx: (Math.random() - 0.5) * 46,
        vy: -30 - Math.random() * 40,
        c: colors[i % colors.length],
      });
    }
  }

  private enableClick(): void {
    this.sprite.container.eventMode = 'static';
    this.sprite.container.cursor = 'pointer';
    this.sprite.container.on('pointertap', (e) => {
      e.stopPropagation();
      this.onClick?.(this.agentId);
    });
  }

  show(parent: Container): void {
    this.isVisible = true;
    this.sprite.setAlpha(0);
    parent.addChild(this.workGlow);
    parent.addChild(this.sprite.container);
    this.sprite.container.addChild(this.overlay);
    this.sprite.container.addChild(this.fx);
    parent.addChild(this.deskCup);
    parent.addChild(this.thoughtBubble.container);
    this.enableClick();
    this.fadeDirection = 'in';
    this.fadeDuration = 0.5;
    this.fadeElapsed = 0;
  }

  hide(): void {
    this.fadeDirection = 'out';
    this.fadeDuration = 0.6;
    this.fadeElapsed = 0;
  }

  update(dt: number): void {
    if (this.fadeDirection) {
      this.fadeElapsed += dt;
      const t = Math.min(this.fadeElapsed / this.fadeDuration, 1);
      const alpha = (this.fadeDirection === 'in' ? t : 1 - t) * this.targetAlpha;
      this.sprite.setAlpha(alpha);
      if (t >= 1) {
        const reachedZero = this.fadeDirection === 'out';
        this.fadeDirection = null;
        if (reachedZero) {
          this.isVisible = false;
          this.sprite.container.parent?.removeChild(this.sprite.container);
          this.thoughtBubble.hide();
          this.thoughtBubble.container.parent?.removeChild(this.thoughtBubble.container);
          this.workGlow.parent?.removeChild(this.workGlow);
          this.deskCup.parent?.removeChild(this.deskCup);
        }
      }
    }

    this.thoughtBubble.update(dt);
    if (!this.isVisible) return;

    const heldByFx = this.cheerT >= 0;
    if (this.state === 'walk') this.updateWalk(dt);
    else if (this.wandering && !heldByFx) this.updateWander(dt);

    this.sprite.container.zIndex = this.py;
    this.thoughtBubble.setPosition(this.px, this.py);

    // Work focus glow
    const ts = this.mapRenderer.tileSize;
    this.workGlow.x = this.px;
    this.workGlow.y = this.py - ts / 2;
    this.workGlow.zIndex = this.py - 1;
    if (this.glowOn) {
      this.workGlowElapsed += dt;
      const phase = (Math.sin((this.workGlowElapsed * Math.PI) / 0.6) + 1) / 2;
      this.workGlow.alpha = (0.2 + 0.3 * phase) * this.sprite.container.alpha;
      this.workGlow.scale.set(0.95 + 0.15 * phase);
    } else {
      this.workGlow.alpha = 0;
      this.workGlowElapsed = 0;
    }

    this.updateStatusGlyph(dt);
    this.updateFx(dt);
  }

  private updateFx(dt: number): void {
    if (this.cheerT < 0 && !this.carryingCup) {
      if (this.fxDirty) { this.fx.clear(); this.fxDirty = false; }
      return;
    }
    this.fx.clear();
    this.fxDirty = true;

    if (this.cheerT >= 0) {
      this.cheerT += dt;
      const t = this.cheerT;
      if (t >= 1.6) {
        this.cheerT = -1;
        this.sprite.setPosition(this.px, this.py);
      } else {
        const decay = 1 - t / 1.6;
        const hop = Math.abs(Math.sin(t * Math.PI * 2.2)) * 5 * decay;
        this.sprite.setPosition(this.px, this.py - hop);
        for (const p of this.confetti) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 110 * dt;
          const alpha = Math.max(0, Math.min(1, (1.45 - t) / 0.5));
          this.fx.rect(Math.round(p.x), Math.round(p.y), 2, 2).fill({ color: p.c, alpha });
        }
      }
    }
  }

  private updateStatusGlyph(dt: number): void {
    if (this.statusGlyph === 'none') return;
    this.glyphElapsed += dt;
    const g = this.overlay;
    g.clear();
    const yTop = -34;

    if (this.statusGlyph === 'blocked') {
      // Blinking red exclamation mark (!) for human approval required
      if (Math.floor(this.glyphElapsed / 0.4) % 2 === 0) {
        g.rect(-1, yTop, 2, 5).fill(0xef4444);
        g.rect(-1, yTop + 6, 2, 2).fill(0xef4444);
      }
    } else if (this.statusGlyph === 'success') {
      // Golden 4-point sparkle for completed task
      const p = (Math.sin(this.glyphElapsed * 18) + 1) / 2;
      const s = 2 + p * 2;
      g.rect(-0.5, yTop - s, 1, s * 2).fill(0x10b981);
      g.rect(-s, yTop - 0.5, s * 2, 1).fill(0x10b981);
      if (this.glyphElapsed > 0.9) this.setStatusGlyph('none');
    } else if (this.statusGlyph === 'compacting') {
      const p = (Math.sin(this.glyphElapsed * 6) + 1) / 2;
      const s = 2 + p * 3;
      g.rect(-s, yTop - s, s * 2, s * 2).fill(0x8b5cf6);
    } else if (this.statusGlyph === 'looping') {
      const idx = Math.floor(this.glyphElapsed * 8) % 4;
      const pts: [number, number][] = [[-3, yTop - 3], [3, yTop - 3], [3, yTop + 3], [-3, yTop + 3]];
      for (let i = 0; i < 4; i++) {
        const [x, y] = pts[i];
        g.rect(x - 1, y - 1, 2, 2).fill(i === idx ? 0xf59e0b : 0x64748b);
      }
    }
  }

  private updateWalk(dt: number): void {
    if (this.path.length === 0) {
      if (this.pendingSit) {
        this.applySit();
      } else if (this.pendingWork) {
        this.state = this.pendingWork;
        this.pendingWork = null;
        this.sprite.setAnimation(this.state as AnimState, this.seatDirection);
      } else if (this.wandering) {
        this.state = 'idle';
        this.idleTimer = 0;
        this.idleWanderDelay = 1 + Math.random() * 3;
        this.sprite.setAnimation('idle', this.direction);
      } else {
        this.setIdle();
      }
      if (this.arrivalCallback) {
        const cb = this.arrivalCallback;
        this.arrivalCallback = null;
        cb();
      }
      return;
    }

    const target = this.path[0];
    const ts = this.mapRenderer.tileSize;
    const targetPx = target.x * ts + ts / 2;
    const targetPy = target.y * ts + ts;
    const dx = targetPx - this.px;
    const dy = targetPy - this.py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      this.px = targetPx;
      this.py = targetPy;
      this.path.shift();
      return;
    }

    const step = Math.min(dist, SPEED * dt);
    this.px += (dx / dist) * step;
    this.py += (dy / dist) * step;
    this.sprite.setPosition(this.px, this.py);

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let newDir = this.direction;
    if (absDx > absDy) newDir = dx > 0 ? 'right' : 'left';
    else if (absDy > 0) newDir = dy > 0 ? 'down' : 'up';

    if (newDir !== this.direction || this.state !== 'walk') {
      this.direction = newDir;
      this.state = 'walk';
      this.sprite.setAnimation('walk', this.direction);
    }
  }

  private updateWander(dt: number): void {
    this.idleTimer += dt;
    if (this.idleTimer < this.idleWanderDelay) return;
    this.idleTimer = 0;

    const currentTile = this.getTilePosition();
    const candidateOffsets = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
      { dx: 2, dy: 0 }, { dx: -2, dy: 0 },
      { dx: 0, dy: 2 }, { dx: 0, dy: -2 },
    ];
    const shuffled = candidateOffsets.sort(() => Math.random() - 0.5);

    for (const offset of shuffled) {
      const tx = currentTile.x + offset.dx;
      const ty = currentTile.y + offset.dy;
      if (this.mapRenderer.isWalkable(tx, ty)) {
        this.moveTo({ x: tx, y: ty });
        break;
      }
    }
  }
}
