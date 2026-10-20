// The level: a row of pre-made chunks chosen by a seed (brief 5.4).
// Pure data, no game engine. The scene draws whatever this returns.

import type { LightSource } from '../core/light';
import { makeRng } from '../core/rng';
import { LIGHT_KINDS, type LightKind } from '../settings/schema';
import { ARENA, END_CLEARING, GROUND_Y, LEVEL_SCREENS, SCREEN_W } from './config';

export type ChunkType = 'lampRoad' | 'grassField' | 'pillarHall' | 'pond' | 'gap' | 'archway';
export const CHUNK_TYPES: readonly ChunkType[] = ['lampRoad', 'grassField', 'pillarHall', 'pond', 'gap', 'archway'];

export interface LevelLight extends LightSource {
  kind: LightKind;
  /** A strong light is drawn bigger. */
  strong: boolean;
}

/** What the settings file says about light (brief 5.2). */
export interface LightRules {
  /** The kinds of light that may appear. */
  lights: readonly LightKind[];
  /** 0 to 1. 0.5 is the base amount; lower takes lights away, higher adds some. */
  lightDensity: number;
}
export const BASE_LIGHT_RULES: LightRules = { lights: LIGHT_KINDS, lightDensity: 0.5 };

/**
 * Grass and bushes: he lies flat in them. Rocks, pillars and crates: he crouches behind them.
 * An archway: he lies in its shadow, and its roof keeps eyes in the sky off him even when he stands.
 */
export type HideKind = 'grass' | 'rock' | 'pillar' | 'bush' | 'crate' | 'arch';
/** The kinds he goes behind, rather than into. */
export const isShelter = (kind: HideKind): boolean => kind === 'rock' || kind === 'pillar' || kind === 'crate';
/** The kinds with a roof. */
export const isRoof = (kind: HideKind): boolean => kind === 'arch';
export interface HideSpot {
  kind: HideKind;
  x0: number;
  x1: number;
}

export interface Pit {
  x0: number;
  x1: number;
}

/** A shallow pool he can walk through. It splashes. */
export interface Water {
  x0: number;
  x1: number;
}

export interface Level {
  seed: number;
  width: number;
  chunkWidth: number;
  chunks: ChunkType[];
  lights: LevelLight[];
  hideSpots: HideSpot[];
  pits: Pit[];
  waters: Water[];
  /** The boss's clearing, when the game has a boss: where it starts and where the boss stands. */
  arena?: { x0: number; bossX: number };
}

/** How high above the ground each kind of light sits. */
export const LIGHT_HEIGHT: Record<LightKind, number> = { lamp: 190, mirror: 150, fireflies: 80, water: 0 };
const POWER = {
  strong: { radius: 430, strength: 1 },
  weak: { radius: 280, strength: 0.6 },
  pool: { radius: 300, strength: 0.45 },
};

/** A place where a light can stand. The settings decide if one does, and of which kind. */
interface LightSlot {
  x: number;
  power: keyof typeof POWER;
  /** The kinds this place likes, best first. The first one the settings allow is used. */
  prefer: LightKind[];
  /** The light is there when the light density is at least this. */
  min: number;
}

interface ChunkParts {
  lights: LightSlot[];
  hideSpots: HideSpot[];
  pits: Pit[];
  waters?: Water[];
}

// Positions are measured from the left edge of the chunk, for a chunk 960 wide.
const CHUNKS: Record<ChunkType, ChunkParts> = {
  // A strong light. The rock stands in it, so hiding there fails.
  lampRoad: {
    lights: [
      { x: 480, power: 'strong', prefer: ['lamp', 'mirror', 'fireflies', 'water'], min: 0 },
      { x: 880, power: 'weak', prefer: ['fireflies', 'lamp', 'mirror', 'water'], min: 0.75 },
    ],
    hideSpots: [{ kind: 'rock', x0: 560, x1: 660 }],
    pits: [],
  },
  // A weak light. The first grass is inside it, the second is in the dark.
  grassField: {
    lights: [{ x: 200, power: 'weak', prefer: ['fireflies', 'lamp', 'mirror', 'water'], min: 0.3 }],
    hideSpots: [
      { kind: 'grass', x0: 230, x1: 350 },
      { kind: 'grass', x0: 560, x1: 800 },
    ],
    pits: [{ x0: 410, x1: 515 }],
  },
  // The dark stretch. Only a bright game puts a light here, and the first pillar stays dark.
  pillarHall: {
    lights: [{ x: 615, power: 'weak', prefer: ['fireflies', 'mirror', 'lamp', 'water'], min: 0.75 }],
    hideSpots: [
      { kind: 'pillar', x0: 150, x1: 240 },
      { kind: 'pillar', x0: 430, x1: 520 },
      { kind: 'pillar', x0: 710, x1: 800 },
    ],
    pits: [{ x0: 285, x1: 390 }],
  },
  // The moon reflected in water on the ground: a low, weak light.
  pond: {
    lights: [{ x: 440, power: 'pool', prefer: ['water', 'mirror', 'fireflies', 'lamp'], min: 0.2 }],
    hideSpots: [
      { kind: 'bush', x0: 40, x1: 130 },
      { kind: 'rock', x0: 790, x1: 890 },
    ],
    pits: [],
    waters: [{ x0: 270, x1: 610 }],
  },
  // A pit to jump, with a weak light just after it so the edge can be seen.
  gap: {
    lights: [{ x: 640, power: 'weak', prefer: ['mirror', 'lamp', 'fireflies', 'water'], min: 0.25 }],
    hideSpots: [{ kind: 'crate', x0: 170, x1: 250 }],
    pits: [{ x0: 420, x1: 540 }],
  },
  // Two archways with a crate between them. Dark, unless the game is a bright one.
  archway: {
    lights: [{ x: 850, power: 'weak', prefer: ['lamp', 'mirror', 'fireflies', 'water'], min: 0.6 }],
    hideSpots: [
      { kind: 'arch', x0: 180, x1: 310 },
      { kind: 'crate', x0: 410, x1: 490 },
      { kind: 'arch', x0: 590, x1: 720 },
    ],
    pits: [{ x0: 745, x1: 830 }],
  },
};

/** Turn a slot into a light, or into nothing if the settings leave it out. */
function lightFor(slot: LightSlot, left: number, rules: LightRules): LevelLight | undefined {
  if (rules.lightDensity < slot.min) return undefined;
  const kind = slot.prefer.find((k) => rules.lights.includes(k));
  if (!kind) return undefined;
  return { kind, strong: slot.power === 'strong', x: slot.x + left, y: GROUND_Y - LIGHT_HEIGHT[kind], ...POWER[slot.power] };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Choose the order of chunks. The level always opens on a lamp road, uses every
 * chunk type at least once, and never repeats a type twice in a row.
 */
export function chooseChunks(seed: number, count = LEVEL_SCREENS, prefer: readonly ChunkType[] = []): ChunkType[] {
  const rng = makeRng(seed);
  const first: ChunkType = 'lampRoad';
  const others = CHUNK_TYPES.filter((type) => type !== first);
  const rest: ChunkType[] = [];
  for (let i = 0; i < count - 1; i++) {
    // After one of each, the land's own kinds of stretch come up more often.
    const pool = [...CHUNK_TYPES, ...prefer, ...prefer];
    rest.push(i < others.length ? others[i] : pool[Math.floor(rng() * pool.length)]);
  }

  const hasRepeat = (order: ChunkType[]) =>
    order.some((type, i) => type === (i === 0 ? first : order[i - 1]));

  shuffle(rest, rng);
  for (let attempt = 0; attempt < 200 && hasRepeat(rest); attempt++) shuffle(rest, rng);
  return [first, ...rest];
}

/** Build the whole level. The same seed and the same light rules always give the same level. */
export function buildLevel(
  seed: number,
  rules: LightRules = BASE_LIGHT_RULES,
  count = LEVEL_SCREENS,
  chunkWidth = SCREEN_W,
  prefer: readonly ChunkType[] = [],
): Level {
  const chunks = chooseChunks(seed, count, prefer);
  const level: Level = {
    seed,
    // The chunks, then an empty clearing where the road ends.
    width: chunks.length * chunkWidth + END_CLEARING,
    chunkWidth,
    chunks,
    lights: [],
    hideSpots: [],
    pits: [],
    waters: [],
  };
  chunks.forEach((type, index) => {
    const left = index * chunkWidth;
    const parts = CHUNKS[type];
    for (const slot of parts.lights) {
      const light = lightFor(slot, left, rules);
      if (light) level.lights.push(light);
    }
    for (const spot of parts.hideSpots) level.hideSpots.push({ ...spot, x0: spot.x0 + left, x1: spot.x1 + left });
    for (const pit of parts.pits) level.pits.push({ x0: pit.x0 + left, x1: pit.x1 + left });
    for (const water of parts.waters ?? []) level.waters.push({ x0: water.x0 + left, x1: water.x1 + left });
  });
  return level;
}

/**
 * Add the boss's clearing before the planting place: open ground with no lamp, and two
 * places to hide inside the reach of its eye. The level grows by the clearing's length.
 */
export function addArena(level: Level): Level {
  if (level.arena) return level;
  const x0 = level.width - END_CLEARING + 100;
  level.arena = { x0, bossX: x0 + ARENA.boss };
  level.hideSpots.push({ kind: 'grass', x0: x0 + ARENA.grass[0], x1: x0 + ARENA.grass[1] }, { kind: 'rock', x0: x0 + ARENA.rock[0], x1: x0 + ARENA.rock[1] });
  level.width = x0 + ARENA.width + END_CLEARING;
  return level;
}

export function hideSpotAt(level: Level, x: number): HideSpot | undefined {
  return level.hideSpots.find((spot) => x >= spot.x0 && x <= spot.x1);
}

/** Four kinds of water (Amin, 18 Oct). Each piece of water is one of them, chosen by the seed and where it lies. */
export type WaterKind = 'pond' | 'stream' | 'puddles' | 'marsh';
export const WATER_KINDS: readonly WaterKind[] = ['pond', 'stream', 'puddles', 'marsh'];

export function waterKind(level: Level, water: Water): WaterKind {
  const h = Math.imul((level.seed ^ Math.round(water.x0) * 2654435761) >>> 0, 0x9e3779b1) >>> 0;
  return WATER_KINDS[(h >>> 7) % WATER_KINDS.length];
}

export function waterAt(level: Level, x: number): Water | undefined {
  return level.waters.find((water) => x >= water.x0 && x <= water.x1);
}

export function pitAt(level: Level, x: number): Pit | undefined {
  return level.pits.find((pit) => x > pit.x0 && x < pit.x1);
}
