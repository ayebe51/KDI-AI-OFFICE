// ==========================================================
// apps/web/src/office/scene/ThoughtBubble.ts
// Comic "thought cloud" pinned above agent avatars
// Automatically sanitized against secrets and credentials.
// ==========================================================

import { Container, Graphics, Text } from 'pixi.js';
import { toolIcon } from './ToolBubble';
import { SecretSanitizer } from '../security/SecretSanitizer';

const PADDING_X = 6;
const PADDING_Y = 3;
const CORNER_RADIUS = 5;
const MAX_WIDTH = 150;
const FILL_COLOR = 0xf8fafc;
const OUTLINE_COLOR = 0x1e293b;
const TEXT_COLOR = '#0f172a';
const FONT_SIZE = 12;
const RENDER_SCALE = 0.5;
const OFFSET_Y = -38;
const FADE_IN_DURATION = 0.15;
const FADE_OUT_DURATION = 0.3;
const LINGER_DURATION = 1.2;
const DOTS_CYCLE_SPEED = 0.45;
const WRAP_WIDTH = MAX_WIDTH / RENDER_SCALE - PADDING_X * 2;
const MAX_CHARS = 160;

type BubbleState = 'hidden' | 'fading-in' | 'visible' | 'lingering' | 'fading-out';

export class ThoughtBubble {
  readonly container: Container;
  private inner: Container;
  private bg: Graphics;
  private tail: Graphics;
  private label: Text;
  private state: BubbleState = 'hidden';
  private fadeElapsed = 0;
  private lingerElapsed = 0;
  private bgW = 0;
  private bgH = 0;
  private isThinking = false;
  private dotsElapsed = 0;
  private dotsPhase = 0;
  private extraLift = 0;
  private zoom = 1;
  private boundsW = 0;
  private boundsH = 0;

  constructor() {
    this.container = new Container();
    this.container.zIndex = 100000;
    this.container.eventMode = 'none';
    this.container.alpha = 0;
    this.container.visible = false;

    this.inner = new Container();
    this.inner.scale.set(RENDER_SCALE);
    this.container.addChild(this.inner);

    this.tail = new Graphics();
    this.bg = new Graphics();
    this.label = new Text({
      text: '',
      style: {
        fontSize: FONT_SIZE,
        fontWeight: 'bold',
        fill: TEXT_COLOR,
        fontFamily: 'monospace',
        align: 'left',
        wordWrap: true,
        wordWrapWidth: WRAP_WIDTH,
        breakWords: true,
      },
    });
    this.label.x = PADDING_X;
    this.label.y = PADDING_Y;

    this.inner.addChild(this.tail, this.bg, this.label);
  }

  setBounds(w: number, h: number): void {
    this.boundsW = w;
    this.boundsH = h;
  }

  setLift(px: number): void {
    this.extraLift = px;
  }

  setZoom(z: number): void {
    this.zoom = z;
    const s = z < 1 ? RENDER_SCALE / z : RENDER_SCALE;
    this.inner.scale.set(s);
  }

  show(rawText: string, tool?: string): void {
    // Zero secret leakage in thought bubbles
    const text = SecretSanitizer.sanitize(rawText);

    this.isThinking = !text.trim();
    const icon = tool ? toolIcon(tool) + ' ' : '';

    if (this.isThinking) {
      this.dotsElapsed = 0;
      this.dotsPhase = 1;
      this.label.text = icon + '…';
    } else {
      const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS).trimEnd() + '…' : text;
      this.label.text = icon + truncated;
    }

    this.redrawCloud();
    this.state = 'fading-in';
    this.fadeElapsed = 0;
    this.container.visible = true;
  }

  hide(): void {
    if (this.state === 'hidden') return;
    this.state = 'fading-out';
    this.fadeElapsed = 0;
  }

  startLinger(): void {
    if (this.state === 'hidden' || this.state === 'fading-out') return;
    this.state = 'lingering';
    this.lingerElapsed = 0;
  }

  private redrawCloud(): void {
    const textW = this.label.width;
    const textH = this.label.height;
    const w = textW + PADDING_X * 2;
    const h = textH + PADDING_Y * 2;
    this.bgW = w;
    this.bgH = h;

    this.bg.clear();
    this.bg.roundRect(0, 0, w, h, CORNER_RADIUS);
    this.bg.fill({ color: FILL_COLOR, alpha: 0.98 });
    this.bg.stroke({ color: OUTLINE_COLOR, width: 1.5 });

    this.tail.clear();
    // Little puff circles leading down to avatar head
    this.tail.circle(Math.round(w / 2), h + 3, 2).fill({ color: FILL_COLOR, alpha: 0.95 }).stroke({ color: OUTLINE_COLOR, width: 1 });
    this.tail.circle(Math.round(w / 2) - 1, h + 7, 1.5).fill({ color: FILL_COLOR, alpha: 0.95 }).stroke({ color: OUTLINE_COLOR, width: 1 });
  }

  getLayout(worldX: number, worldY: number): { x: number; y: number; w: number; h: number } | null {
    if (this.state === 'hidden') return null;
    const w = this.bgW * RENDER_SCALE;
    const h = this.bgH * RENDER_SCALE;
    return {
      x: worldX - w / 2,
      y: worldY + OFFSET_Y - h,
      w,
      h,
    };
  }

  setPosition(x: number, y: number): void {
    const w = this.bgW * RENDER_SCALE;
    const h = this.bgH * RENDER_SCALE;

    let targetX = x - w / 2;
    let targetY = y + OFFSET_Y - h - this.extraLift;

    if (this.boundsW > 0) {
      targetX = Math.max(4, Math.min(this.boundsW - w - 4, targetX));
    }
    if (this.boundsH > 0) {
      targetY = Math.max(4, targetY);
    }

    this.container.x = targetX;
    this.container.y = targetY;
  }

  update(dt: number): void {
    if (this.state === 'hidden') return;

    if (this.isThinking) {
      this.dotsElapsed += dt;
      if (this.dotsElapsed >= DOTS_CYCLE_SPEED) {
        this.dotsElapsed = 0;
        this.dotsPhase = (this.dotsPhase % 3) + 1;
        this.label.text = '.'.repeat(this.dotsPhase);
        this.redrawCloud();
      }
    }

    if (this.state === 'fading-in') {
      this.fadeElapsed += dt;
      const t = Math.min(this.fadeElapsed / FADE_IN_DURATION, 1);
      this.container.alpha = t;
      if (t >= 1) {
        this.state = 'visible';
        this.lingerElapsed = 0;
      }
    } else if (this.state === 'lingering') {
      this.lingerElapsed += dt;
      if (this.lingerElapsed >= LINGER_DURATION) {
        this.state = 'fading-out';
        this.fadeElapsed = 0;
      }
    } else if (this.state === 'fading-out') {
      this.fadeElapsed += dt;
      const t = Math.min(this.fadeElapsed / FADE_OUT_DURATION, 1);
      this.container.alpha = 1 - t;
      if (t >= 1) {
        this.state = 'hidden';
        this.container.visible = false;
      }
    }
  }
}
