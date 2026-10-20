// The validator (brief 5.2). It accepts anything at all and always returns a playable
// settings object: every missing or invalid field is replaced by a default.
// Pure: no browser, no game engine.

import { DEFAULT_SETTINGS, MOOD_PRESETS, NO_WEAPON, WEAPON_PRESETS, WORLD_SCENERY } from './defaults';
import {
  ENEMIES,
  LIGHT_KINDS,
  MOODS,
  ATTACKS,
  BODIES,
  CREATURES_MAX,
  GROUNDS,
  MOVES_OF,
  PALETTE_SLOTS,
  WEATHERS,
  RECIPE_NAME_MAX,
  RECIPE_PARTS_MAX,
  SCENERY_KINDS,
  SHAPE_TYPES,
  TRAVELS,
  SCENERY_MAX,
  SEED_MAX,
  WEAPON_KINDS,
  WEAPON_LOOKS,
  WEAPON_NAME_MAX,
  WEAPON_REACH,
  SHIPPED_WORLDS,
  INTRO_MAX,
  TITLE_MAX,
  TWISTS,
  STORIES,
  type Creature,
  type Palette,
  type Recipe,
  type SceneryPiece,
  type Shape,
  type Settings,
  type Weapon,
  type WeaponKind,
  type WeaponLook,
  type World,
} from './schema';
import { ownMonsterLook } from './monsterLooks';
import { makeIntro, makeTitle } from './title';

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Keep the known items, once each, in the order of `allowed`. Undefined if `value` is not a list. */
function subsetOf<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return allowed.filter((item) => value.includes(item));
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const HEX = /^#[0-9a-f]{6}$/;

export function isHexColour(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.toLowerCase());
}

/** Letters, digits, spaces and plain punctuation only, so words from a link or an AI are always safe to show. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^\p{L}\p{N} '’,.!?&-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * A palette from outside is only taken when the game stays readable with it: a dark stage
 * and backdrop, a bright light, a visible accent, and a hero that stands out from the stage.
 */
export function playablePalette(value: unknown): Palette | undefined {
  if (!isObject(value)) return undefined;
  const palette = {} as Palette;
  for (const slot of PALETTE_SLOTS) {
    const colour = value[slot];
    if (!isHexColour(colour)) return undefined;
    palette[slot] = colour.toLowerCase();
  }
  const lum = (slot: keyof Palette) => luminance(palette[slot]);
  const heroContrast = (lum('hero') + 0.05) / (lum('stage') + 0.05);
  const fine =
    lum('stage') <= 0.03 && lum('far') <= 0.12 && lum('mid') <= 0.12 && lum('light') >= 0.45 && lum('accent') >= 0.25 && heroContrast >= 3;
  return fine ? palette : undefined;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** How far a part reaches: to the side of the middle, and up from the ground. */
function reachOf(part: Shape): { side: number; top: number } {
  if (part.t === 'circle') return { side: Math.abs(part.x) + part.w / 2, top: part.y + part.w / 2 };
  if (part.t === 'line') return { side: Math.max(Math.abs(part.x), Math.abs(part.x + part.w)), top: Math.max(part.y, part.y + part.h) };
  return { side: Math.abs(part.x) + Math.abs(part.w) / 2, top: Math.max(part.y, part.y + part.h) };
}

/** A drawing that spills out of the square (100 wide, 100 high) is shrunk until it fits. */
function fitToSquare(parts: Shape[]): Shape[] {
  let side = 0;
  let top = 0;
  for (const part of parts) {
    const reach = reachOf(part);
    side = Math.max(side, reach.side);
    top = Math.max(top, reach.top);
  }
  const k = Math.min(1, 50 / Math.max(1, side), 100 / Math.max(1, top));
  if (k === 1) return parts;
  const s = (v: number) => Math.round(v * k);
  return parts.map((part) => ({ t: part.t, x: s(part.x), y: s(part.y), w: s(part.w) || (part.t === 'line' ? 0 : 1), h: s(part.h) }));
}

/**
 * A recipe from anything: known shapes only, whole numbers inside the square (with a
 * little room around it), twelve parts at most. Undefined when no usable part is left,
 * so the caller falls back to a shape from our library.
 */
export function repairRecipe(value: unknown): Recipe | undefined {
  if (!isObject(value) || !Array.isArray(value.parts)) return undefined;
  const parts: Shape[] = [];
  for (const item of value.parts) {
    if (!isObject(item) || !(SHAPE_TYPES as readonly unknown[]).includes(item.t)) continue;
    const n = (v: unknown, lo: number, hi: number) => Math.round(numberIn(v, lo, hi, 0));
    const line = item.t === 'line';
    const part: Shape = {
      t: item.t as Shape['t'],
      x: n(item.x, -60, 60),
      y: n(item.y, 0, 120),
      w: n(item.w, line ? -120 : 1, 120),
      h: n(item.h, line || item.t === 'tri' ? -120 : 0, 120),
    };
    // A shape with no size draws nothing.
    if (!line && part.t !== 'circle' && part.h === 0) continue;
    if (line && part.w === 0 && part.h === 0) continue;
    parts.push(part);
    if (parts.length === RECIPE_PARTS_MAX) break;
  }
  if (parts.length === 0) return undefined;
  return { name: capital(cleanText(value.name, RECIPE_NAME_MAX)) || 'Shape', parts: fitToSquare(parts) };
}

/**
 * Scenery from anything: known kinds only, once each, at most three, numbers in range.
 * Undefined when the input names no scenery we have, so the caller can fall back.
 */
export function repairScenery(value: unknown): SceneryPiece[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const pieces: SceneryPiece[] = [];
  for (const item of value) {
    // A bare name ("buildings") is as good as an object with a kind.
    const raw: Loose = isObject(item) ? item : { kind: item };
    const kind = oneOf(raw.kind, SCENERY_KINDS, SCENERY_KINDS[0]);
    if (kind !== raw.kind) continue;
    const piece: SceneryPiece = { kind, amount: round2(numberIn(raw.amount, 0.1, 1, 0.6)), size: round2(numberIn(raw.size, 0.6, 1.6, 1)) };
    if (kind === 'custom') {
      // A custom piece is only as good as its recipe. Two custom pieces may stand side by side.
      const recipe = repairRecipe(raw.recipe);
      if (!recipe) continue;
      piece.recipe = recipe;
    } else if (pieces.some((other) => other.kind === kind)) continue;
    pieces.push(piece);
    if (pieces.length === SCENERY_MAX) break;
  }
  return pieces.length > 0 ? pieces : undefined;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** A described monster from anything. It needs at least a body, a move or an attack we know. */
export function repairCreature(value: unknown): Creature | undefined {
  if (!isObject(value)) return undefined;
  const known = (v: unknown, allowed: readonly string[]) => typeof v === 'string' && allowed.includes(v);
  if (!known(value.body, BODIES) && !known(value.move, MOVES_OF) && !known(value.attack, ATTACKS)) return undefined;
  const move = oneOf(value.move, MOVES_OF, value.body === 'flying' ? 'fly' : 'walk');
  // Something that flies or floats has a flying body, whatever else was said.
  const body = move === 'fly' || move === 'float' ? 'flying' : oneOf(value.body, BODIES, 'low');
  const name = capital(cleanText(value.name, RECIPE_NAME_MAX)) || 'Thing';
  // A dragon, a spider, a ghost...: drawn with our own picture, not the AI's handful of shapes.
  const recipe = ownMonsterLook(name) ?? repairRecipe(value.recipe);
  return {
    name,
    body,
    move: body === 'flying' && move !== 'float' ? 'fly' : move,
    attack: oneOf(value.attack, ATTACKS, body === 'flying' ? 'swoop' : body === 'tall' ? 'reach' : 'charge'),
    size: round2(numberIn(value.size, 0.7, 1.5, 1)),
    speed: round2(numberIn(value.speed, 0.6, 1.4, 1)),
    hits: Math.round(numberIn(value.hits, 1, 3, 1)),
    eyes: Math.round(numberIn(value.eyes, 1, 3, 2)),
    ...(recipe ? { recipe } : {}),
  };
}

export function repairCreatures(value: unknown): Creature[] {
  if (!Array.isArray(value)) return [];
  const creatures: Creature[] = [];
  for (const item of value) {
    const creature = repairCreature(item);
    if (creature) creatures.push(creature);
    if (creatures.length === CREATURES_MAX) break;
  }
  return creatures;
}

const LOOK_FOR_KIND: Record<WeaponKind, WeaponLook> = { melee: 'sword', ranged: 'bow', thrown: 'stone', mounted: 'bow', none: 'sword' };

/** A weapon from anything. Undefined when the input is not a weapon at all. */
export function repairWeapon(value: unknown): Weapon | undefined {
  if (!isObject(value)) return undefined;
  const knownLook = typeof value.look === 'string' && (WEAPON_LOOKS as readonly string[]).includes(value.look);
  const knownKind = typeof value.kind === 'string' && (WEAPON_KINDS as readonly string[]).includes(value.kind);
  if (!knownLook && !knownKind) return undefined;
  if (value.kind === 'none') return { ...NO_WEAPON };
  // A bazooka is a bazooka, however it was spelled or classed: our own drawing, firing rockets.
  const named = typeof value.name === 'string' ? value.name : '';
  if (value.kind !== 'mounted' && /bazoo?k|bazuk|rocket|missile|\brpg\b|launcher/i.test(named)) {
    return { ...WEAPON_PRESETS.launcher, name: capital(cleanText(named, WEAPON_NAME_MAX)).replace(/^Bazoka$|^Bazuka$/i, 'Bazooka') };
  }
  // The shape decides what is left unsaid, and the kind decides the shape when no shape is given.
  const kind = knownKind ? (value.kind as WeaponKind) : WEAPON_PRESETS[value.look as WeaponLook].kind;
  let look = knownLook ? (value.look as WeaponLook) : LOOK_FOR_KIND[kind];
  // A bow is not swung and a sword is not shot: a mismatch takes the shape of its kind.
  if (WEAPON_PRESETS[look].kind !== (kind === 'mounted' ? 'ranged' : kind)) look = LOOK_FOR_KIND[kind];
  const preset = WEAPON_PRESETS[look];
  const [near, far] = WEAPON_REACH[kind];
  const recipe = repairRecipe(value.recipe);
  return {
    ...(recipe ? { recipe } : {}),
    name: capital(cleanText(value.name, WEAPON_NAME_MAX)) || preset.name,
    kind,
    look,
    reach: Math.round(numberIn(value.reach, near, far, preset.reach)),
    speed: round2(numberIn(value.speed, 0.5, 2, preset.speed)),
    power: Math.round(numberIn(value.power, 1, 2, preset.power)),
    ...(kind !== 'melee' && typeof value.shots === 'number' && value.shots > 1
      ? { shots: Math.round(numberIn(value.shots, 1, 6, 1)), spread: round2(numberIn(value.spread, 0, 0.6, 0.25)) }
      : {}),
  };
}

/** Turn any input into valid settings. Valid fields are kept, everything else gets a default. */
export function repairSettings(input: unknown): Settings {
  const raw: Loose = isObject(input) ? input : {};

  const mood = oneOf(raw.mood, MOODS, DEFAULT_SETTINGS.mood);
  const preset = MOOD_PRESETS[mood];
  const world: World = oneOf(raw.world, SHIPPED_WORLDS, DEFAULT_SETTINGS.world);

  const rawPalette: Loose = isObject(raw.palette) ? raw.palette : {};
  const palette = {} as Palette;
  for (const slot of PALETTE_SLOTS) {
    const colour = rawPalette[slot];
    palette[slot] = isHexColour(colour) ? colour.toLowerCase() : preset.palette[slot];
  }

  const rawHero: Loose = isObject(raw.hero) ? raw.hero : {};
  const hero = {
    cape: typeof rawHero.cape === 'boolean' ? rawHero.cape : DEFAULT_SETTINGS.hero.cape,
    colour: typeof rawHero.colour === 'boolean' ? rawHero.colour : preset.heroColour,
  };

  // A game with no light at all cannot be played, so an empty list is repaired too.
  const lights = subsetOf(raw.lights, LIGHT_KINDS);
  const seed = Math.round(numberIn(raw.seed, 0, SEED_MAX, DEFAULT_SETTINGS.seed));
  const travel = oneOf(raw.travel, TRAVELS, DEFAULT_SETTINGS.travel);
  let weapon = repairWeapon(raw.weapon) ?? { ...DEFAULT_SETTINGS.weapon };
  // A weapon fixed to a vehicle needs a vehicle. On foot it is carried and shot by hand.
  if (weapon.kind === 'mounted' && travel === 'foot') weapon = { ...weapon, kind: 'ranged' };

  return {
    v: 1,
    genre: 'side-scroller',
    modifier: null,
    mood,
    world,
    palette,
    hero,
    lights: lights && lights.length > 0 ? lights : [...preset.lights],
    // Two decimals, so the value survives a trip through a share link unchanged.
    lightDensity: Math.round(numberIn(raw.lightDensity, 0, 1, preset.lightDensity) * 100) / 100,
    enemies: subsetOf(raw.enemies, ENEMIES) ?? [...DEFAULT_SETTINGS.enemies],
    creatures: repairCreatures(raw.creatures),
    weather: oneOf(raw.weather, WEATHERS, 'none'),
    scenery: repairScenery(raw.scenery) ?? WORLD_SCENERY[world].map((piece) => ({ ...piece })),
    travel,
    ground: oneOf(raw.ground, GROUNDS, DEFAULT_SETTINGS.ground),
    weapon,
    merges: typeof raw.merges === 'boolean' ? raw.merges : DEFAULT_SETTINGS.merges,
    twist: oneOf(raw.twist, TWISTS, DEFAULT_SETTINGS.twist),
    story: oneOf(raw.story, STORIES, DEFAULT_SETTINGS.story),
    difficulty: Math.round(numberIn(raw.difficulty, 1, 3, DEFAULT_SETTINGS.difficulty)),
    seed,
    title: cleanText(raw.title, TITLE_MAX) || makeTitle(mood, world, seed),
    intro: cleanText(raw.intro, INTRO_MAX) || makeIntro(mood, seed),
  };
}
