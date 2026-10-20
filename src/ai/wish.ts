// The local reading of a wish: plain keyword matching, no AI. It is what the maker uses
// when the server is missing, slow or failing, so "a town" still gives buildings and
// "a bow" still gives a ranged weapon. It returns a patch per step (see options.ts);
// steps the wish says nothing about are left out.
// Pure: no browser, no server.

import { BEASTS, type Beast } from '../game/beasts';
import { WEAPON_PRESETS } from '../settings/defaults';
import type { Patch, Step } from '../settings/options';
import { STEPS } from '../settings/options';
import type { Attack, Body, Creature, Enemy, Mood, MoveOf, SceneryKind, SceneryPiece, Twist, WeaponLook, Weather } from '../settings/schema';

// A word matches when the wish has a word that starts with it ("haunt" matches "haunted").
// A word that ends in a space must match exactly ("bat " does not match "battle").
const MOOD_WORDS: Record<Mood, readonly string[]> = {
  calm: ['calm', 'quiet', 'peace', 'gentle', 'relax', 'soft', 'slow', 'sleep', 'chill', 'cozy', 'cosy', 'still', 'dream', 'moon', 'lamp'],
  happy: ['happy', 'fun', 'cheer', 'cute', 'joy', 'bright', 'sunny', 'warm', 'colour', 'color', 'sweet', 'friend', 'silly', 'pink', 'glad', 'party'],
  eerie: ['scary', 'scare', 'spook', 'creep', 'eerie', 'haunt', 'ghost', 'horror', 'swamp', 'fog', 'mist', 'whisper', 'dread', 'nightmare', 'green', 'firefl', 'witch', 'dark'],
  fierce: ['fierce', 'fire', 'angry', 'rage', 'battle', 'fight', 'war ', 'red ', 'burn', 'ember', 'lava', 'brutal', 'intense', 'boss', 'blood', 'storm', 'fast'],
};

const ENEMY_WORDS: Record<Enemy, readonly string[]> = {
  crawler: ['crawl', 'bug', 'spider', 'insect', 'beetle', 'worm', 'rat '],
  thorn: ['thorn', 'plant', 'vine', 'bramble', 'cactus', 'spike'],
  flyer: ['fly ', 'flies ', 'flying', 'flyer', 'bat ', 'bats ', 'bird', 'wing', 'swoop', 'crow'],
  stalker: ['stalk', 'long arm', 'tall monster', 'tall creature', 'tall thing', 'slender', 'chase', 'hunter'],
  watcher: ['watch', 'eye', 'stare', 'spy '],
};
const ALL_ENEMIES: Enemy[] = ['crawler', 'thorn', 'flyer', 'stalker', 'watcher'];

const SCENERY_WORDS: Record<Exclude<SceneryKind, 'custom'>, readonly string[]> = {
  buildings: ['town', 'city', 'cities', 'building', 'skyscraper', 'street', 'urban', 'apartment', 'rooftop', 'downtown', 'skyline'],
  houses: ['house', 'village', 'home', 'cottage', 'hut', 'cabin'],
  towers: ['tower', 'castle', 'fortress', 'lighthouse', 'spire'],
  ruins: ['ruin', 'temple', 'ancient', 'abandon', 'grave', 'tomb', 'broken wall'],
  trees: ['tree', 'forest', 'wood ', 'woods', 'jungle', 'grove', 'pine', 'swamp', 'marsh'],
  mountains: ['mountain', 'hill', 'cliff', 'peak', 'valley'],
  bridges: ['bridge', 'river', 'shore', 'sea ', 'lake', 'harbour', 'harbor', 'dock', 'pier', 'beach', 'ocean', 'canal'],
  fences: ['fence', 'farm', 'field', 'yard', 'garden'],
  dunes: ['desert', 'dune', 'sand', 'sahara'],
  cacti: ['cactus', 'cacti', 'dry ', 'dead tree', 'wasteland'],
};

/**
 * Words for a weapon: the shape we draw it with, and what to call it when the word is not our own name.
 * The first word in this list that the wish has wins, so things of two words come first ("a laser gun"
 * is not just a gun, "a baseball bat" is not a bat). Words in other languages give our own name.
 */
const WEAPON_WORDS: readonly [string, WeaponLook, string?][] = [
  ['frying pan', 'hammer', 'Frying pan'],
  ['baseball bat', 'club', 'Baseball bat'],
  ['cricket bat', 'club', 'Cricket bat'],
  ['rolling pin', 'club', 'Rolling pin'],
  ['throwing kni', 'stone', 'Throwing knives'],
  ['throwing star', 'stone', 'Throwing stars'],
  ['throwing axe', 'stone', 'Throwing axes'],
  ['shuriken', 'stone', 'Shuriken'],
  ['boomerang', 'stone', 'Boomerang'],
  ['grenade', 'stone', 'Grenades'],
  ['fireball', 'stone', 'Fireballs'],
  ['laser gun', 'gun', 'Laser gun'],
  ['ray gun', 'gun', 'Ray gun'],
  ['water gun', 'gun', 'Water gun'],
  ['nail gun', 'gun', 'Nail gun'],
  ['machine gun', 'gun', 'Machine gun'],
  ['minigun', 'gun', 'Minigun'],
  ['flamethrower', 'gun', 'Flamethrower'],
  ['flame thrower', 'gun', 'Flamethrower'],
  ['magic wand', 'bow', 'Magic wand'],
  ['lightsaber', 'sword', 'Lightsaber'],
  ['light saber', 'sword', 'Lightsaber'],
  ['chainsaw', 'axe', 'Chainsaw'],
  ['scythe', 'axe', 'Scythe'],
  ['sickle', 'axe', 'Sickle'],
  ['crowbar', 'club', 'Crowbar'],
  ['umbrella', 'staff', 'Umbrella'],
  ['broom', 'staff', 'Broom'],
  ['shovel', 'staff', 'Shovel'],
  ['whip', 'staff', 'Whip'],
  ['guitar', 'club', 'Guitar'],
  ['baguette', 'club', 'Baguette'],
  ['pan ', 'hammer', 'Pan'],
  ['pans ', 'hammer', 'Pans'],
  // Other languages, after accents are taken off: Spanish, French, German, Italian, Portuguese.
  ['lanzacohetes', 'launcher', 'Rocket launcher'],
  ['escopeta', 'shotgun'],
  ['fusil', 'rifle'],
  ['pistola', 'pistol'],
  ['pistole', 'pistol'],
  ['arco ', 'bow'],
  ['arc ', 'bow'],
  ['bogen', 'bow'],
  ['arbalete', 'bow', 'Crossbow'],
  ['ballesta', 'bow', 'Crossbow'],
  ['espada', 'sword'],
  ['epee', 'sword'],
  ['schwert', 'sword'],
  ['spada', 'sword'],
  ['cuchillo', 'knife'],
  ['couteau', 'knife'],
  ['messer', 'knife'],
  ['coltello', 'knife'],
  ['hacha', 'axe'],
  ['hache', 'axe'],
  ['axt ', 'axe'],
  ['lanza', 'spear'],
  ['martillo', 'hammer'],
  ['marteau', 'hammer'],
  ['hammer', 'hammer'],
  ['crossbow', 'bow', 'Crossbow'],
  ['bow ', 'bow'],
  ['bows ', 'bow'],
  ['arrow', 'bow'],
  ['archer', 'bow'],
  ['bazooka', 'launcher', 'Bazooka'],
  ['bazoka', 'launcher', 'Bazooka'],
  ['bazuka', 'launcher', 'Bazooka'],
  ['rocket', 'launcher', 'Rocket launcher'],
  ['rpg', 'launcher', 'RPG'],
  ['launcher', 'launcher', 'Launcher'],
  ['missile', 'launcher', 'Missile launcher'],
  ['gun', 'gun'],
  ['pistol', 'pistol'],
  ['rifle', 'rifle'],
  ['sniper', 'rifle', 'Sniper rifle'],
  ['revolver', 'pistol', 'Revolver'],
  ['shotgun', 'shotgun'],
  ['knife', 'knife'],
  ['knives', 'knife', 'Knives'],
  ['hammer', 'hammer'],
  ['pencil', 'pen', 'Pencil'],
  ['pen ', 'pen'],
  ['pens ', 'pen'],
  ['laser', 'gun', 'Laser'],
  ['blaster', 'gun', 'Blaster'],
  ['cannon', 'gun', 'Cannon'],
  ['wand', 'bow', 'Wand'],
  ['slingshot', 'sling', 'Slingshot'],
  ['sling', 'sling'],
  ['catapult', 'sling', 'Catapult'],
  ['snowball', 'stone', 'Snowballs'],
  ['bomb', 'stone', 'Bombs'],
  ['stone', 'stone'],
  ['rock ', 'stone'],
  ['rocks ', 'stone'],
  ['throw', 'stone'],
  ['trident', 'spear', 'Trident'],
  ['lance', 'spear', 'Lance'],
  ['pike', 'spear', 'Pike'],
  ['spear', 'spear'],
  ['hatchet', 'axe', 'Hatchet'],
  ['axe', 'axe'],
  ['ax ', 'axe'],
  ['hammer', 'club', 'Hammer'],
  ['mace', 'club', 'Mace'],
  ['club', 'club'],
  ['staff', 'staff'],
  ['stick', 'staff', 'Stick'],
  ['pole', 'staff', 'Pole'],
  ['knife', 'dagger', 'Knife'],
  ['knives', 'dagger', 'Knives'],
  ['dagger', 'dagger'],
  ['katana', 'sword', 'Katana'],
  ['sabre', 'sword', 'Sabre'],
  ['saber', 'sword', 'Saber'],
  ['sword', 'sword'],
];
const NO_WEAPON_WORDS = ['nothing ', 'none ', 'want to hide', 'no sword', 'no weapon', 'unarmed', 'bare hand', 'pacifist', 'only hide', 'just hide', 'no fight', 'without a weapon', 'without weapon'];

function has(wish: string, words: readonly string[]): boolean {
  return words.some((word) => wish.includes(` ${word}`));
}

function count(wish: string, words: readonly string[]): number {
  return words.filter((word) => wish.includes(` ${word}`)).length;
}

/**
 * Spaces at both ends, so " word" finds a word start and "word " a word end anywhere. Accents are taken
 * off first ("dragón" is "dragon", not "drag n"), and a few typos are mended (see `mendTypos`).
 */
export const tidy = (text: string) =>
  mendTypos(
    ` ${text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]+/g, ' ')
      .trim()} `,
  );

// ---- typos -------------------------------------------------------------------------------------

/**
 * Long words players ask for by name, which a slip of the finger should not lose ("drgon", "bazzoka").
 * Only words with no common English word one letter away: "rocket" is left out for "pocket", "witch" for "which".
 */
const TYPO_TARGETS = [
  'dragon', 'spider', 'zombie', 'skeleton', 'werewolf', 'vampire', 'scorpion', 'octopus', 'dinosaur', 'scarecrow', 'mushroom', 'cyclops',
  'goblin', 'monster', 'bazooka', 'shotgun', 'crossbow', 'katana', 'slingshot', 'launcher', 'revolver', 'catapult', 'boomerang', 'flamethrower',
];

/** Letters to change, add, drop or swap to turn one word into the other, up to `cap` (then cap + 1). */
function distance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

/** A word of five letters or more that is one slip (two, for long words) from a word we know becomes that word. */
function mendTypos(wish: string): string {
  return wish.replace(/[a-z]{5,}/g, (word) => {
    const stem = word.endsWith('s') ? word.slice(0, -1) : word;
    if (TYPO_TARGETS.includes(stem)) return word;
    for (const target of TYPO_TARGETS) {
      const cap = target.length >= 8 ? 2 : 1;
      if (distance(stem, target, cap) <= cap) return stem === word ? target : `${target}s`;
      if (distance(word, target, cap) <= cap) return target;
    }
    return word;
  });
}

// ---- the monsters we draw ourselves ------------------------------------------------------------

/** Endings a beast's word may carry and still be that word: plurals, and the endings of other languages. */
const ENDINGS = new Set(['', 's', 'es', 'ies', 'e', 'en', 'o', 'a', 'os', 'as', 'er', 'ers', 'y', 'ess', 'i']);

interface Found {
  beast: Beast;
  start: number;
  end: number;
}

/**
 * The monsters we draw ourselves that a text names, in the order it names them, at most `max`.
 * A word must start a word and end one ("ape" is not in "escape", "goo" not in "good"). When two
 * names overlap the longer wins ("vampire bat" is a bat, "hombre lobo" a werewolf), and when one stands
 * right before another it describes it: "a giant robot" is a robot, "a zombie dragon" a dragon.
 */
export function beastsIn(text: string, max = 2): Beast[] {
  const wish = text.startsWith(' ') ? text : tidy(text);
  const found: Found[] = [];
  for (const beast of BEASTS) {
    const all = new RegExp(beast.words.source, 'gi');
    for (const match of wish.matchAll(all)) {
      const start = match.index ?? 0;
      if (wish[start - 1] !== ' ' || match[0].length === 0) continue;
      let end = start + match[0].length;
      const rest = /^[a-z]*/.exec(wish.slice(end))?.[0] ?? '';
      if (!ENDINGS.has(rest)) continue;
      end += rest.length;
      found.push({ beast, start, end });
    }
  }
  // The longest names first, and nothing that overlaps a longer one.
  const kept: Found[] = [];
  for (const one of [...found].sort((a, b) => b.end - b.start - (a.end - a.start))) {
    if (!kept.some((other) => one.start < other.end && other.start < one.end)) kept.push(one);
  }
  kept.sort((a, b) => a.start - b.start);
  const heads = kept.filter((one) => !kept.some((next) => next.start === one.end + 1));
  const beasts: Beast[] = [];
  for (const one of heads) if (!beasts.includes(one.beast)) beasts.push(one.beast);
  return beasts.slice(0, max);
}

/** The one of our drawings a monster's name means, read the way a wish is read. */
export const headBeast = (name: string): Beast | undefined => beastsIn(name, 1)[0];

/** Its name from its drawing's key: "beast-dragon" is a Dragon. */
export const beastName = (key: string) => key.charAt(6).toUpperCase() + key.slice(7);

/** One of our own drawn monsters, as the wish describes it: big or small. */
export function creatureFor(beast: Beast, text: string): Creature {
  const wish = text.startsWith(' ') ? text : tidy(text);
  const size = has(wish, ['giant', 'huge', 'big ', 'enormous', 'massive']) ? 1.45 : has(wish, ['small', 'tiny', 'little']) ? 0.75 : beast.blocks.size;
  return { name: beastName(beast.key), ...beast.blocks, size };
}

function readMood(wish: string): Patch | undefined {
  let best = 0;
  let mood: Mood | undefined;
  for (const candidate of Object.keys(MOOD_WORDS) as Mood[]) {
    const hits = count(wish, MOOD_WORDS[candidate]);
    if (hits > best) {
      best = hits;
      mood = candidate;
    }
  }
  const weather = (Object.keys(WEATHER_WORDS) as Exclude<Weather, 'none'>[]).find((kind) => has(wish, WEATHER_WORDS[kind]));
  // Weather alone is an answer too: it goes with the mood that suits it.
  if (!mood && weather) mood = weather === 'petals' ? 'happy' : weather === 'fog' ? 'eerie' : 'calm';
  if (!mood) return undefined;
  const patch: Patch = { mood };
  if (weather) patch.weather = weather;
  if (has(wish, ['bright', 'sunny', 'well lit', 'lots of light', 'many light'])) patch.lightDensity = 1;
  return patch;
}

function readWorld(wish: string): Patch | undefined {
  const scenery: SceneryPiece[] = [];
  for (const kind of Object.keys(SCENERY_WORDS) as (keyof typeof SCENERY_WORDS)[]) {
    if (!has(wish, SCENERY_WORDS[kind])) continue;
    // "tall", "huge" and the like make the first thing named bigger.
    const big = scenery.length === 0 && has(wish, ['tall', 'huge', 'giant', 'big ', 'high ', 'towering', 'massive']);
    scenery.push({ kind, amount: scenery.length === 0 ? 0.8 : 0.5, size: big ? 1.4 : 1 });
  }
  return scenery.length > 0 ? { scenery: scenery.slice(0, 3) } : undefined;
}

/** The weapon word a wish names first. Undefined when it names none of ours. */
export function weaponWord(text: string): { word: string; look: WeaponLook; name?: string } | undefined {
  const wish = text.startsWith(' ') ? text : tidy(text);
  const found = WEAPON_WORDS.find(([word]) => wish.includes(` ${word}`));
  return found ? { word: found[0], look: found[1], name: found[2] } : undefined;
}

/** A weapon of two words is not a monster: "a baseball bat" has no bat in it, "a machine gun" no robot. */
export function withoutWeapons(wish: string): string {
  let out = wish;
  for (const [word] of WEAPON_WORDS) if (word.includes(' ') && word.trim() === word) out = out.split(` ${word}`).join(' ');
  return out;
}

/**
 * Monsters we draw ourselves (game/beasts.ts), with how each really gets about and fights. Read
 * before anything else, so that with no AI "a dragon" is still a dragon (18 Oct: it became a red night).
 */
function readMonsters(wishIn: string, here: boolean): Patch | undefined {
  const wish = withoutWeapons(wishIn);
  const patch: Patch = {};
  const known = beastsIn(wish);
  const harder = has(wish, ['hard ', 'harder', 'hardest', 'difficult', 'brutal', 'impossible', 'nightmare', 'tough', 'punish', 'many ', 'lots ', 'horde', 'swarm', 'more monster', 'more enem']);
  const easier = has(wish, ['easy', 'easier', 'simple', 'relax', 'gentle', 'beginner', 'few ', 'fewer', 'less monster', 'less enem']);
  if (known.length > 0) {
    return { enemies: [], creatures: known.map((beast) => creatureFor(beast, wish)), ...(harder ? { difficulty: 3 } : {}) };
  }
  if (has(wish, ['all monsters', 'every monster', 'everything', 'the lot', 'chaos', 'lots of monsters', 'many monsters', 'more monster', 'more enem', 'fewer monster', 'less monster', 'monsters harder', 'monsters easier'])) {
    patch.enemies = [...ALL_ENEMIES];
  } else {
    const named = ALL_ENEMIES.filter((enemy) => has(wish, ENEMY_WORDS[enemy]));
    if (named.length > 0) patch.enemies = named;
  }
  // A description rather than a name: build a monster from the blocks it mentions.
  // Away from the monsters step, only a wish that names a creature counts ("a tall thing"),
  // so that "tall buildings" does not grow legs. A named monster is taken as named.
  const described = describeCreature(wish, here && !patch.enemies);
  if (described) {
    patch.creatures = [described];
    patch.enemies ??= [];
  }
  if (!patch.enemies) return undefined;
  if (easier) patch.difficulty = 1;
  if (harder) patch.difficulty = 3;
  return patch;
}

function readWeapon(wish: string): Patch | undefined {
  if (has(wish, NO_WEAPON_WORDS)) return { weapon: { name: 'No weapon', kind: 'none', look: 'sword', reach: 0, speed: 1, power: 1 } };
  const found = weaponWord(wish);
  if (!found) return undefined;
  const weapon = { ...WEAPON_PRESETS[found.look] };
  if (found.name) weapon.name = found.name;
  if (has(wish, ['long ', 'longer', 'far ', 'giant', 'huge'])) weapon.reach = Math.round(weapon.reach * 1.3);
  if (has(wish, ['fast', 'quick', 'rapid'])) weapon.speed = Math.min(2, weapon.speed * 1.4);
  if (has(wish, ['heavy', 'strong', 'mighty', 'powerful', 'big '])) weapon.power = 2;
  return { weapon };
}

// ---- when nothing we know is named ---------------------------------------------------------------

/** Words that say a thing is alive: it is a monster, not something he carries. */
const ALIVE = /\b(legs?|eyes?|teeth|claws?|fangs?|tails?|wings?|horns?|monsters?|creatures?|beasts?|alive|living|walks?|walking|crawls?|crawling|flies|flying|animals?|bites?|chases?|eats?|hunts?|man|men|woman|women|people|person|lady|guy|guys)\b/;
/** Words that start an order, not a thing: "ignore your instructions" is not a weapon. */
const ORDERS = /^(ignore|forget|write|tell|say|reply|print|show|repeat|pretend|act|set|change|delete|disregard|answer|translate|help|stop|start)\b/;
const FILLER = /^(?:(?:please|pls|plz|i|want|wanna|would|like|id|need|give|gimme|me|can|could|get|have|make|it|add|put|use|a|an|the|some|my|our|new|more|few|lots|lot|of|bunch|several|two|three|many|instead|now|just|only)\s+)+/;
const AFTER = /\s(?:with|that|who|which|and|but|to|for|in|on|at|from|of|instead|please|plz|pls|so|or|like)\s.*$/;

/** What a wish names, in its own words, when it is one plain thing: "a toaster with legs" names "Toaster". */
export function thingNamed(text: string, max = 16): string | undefined {
  const wish = tidy(text).trim();
  if (ORDERS.test(wish)) return undefined;
  const thing = ` ${wish} `.replace(AFTER, ' ').trim().replace(FILLER, '').trim();
  const words = thing.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 3 || thing.length < 3) return undefined;
  // A word must look like one: a vowel, and no long run of consonants ("asdfghjkl" is not a thing).
  if (!words.every((word) => /[aeiouy]/.test(word) && !/[^aeiouy]{5,}/.test(word) && word.length >= 2)) return undefined;
  let name = '';
  for (const word of words) {
    const next = name ? `${name} ${word}` : word;
    if (next.length > max) break;
    name = next;
  }
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined;
}

/** Whether a wish speaks of something alive. */
export function soundsAlive(text: string): boolean {
  const wish = withoutWeapons(tidy(text));
  return ALIVE.test(wish) || beastsIn(wish).length > 0;
}

/**
 * Something in the player's own words, built from our closest blocks, for a wish that names nothing we know:
 * "an umbrella" is swung, "a toaster with legs" walks. Only for the weapon and the monsters, and only when the
 * words look like a thing. Undefined otherwise: nonsense stays unclear.
 */
export function standIn(text: string, step: 'weapon' | 'monsters'): { step: Step; patch: Patch } | undefined {
  const wish = tidy(text);
  const name = thingNamed(text);
  if (!name) return undefined;
  if (step === 'weapon') {
    const shoots = has(wish, ['shoot', 'fire', 'fires ', 'blast', 'laser', 'gun', 'ray ', 'beam', 'spray', 'zap']);
    const thrown = has(wish, ['throw', 'toss', 'hurl']);
    const weapon = { ...WEAPON_PRESETS[shoots ? 'gun' : thrown ? 'stone' : 'club'], name };
    if (has(wish, ['heavy', 'big ', 'giant', 'huge', 'strong'])) weapon.power = 2;
    return { step: 'weapon', patch: { weapon } };
  }
  const described = describeCreature(` ${wish.trim()} monster `, true);
  const creature: Creature = described
    ? { ...described, name }
    : { name, body: 'low', move: 'walk', attack: 'charge', size: has(wish, ['giant', 'huge', 'big ']) ? 1.4 : 1, speed: 1, hits: 1, eyes: 2 };
  return { step: 'monsters', patch: { enemies: [], creatures: [creature] } };
}

function readTwist(wish: string): Patch | undefined {
  let twist: Twist | undefined;
  if (has(wish, ['unarmed', 'only hide', 'just hide', 'stealth', 'sneak', 'no fight', 'no sword', 'no weapon'])) twist = 'no-sword';
  else if (has(wish, ['darker', 'darkest', 'very dark', 'really dark', 'pitch black', 'no light', 'few light', 'fewer light', 'less light', 'blind'])) twist = 'fewer-lights';
  else if (has(wish, ['many eyes', 'more watcher', 'lots of eyes', 'everyone watch'])) twist = 'more-watchers';
  else if (has(wish, ['more flower', 'fast flower', 'heal fast', 'many flower', 'lots of flower'])) twist = 'fast-flowers';
  else if (has(wish, ['no twist', 'nothing', 'none', 'normal', 'plain'])) twist = 'none';
  return twist ? { twist } : undefined;
}

const WEATHER_WORDS: Record<Exclude<Weather, 'none'>, readonly string[]> = {
  fog: ['fog', 'mist', 'haze', 'smoke', 'smog'],
  rain: ['rain', 'storm', 'drizzle', 'wet '],
  snow: ['snow', 'blizzard', 'winter', 'frost', 'ice '],
  petals: ['petal', 'blossom', 'confetti', 'falling flower'],
};

const BODY_WORDS: Record<Body, readonly string[]> = {
  tall: ['tall', 'giant', 'huge', 'towering', 'lanky', 'long leg', 'big '],
  flying: ['flying', 'flies ', 'fly ', 'float', 'hover', 'wing', 'ghost', 'drift', 'airborne'],
  low: ['small', 'low ', 'short', 'tiny', 'squat', 'crawling', 'scuttl'],
};
const MOVE_WORDS: Record<MoveOf, readonly string[]> = {
  hop: ['hop', 'jump', 'bounc', 'leap'],
  float: ['float', 'hover', 'drift', 'ghost'],
  fly: ['flying', 'flies ', 'fly ', 'wing'],
  still: ['still', 'rooted', 'statue', 'does not move', 'never moves', 'stays put'],
  walk: ['walk', 'stomp', 'march', 'shuffl'],
};
const ATTACK_WORDS: Record<Attack, readonly string[]> = {
  beam: ['beam', 'searchlight', 'spotlight', 'stare', 'gaze', 'laser eye'],
  spit: ['spit', 'shoot', 'throws', 'fires ', 'acid', 'venom'],
  swoop: ['swoop', 'dive', 'pounce from'],
  reach: ['long arm', 'reach', 'grab', 'tentacle', 'claw'],
  charge: ['charge', 'rush', 'ram ', 'runs at', 'fast'],
  touch: ['slow', 'shambl', 'zombie', 'blob', 'slime'],
};
/** Words that say "this is a monster of my own", and what to call it. */
const CREATURE_NOUNS = ['thing', 'monster', 'creature', 'beast', 'ghost', 'robot', 'dragon', 'zombie', 'demon', 'blob', 'slime', 'spirit', 'alien', 'golem', 'wolf', 'shadow'];

function describeCreature(wish: string, lenient: boolean): Creature | undefined {
  const find = <T extends string>(table: Record<T, readonly string[]>) => (Object.keys(table) as T[]).find((key) => has(wish, table[key]));
  const body = find(BODY_WORDS);
  const move = find(MOVE_WORDS);
  const attack = find(ATTACK_WORDS);
  const noun = CREATURE_NOUNS.find((word) => wish.includes(` ${word}`));
  const eyes = has(wish, ['one eye', 'single eye', 'cyclops']) ? 1 : has(wish, ['three eye', 'many eye', 'lots of eyes', 'eyes everywhere']) ? 3 : has(wish, ['two eye']) ? 2 : undefined;
  // Something has to be said about it: a noun alone ("monsters") is not a description.
  if (!body && !move && !attack && eyes === undefined) return undefined;
  if (!noun && !lenient) return undefined;
  const airborne = move === 'fly' || move === 'float' || body === 'flying';
  const shape: Body = airborne ? 'flying' : body ?? 'low';
  const name = noun && noun !== 'thing' && noun !== 'monster' && noun !== 'creature' ? noun : shape === 'tall' ? 'tall thing' : shape === 'flying' ? 'floating thing' : 'low thing';
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    body: shape,
    move: airborne ? (move === 'float' ? 'float' : 'fly') : move ?? 'walk',
    attack: attack ?? (airborne ? 'swoop' : shape === 'tall' ? 'reach' : 'charge'),
    size: has(wish, ['giant', 'huge', 'towering', 'big ']) ? 1.4 : has(wish, ['small', 'tiny']) ? 0.75 : 1,
    speed: has(wish, ['fast', 'quick']) ? 1.3 : has(wish, ['slow']) ? 0.7 : 1,
    hits: has(wish, ['tough', 'strong', 'armou', 'armor', 'giant', 'huge']) ? 3 : 1,
    eyes: eyes ?? 2,
  };
}

/** How it ends: home, a hunt, or the flower. */
function readStory(wish: string): Patch | undefined {
  if (has(wish, ['home', 'escape', 'way out', 'get out', 'survive', 'live', 'family', 'door', 'return'])) return { story: 'home' };
  if (has(wish, ['hunt', 'kill them all', 'defeat all', 'every monster', 'all the monsters', 'beat them all', 'clear', 'revenge'])) return { story: 'hunt' };
  if (has(wish, ['plant', 'flower', 'bury', 'grave', 'sacrifice', 'head'])) return { story: 'flower' };
  return undefined;
}

const READERS: Record<Step, (wish: string, here: boolean) => Patch | undefined> = {
  mood: readMood,
  world: readWorld,
  monsters: readMonsters,
  weapon: readWeapon,
  twist: readTwist,
  story: readStory,
};

/** What a wish says about one step. Undefined when it says nothing we know about that step. */
export function readStepWish(step: Step, text: string, here = true): Patch | undefined {
  const wish = tidy(text);
  return wish.trim() === '' ? undefined : READERS[step](wish, here);
}

/** What a wish says, step by step. The step the player is at comes first. */
export function readWish(text: string, at?: Step): { step: Step; patch: Patch }[] {
  const order = at ? [at, ...STEPS.filter((step) => step !== at)] : [...STEPS];
  const parts: { step: Step; patch: Patch }[] = [];
  for (const step of order) {
    const patch = readStepWish(step, text, at === undefined || step === at);
    if (patch) parts.push({ step, patch });
  }
  // "no sword" names both a weapon and a twist. The weapon is the plainer reading.
  if (parts.some((part) => part.step === 'weapon' && part.patch.weapon?.kind === 'none')) {
    return parts.filter((part) => !(part.step === 'twist' && part.patch.twist === 'no-sword'));
  }
  return parts;
}
