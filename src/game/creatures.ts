// Described monsters. A creature is a set of building blocks (see schema.ts); this file
// turns those blocks into what the game runs: a brain (one of the five behaviours that
// already exist), a body to hit, a shape of sight, and a speed. Pure: no game engine.
//
// The five named monsters are the same blocks with fixed values, so a described monster
// behaves in ways the player has already learned to read.

import { makeRng } from '../core/rng';
import type { Attack, Body, Creature, Enemy, MoveOf, Recipe } from '../settings/schema';
import { beastScale } from './beasts';
import { drawingFor } from './generated';
import { BOSS } from './config';
import { BOSS_POINTS, bossFigure, creatureFigure, mergeFigure, mergeKey, type Figure } from './kit';
import { MONSTERS, type MonsterSpec } from './monsters';
import { SIGHTS, type SightShape } from './sight';

export interface Design {
  /** Which of the five behaviours drives it. */
  brain: Enemy;
  spec: MonsterSpec;
  sight: SightShape | undefined;
  /** 1 is the speed of the named monster with this brain. */
  speed: number;
  /** Set for a described monster. */
  creature?: Creature;
  /** A merge: the second kind, whose attack and way of seeing it also has. */
  also?: Enemy;
  /** The second kind's way of seeing. */
  extraSight?: SightShape;
  /** Where its beam starts, for one that has a beam: this far ahead of its middle, this high above its base. */
  eye?: { ahead: number; up: number };
  /** What it is drawn from, when it is built from the kit. */
  figure?: Figure;
  /** Its name, for a merge ("crawler+flyer") or the boss. */
  name?: string;
  boss?: true;
}

/** The five named monsters, written as the same blocks. */
export const PRESET_BLOCKS: Record<Enemy, Pick<Creature, 'body' | 'move' | 'attack' | 'eyes'>> = {
  crawler: { body: 'low', move: 'walk', attack: 'charge', eyes: 2 },
  thorn: { body: 'tall', move: 'still', attack: 'spit', eyes: 1 },
  flyer: { body: 'flying', move: 'fly', attack: 'swoop', eyes: 2 },
  stalker: { body: 'tall', move: 'walk', attack: 'reach', eyes: 1 },
  watcher: { body: 'low', move: 'still', attack: 'beam', eyes: 1 },
};

export const isAirborne = (creature: Pick<Creature, 'move'>): boolean => creature.move === 'fly' || creature.move === 'float';

/**
 * The behaviour that moves it. Its body decides how it gets about; its attack is carried out by that
 * behaviour, or added to it (18 Oct: a dragon that spits fire stood rooted like a thorn). Only a spitter
 * that stays still is a thorn; one that flies flies, one that walks comes at him, and both spit.
 */
export function brainFor(creature: Pick<Creature, 'move' | 'attack'>): Enemy {
  const { attack } = creature;
  if (attack === 'beam') return 'watcher';
  if (attack === 'spit') return isAirborne(creature) ? 'flyer' : creature.move === 'still' ? 'thorn' : 'crawler';
  if (attack === 'swoop' || isAirborne(creature)) return 'flyer';
  return attack === 'reach' ? 'stalker' : 'crawler';
}

/** The attack added to how it moves: a spitter that is not rooted spits as it goes. */
export function alsoFor(creature: Pick<Creature, 'move' | 'attack'>): Enemy | undefined {
  return creature.attack === 'spit' && brainFor(creature) !== 'thorn' ? 'thorn' : undefined;
}

/** Its body, as heights in pixels at size 1. */
const BODY_BOX: Record<Body, { halfW: number; height: number }> = {
  low: { halfW: 24, height: 46 },
  tall: { halfW: 15, height: 140 },
  flying: { halfW: 18, height: 30 },
};
/** How high above the ground an airborne creature hovers, by brain. */
const HOVER: Partial<Record<Enemy, number>> = { flyer: 128, thorn: 96, watcher: 34 };

export function designFor(creature: Creature): Design {
  const brain = brainFor(creature);
  const base = MONSTERS[brain];
  // One of our own drawings: its body to hit is the size of the drawing.
  const beast = drawingFor(creature);
  const box = beast ? { halfW: Math.round(beast.w * beastScale(beast) * 0.3), height: beast.height } : BODY_BOX[creature.body];
  const airborne = isAirborne(creature);
  // In the air it looks down. On the ground its body decides: tall looks ahead and high, low along the ground.
  const sight = brain === 'watcher' ? undefined : airborne ? SIGHTS.flyer : creature.body === 'tall' ? (brain === 'thorn' ? SIGHTS.thorn : SIGHTS.stalker) : SIGHTS.crawler;
  // A creature with a drawing (ours or generated) or a silhouette of its own keeps it. Every other one is built
  // from the kit, until its generated look arrives (GameScene swaps it then).
  const figure = creature.recipe || beast ? undefined : creatureFigure(creature);
  return {
    brain,
    creature,
    also: alsoFor(creature),
    figure,
    sight,
    // "touch" does not rush at him: it keeps to a walk.
    speed: creature.speed * (creature.move === 'still' ? 0 : 1),
    spec: {
      ...base,
      hits: creature.hits,
      flowers: 4 + creature.hits * 2,
      halfW: Math.round(box.halfW * creature.size),
      height: Math.round(box.height * creature.size),
      fly: airborne ? HOVER[brain] ?? 128 : undefined,
      touch: brain !== 'watcher',
    },
  };
}

// ---- stock silhouettes, one per body, used when a creature has no recipe of its own ----

const STOCK: Record<Body, Recipe> = {
  low: {
    name: 'Low',
    parts: [
      { t: 'circle', x: 0, y: 22, w: 44, h: 0 },
      { t: 'box', x: 0, y: 0, w: 44, h: 22 },
      { t: 'tri', x: -14, y: 38, w: 12, h: 16 },
      { t: 'tri', x: 8, y: 40, w: 12, h: 16 },
      { t: 'box', x: -14, y: 0, w: 9, h: 6 },
      { t: 'box', x: 14, y: 0, w: 9, h: 6 },
    ],
  },
  tall: {
    name: 'Tall',
    parts: [
      { t: 'line', x: -6, y: 0, w: 0, h: 52 },
      { t: 'line', x: 6, y: 0, w: 0, h: 52 },
      { t: 'box', x: 0, y: 50, w: 20, h: 44 },
      { t: 'circle', x: 2, y: 104, w: 22, h: 0 },
      { t: 'line', x: 8, y: 88, w: 16, h: -44 },
      { t: 'line', x: -8, y: 88, w: -10, h: -40 },
    ],
  },
  flying: {
    name: 'Flying',
    parts: [
      { t: 'circle', x: 0, y: 14, w: 26, h: 0 },
      { t: 'tri', x: -24, y: 16, w: 30, h: 22 },
      { t: 'tri', x: 24, y: 16, w: 30, h: 22 },
      { t: 'tri', x: -6, y: 24, w: 8, h: 12 },
      { t: 'tri', x: 8, y: 24, w: 8, h: 12 },
    ],
  },
};

/** The silhouette a creature is drawn with, and where its eyes sit (in the recipe's own units). */
export function lookOf(creature: Creature): { recipe: Recipe; eyeY: number; eyeX: number } {
  const recipe = creature.recipe ?? STOCK[creature.body];
  // The eyes sit in the upper part of whatever was drawn, towards the front.
  let top = 0;
  for (const part of recipe.parts) {
    const reach = part.t === 'circle' ? part.y + part.w / 2 : part.t === 'line' ? Math.max(part.y, part.y + part.h) : part.y + Math.max(0, part.h);
    top = Math.max(top, reach);
  }
  // On the head: the circle highest and furthest forward, when there is one (a dragon's head, a spider's).
  const head = recipe.parts.filter((part) => part.t === 'circle').sort((a, b) => b.x + b.y - (a.x + a.y))[0];
  if (head) return { recipe, eyeY: head.y + head.w * 0.08, eyeX: head.x + head.w * 0.22 };
  return { recipe, eyeY: Math.max(8, top * 0.78), eyeX: 6 };
}

// ---- variety with no AI: a creature mixed from the blocks by the seed ----------------------

const MIX_NAMES: Record<Body, string[]> = {
  low: ['Scuttler', 'Lurker', 'Creeper', 'Snapper'],
  tall: ['Loomer', 'Strider', 'Reacher', 'Lanky'],
  flying: ['Drifter', 'Hoverer', 'Swooper', 'Glider'],
};
const MIX: Record<Body, { moves: MoveOf[]; attacks: Attack[] }> = {
  low: { moves: ['walk', 'hop'], attacks: ['charge', 'touch', 'spit'] },
  tall: { moves: ['walk', 'still'], attacks: ['reach', 'spit', 'touch'] },
  flying: { moves: ['fly', 'float'], attacks: ['swoop', 'spit'] },
};

/** One creature mixed from the blocks. The same seed always gives the same one. */
export function mixedCreature(seed: number): Creature {
  const rng = makeRng(seed ^ 0x3c7ea7);
  const pick = <T>(items: readonly T[]) => items[Math.floor(rng() * items.length)];
  const body = pick<Body>(['low', 'tall', 'flying']);
  const move = pick(MIX[body].moves);
  return {
    name: pick(MIX_NAMES[body]),
    body,
    move,
    attack: pick(MIX[body].attacks),
    size: Math.round((0.8 + rng() * 0.5) * 100) / 100,
    speed: Math.round((0.8 + rng() * 0.4) * 100) / 100,
    hits: 1 + Math.floor(rng() * 2),
    eyes: 1 + Math.floor(rng() * 3),
  };
}

// ---- merged monsters and the boss -------------------------------------------------------------

/** Which of two kinds decides how a merge moves. The other adds its attack and its way of seeing. */
const DRIVER: readonly Enemy[] = ['flyer', 'crawler', 'stalker', 'thorn', 'watcher'];

/**
 * Two of the five as one harder monster. It moves like one of them, has the attacks of both,
 * sees in both ways, and takes as many strikes as the two together.
 */
export function mergeDesign(a: Enemy, b: Enemy): Design {
  const [brain, also] = DRIVER.indexOf(a) <= DRIVER.indexOf(b) ? [a, b] : [b, a];
  const figure = mergeFigure(a, b);
  const one = MONSTERS[brain];
  const two = MONSTERS[also];
  const fly = brain === 'flyer' ? 128 : undefined;
  const eyeUp = -figure.eyes[0].y;
  // Each way of seeing starts at the eye this body really has.
  const fit = (shape: SightShape | undefined): SightShape | undefined => {
    if (!shape || shape.kind !== 'ahead') return shape;
    if (fly !== undefined) {
      // From the air, a gaze that looks ahead slants down to the ground in front of it.
      return { ...shape, range: 300, low: -fly, high: 30, fan: 70, eyeUp, eyeAhead: 10 };
    }
    return { ...shape, eyeUp, fan: Math.max(shape.fan, eyeUp * 0.8), high: Math.max(shape.high, Math.min(eyeUp + 20, 175)) };
  };
  return {
    brain,
    also,
    name: mergeKey(a, b),
    figure,
    sight: fit(SIGHTS[brain]),
    extraSight: fit(SIGHTS[also]),
    eye: also === 'watcher' ? { ahead: figure.eyes[0].x, up: eyeUp } : undefined,
    speed: 1,
    spec: {
      ...one,
      hits: one.hits + two.hits,
      flowers: one.flowers + two.flowers,
      halfW: figure.halfW,
      height: figure.height,
      sight: Math.max(one.sight, two.sight),
      touch: true,
      fly,
    },
  };
}

/** The boss. It stands still; what it does is in monsters.ts. */
export function bossDesign(): Design {
  const figure = bossFigure();
  return {
    brain: 'watcher',
    boss: true,
    name: 'boss',
    figure,
    sight: undefined,
    eye: BOSS_POINTS.eye,
    speed: 0,
    spec: { ...MONSTERS.watcher, hits: BOSS.hits, flowers: BOSS.flowers, halfW: figure.halfW, height: figure.height, sight: BOSS.range, touch: false },
  };
}
