// ==========================================================
// apps/web/src/office/scene/glRecovery.ts
// Automatic WebGL Context Loss Recovery
// ==========================================================

export interface GlRecoveryOptions {
  maxRebuilds?: number;
  delayMs?: number;
  onRebuild: () => void;
  onGiveUp?: () => void;
  schedule?: (fn: () => void, ms: number) => unknown;
  log?: (msg: string) => void;
}

export const DEFAULT_MAX_REBUILDS = 3;
export const DEFAULT_REBUILD_DELAY_MS = 1500;

export function installContextLossRecovery(
  canvas: EventTarget,
  opts: GlRecoveryOptions
): () => void {
  const max = opts.maxRebuilds ?? DEFAULT_MAX_REBUILDS;
  const delay = opts.delayMs ?? DEFAULT_REBUILD_DELAY_MS;
  const schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const log = opts.log ?? ((m: string) => console.warn(m));

  let rebuilds = 0;
  let live = true;

  const onLost = (e: Event) => {
    e.preventDefault();
    if (!live) return;
    if (rebuilds >= max) {
      log(`[OfficeFloor] WebGL context lost again after ${max} rebuilds — giving up until restart`);
      opts.onGiveUp?.();
      live = false;
      return;
    }
    rebuilds += 1;
    log(`[OfficeFloor] WebGL context lost — rebuilding scene, attempt ${rebuilds}/${max}`);
    schedule(() => { if (live) opts.onRebuild(); }, delay);
  };

  canvas.addEventListener('webglcontextlost', onLost as EventListener, false);
  return () => {
    live = false;
    canvas.removeEventListener('webglcontextlost', onLost as EventListener, false);
  };
}

export const DEFAULT_MAX_INIT_RETRIES = 3;

const CONTEXT_UNAVAILABLE = [
  /does not support webgl/i,
  /web(gl|gpu)\d?\s*(is\s+)?(not\s+(supported|available)|unsupported|unavailable)/i,
  /(unable|failed) to (create|get|obtain)[^.]*context/i,
  /no (webgl|gpu|rendering) context/i,
];

export function isContextUnavailableError(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e && depth < 5; depth++) {
    const msg = typeof e === 'string' ? e : (e as { message?: unknown })?.message;
    if (typeof msg === 'string' && CONTEXT_UNAVAILABLE.some((re) => re.test(msg))) return true;
    e = (e as { cause?: unknown })?.cause;
  }
  return false;
}

export type InitFailurePlan =
  | { action: 'retry'; delayMs: number; attempt: number }
  | { action: 'give-up' }
  | { action: 'report' };

export function planInitFailure(
  err: unknown,
  attemptsUsed: number,
  opts: { maxRetries?: number; delayMs?: number } = {}
): InitFailurePlan {
  if (!isContextUnavailableError(err)) return { action: 'report' };
  const max = opts.maxRetries ?? DEFAULT_MAX_INIT_RETRIES;
  if (attemptsUsed >= max) return { action: 'give-up' };
  return { action: 'retry', delayMs: opts.delayMs ?? DEFAULT_REBUILD_DELAY_MS, attempt: attemptsUsed + 1 };
}
