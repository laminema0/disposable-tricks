// The maker's questions [Amin, 17 and 18 Oct]. Only two now: what he carries, and what he meets.
// Each has four options and a fifth, written answer; anything written is made by the AI, so a player
// can have any weapon and any monster. The night and the place are chosen by the game, from the seed.
// The older questions (night, place, look) are kept below for links and tests, but no longer asked.
// Pure: no browser, no game engine.

import { WEAPON_PRESETS } from './defaults';
import { applyPatch, STEP_LABELS, type Patch, type Step } from './options';
import { MOODS, WORLDS, type Enemy, type Mood, type Settings, type Weapon, type World } from './schema';
import { repairSettings } from './validate';

export interface TreeOption {
  id: string;
  /** Short, on one line. */
  label: string;
  /** One short line. */
  detail: string;
  /** What choosing it does to the game. */
  apply(settings: Settings): Settings;
}

export interface Question {
  id: string;
  /** The name of what it decides, for the list of answers: Night, Place, Monsters, Weapon, Look. */
  name: string;
  ask: string;
  /** The words in the written fifth answer. */
  write: string;
  /** The part of the game a written answer may change. `look` is read by the maker itself. */
  step: Step | 'look';
  options: TreeOption[];
}

const stepOption = (id: string, label: string, detail: string, step: Step, patch: Patch): TreeOption => ({
  id,
  label,
  detail,
  apply: (settings) => applyPatch(settings, step, patch),
});

// ---- 1. the night ------------------------------------------------------------------------------

const NIGHTS: Record<Mood, { label: string; detail: string }> = {
  calm: { label: 'Calm', detail: 'Navy night, warm lamps' },
  happy: { label: 'Bright', detail: 'Plum dusk, in colour' },
  eerie: { label: 'Eerie', detail: 'Green dark, fireflies' },
  fierce: { label: 'Fierce', detail: 'Ember red, hard light' },
};

function night(): Question {
  return {
    id: 'night',
    name: 'Night',
    ask: 'What kind of night?',
    write: 'Or write the air',
    step: 'mood',
    options: MOODS.map((mood) => stepOption(mood, NIGHTS[mood].label, NIGHTS[mood].detail, 'mood', { mood })),
  };
}

// ---- 2. the place: offered in the order that suits the night -----------------------------------

const PLACES: Record<World, { label: string; detail: string }> = {
  forest: { label: 'Forest', detail: 'Trees, far mountains' },
  town: { label: 'Town', detail: 'Houses and streets' },
  ruins: { label: 'Ruins', detail: 'Broken walls, towers' },
  shore: { label: 'Shore', detail: 'Bridges, still water' },
};
const PLACE_ORDER: Record<Mood, World[]> = {
  calm: ['forest', 'town', 'shore', 'ruins'],
  happy: ['town', 'forest', 'shore', 'ruins'],
  eerie: ['ruins', 'forest', 'shore', 'town'],
  fierce: ['ruins', 'town', 'forest', 'shore'],
};
const PLACE_ASK: Record<Mood, string> = {
  calm: 'Where does he walk?',
  happy: 'Where is it brightest?',
  eerie: 'Where is it darkest?',
  fierce: 'What is burning?',
};

function place(mood: Mood): Question {
  return {
    id: `place-${mood}`,
    name: 'Place',
    ask: PLACE_ASK[mood],
    write: 'Or write a place',
    step: 'world',
    options: PLACE_ORDER[mood].map((world) => stepOption(world, PLACES[world].label, PLACES[world].detail, 'world', { world })),
  };
}

// ---- 3. the monsters: who lives in that place ---------------------------------------------------

interface Kind {
  label: string;
  detail: string;
  enemies: Enemy[];
}
const KINDS: Record<string, Kind> = {
  crawler: { label: 'Crawlers', detail: 'Low, they charge', enemies: ['crawler'] },
  thorn: { label: 'Thorns', detail: 'Rooted, they spit', enemies: ['thorn'] },
  flyer: { label: 'Flyers', detail: 'They swoop from above', enemies: ['flyer'] },
  stalker: { label: 'Stalkers', detail: 'Tall, with long arms', enemies: ['stalker'] },
  watcher: { label: 'Watchers', detail: 'One eye, one beam', enemies: ['watcher'] },
  all: { label: 'All five', detail: 'Every kind, harder', enemies: ['crawler', 'thorn', 'flyer', 'stalker', 'watcher'] },
};
const LIVES_IN: Record<World, { ask: string; kinds: string[] }> = {
  forest: { ask: 'What lives in the trees?', kinds: ['crawler', 'thorn', 'flyer', 'all'] },
  town: { ask: 'What walks the streets?', kinds: ['stalker', 'watcher', 'crawler', 'all'] },
  ruins: { ask: 'What waits in the ruins?', kinds: ['watcher', 'stalker', 'thorn', 'all'] },
  shore: { ask: 'What comes from the water?', kinds: ['flyer', 'crawler', 'watcher', 'all'] },
};

function monsters(world: World): Question {
  const here = LIVES_IN[world];
  return {
    id: `monsters-${world}`,
    name: 'Monsters',
    ask: here.ask,
    write: 'Or describe a monster',
    step: 'monsters',
    options: here.kinds.map((id) => {
      const kind = KINDS[id];
      // "All five" also makes the road harder.
      return stepOption(id, kind.label, kind.detail, 'monsters', id === 'all' ? { enemies: kind.enemies, difficulty: 3 } : { enemies: kind.enemies });
    }),
  };
}

// ---- 4. what he carries: it follows from how the monsters come at him ---------------------------

type Reach = 'near' | 'far' | 'mixed';
/** Monsters that come from above or watch from afar are met at range; the others up close. */
export function reachFor(enemies: readonly Enemy[]): Reach {
  const far = enemies.filter((enemy) => enemy === 'flyer' || enemy === 'watcher').length;
  if (far === 0) return 'near';
  return far === enemies.length ? 'far' : 'mixed';
}
const named = (look: keyof typeof WEAPON_PRESETS, name?: string): Weapon => ({ ...WEAPON_PRESETS[look], name: name ?? WEAPON_PRESETS[look].name });
const ARMS: Record<Reach, { ask: string; weapons: { id: string; weapon: Weapon; detail: string }[] }> = {
  near: {
    ask: 'They come close. What does he carry?',
    weapons: [
      { id: 'knife', weapon: named('knife'), detail: 'Short reach, very quick' },
      { id: 'sword', weapon: named('sword'), detail: 'A lunge and a slash' },
      { id: 'spear', weapon: named('spear'), detail: 'Long reach, a bit slow' },
      { id: 'hammer', weapon: named('hammer'), detail: 'Slow, hits twice as hard' },
    ],
  },
  far: {
    ask: 'They come from above. What does he carry?',
    weapons: [
      { id: 'bow', weapon: named('bow'), detail: 'Arrows from far away' },
      { id: 'rifle', weapon: named('rifle'), detail: 'Slow, far and hard' },
      { id: 'shotgun', weapon: named('shotgun'), detail: 'Five shots in a fan' },
      { id: 'sling', weapon: named('sling'), detail: 'Stones in an arc' },
    ],
  },
  // Amin's own four.
  mixed: {
    ask: 'What does he carry?',
    weapons: [
      { id: 'knife', weapon: named('knife'), detail: 'Short reach, very quick' },
      { id: 'gun', weapon: named('pistol', 'Gun'), detail: 'Quick shots, far away' },
      { id: 'sword', weapon: named('sword'), detail: 'A lunge and a slash' },
      { id: 'stone', weapon: named('stone'), detail: 'Thrown by hand' },
    ],
  },
};

function weapon(reach: Reach): Question {
  return {
    id: `weapon-${reach}`,
    name: 'Weapon',
    ask: ARMS[reach].ask,
    write: 'Or write a weapon',
    step: 'weapon',
    options: ARMS[reach].weapons.map(({ id, weapon: w, detail }) => stepOption(id, w.name, detail, 'weapon', { weapon: w })),
  };
}

// ---- 5. how he looks ----------------------------------------------------------------------------------

export const LOOKS: { id: string; label: string; detail: string; cape: boolean; colour: boolean }[] = [
  { id: 'grey-cape', label: 'Grey, cape', detail: 'Dark grey, long cape', cape: true, colour: false },
  { id: 'grey', label: 'Grey, no cape', detail: 'Dark grey, bare back', cape: false, colour: false },
  { id: 'colour-cape', label: 'Colour, cape', detail: 'His colours, long cape', cape: true, colour: true },
  { id: 'colour', label: 'Colour, no cape', detail: 'His colours, bare back', cape: false, colour: true },
];

function look(settings: Settings): Question {
  const carries = settings.weapon.kind === 'none' ? 'Empty-handed.' : `${settings.weapon.name} in hand.`;
  return {
    id: 'look',
    name: 'Look',
    ask: `${carries} How does he look?`,
    write: 'Or write his look',
    step: 'look',
    options: LOOKS.map((option) => ({
      id: option.id,
      label: option.label,
      detail: option.detail,
      apply: (current) => withLook(current, option.cape, option.colour),
    })),
  };
}

export function withLook(settings: Settings, cape: boolean, colour: boolean): Settings {
  return repairSettings({ ...settings, hero: { cape, colour } });
}

/** A written look, read with our own words: cape or none, grey or colour. Undefined when it names neither. */
export function readLook(text: string, settings: Settings): Settings | undefined {
  const words = text.toLowerCase();
  const noCape = /\b(no|without|lose|drop)\b[^.]*\bcape\b|\bcapeless\b/.test(words);
  const cape = !noCape && /\bcape|cloak\b/.test(words);
  const colour = /\b(colou?r|colou?rful|bright|red|blue|green|yellow|orange|pink|purple|gold)\b/.test(words);
  const grey = /\b(grey|gray|dark|black|plain)\b/.test(words);
  if (!noCape && !cape && !colour && !grey) return undefined;
  return withLook(settings, noCape ? false : cape ? true : settings.hero.cape, colour ? true : grey ? false : settings.hero.colour);
}

// ---- the two questions asked now -------------------------------------------------------------------

/** Every game has all of our monsters (Amin, 18 Oct); this step only adds the player's own, by name. */
function meets(): Question {
  return {
    id: 'meets',
    name: 'Monsters',
    ask: 'All our monsters are there. Add any?',
    write: 'Zombies, a dragon, a giant crab…',
    step: 'monsters',
    options: [],
  };
}

function carries(): Question {
  return { ...weapon('mixed'), id: 'carries', ask: 'What does he carry?', write: 'Or write any weapon' };
}

/** The night and the place, chosen by the game from the seed. */
export function sceneFor(settings: Settings): Settings {
  const seed = settings.seed >>> 0;
  const mood = MOODS[seed % MOODS.length];
  const world = WORLDS[(seed >>> 3) % WORLDS.length];
  const placed = applyPatch(applyPatch(settings, 'mood', { mood }), 'world', { world });
  // The story's world is a dried-out desert that the flowers bring back to life, and every monster we
  // designed lives in it (Amin, 18 Oct).
  // He is always the dark grey boy of the board, his flower his only colour (design research, 19 Oct).
  return repairSettings({ ...placed, scenery: DESERT, enemies: [...KINDS.all.enemies], hero: { cape: true, colour: false } });
}

/** The dry world: dunes far off, cacti and dead trees nearer, a few broken walls. */
export const DESERT = [
  { kind: 'dunes' as const, amount: 0.8, size: 1 },
  { kind: 'cacti' as const, amount: 0.5, size: 1 },
  { kind: 'ruins' as const, amount: 0.25, size: 0.8 },
];

// ---- the path ------------------------------------------------------------------------------------------

export const FIRST = 'carries';
/** How many questions any path asks. */
export const DEPTH = 2;

/** A question by its id, built for the game so far. */
export function question(id: string, settings: Settings): Question {
  if (id === 'carries') return carries();
  if (id === 'meets') return meets();
  if (id === 'night') return night();
  if (id.startsWith('place-')) return place(id.slice(6) as Mood);
  if (id.startsWith('monsters-')) return monsters(id.slice(9) as World);
  if (id.startsWith('weapon-')) return weapon(id.slice(7) as Reach);
  return look(settings);
}

/**
 * What is asked after a question, given the game as it now is. It is read from the game,
 * not from the option, so a written answer leads on just as a tapped one does.
 * Undefined after the last question.
 */
export function nextQuestion(id: string, settings: Settings): string | undefined {
  if (id === 'carries') return 'meets';
  if (id === 'meets') return undefined;
  if (id === 'night') return `place-${settings.mood}`;
  if (id.startsWith('place-')) return `monsters-${settings.world}`;
  if (id.startsWith('monsters-')) return `weapon-${reachFor(settings.enemies)}`;
  if (id.startsWith('weapon-')) return 'look';
  return undefined;
}

/** The answer a question holds in these settings, for the list of answers. */
export function answerLabel(q: Question, settings: Settings): string {
  switch (q.step) {
    case 'mood':
      return NIGHTS[settings.mood].label;
    case 'world':
      return PLACES[settings.world].label;
    case 'monsters': {
      const own = settings.creatures.map((creature) => creature.name);
      if (settings.enemies.length === 5) return own.length > 0 ? `All, and ${own.join(', ')}` : 'All of them';
      const names = [...settings.enemies.map((enemy) => KINDS[enemy].label), ...own];
      return names.length > 2 ? `${names.length} kinds` : names.join(', ');
    }
    case 'weapon':
      return settings.weapon.name;
    case 'look':
      return LOOKS.find((option) => option.cape === settings.hero.cape && option.colour === settings.hero.colour)?.label ?? '';
    default:
      return STEP_LABELS[q.step];
  }
}

/** "Surprise me": a random path through the tree. */
export function surprisePath(settings: Settings, rng: () => number = Math.random): Settings {
  let game = sceneFor(settings);
  for (let id: string | undefined = FIRST; id; id = nextQuestion(id, game)) {
    const options = question(id, game).options;
    if (options.length > 0) game = options[Math.floor(rng() * options.length)].apply(game);
  }
  return game;
}
