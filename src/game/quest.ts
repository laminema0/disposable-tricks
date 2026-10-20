// The story (Amin, 18 Oct): the world has dried out. In the whole world there are ten living flowers to
// find; seven are needed. Some stand in the open, some are hidden inside stones he breaks, and two wait
// through each detour gate. At the gate at the end he plants them, and the world comes back to colour.
// Stones can hold other things too: a petal (a life) or a weapon charge.
// Pure: where things are and what they hold. The scene draws them.

import { makeRng } from '../core/rng';
import type { Level } from './level';

export const QUEST = {
  /** Flowers on one stretch, its detours included. */
  total: 10,
  /** Flowers needed to plant at the end gate. */
  needed: 7,
  /** Flowers waiting through each detour gate (one of them inside a stone). */
  perDetour: 2,
  /** Of the flowers on the road, how many are hidden in stones. */
  inStones: 2,
  /** Stones on a stretch, with or without a flower inside. */
  stones: 6,
  /** Strikes a stone takes to break. */
  stoneHits: 2,
  /** How close he must come to pick a flower. */
  reach: 30,
};

export type StoneHolds = 'flower' | 'petal' | 'charge' | 'nothing';

export interface QuestFlower {
  id: string;
  x: number;
  /** Set when it is inside a stone, and which one. */
  stone?: string;
}

export interface Stone {
  id: string;
  x: number;
  holds: StoneHolds;
}

export interface QuestLayout {
  flowers: QuestFlower[];
  stones: Stone[];
}

/**
 * Where the flowers and stones are on a stretch. `detours` is how many detour gates open off it (each holds
 * `perDetour` flowers of its own); `keep` are places taken already (gates). `tag` keeps ids apart between a
 * road and its detours, so a flower found stays found when he comes back.
 */
export function placeQuest(level: Level, goalX: number, detours: number, keep: readonly number[], tag: string, inDetour: boolean): QuestLayout {
  const rng = makeRng((level.seed ^ 0xf10e3) >>> 0);
  const free = (x: number) =>
    !level.pits.some((p) => x > p.x0 - 60 && x < p.x1 + 60) &&
    !(level.mounds ?? []).some((m) => x > m.x0 - 40 && x < m.x1 + 40) &&
    !level.waters.some((w) => x > w.x0 - 30 && x < w.x1 + 30) &&
    !keep.some((k) => Math.abs(x - k) < 110);
  let spots: number[] = [];
  for (let x = 420; x < goalX - 220; x += 40) if (free(x)) spots.push(x);
  const take = (): number | undefined => {
    if (spots.length === 0) return undefined;
    // Spread out: pick from the spots, then keep the next ones a fair way off.
    const x = spots[Math.floor(rng() * spots.length)];
    spots = spots.filter((s) => Math.abs(s - x) > 150);
    return x;
  };

  const flowerCount = inDetour ? QUEST.perDetour : QUEST.total - detours * QUEST.perDetour;
  const hiddenCount = inDetour ? 1 : QUEST.inStones;
  const stoneCount = inDetour ? 3 : QUEST.stones;
  const stones: Stone[] = [];
  const flowers: QuestFlower[] = [];
  for (let i = 0; i < stoneCount; i++) {
    const x = take();
    if (x === undefined) break;
    const holds: StoneHolds = i < hiddenCount ? 'flower' : rng() < 0.4 ? 'petal' : rng() < 0.6 ? 'charge' : 'nothing';
    stones.push({ id: `${tag}s${i}`, x, holds });
  }
  // The stones' order along the road should not give away which hold flowers.
  for (let i = 0; i < stones.length; i++) {
    const stone = stones[i];
    if (stone.holds === 'flower') flowers.push({ id: `${tag}f${flowers.length}`, x: stone.x, stone: stone.id });
  }
  while (flowers.length < flowerCount) {
    const x = take();
    if (x === undefined) break;
    flowers.push({ id: `${tag}f${flowers.length}`, x });
  }
  return { flowers, stones };
}

/** The share of the dryness left: 1 is the dead grey world, 0 full colour. More flowers found, more colour. */
export function dryness(found: number, planted: number): number {
  const base = Math.max(0.2, 1 - planted * 0.2);
  return Math.max(0, base * (1 - Math.min(found, QUEST.total) / (QUEST.total + 2)));
}
