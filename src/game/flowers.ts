// The flowers a defeated monster bursts into (brief 3.3 and 3.4).
// They fly out, land, and are drawn to him when he comes near. No game engine in here.

import { FLOWER, GROUND_Y } from './config';

export interface Bloom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  landed: boolean;
  /** Which of the flower colours it has. */
  colour: number;
  /** Picked up, or lost down a pit. It is removed after this step. */
  gone: boolean;
}

const REST_Y = GROUND_Y - 7;

/** `count` flowers thrown up and outwards from one point. */
export function makeBurst(x: number, y: number, count: number, rng: () => number, colours = 5): Bloom[] {
  const blooms: Bloom[] = [];
  for (let i = 0; i < count; i++) {
    blooms.push({
      x,
      y,
      vx: (rng() - 0.5) * 340,
      vy: -(170 + rng() * 250),
      age: 0,
      landed: false,
      colour: Math.floor(rng() * colours),
      gone: false,
    });
  }
  return blooms;
}

/**
 * Move the flowers one step. Returns how many he picked up in this step.
 * `heroX`, `heroY` is the middle of his body. `overPit` says if a place has no ground.
 */
export function stepBlooms(
  blooms: Bloom[],
  dt: number,
  heroX: number,
  heroY: number,
  overPit: (x: number) => boolean,
): number {
  let picked = 0;
  for (const bloom of blooms) {
    bloom.age += dt;
    const dx = heroX - bloom.x;
    const dy = heroY - bloom.y;
    const distance = Math.hypot(dx, dy);
    const ready = bloom.age >= FLOWER.pickDelay;
    if (ready && distance <= FLOWER.take) {
      bloom.gone = true;
      picked++;
    } else if (ready && distance <= FLOWER.pull) {
      // Close enough: it flies to him.
      bloom.x += (dx / distance) * 420 * dt;
      bloom.y += (dy / distance) * 420 * dt;
      bloom.landed = false;
      bloom.vx = bloom.vy = 0;
    } else if (!bloom.landed) {
      bloom.vy += FLOWER.gravity * dt;
      bloom.x += bloom.vx * dt;
      bloom.y += bloom.vy * dt;
      if (bloom.y >= REST_Y && !overPit(bloom.x)) {
        bloom.y = REST_Y;
        bloom.landed = true;
      } else if (bloom.y > GROUND_Y + 300) {
        bloom.gone = true; // it fell down a pit
      }
    }
  }
  for (let i = blooms.length - 1; i >= 0; i--) if (blooms[i].gone) blooms.splice(i, 1);
  return picked;
}
