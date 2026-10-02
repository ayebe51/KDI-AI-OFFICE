// ==========================================================
// apps/web/src/office/scene/MessageEnvelope.ts
// Flying message envelope animation for real-time task delegation
// ==========================================================

import { Container, Graphics } from 'pixi.js';

export type MessageAct = 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';

const ACT_COLOR: Record<MessageAct, number> = {
  request: 0x38bdf8,
  query:   0xa78bfa,
  propose: 0xfacc15,
  inform:  0xe2e8f0,
  agree:   0x34d399,
  done:    0x10b981,
  refuse:  0xf87171,
};

const OUTLINE = 0x0f172a;
const HUMAN_COLOR = 0xf43f5e;

const FLY_HEIGHT = 22;
const ARC_LIFT = 38;
const SPEED = 230;
const MIN_DURATION = 0.8;
const MAX_DURATION = 2.0;
const FADE_IN = 0.14;
const FADE_OUT = 0.22;
const BURST_DURATION = 0.34;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class MessageEnvelope {
  readonly container: Container;
  private body: Graphics;
  private burst: Graphics;

  private sx: number; private sy: number;
  private ex: number; private ey: number;
  private duration: number;
  private elapsed = 0;
  private bursting = false;
  private burstElapsed = 0;
  private finished = false;

  constructor(
    start: { x: number; y: number },
    end: { x: number; y: number },
    act: MessageAct = 'request',
    needsHuman = false
  ) {
    this.sx = start.x; this.sy = start.y - FLY_HEIGHT;
    this.ex = end.x;   this.ey = end.y - FLY_HEIGHT;
    const dist = Math.hypot(this.ex - this.sx, this.ey - this.sy);
    this.duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, dist / SPEED));

    const fill = needsHuman ? HUMAN_COLOR : (ACT_COLOR[act] ?? 0xe2e8f0);

    this.container = new Container();
    this.container.zIndex = 1_000_000;
    this.container.eventMode = 'none';
    this.container.alpha = 0;

    this.body = new Graphics();
    const w = 14, h = 10;
    this.body.rect(-w / 2, -h / 2, w, h).fill({ color: fill }).stroke({ color: OUTLINE, width: 1 });
    this.body.moveTo(-w / 2, -h / 2).lineTo(0, h / 2 - 3).lineTo(w / 2, -h / 2)
      .stroke({ color: OUTLINE, width: 1 });
    this.container.addChild(this.body);

    this.burst = new Graphics();
    this.burst.visible = false;
    this.container.addChild(this.burst);

    this.setPos(this.sx, this.sy);
  }

  private setPos(x: number, y: number): void {
    this.container.x = Math.round(x);
    this.container.y = Math.round(y);
  }

  update(dt: number): boolean {
    if (this.finished) return true;

    if (this.bursting) {
      this.burstElapsed += dt;
      const t = Math.min(1, this.burstElapsed / BURST_DURATION);
      this.burst.clear();
      const r = 4 + t * 9;
      this.burst.circle(0, 0, r).stroke({ color: 0xffd93d, width: 1.5, alpha: 1 - t });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + t * 0.8;
        const px = Math.cos(a) * (r + 2);
        const py = Math.sin(a) * (r + 2);
        this.burst.rect(Math.round(px) - 1, Math.round(py) - 1, 2, 2)
          .fill({ color: 0xffffff, alpha: 1 - t });
      }
      if (t >= 1) {
        this.finished = true;
        this.container.visible = false;
      }
      return this.finished;
    }

    this.elapsed += dt;
    const progress = Math.min(1, this.elapsed / this.duration);
    const easeP = easeInOut(progress);

    const x = this.sx + (this.ex - this.sx) * easeP;
    const arc = Math.sin(progress * Math.PI) * ARC_LIFT;
    const y = this.sy + (this.ey - this.sy) * easeP - arc;
    this.setPos(x, y);

    const travelDx = this.ex - this.sx;
    const tilt = (travelDx > 0 ? 1 : -1) * Math.sin(progress * Math.PI) * 0.16;
    this.body.rotation = tilt;

    if (this.elapsed < FADE_IN) {
      this.container.alpha = this.elapsed / FADE_IN;
    } else if (this.duration - this.elapsed < FADE_OUT) {
      this.container.alpha = Math.max(0, (this.duration - this.elapsed) / FADE_OUT);
    } else {
      this.container.alpha = 1;
    }

    if (progress >= 1) {
      this.bursting = true;
      this.body.visible = false;
      this.burst.visible = true;
      this.container.alpha = 1;
    }

    return false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
