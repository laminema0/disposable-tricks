// Where the monsters stand. The settings say which kinds (`enemies`) and how many
// (`difficulty`); the seed says where, so a share link gives the same game. Pure, tested.

import { makeRng } from '../core/rng';
import { ENEMIES, type Creature, type Enemy, type Settings } from '../settings/schema';
import { bossDesign, designFor, mergeDesign } from './creatures';
import { BOSS_FROM, EXTRA_WATCHERS, MERGE_SHARE, MONSTER_COUNT, SAFE_END, SAFE_START } from './config';
import type { Level } from './level';
import { MONSTERS, type Spawn } from './monsters';

export type MonsterRules = Pick<Settings, 'enemies' | 'difficulty' | 'twist' | 'seed'> & {
  creatures?: readonly Creature[];
  /** The endless run sets these per chapter: how many monsters, and whether a boss waits. */
  count?: number;
  boss?: boolean;
  /** Kinds this land has more of: each entry is one more share (lands.ts). */
  more?: readonly Enemy[];
};
/** One place in the game's cast: a named monster, or the number of a described one. */
export type Cast = Enemy | number;

/** A ground monster keeps this far from the edge of a pit. */
const PIT_MARGIN = 70;
/** A monster never strays further than this from where it was put. */
const LEASH = 460;

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** How many monsters of each kind a game holds. Every chosen kind appears when there is room. */
export function chooseKinds(rules: MonsterRules): Cast[] {
  const rng = makeRng(rules.seed ^ 0x6d6f6e73);
  const kinds: Cast[] = [
    ...new Set(rules.enemies),
    ...(rules.creatures ?? []).map((_, index) => index),
    ...(rules.more ?? []).filter((kind) => rules.enemies.includes(kind)),
  ];
  const count = kinds.length === 0 ? 0 : rules.count ?? MONSTER_COUNT[Math.round(rules.difficulty)] ?? MONSTER_COUNT[2];
  const order = shuffle([...kinds], rng);
  const chosen: Cast[] = [];
  for (let i = 0; i < count; i++) chosen.push(order[i % order.length]);
  if (rules.twist === 'more-watchers') for (let i = 0; i < EXTRA_WATCHERS; i++) chosen.push('watcher');
  return shuffle(chosen, rng);
}

/** True when these settings put a boss at the end of the road: any monsters at all, and enough difficulty. */
export function hasBoss(rules: MonsterRules): boolean {
  if (rules.boss !== undefined) return rules.boss && rules.enemies.length + (rules.creatures ?? []).length > 0;
  return rules.enemies.length + (rules.creatures ?? []).length > 0 && Math.round(rules.difficulty) >= BOSS_FROM;
}

/**
 * "As you go": which places along the road hold a merge, and of which two kinds.
 * The first part of the road has plain monsters; merges fill the later part, and there are
 * more of them the harder the game. A merge is made of the kind that stood there and one
 * other kind from the game (or, in a game with a single kind, any other kind).
 */
export function chooseMerges(rules: MonsterRules, cast: readonly Cast[]): (readonly [Enemy, Enemy] | undefined)[] {
  const rng = makeRng(rules.seed ^ 0x6d657267);
  const share = MERGE_SHARE[Math.round(rules.difficulty)] ?? 0;
  const first = cast.length - Math.round(cast.length * share);
  const chosen = [...new Set(rules.enemies)];
  return cast.map((kind, i) => {
    if (i < first || typeof kind === 'number') return undefined;
    const others = (chosen.length > 1 ? chosen : [...ENEMIES]).filter((other) => other !== kind);
    return [kind, others[Math.floor(rng() * others.length)]] as const;
  });
}

/** The stretch of ground around `x` that a walking monster can use: it ends at pits. */
export function groundAround(level: Level, x: number): { minX: number; maxX: number } {
  let minX = 60;
  let maxX = level.width - SAFE_END;
  for (const pit of level.pits) {
    if (pit.x1 <= x) minX = Math.max(minX, pit.x1 + PIT_MARGIN);
    else if (pit.x0 >= x) maxX = Math.min(maxX, pit.x0 - PIT_MARGIN);
  }
  return { minX: Math.max(minX, x - LEASH), maxX: Math.min(maxX, x + LEASH) };
}

/**
 * Put the monsters along the road. The road is cut into equal stretches, one monster each,
 * so they are spread out; the seed picks the spot inside each stretch.
 * The first screen and the planting place stay free.
 */
export function placeMonsters(level: Level, rules: MonsterRules): Spawn[] {
  const kinds = chooseKinds(rules);
  const merges = chooseMerges(rules, kinds);
  const rng = makeRng(rules.seed ^ 0x706c6163);
  const from = SAFE_START;
  // With a boss, the road's monsters end before its clearing.
  const to = level.arena ? level.arena.x0 - 260 : level.width - SAFE_END;
  const stretch = (to - from) / Math.max(1, kinds.length);

  const spawns = kinds.map((cast, i): Spawn => {
    let x = Math.round(from + stretch * (i + 0.15 + rng() * 0.7));
    const merge = merges[i];
    const design = merge ? mergeDesign(merge[0], merge[1]) : typeof cast === 'number' ? designFor((rules.creatures ?? [])[cast]) : undefined;
    const kind: Enemy = design ? design.brain : (cast as Enemy);
    const flies = (design ? design.spec : MONSTERS[kind]).fly !== undefined;
    if (!flies) {
      // Nothing that walks may stand in a pit or on its edge.
      const pit = level.pits.find((p) => x > p.x0 - PIT_MARGIN && x < p.x1 + PIT_MARGIN);
      if (pit) {
        const before = pit.x0 - PIT_MARGIN - 20;
        const after = pit.x1 + PIT_MARGIN + 20;
        x = x < (pit.x0 + pit.x1) / 2 || after > to ? before : after;
      }
    }
    const bounds = flies ? { minX: Math.max(60, x - LEASH), maxX: Math.min(to, x + LEASH) } : groundAround(level, x);
    return design ? { kind, x, ...bounds, design } : { kind, x, ...bounds };
  });
  // The boss stands in its clearing, last of all.
  if (level.arena && hasBoss(rules)) {
    const x = level.arena.bossX;
    spawns.push({ kind: 'watcher', x, minX: x, maxX: x, design: bossDesign() });
  }
  return spawns;
}
