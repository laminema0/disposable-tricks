// What the browser and the server function say to each other. Shared by both sides.
// The player's text travels in the request only. It is never stored and never in a share link.

import { STEPS, type Patch, type Step } from '../settings/options';
import type { Settings } from '../settings/schema';

/**
 * "cards": propose the cards of a step, given the answers so far.
 * "wish":  turn what the player wrote into the settings of one or more steps.
 * "name":  name the finished game and write its one-line intro.
 */
export type Job = 'cards' | 'wish' | 'name' | 'trick';

export interface MakeRequest {
  job: Job;
  /** The step the player is at. Not needed for "name". */
  step?: Step;
  /** The settings so far. The server repairs them before use, like everything from outside. */
  draft: Settings;
  /** For "wish" and "trick": what the player wrote. */
  text?: string;
  /** Only for "trick", on a repair try: the script that failed and what went wrong with it. */
  broken?: { code: string; error: string };
  /**
   * Only for "trick": the game the player is playing now. The wish is then a change to it,
   * and the AI edits this script instead of starting from one of ours.
   */
  base?: string;
  /**
   * Only for "wish": the player is changing a game they already play, and the AI decides whether the words are
   * about the weapon he carries or the monsters he meets.
   */
  either?: boolean;
  seed: number;
}

/** A card as it travels: a name, a line, and the part of the settings it fills in. */
export interface CardProposal {
  label: string;
  detail: string;
  patch: Patch;
}

/** What a wish said about one step. */
export interface WishPart {
  step: Step;
  patch: Patch;
}

export type RefusedReason =
  /** The text did not pass the filter. The player is asked for other words. */
  | 'unsafe'
  | 'bad-request'
  /** No provider answered. The browser uses the pre-made cards and its own reading instead. */
  | 'unavailable'
  /** Too many calls this minute. Same result for the player as "unavailable". */
  | 'busy';

export type MakeResponse =
  | { ok: true; job: 'cards'; step: Step; cards: CardProposal[]; suggest: number | null; from: 'ai' | 'cache' }
  | { ok: true; job: 'wish'; step: Step; parts: WishPart[]; missed: string; from: 'ai' }
  | { ok: true; job: 'name'; title: string; intro: string; from: 'ai' | 'cache' }
  /** A script written for this wish. It is untrusted: the browser checks it and runs it only in the locked frame. */
  | { ok: true; job: 'trick'; code: string; title: string; tokens: number; provider: string; from: 'ai' }
  | { ok: false; reason: RefusedReason };

/** The longest wish we accept. The text field stops at this length too. */
export const WISH_MAX = 160;
/** The longest note about what could not be built. */
export const MISSED_MAX = 40;

/** What the settings hold at one step, as a short key. */
function stepKey(step: Step, draft: Settings): string {
  switch (step) {
    case 'mood':
      return draft.mood;
    case 'world':
      return draft.scenery.map((piece) => piece.kind).join('+');
    case 'monsters':
      return draft.enemies.join('+');
    case 'weapon':
      return `${draft.weapon.kind}-${draft.weapon.look}`;
    case 'twist':
      return draft.twist;
    case 'story':
      return draft.story;
  }
}

/** "eerie>ruins+towers>crawler": the answers before a step, used as the key for saved cards. */
export function pathKey(step: Step, draft: Settings): string {
  return STEPS.slice(0, STEPS.indexOf(step))
    .map((earlier) => stepKey(earlier, draft))
    .join('>');
}

/** The whole game as a key, for saved names. */
export function gameKey(draft: Settings): string {
  return STEPS.map((step) => stepKey(step, draft)).join('>');
}
