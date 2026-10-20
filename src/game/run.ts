// The run (WHAT_AMIN_WANTS, redesigns of 17 and 18 October): one road in stretches, each harder than the last.
// Ten worlds (Amin, 20 Oct: "only 10 levels ... harder in each level"); the tenth boss falls and the world turns
// green. Until then, the last petal falling ends it. Detours open inside archway gates and lead back to it.
// Skills come while playing, chosen by the game, as he earns XP (docs/skills.md); every skill makes the monsters
// a little stronger too. Pure: no game engine. The scene asks it what a stretch holds and what he has earned.

import { landOf } from './lands';
import type { Enemy } from '../settings/schema';
import type { ChunkType } from './level';
import { makeRng } from '../core/rng';
import type { Settings } from '../settings/schema';

export type SkillKey =
  | 'reach'
  | 'quick'
  | 'power'
  | 'charges'
  | 'reload'
  | 'double-jump'
  | 'soft-steps'
  | 'quiet'
  | 'blooms'
  | 'bloom';
/** The older name, from when these were picked at a gate. */
export type UpgradeKey = SkillKey;

export interface Skill {
  name: string;
  line: string;
  /** How many times he can hold it. */
  most: number;
}

export const SKILLS: Record<SkillKey, Skill> = {
  reach: { name: 'Longer reach', line: 'Your weapon reaches further.', most: 3 },
  quick: { name: 'Quicker hands', line: 'Strike and shoot faster.', most: 3 },
  power: { name: 'Sharper edge', line: 'Your weapon hits harder.', most: 2 },
  charges: { name: 'Deep pockets', line: 'One more charge for your weapon.', most: 2 },
  reload: { name: 'Quick reload', line: 'Charges come back sooner.', most: 2 },
  'double-jump': { name: 'Second jump', line: 'Jump once more in the air.', most: 1 },
  'soft-steps': { name: 'Soft steps', line: 'Monsters notice you later.', most: 1 },
  quiet: { name: 'Quiet feet', line: 'Water makes no sound under you.', most: 1 },
  blooms: { name: 'Fertile ground', line: 'Monsters drop flowers more often.', most: 1 },
  bloom: { name: 'Full bloom', line: 'All your petals grow back.', most: 99 },
};
export const UPGRADES = SKILLS;

/** XP for a defeat (docs/skills.md). */
export const XP = { oneHit: 2, twoHits: 3, strong: 4, boss: 10, sneak: 1, detour: 3 };

export type Stage = 'road' | 'street';

export interface RunState {
  /** 1 for the first stretch of road. */
  chapter: number;
  stage: Stage;
  /** Pixels walked on the stretches already finished: the score. */
  distance: number;
  petals: number;
  flowers: number;
  defeated: number;
  /** The skills he holds, in the order he got them. */
  upgrades: SkillKey[];
  xp: number;
  /** How often he has thrown his weapon away. */
  throws: number;
  /** The living flowers found on this stretch and its detours, by id (quest.ts); and how often he has planted. */
  found: string[];
  planted: number;
  /** Set while he is in a detour: the place on the road he comes back to. */
  returnTo?: { x: number };
  /** Detours already walked on this stretch, by their place on the road, so each is entered once. */
  streetsDone: number[];
  /** Words already said on this run ("boss:2", "taunt:1"): every conversation is heard once (Amin, 20 Oct). */
  said?: string[];
  /** Worlds whose boss he has beaten: it stays beaten when he comes back along the road. */
  bossDown?: number[];
}

export function newRun(petals: number): RunState {
  return { chapter: 1, stage: 'road', distance: 0, petals, flowers: 0, defeated: 0, upgrades: [], xp: 0, throws: 0, found: [], planted: 0, streetsDone: [], said: [], bossDown: [] };
}

export function has(run: RunState, key: SkillKey): boolean {
  return run.upgrades.includes(key);
}

/** How many of a skill he holds. */
export function count(run: RunState, key: SkillKey): number {
  return run.upgrades.filter((k) => k === key).length;
}

/** How strong the monsters have grown: one step for every skill he holds. */
export function threat(run: RunState): number {
  return run.upgrades.length;
}

/** The XP at which his n-th skill arrives: 4, 10, 18, 28, 40 ... */
export function skillAt(n: number): number {
  return n * n + 3 * n;
}

/** XP for defeating a monster that took `hits` hits. */
export function xpFor(defeat: { hits: number; boss?: boolean; strong?: boolean; sneak?: boolean }): number {
  const base = defeat.boss ? XP.boss : defeat.strong || defeat.hits >= 3 ? XP.strong : defeat.hits >= 2 ? XP.twoHits : XP.oneHit;
  return base + (defeat.sneak ? XP.sneak : 0);
}

/** The skill the game gives him next, or nothing when every skill is full. */
export function chooseSkill(run: RunState, seed: number, maxPetals: number): SkillKey | undefined {
  const open = (Object.keys(SKILLS) as SkillKey[]).filter((k) => count(run, k) < SKILLS[k].most && (k !== 'bloom' || run.petals < maxPetals));
  if (open.length === 0) return undefined;
  if (run.petals <= 2 && open.includes('bloom')) return 'bloom';
  const rng = makeRng((seed ^ (run.upgrades.length * 2654435761) ^ (run.xp * 40503)) >>> 0);
  // Weighted: full bloom is rarer when he is healthy.
  const weight = (k: SkillKey) => (k === 'bloom' ? 0.5 : 1);
  const total = open.reduce((sum, k) => sum + weight(k), 0);
  let pick = rng() * total;
  for (const k of open) {
    pick -= weight(k);
    if (pick <= 0) return k;
  }
  return open[open.length - 1];
}

/** He takes a skill. "Full bloom" heals at once; the rest are kept and change how he fights. */
export function takeUpgrade(run: RunState, key: SkillKey, maxPetals: number): RunState {
  return { ...run, upgrades: [...run.upgrades, key], petals: key === 'bloom' ? maxPetals : run.petals };
}

/** He earns XP. When it reaches the next mark the game gives him a skill, which is returned too. */
export function gainXp(run: RunState, xp: number, seed: number, maxPetals: number): { run: RunState; skill?: SkillKey } {
  let next = { ...run, xp: run.xp + xp };
  if (next.xp < skillAt(next.upgrades.length + 1)) return { run: next };
  const skill = chooseSkill(next, seed, maxPetals);
  if (!skill) return { run: next };
  next = takeUpgrade(next, skill, maxPetals);
  return { run: next, skill };
}

/** The number of worlds. Beating the boss of the last and planting its flowers ends the game: the world is green. */
export const LAST_LEVEL = 10;

/**
 * How hard each world is, 1 to 10 (20 Oct). Every number grows: more monsters on a longer road, more of them merged,
 * tougher (extra hits), quicker and further-sighted, a little less light, more soldiers at the boss. The skills he
 * earns add a little on top (threat), as before.
 */
export interface LevelPlan {
  monsters: number;
  screens: number;
  /** 1 to 3: how many of the monsters are merges (config MERGE_SHARE). */
  difficulty: number;
  toughness: number;
  pace: number;
  sight: number;
  /** Light taken away. */
  dark: number;
  /** Soldiers the boss calls before the fight. */
  soldiers: number;
}

export const LEVELS: LevelPlan[] = [
  { monsters: 5, screens: 8, difficulty: 1, toughness: 0, pace: 1, sight: 1, dark: 0, soldiers: 2 },
  { monsters: 6, screens: 8, difficulty: 1, toughness: 0, pace: 1.04, sight: 1.03, dark: 0.02, soldiers: 3 },
  { monsters: 7, screens: 9, difficulty: 2, toughness: 0, pace: 1.08, sight: 1.06, dark: 0.03, soldiers: 3 },
  { monsters: 8, screens: 9, difficulty: 2, toughness: 1, pace: 1.1, sight: 1.08, dark: 0.04, soldiers: 4 },
  { monsters: 9, screens: 10, difficulty: 2, toughness: 1, pace: 1.13, sight: 1.1, dark: 0.06, soldiers: 4 },
  { monsters: 10, screens: 10, difficulty: 3, toughness: 1, pace: 1.16, sight: 1.12, dark: 0.07, soldiers: 5 },
  { monsters: 11, screens: 10, difficulty: 3, toughness: 1, pace: 1.19, sight: 1.14, dark: 0.08, soldiers: 5 },
  { monsters: 12, screens: 11, difficulty: 3, toughness: 2, pace: 1.22, sight: 1.16, dark: 0.09, soldiers: 6 },
  { monsters: 13, screens: 11, difficulty: 3, toughness: 2, pace: 1.25, sight: 1.18, dark: 0.1, soldiers: 6 },
  { monsters: 15, screens: 12, difficulty: 3, toughness: 2, pace: 1.28, sight: 1.2, dark: 0.11, soldiers: 7 },
];

/** How hard this world is. */
export function levelOf(chapter: number): LevelPlan {
  return LEVELS[Math.min(LEVELS.length, Math.max(1, chapter)) - 1];
}

/** True in the last world. */
export function isLastLevel(chapter: number): boolean {
  return chapter >= LAST_LEVEL;
}

/** What a stretch (or a detour off it) holds: the player's settings, made harder as the run goes on. */
export interface ChapterPlan {
  settings: Settings;
  /** Seed of this stretch. */
  seed: number;
  /** Level chunks: roads grow a little longer, detours are short. */
  screens: number;
  /** How many monsters stand in it. */
  monsters: number;
  /** A boss waits at its end. */
  boss: boolean;
  /** Detour gates that open off it. None in a detour. */
  streets: number;
  /** How the monsters have grown: extra hits each takes, and how much faster and further-sighted they are. */
  toughness: number;
  pace: number;
  sight: number;
  /** The land's lean: monsters more common in it, and road stretches that come up more often (lands.ts). */
  more: Enemy[];
  chunks: ChunkType[];
}

/** The places a detour can lead to. */
const DETOUR_PLACES: Settings['scenery'][] = [
  [
    { kind: 'trees', amount: 0.7, size: 0.9 },
    { kind: 'dunes', amount: 0.6, size: 0.9 },
  ],
  [
    { kind: 'ruins', amount: 0.9, size: 1 },
    { kind: 'towers', amount: 0.5, size: 1 },
    { kind: 'dunes', amount: 0.5, size: 0.8 },
  ],
  [
    { kind: 'mountains', amount: 1, size: 1.4 },
    { kind: 'cacti', amount: 0.7, size: 1 },
    { kind: 'ruins', amount: 0.2, size: 0.7 },
  ],
];

/** Which of the detour places a detour leads to (0 to 2), from the gate it was entered by. */
export function detourIndex(run: RunState): number {
  return Math.floor((run.returnTo?.x ?? 0) / 140) % DETOUR_PLACES.length;
}

export function planChapter(base: Settings, run: RunState): ChapterPlan {
  const c = Math.min(LAST_LEVEL, run.chapter);
  const t = threat(run);
  const street = run.stage === 'street';
  const level = levelOf(c);
  // Harder in each world (LEVELS), and a little more as he grows: more monsters, more merges, a little less light.
  const difficulty = Math.min(3, level.difficulty + (street || t >= 6 ? 1 : 0));
  // Each world is a land of its own: its colours, scenery, light and lean (lands.ts).
  const land = landOf(c);
  // Later worlds lose a little light, and never fall below 0.3 (19 Oct: they were too dark).
  const lightDensity = Math.max(0.3, Math.min(0.9, base.lightDensity - level.dark - (street ? 0.1 : 0) + land.light));
  const weapon = { ...base.weapon };
  weapon.reach = Math.round(weapon.reach * (1 + 0.25 * count(run, 'reach')));
  weapon.speed = Math.round(weapon.speed * (1 + 0.25 * count(run, 'quick')) * 100) / 100;
  weapon.power = weapon.power + count(run, 'power');
  // A detour is another place beyond the gate: the old city of the dry world, its towers and broken walls.
  // Each detour is a place of its own (loop 6): an oasis, the old city, or a canyon, chosen by where its gate stands.
  const scenery = street ? DETOUR_PLACES[detourIndex(run)] : land.scenery ?? base.scenery;
  const palette = land.palette ?? base.palette;
  const settings: Settings = { ...base, difficulty, lightDensity, weapon, scenery, palette };
  const seed = (base.seed + c * 7919 + (street ? 104729 + (run.returnTo?.x ?? 0) : 0)) >>> 0;
  const extra = Math.floor(t / 2);
  return {
    settings,
    seed,
    // A world (18 Oct): one long road with three detour gates; the ten flowers are spread over all of it.
    screens: street ? 3 : level.screens,
    monsters: street ? 3 + Math.ceil(c / 2) + extra : Math.min(18, level.monsters + extra),
    boss: !street && base.enemies.length + base.creatures.length > 0,
    streets: street ? 0 : 3,
    toughness: level.toughness + Math.floor(t / 4),
    pace: Math.round((level.pace + 0.03 * t) * 100) / 100,
    sight: Math.round((level.sight + 0.02 * t) * 100) / 100,
    more: land.more,
    chunks: land.chunks,
  };
}

/** The gate at the end of a stretch: a detour leads back to the road, a road leads on to the next stretch. */
export function afterGate(run: RunState, walked: number): RunState {
  if (run.stage === 'street') return { ...run, stage: 'road', returnTo: run.returnTo, distance: run.distance + walked };
  return { ...run, chapter: Math.min(LAST_LEVEL, run.chapter + 1), stage: 'road', returnTo: undefined, streetsDone: [], found: [], distance: run.distance + walked };
}

/** He goes through the detour gate that stands at `x`. */
export function enterStreet(run: RunState, x: number): RunState {
  return { ...run, stage: 'street', returnTo: { x }, streetsDone: [...run.streetsDone, Math.round(x)] };
}

/** He turns back through the gate he came in by, without walking the detour. */
export function leaveStreet(run: RunState): RunState {
  return { ...run, stage: 'road' };
}
