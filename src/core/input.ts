// Touch classification. A pure function, no game engine, so it can be unit tested.
// Rules from BUILD_BRIEF.md section 3.5.

import { TOUCH } from '../game/config';

/** -1 is the left half of the screen (go back), 1 is the right half (go forward). */
export type Side = -1 | 1;

export type TouchAction = 'move' | 'jump' | 'lie' | 'strike' | 'none';

/** One finger, from the moment it touched until now. Positions in screen pixels. */
export interface TouchTrace {
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Milliseconds since the finger touched. */
  heldMs: number;
  /** True once the finger has lifted. */
  released: boolean;
  /** How fast the finger is moving up or down just now, in px per ms (up is negative). */
  vy?: number;
}

export interface TouchThresholds {
  tapMaxMs: number;
  tapMaxMovePx: number;
  dragPx: number;
  crawlPx: number;
  flickPx?: number;
  flickSpeed?: number;
  walkDelayMs?: number;
}

export interface TouchResult {
  side: Side;
  action: TouchAction;
  /** Only with "lie": the way he crawls, or 0 to lie still. */
  crawl: -1 | 0 | 1;
}

/**
 * Decide what one finger means.
 *
 * While the finger is down:
 *   dragged up more than dragPx, or flicked up fast more than flickPx -> jump
 *   dragged down more than dragPx   -> lie. Sliding the same finger sideways by more than
 *                                      crawlPx then crawls that way; back to the middle stops.
 *   held less than walkDelayMs      -> none (so a tap does not step him)
 *   otherwise                       -> move
 * When the finger lifts:
 *   lifted within tapMaxMs and moved less than tapMaxMovePx -> strike
 *   otherwise                                               -> none
 *
 * The side is always the half of the screen where the finger first touched.
 */
export function classifyTouch(
  trace: TouchTrace,
  screenWidth: number,
  thresholds: TouchThresholds = TOUCH,
): TouchResult {
  const side: Side = trace.startX < screenWidth / 2 ? -1 : 1;
  const dx = trace.x - trace.startX;
  const dy = trace.y - trace.startY;

  if (trace.released) {
    const quick = trace.heldMs <= thresholds.tapMaxMs;
    const still = Math.hypot(dx, dy) < thresholds.tapMaxMovePx;
    return { side, action: quick && still ? 'strike' : 'none', crawl: 0 };
  }

  const vy = trace.vy ?? 0;
  const flickPx = thresholds.flickPx ?? Infinity;
  const flickSpeed = thresholds.flickSpeed ?? Infinity;
  if (dy < -thresholds.dragPx || (dy < -flickPx && vy < -flickSpeed)) return { side, action: 'jump', crawl: 0 };
  if (dy > thresholds.dragPx || (dy > flickPx && vy > flickSpeed)) {
    return { side, action: 'lie', crawl: dx > thresholds.crawlPx ? 1 : dx < -thresholds.crawlPx ? -1 : 0 };
  }
  if (trace.heldMs < (thresholds.walkDelayMs ?? 0)) return { side, action: 'none', crawl: 0 };
  return { side, action: 'move', crawl: 0 };
}
