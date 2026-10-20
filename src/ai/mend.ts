// The AI's reading of a wish, checked against the words themselves. A model that is mostly right
// still slips: asked for "a dragon" it gave a crawler (live, 19 Oct), asked for "dragons" a fireball
// weapon, asked for "a frying pan" a monster. When the wish names something plainly and the answer
// ignored it, the answer is mended from our own reading; when there is no answer at all, our own
// reading is the answer, and when even that finds nothing, a stand-in in the player's own words.
// Pure: no browser, no server.

import { beastFor } from '../game/beasts';
import type { Patch, Step } from '../settings/options';
import type { Creature, Weapon, WeaponKind } from '../settings/schema';
import type { WishPart } from './protocol';
import { beastName, beastsIn, creatureFor, headBeast, readStepWish, readWish, soundsAlive, standIn, tidy, weaponWord, withoutWeapons } from './wish';

export interface Mended {
  parts: WishPart[];
  /** Our own words changed or replaced what the AI said. */
  mended: boolean;
  /** Nothing usable came from the AI: the parts are our own reading. */
  local: boolean;
}

/** Words that say a thing fires, and that it is thrown: a weapon may be of that kind whatever our word for it says. */
const SHOOTS = /\b(shoot|shoots|shooting|fires?|firing|blasts?|laser|lasers|beam|zaps?|spray|sprays)\b/;
const THROWS = /\b(throw|throws|throwing|toss|tosses|hurl|hurls)\b/;
/** A weapon a monster carries is the monster's: "a skeleton with a bow" does not arm the hero. */
const CARRIED = /\b(with|holding|wielding|carrying|armed with|has|having)\s+(an?\s+|the\s+|his\s+|her\s+|its\s+|their\s+|my\s+|old\s+)*$/;

/** Kinds of weapon the wish allows: the kind of the word it names, and firing or throwing when it says so. */
function kindsFor(wish: string, ours: Weapon): Set<WeaponKind> {
  const kinds = new Set<WeaponKind>([ours.kind]);
  if (SHOOTS.test(wish)) kinds.add('ranged');
  if (THROWS.test(wish)) kinds.add('thrown');
  return kinds;
}

/** Looks a word decides on its own: "a bazooka" must look like one even when the AI said "gun". */
const STRONG_LOOKS = new Set(['launcher', 'shotgun', 'rifle', 'sling', 'bow', 'spear']);

/** Whether the wish asks for the hero's weapon, rather than describing a monster's. */
function asksWeapon(wish: string, word: string): boolean {
  const at = wish.indexOf(` ${word}`);
  return at >= 0 && !CARRIED.test(wish.slice(0, at + 1));
}

/** A monster with one of our drawings is that drawing, under a name the game reads the same way. */
function fitCreature(creature: Creature, wish: string): Creature {
  const beast = headBeast(creature.name);
  if (!beast) return creature;
  let fitted = creature;
  // "Giant robot" would be drawn as the troll (the first drawing whose words it has): named for the robot instead.
  if (beastFor(creature.name)?.key !== beast.key) fitted = { ...fitted, name: beastName(beast.key) };
  // It gets about the way the animal does (19 Oct: a dragon came back walking), unless the wish said otherwise.
  const saysHow = /\b(walk|walks|walking|fly|flies|flying|float|floats|crawl|crawls|hop|hops|jump|jumps|still|swim|swims)\b/.test(wish);
  if (!saysHow && (fitted.body !== beast.blocks.body || fitted.move !== beast.blocks.move)) fitted = { ...fitted, body: beast.blocks.body, move: beast.blocks.move };
  return fitted;
}

const onlyOpen = (parts: readonly WishPart[], locked: ReadonlySet<Step>) => parts.filter((part) => !locked.has(part.step));

/**
 * Check what the AI read in a wish against the words, and mend it.
 * `step` is where the player wrote it; `either` that it is a change to the weapon or the monsters of a game
 * being played. Steps in `locked` are never touched. The weapon and the monsters are only checked where the
 * player could be asking about them: at their own step, or in a change.
 */
export function mendWish(text: string, step: Step, aiParts: readonly WishPart[], locked: ReadonlySet<Step>, either = false): Mended {
  const wish = tidy(text);
  const checkMonsters = !locked.has('monsters') && (either || step === 'monsters');
  const checkWeapon = !locked.has('weapon') && (either || step === 'weapon');
  let parts = onlyOpen(aiParts, locked).map((part) => ({ step: part.step, patch: { ...part.patch } }));
  const named = beastsIn(withoutWeapons(wish));
  const word = weaponWord(wish);
  const ours = readStepWish('weapon', text)?.weapon;
  const wantsWeapon = !!ours && (ours.kind === 'none' || (!!word && asksWeapon(wish, word.word)));

  // No usable answer: our own reading, and a stand-in when it found nothing.
  if (parts.length === 0) {
    parts = onlyOpen(readWish(text, step), locked);
    // "A skeleton with a bow" is a skeleton: the bow is his, not the hero's.
    if (named.length > 0 && !wantsWeapon && (either || step !== 'weapon')) parts = parts.filter((part) => part.step !== 'weapon');
    if (parts.length === 0) {
      const target = either ? (soundsAlive(text) ? 'monsters' : 'weapon') : step === 'weapon' || step === 'monsters' ? step : undefined;
      const made = target && !locked.has(target) ? standIn(text, target) : undefined;
      if (made) parts = [made];
    }
    return { parts: parts.map((part) => (part.step === 'monsters' ? fitMonsters(part, wish) : part)), mended: false, local: true };
  }

  let mended = false;
  const find = (name: Step) => parts.find((part) => part.step === name);

  // The wrong thing: a weapon for "dragons", a monster for "a frying pan".
  if (checkMonsters && checkWeapon) {
    if (find('weapon') && !find('monsters') && named.length > 0 && !wantsWeapon) {
      parts = parts.filter((part) => part.step !== 'weapon');
      mended = true;
    }
    if (find('monsters') && !find('weapon') && named.length === 0 && (wantsWeapon || (!soundsAlive(text) && !readStepWish('monsters', text)))) {
      parts = parts.filter((part) => part.step !== 'monsters');
      const weapon = ours ? { step: 'weapon' as const, patch: { weapon: ours } } : standIn(text, 'weapon');
      if (weapon) parts.push(weapon);
      mended = true;
    }
  }

  // The monsters: every one of ours the wish names must be there, drawn as ours.
  if (checkMonsters && named.length > 0) {
    const part = find('monsters');
    const creatures = (part?.patch.creatures ?? []).map((creature) => fitCreature(creature, wish));
    for (const beast of named) {
      if (creatures.some((creature) => headBeast(creature.name)?.key === beast.key)) continue;
      const own = creatureFor(beast, wish);
      // A monster the AI made up for it ("Shambler" for slow zombies) keeps its numbers, under our drawing.
      const stray = creatures.findIndex((creature) => !headBeast(creature.name));
      if (stray >= 0 && named.length === 1) {
        const { recipe: _drawing, ...kept } = creatures[stray];
        creatures[stray] = { ...kept, name: own.name, body: own.body, move: own.move };
      } else creatures.push(own);
      mended = true;
    }
    const patch: Patch = { ...part?.patch, enemies: part?.patch.enemies ?? [], creatures: creatures.slice(0, 3) };
    parts = [...parts.filter((one) => one.step !== 'monsters'), { step: 'monsters', patch }];
  } else if (checkMonsters && find('monsters')) {
    parts = parts.map((part) => (part.step === 'monsters' ? fitMonsters(part, wish) : part));
  }

  // The weapon: the kind and the look the word names.
  if (checkWeapon && ours && wantsWeapon) {
    const part = find('weapon');
    const theirs = part?.patch.weapon;
    const wrongKind = theirs && !kindsFor(wish, ours).has(theirs.kind);
    const wrongLook = theirs && STRONG_LOOKS.has(ours.look) && theirs.look !== ours.look && !theirs.recipe && theirs.kind === ours.kind;
    if (!theirs || wrongKind || wrongLook) {
      parts = [...parts.filter((one) => one.step !== 'weapon'), { step: 'weapon', patch: { weapon: ours } }];
      mended = true;
    }
  }

  return { parts, mended, local: false };
}

/** Every creature of a monsters part, drawn as ours where it can be. */
function fitMonsters(part: WishPart, wish: string): WishPart {
  const creatures = part.patch.creatures?.map((creature) => fitCreature(creature, wish));
  return creatures ? { step: part.step, patch: { ...part.patch, creatures } } : part;
}

/** A note about what could not be built is dropped when we built it after all ("dragons", and here is a dragon). */
export function stillMissed(missed: string, parts: readonly WishPart[]): string {
  if (!missed) return '';
  const built = parts.flatMap((part) => part.patch.creatures ?? []).map((creature) => headBeast(creature.name)?.key);
  return beastsIn(missed).some((beast) => built.includes(beast.key)) ? '' : missed;
}
