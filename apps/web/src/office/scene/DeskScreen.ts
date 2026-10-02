// ==========================================================
// apps/web/src/office/scene/DeskScreen.ts
// Overlay CRT monitor screen with scrolling code output lines
// ==========================================================

import { Container, Graphics, Sprite } from 'pixi.js';
import type { TiledMapRenderer } from './TiledMapRenderer';

export const MONITOR_OFF_TOPLEFT_GID = 365;

const DEFAULT_ON_GIDS: ReadonlyArray<readonly [number, number, number]> = [
  [367, 0, 0], [368, 1, 0],
  [383, 0, 1], [384, 1, 1],
];

const SCREEN = { x: 3, y: 5, w: 25, h: 12 };

export interface MonitorConfig {
  offTopLeftGid: number;
  onGids: ReadonlyArray<readonly [number, number, number]>;
}

export class DeskScreen {
  readonly container = new Container();
  private anim = new Graphics();
  private on = false;
  private t = 0;

  constructor(mapRenderer: TiledMapRenderer, topLeft: { x: number; y: number }, monitor?: MonitorConfig) {
    const ts = mapRenderer.tileSize;
    const onGids = monitor?.onGids ?? DEFAULT_ON_GIDS;
    for (const [gid, dx, dy] of onGids) {
      const tex = mapRenderer.textureForGid(gid);
      if (!tex) continue;
      const s = new Sprite(tex);
      s.x = dx * ts;
      s.y = dy * ts;
      this.container.addChild(s);
    }
    this.anim.eventMode = 'none';
    this.container.addChild(this.anim);
    this.container.x = topLeft.x * ts;
    this.container.y = topLeft.y * ts;
    this.container.zIndex = (topLeft.y + 2) * ts - 1;
    this.container.visible = false;
    this.container.eventMode = 'none';
  }

  setOn(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    this.container.visible = on;
    if (!on) {
      this.anim.clear();
      this.t = 0;
    }
  }

  update(dt: number): void {
    if (!this.on) return;
    this.t += dt;
    const g = this.anim;
    g.clear();
    // Two code compilation lines scrolling up screen
    for (let i = 0; i < 2; i++) {
      const phase = (this.t * 3.2 + i * (SCREEN.h / 2)) % SCREEN.h;
      const y = SCREEN.y + SCREEN.h - 1 - phase;
      const w = 6 + ((i * 7 + Math.floor(this.t / 1.7)) % 9);
      g.rect(SCREEN.x + 2, Math.round(y), w, 1).fill({ color: 0xcfe6ff, alpha: 0.55 });
    }
    if (Math.floor(this.t / 0.53) % 2 === 0) {
      g.rect(SCREEN.x + 2, SCREEN.y + SCREEN.h - 2, 2, 2).fill({ color: 0xffffff, alpha: 0.9 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
