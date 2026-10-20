// Share links (brief 5.5). The settings travel in the part of the address after "#".
// Browsers never send that part to a server. Pure: no browser objects are needed.
//
// The form is short and readable, for example:
//   #v=1&m=calm&w=forest&p=17153a.1f1c48.070a14.6b7388.ffd9a0.ffe66d&h=10
//   &l=lamp.water&d=0.5&e=crawler.thorn&g=1&t=none&x=2&s=48213&n=The+Quiet+Lamp+Road&i=Walk+softly.

import { PALETTE_SLOTS, type Creature, type Recipe, type Settings } from './schema';
import { repairSettings } from './validate';

const flag = (on: boolean) => (on ? '1' : '0');
const readFlag = (value: string | null) => (value === '1' ? true : value === '0' ? false : undefined);
const readNumber = (value: string | null) => (value === null || value === '' ? undefined : Number(value));
const readList = (value: string | null) => (value === null ? undefined : value.split('.').filter(Boolean));

const encodeRecipe = (recipe: Recipe) => `${recipe.name}~${recipe.parts.map((part) => [part.t[0], part.x, part.y, part.w, part.h].join('.')).join('_')}`;
const SHAPE_LETTER: Record<string, string> = { b: 'box', c: 'circle', t: 'tri', l: 'line' };
function decodeRecipe(text: string | null): unknown {
  if (!text) return undefined;
  const [name, parts = ''] = text.split('~');
  return {
    name,
    parts: parts.split('_').map((part) => {
      const [t, x, y, w, h] = part.split('.');
      return { t: SHAPE_LETTER[t], x: Number(x), y: Number(y), w: Number(w), h: Number(h) };
    }),
  };
}

// A described monster: "Name.body.move.attack.size.speed.hits.eyes" (sizes in hundredths), then "!" and its recipe if it has one.
const encodeCreature = (c: Creature) =>
  [c.name.replace(/[.!]/g, ' '), c.body, c.move, c.attack, Math.round(c.size * 100), Math.round(c.speed * 100), c.hits, c.eyes].join('.') +
  (c.recipe ? `!${encodeRecipe(c.recipe)}` : '');
function decodeCreature(text: string): unknown {
  const [fields, recipe] = text.split('!');
  const [name, body, move, attack, size, speed, hits, eyes] = fields.split('.');
  return { name, body, move, attack, size: Number(size) / 100, speed: Number(speed) / 100, hits: Number(hits), eyes: Number(eyes), recipe: decodeRecipe(recipe ?? null) };
}

/** The text to put after "#" in a share link. */
export function encodeSettings(settings: Settings): string {
  const s = repairSettings(settings);
  const params = new URLSearchParams();
  params.set('v', String(s.v));
  params.set('m', s.mood);
  params.set('w', s.world);
  params.set('p', PALETTE_SLOTS.map((slot) => s.palette[slot].slice(1)).join('.'));
  params.set('h', flag(s.hero.cape) + flag(s.hero.colour));
  params.set('l', s.lights.join('.'));
  params.set('d', String(s.lightDensity));
  params.set('e', s.enemies.join('.'));
  // Scenery as "buildings-80-100" (amount and size in hundredths), the weapon as "melee.sword.70.100.1".
  params.set('c', s.scenery.map((piece) => `${piece.kind}-${Math.round(piece.amount * 100)}-${Math.round(piece.size * 100)}`).join('.'));
  params.set('k', [s.weapon.kind, s.weapon.look, s.weapon.reach, Math.round(s.weapon.speed * 100), s.weapon.power].join('.'));
  params.set('kn', s.weapon.name);
  if (s.weapon.recipe) params.set('kr', encodeRecipe(s.weapon.recipe));
  // Recipes of custom scenery, in the order of the custom pieces.
  for (const piece of s.scenery) if (piece.recipe) params.append('r', encodeRecipe(piece.recipe));
  for (const creature of s.creatures) params.append('mc', encodeCreature(creature));
  if (s.weather !== 'none') params.set('wx', s.weather);
  if (s.travel !== 'foot') params.set('tr', s.travel);
  if (s.ground !== 'path') params.set('gr', s.ground);
  params.set('g', flag(s.merges));
  params.set('t', s.twist);
  // The first story is the usual one, so it is left out of the link.
  if (s.story !== 'flower') params.set('st', s.story);
  params.set('x', String(s.difficulty));
  params.set('s', String(s.seed));
  params.set('n', s.title);
  params.set('i', s.intro);
  return params.toString();
}

/**
 * Read settings back from the part after "#" (with or without the "#").
 * Returns null when the text is not a share link at all. A damaged link still
 * gives a playable game: the validator repairs whatever is wrong in it.
 */
export function decodeSettings(hash: string): Settings | null {
  const text = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(text);
  if (params.get('v') !== '1' || !params.has('m')) return null;

  const colours = (params.get('p') ?? '').split('.');
  const palette: Record<string, string> = {};
  PALETTE_SLOTS.forEach((slot, i) => {
    if (colours[i]) palette[slot] = `#${colours[i]}`;
  });
  const heroFlags = params.get('h') ?? '';

  const recipes = params.getAll('r');
  const scenery = readList(params.get('c'))?.map((text) => {
    const [kind, amount, size] = text.split('-');
    return { kind, amount: Number(amount) / 100, size: Number(size) / 100, recipe: kind === 'custom' ? decodeRecipe(recipes.shift() ?? null) : undefined };
  });
  const k = readList(params.get('k'));
  const weapon = k && {
    kind: k[0],
    look: k[1],
    reach: Number(k[2]),
    speed: Number(k[3]) / 100,
    power: Number(k[4]),
    name: params.get('kn'),
    recipe: decodeRecipe(params.get('kr')),
  };

  return repairSettings({
    scenery,
    weapon,
    creatures: params.getAll('mc').map(decodeCreature),
    weather: params.get('wx'),
    travel: params.get('tr'),
    ground: params.get('gr'),
    mood: params.get('m'),
    world: params.get('w'),
    palette,
    hero: { cape: readFlag(heroFlags[0] ?? null), colour: readFlag(heroFlags[1] ?? null) },
    lights: readList(params.get('l')),
    lightDensity: readNumber(params.get('d')),
    enemies: readList(params.get('e')),
    merges: readFlag(params.get('g')),
    twist: params.get('t'),
    story: params.get('st') ?? undefined,
    difficulty: readNumber(params.get('x')),
    seed: readNumber(params.get('s')),
    title: params.get('n'),
    intro: params.get('i'),
  });
}

/** A full share link. `pageUrl` is the address of the game page; any old "#..." on it is replaced. */
export function shareLink(pageUrl: string, settings: Settings): string {
  return `${pageUrl.split('#')[0]}#${encodeSettings(settings)}`;
}
