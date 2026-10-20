// The steps of the maker and the cards of each step.
//
// A card is a name, one short line, and a "patch": the part of the settings file that
// choosing it fills in. The cards in this file are our own, pre-made ones. An AI can
// propose other cards for a step, but a card from anywhere is only ever a patch made of
// things the engine can build, and it goes through `repairPatch` before it is used.
// Each answer changes what the next step offers.
// Pure: no browser, no game engine.

import { mixedCreature } from '../game/creatures';
import { MOOD_PRESETS, NO_WEAPON, WEAPON_PRESETS, WORLD_SCENERY } from './defaults';
import {
  ENEMIES,
  LIGHT_KINDS,
  MOODS,
  WEATHERS,
  TWISTS,
  STORIES,
  WORLDS,
  type Creature,
  type Enemy,
  type LightKind,
  type Mood,
  type Weather,
  type Palette,
  type SceneryKind,
  type SceneryPiece,
  type Settings,
  type Twist,
  type Story,
  type Weapon,
  type WeaponLook,
  type World,
} from './schema';
import { makeIntro, makeTitle } from './title';
import { playablePalette, repairCreatures, repairScenery, repairSettings, repairWeapon } from './validate';

export const STEPS = ['mood', 'world', 'monsters', 'weapon', 'twist', 'story'] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = { mood: 'Mood', world: 'World', monsters: 'Monsters', weapon: 'Weapon', twist: 'Twist', story: 'Story' };
export const STEP_QUESTIONS: Record<Step, string> = {
  mood: 'Pick a mood',
  world: 'Pick a world',
  monsters: 'Pick the monsters',
  weapon: 'Pick a weapon',
  twist: 'Pick a twist',
  story: 'How does it end?',
};
/** The words in the write-in field of each step. */
export const STEP_WRITE: Record<Step, string> = {
  mood: 'Or write the air: foggy, green, rainy…',
  world: 'Or write a place: a town, a bridge…',
  monsters: 'Or describe a monster',
  weapon: 'Or write a weapon: a gun, a spear…',
  twist: 'Or write a twist',
  story: 'Or write how it ends',
};

/** The part of the settings one step may fill in. Which fields count depends on the step. */
export interface Patch {
  mood?: Mood;
  palette?: Palette;
  lightDensity?: number;
  lights?: LightKind[];
  weather?: Weather;
  creatures?: Creature[];
  world?: World;
  scenery?: SceneryPiece[];
  enemies?: Enemy[];
  difficulty?: number;
  weapon?: Weapon;
  twist?: Twist;
  story?: Story;
}

export interface Card {
  id: string;
  label: string;
  /** One short line. It must fit a card without wrapping. */
  detail: string;
  patch: Patch;
}

/** The longest name and line a card can carry. */
export const LABEL_MAX = 18;
export const DETAIL_MAX = 28;

// ---- our own cards ------------------------------------------------------------

const MOOD_CARDS: Record<Mood, { label: string; detail: string }> = {
  calm: { label: 'Calm', detail: 'Navy night, warm lamps' },
  happy: { label: 'Happy', detail: 'Plum dusk, hero in colour' },
  eerie: { label: 'Eerie', detail: 'Green dark, only fireflies' },
  fierce: { label: 'Fierce', detail: 'Ember red, hard light' },
};

const WORLD_CARDS: Record<World, { label: string; detail: string }> = {
  forest: { label: 'Forest', detail: 'Trees under far mountains' },
  town: { label: 'Town', detail: 'Buildings, houses, fences' },
  ruins: { label: 'Ruins', detail: 'Broken walls and towers' },
  shore: { label: 'Shore', detail: 'Bridges over still water' },
};
/** Each mood puts the world that suits it first. */
const WORLD_ORDER: Record<Mood, World[]> = {
  calm: ['forest', 'town', 'shore', 'ruins'],
  happy: ['town', 'forest', 'shore', 'ruins'],
  eerie: ['ruins', 'forest', 'shore', 'town'],
  fierce: ['ruins', 'town', 'forest', 'shore'],
};

interface Pack {
  label: string;
  detail: string;
  enemies: Enemy[];
  /** The moods that offer this pack. */
  moods: Mood[];
}

export const PACKS: Record<string, Pack> = {
  garden: { label: 'Thorn garden', detail: 'Only Thorns', enemies: ['thorn'], moods: ['happy'] },
  creepers: { label: 'Creepers', detail: 'Crawlers and Thorns', enemies: ['crawler', 'thorn'], moods: ['calm', 'happy', 'eerie'] },
  swoopers: { label: 'Swoopers', detail: 'Crawlers and Flyers', enemies: ['crawler', 'flyer'], moods: ['calm', 'happy', 'fierce'] },
  longarms: { label: 'Long arms', detail: 'Thorns and Stalkers', enemies: ['thorn', 'stalker'], moods: ['calm', 'eerie', 'fierce'] },
  watchers: { label: 'Watchers', detail: 'Crawlers and Watchers', enemies: ['crawler', 'watcher'], moods: ['eerie', 'fierce'] },
  all: { label: 'The lot', detail: 'All five monsters', enemies: ['crawler', 'thorn', 'flyer', 'stalker', 'watcher'], moods: ['calm', 'happy', 'eerie', 'fierce'] },
};

const WEAPON_LINES: Record<WeaponLook | 'none', string> = {
  sword: 'A short lunge and a slash',
  dagger: 'Short reach, very quick',
  spear: 'Long reach, a little slow',
  axe: 'Slow, hits twice as hard',
  club: 'Slow, hits twice as hard',
  staff: 'Long reach, steady',
  bow: 'Arrows, from far away',
  gun: 'Quick shots, from far away',
  sling: 'Stones thrown in an arc',
  stone: 'Stones thrown by hand',
  knife: 'Very close, very quick',
  hammer: 'Slow, hits twice as hard',
  pen: 'Tiny reach, quickest of all',
  pistol: 'Quick shots, mid range',
  shotgun: 'Five shots in a spread',
  rifle: 'Slow shots, very far',
  launcher: 'One rocket, a wide blast',
  none: 'Bare hands: only hiding',
};
/** The weapons each mood offers. */
const WEAPONS_FOR: Record<Mood, (WeaponLook | 'none')[]> = {
  calm: ['sword', 'staff', 'bow', 'sling'],
  happy: ['sword', 'stone', 'sling', 'staff'],
  eerie: ['dagger', 'bow', 'spear', 'none'],
  fierce: ['axe', 'gun', 'spear', 'sword'],
};

const TWIST_CARDS: Record<Twist, { label: string; detail: string }> = {
  none: { label: 'No twist', detail: 'The game as it is' },
  'fewer-lights': { label: 'Fewer lights', detail: 'Half the lights go out' },
  'no-sword': { label: 'Unarmed', detail: 'You can only hide' },
  'more-watchers': { label: 'More Watchers', detail: 'Two more eyes on the road' },
  'fast-flowers': { label: 'Fast flowers', detail: 'Five flowers regrow a petal' },
};

export const STORY_CARDS: Record<Story, { label: string; detail: string }> = {
  flower: { label: 'The flower', detail: 'Plant it with your head' },
  home: { label: 'Home', detail: 'Walk into the light and live' },
  hunt: { label: 'The hunt', detail: 'Every monster must fall' },
};

/** The stories on offer. The hunt needs a weapon to fell monsters with. */
export function storiesFor(settings: Settings): Story[] {
  const armed = settings.weapon.kind !== 'none' && settings.twist !== 'no-sword';
  return STORIES.filter((story) => story !== 'hunt' || armed);
}

/** The twists on offer depend on the mood, the monsters and the weapon. */
export function twistsFor(settings: Settings): Twist[] {
  const twists: Twist[] = ['none'];
  // Eerie is already dark, so it does not offer fewer lights.
  if (settings.mood !== 'eerie') twists.push('fewer-lights');
  // Unarmed needs a weapon to take away.
  if (settings.weapon.kind !== 'none') twists.push('no-sword');
  // More Watchers needs Watchers. Without them the slot goes to fast flowers.
  twists.push(settings.enemies.includes('watcher') ? 'more-watchers' : 'fast-flowers');
  return twists;
}

const copyScenery = (pieces: readonly SceneryPiece[]) => pieces.map((piece) => ({ ...piece }));

/** Our own cards for one step, given the choices already in `settings`. */
export function premadeCards(step: Step, settings: Settings): Card[] {
  switch (step) {
    case 'mood':
      return MOODS.map((mood) => ({ id: mood, ...MOOD_CARDS[mood], patch: { mood } }));
    case 'world':
      return WORLD_ORDER[settings.mood].map((world) => ({
        id: world,
        ...WORLD_CARDS[world],
        patch: { world, scenery: copyScenery(WORLD_SCENERY[world]) },
      }));
    case 'monsters':
      return Object.entries(PACKS)
        .filter(([, pack]) => pack.moods.includes(settings.mood))
        // Every pack also gets one monster mixed from the blocks by the seed, so two games are never quite the same.
        .map(([id, pack], index) => ({
          id,
          label: pack.label,
          detail: pack.detail,
          patch: { enemies: [...pack.enemies], creatures: [mixedCreature(settings.seed + index * 101)] },
        }));
    case 'weapon':
      return WEAPONS_FOR[settings.mood].map((look) => {
        const weapon = look === 'none' ? { ...NO_WEAPON } : { ...WEAPON_PRESETS[look] };
        return { id: look, label: weapon.name, detail: WEAPON_LINES[look], patch: { weapon } };
      });
    case 'twist':
      return twistsFor(settings).map((twist) => ({ id: twist, ...TWIST_CARDS[twist], patch: { twist } }));
    case 'story':
      return storiesFor(settings).map((story) => ({ id: story, ...STORY_CARDS[story], patch: { story } }));
  }
}

// ---- reading and applying a patch ------------------------------------------------

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === 'object' && value !== null && !Array.isArray(value);
const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value);

/** How far a card may move the amount of light away from what its mood gives. */
const LIGHT_TUNE = 0.2;
const LIGHT_MIN = 0.15;

/** The ready-made world whose scenery is closest to a list of pieces. */
export function worldFor(scenery: readonly SceneryPiece[]): World {
  let best: World = 'forest';
  let bestScore = -1;
  for (const world of WORLDS) {
    const kinds = WORLD_SCENERY[world].map((piece) => piece.kind);
    const shared = scenery.filter((piece) => kinds.includes(piece.kind)).length;
    const score = shared / (kinds.length + scenery.length - shared);
    if (score > bestScore) {
      bestScore = score;
      best = world;
    }
  }
  return best;
}

/**
 * Read a patch for one step from anything (an AI answer, say). Only the fields of that
 * step are read, only values the engine can build are kept, and undefined comes back
 * when nothing usable is left.
 */
export function repairPatch(step: Step, input: unknown, settings: Settings): Patch | undefined {
  const raw: Loose = isObject(input) ? input : {};
  switch (step) {
    case 'mood': {
      if (!isOneOf(raw.mood, MOODS)) return undefined;
      const patch: Patch = { mood: raw.mood };
      const palette = playablePalette(raw.palette);
      if (palette) patch.palette = palette;
      if (typeof raw.lightDensity === 'number' && Number.isFinite(raw.lightDensity)) {
        const base = MOOD_PRESETS[raw.mood].lightDensity;
        patch.lightDensity = Math.min(Math.min(1, base + LIGHT_TUNE), Math.max(Math.max(LIGHT_MIN, base - LIGHT_TUNE), raw.lightDensity));
      }
      // The kinds of light, and what is in the air.
      const lights = Array.isArray(raw.lights) ? LIGHT_KINDS.filter((kind) => (raw.lights as unknown[]).includes(kind)) : [];
      if (lights.length > 0) patch.lights = lights;
      if (isOneOf(raw.weather, WEATHERS)) patch.weather = raw.weather;
      return patch;
    }
    case 'world': {
      const scenery = repairScenery(raw.scenery) ?? (isOneOf(raw.world, WORLDS) ? copyScenery(WORLD_SCENERY[raw.world]) : undefined);
      if (!scenery) return undefined;
      return { world: worldFor(scenery), scenery };
    }
    case 'monsters': {
      const enemies = Array.isArray(raw.enemies) ? ENEMIES.filter((enemy) => (raw.enemies as unknown[]).includes(enemy)) : [];
      // Described monsters can stand in for the named ones, or join them.
      const creatures = repairCreatures(raw.creatures);
      if (enemies.length === 0 && creatures.length === 0) return undefined;
      const patch: Patch = creatures.length > 0 ? { enemies, creatures } : { enemies };
      if (typeof raw.difficulty === 'number' && Number.isFinite(raw.difficulty)) {
        patch.difficulty = Math.min(3, Math.max(1, Math.round(raw.difficulty)));
      }
      return patch;
    }
    case 'weapon': {
      const weapon = repairWeapon(isObject(raw.weapon) ? raw.weapon : raw);
      return weapon ? { weapon } : undefined;
    }
    case 'twist':
      return isOneOf(raw.twist, TWISTS) && twistsFor(settings).includes(raw.twist) ? { twist: raw.twist } : undefined;
    case 'story':
      return isOneOf(raw.story, STORIES) && storiesFor(settings).includes(raw.story) ? { story: raw.story } : undefined;
  }
}

/**
 * Fill in one step and return the new settings. Later choices that this one has made
 * impossible are replaced by the first option still on offer, so the result is always
 * a consistent game.
 */
export function applyPatch(settings: Settings, step: Step, patchIn: Patch): Settings {
  const patch = repairPatch(step, patchIn, settings);
  if (!patch) return settings;
  const next: Settings = { ...settings, palette: { ...settings.palette }, hero: { ...settings.hero } };
  // The amount of light before the twist had its say.
  let light = settings.twist === 'fewer-lights' ? Math.min(1, settings.lightDensity * 2) : settings.lightDensity;

  if (step === 'mood' && patch.mood) {
    const preset = MOOD_PRESETS[patch.mood];
    next.mood = patch.mood;
    next.palette = { ...(patch.palette ?? preset.palette) };
    next.hero.colour = preset.heroColour;
    next.lights = [...(patch.lights ?? preset.lights)];
    next.weather = patch.weather ?? 'none';
    light = patch.lightDensity ?? preset.lightDensity;
    // A new mood can take a monster pack off the table.
    const packs = premadeCards('monsters', next);
    const pack = Object.keys(PACKS).find((id) => sameSet(PACKS[id].enemies, next.enemies));
    if (pack && !packs.some((card) => card.id === pack)) next.enemies = [...(packs[0].patch.enemies ?? next.enemies)];
  } else if (step === 'world' && patch.scenery) {
    next.world = patch.world ?? worldFor(patch.scenery);
    next.scenery = copyScenery(patch.scenery);
  } else if (step === 'monsters' && patch.enemies) {
    next.enemies = [...patch.enemies];
    next.creatures = (patch.creatures ?? []).map((creature) => ({ ...creature }));
    if (patch.difficulty) next.difficulty = patch.difficulty;
  } else if (step === 'weapon' && patch.weapon) {
    next.weapon = { ...patch.weapon };
  } else if (step === 'twist' && patch.twist) {
    next.twist = patch.twist;
  } else if (step === 'story' && patch.story) {
    next.story = patch.story;
  }

  if (!twistsFor(next).includes(next.twist)) next.twist = 'none';
  if (!storiesFor(next).includes(next.story)) next.story = 'flower';
  next.lightDensity = next.twist === 'fewer-lights' ? light / 2 : light;
  next.title = makeTitle(next.mood, next.world, next.seed);
  next.intro = makeIntro(next.mood, next.seed);
  return repairSettings(next);
}

/** Apply one of our own cards by its id. An id that is not on offer changes nothing. */
export function applyChoice(settings: Settings, step: Step, id: string): Settings {
  const card = premadeCards(step, settings).find((candidate) => candidate.id === id);
  return card ? applyPatch(settings, step, card.patch) : settings;
}

// ---- naming what the settings hold -------------------------------------------------

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item) => b.includes(item));
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const sceneryKinds = (pieces: readonly SceneryPiece[]): SceneryKind[] => pieces.map((piece) => piece.kind);
const ENEMY_NAMES: Record<Enemy, string> = { crawler: 'Crawlers', thorn: 'Thorns', flyer: 'Flyers', stalker: 'Stalkers', watcher: 'Watchers' };

/** Everything that hunts him in these settings, by name: the named monsters, then the described ones. */
function castNames(settings: Settings): string[] {
  return [...settings.enemies.map((enemy) => ENEMY_NAMES[enemy]), ...settings.creatures.map((creature) => creature.name)];
}

/** Which of our own cards these settings hold at a step. Undefined when they match none. */
export function choiceOf(step: Step, settings: Settings): string | undefined {
  switch (step) {
    case 'mood':
      return settings.mood;
    case 'world':
      return WORLDS.find((world) => sameSet(sceneryKinds(WORLD_SCENERY[world]), sceneryKinds(settings.scenery)));
    case 'monsters':
      return Object.keys(PACKS).find((id) => sameSet(PACKS[id].enemies, settings.enemies));
    case 'weapon':
      if (settings.weapon.kind === 'none') return 'none';
      return settings.weapon.name === WEAPON_PRESETS[settings.weapon.look].name ? settings.weapon.look : undefined;
    case 'twist':
      return settings.twist;
    case 'story':
      return settings.story;
  }
}

/** The name of the current choice of a step, for display. Works for cards that were not ours too. */
export function choiceLabel(step: Step, settings: Settings): string {
  switch (step) {
    case 'mood':
      return MOOD_CARDS[settings.mood].label;
    case 'world': {
      const world = choiceOf('world', settings) as World | undefined;
      return world ? WORLD_CARDS[world].label : capital(sceneryKinds(settings.scenery).slice(0, 2).join(', '));
    }
    case 'monsters': {
      const pack = choiceOf('monsters', settings);
      if (pack) return PACKS[pack].label;
      const names = castNames(settings);
      return names.length > 2 ? `${names.length} monsters` : names.join(', ');
    }
    case 'weapon':
      return settings.weapon.name;
    case 'twist':
      return TWIST_CARDS[settings.twist].label;
    case 'story':
      return STORY_CARDS[settings.story].label;
  }
}

/**
 * One plain line that says what a step now holds, so the player can see a written wish
 * was understood: "Buildings, houses, fences", "Bow, shoots far", "Calm".
 */
export function understood(step: Step, settings: Settings): string {
  switch (step) {
    case 'world':
      return capital(sceneryKinds(settings.scenery).join(', '));
    case 'monsters':
      return castNames(settings).join(', ');
    case 'mood':
      return settings.weather === 'none' ? MOOD_CARDS[settings.mood].label : `${MOOD_CARDS[settings.mood].label}, ${settings.weather}`;
    case 'weapon': {
      const { name, kind } = settings.weapon;
      return kind === 'none' ? name : `${name}, ${kind === 'ranged' ? 'shoots far' : kind === 'thrown' ? 'thrown' : 'close up'}`;
    }
    default:
      return choiceLabel(step, settings);
  }
}

/** "Surprise me": fill every step at random, in order, so each pick is one that was on offer. */
export function surprise(seed: number, rng: () => number = Math.random): Settings {
  let settings = repairSettings({ seed });
  for (const step of STEPS) {
    const cards = premadeCards(step, settings);
    settings = applyPatch(settings, step, cards[Math.floor(rng() * cards.length)].patch);
  }
  return settings;
}

/** A new seed for a new game. */
export function randomSeed(rng: () => number = Math.random): number {
  return Math.floor(rng() * 1_000_000);
}
