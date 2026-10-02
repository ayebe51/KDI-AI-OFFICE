// ==========================================================
// apps/web/src/office/scene/ToolBubble.ts
// Tool and action indicator speech bubble with Secret Sanitization
// ==========================================================

import { Container, Graphics, Text } from 'pixi.js';
import { SecretSanitizer } from '../security/SecretSanitizer';

const TOOL_ICONS: Record<string, string> = {
  Read: '<',
  Edit: '>',
  Write: '>',
  Bash: '$',
  Grep: '?',
  Glob: '?',
  WebFetch: '@',
  WebSearch: '@',
  TodoWrite: '=',
  MCP: '*',
  AST: '#',
  Test: '!',
  Deploy: '^',
};

const DEFAULT_ICON = '*';
const PADDING_X = 6;
const PADDING_Y = 3;
const CORNER_RADIUS = 4;
const MAX_WIDTH = 140;
const BG_COLOR = 0x1a1e2e;
const BG_ALPHA = 0.95;
const TEXT_COLOR = '#fffdf5';
const FONT_SIZE = 12;
const RENDER_SCALE = 0.5;
const OFFSET_Y = -36;
const FADE_IN_DURATION = 0.15;
const FADE_OUT_DURATION = 0.3;
const LINGER_DURATION = 2.0;
const DOTS_CYCLE_SPEED = 0.5;
const WRAP_WIDTH = MAX_WIDTH / RENDER_SCALE - PADDING_X * 2;
const MAX_CHARS = 150;

type BubbleState = 'hidden' | 'fading-in' | 'visible' | 'lingering' | 'fading-out';

export function toolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] ?? DEFAULT_ICON;
}

export class ToolBubble {
  readonly container: Container;
  private inner: Container;
  private bg: Graphics;
  private label: Text;
  private state: BubbleState = 'hidden';
  private fadeElapsed = 0;
  private lingerElapsed = 0;
  private bgW = 0;
  private bgH = 0;
  private isThinking = false;
  private dotsElapsed = 0;
  private dotsPhase = 0;

  constructor() {
    this.container = new Container();
    this.container.zIndex = 100000;
    this.container.eventMode = 'none';
    this.container.alpha = 0;
    this.container.visible = false;

    this.inner = new Container();
    this.inner.scale.set(RENDER_SCALE);
    this.container.addChild(this.inner);

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

    this.inner.addChild(this.bg, this.label);
  }

  show(toolName: string, target: string): void {
    const icon = toolIcon(toolName);
    this.isThinking = !toolName && target === '...';

    // Sanitize target string against secrets!
    const sanitizedTarget = SecretSanitizer.sanitize(target);

    if (this.isThinking) {
      this.dotsElapsed = 0;
      this.dotsPhase = 1;
      this.label.text = '.';
    } else {
      const truncated = sanitizedTarget.length > MAX_CHARS ? sanitizedTarget.slice(0, MAX_CHARS) + '…' : sanitizedTarget;
      this.label.text = `${icon} ${truncated}`;
    }

    this.redrawBg();
    this.state = 'fading-in';
    this.fadeElapsed = 0;
    this.container.visible = true;
  }

  hide(): void {
    if (this.state === 'hidden') return;
    this.state = 'fading-out';
    this.fadeElapsed = 0;
  }

  private redrawBg(): void {
    const textW = this.label.width;
    const textH = this.label.height;
    const w = textW + PADDING_X * 2;
    const h = textH + PADDING_Y * 2;
    this.bgW = w;
    this.bgH = h;

    this.bg.clear();
    this.bg.roundRect(0, 0, w, h, CORNER_RADIUS);
    this.bg.fill({ color: BG_COLOR, alpha: BG_ALPHA });
    this.bg.stroke({ color: 0x3b4252, width: 1 });

    // Center horizontally above avatar head
    this.inner.x = -Math.round((w * RENDER_SCALE) / 2);
    this.inner.y = OFFSET_Y - Math.round(h * RENDER_SCALE);
  }

  update(dt: number): void {
    if (this.state === 'hidden') return;

    if (this.isThinking) {
      this.dotsElapsed += dt;
      if (this.dotsElapsed >= DOTS_CYCLE_SPEED) {
        this.dotsElapsed = 0;
        this.dotsPhase = (this.dotsPhase % 3) + 1;
        this.label.text = '.'.repeat(this.dotsPhase);
        this.redrawBg();
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
    } else if (this.state === 'visible') {
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

  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }
}
