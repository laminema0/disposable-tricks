// What the maker screen calls. It always gives an answer: from the AI when the server
// answers in time, and otherwise from our own cards and our own keyword reading of what
// the player wrote. The screen never needs to know which of the two it was.

import { premadeCards, STEPS, understood, type Card, type Step } from '../settings/options';
import { CREATURES_MAX, type Settings } from '../settings/schema';
import { repairSettings } from '../settings/validate';
import { applyWish, repairCards, repairName, repairWish } from './assemble';
import { createAiClient, type AiClient } from './client';
import { checkText, tidyWish } from './filter';
import { gameKey, pathKey } from './protocol';
import { checkTrick } from '../trick/check';
import { mendWish, stillMissed } from './mend';
import { readWish } from './wish';

/** How a script is test-run. The app gives the locked frame's own check here. */
export type TrickTester = (code: string) => Promise<{ ok: boolean; message: string }>;

export type Tricked =
  | { ok: true; code: string; title: string; tries: number; tokens: number; seconds: number; provider: string }
  /** No script worked. `lastError` is what was wrong with the last one. */
  | { ok: false; tries: number; tokens: number; seconds: number; provider: string; lastError: string };

/** One first try and up to two repairs. */
export const TRICK_TRIES = 3;

export interface StepCards {
  cards: Card[];
  /** The id of the card the AI would pick, if it said so. */
  suggest: string | null;
  from: 'ai' | 'local';
}

export type Wished =
  /** The wish was understood. `filled` are the steps it answered; `heard` says what it made of them. */
  | { kind: 'made'; settings: Settings; filled: Step[]; heard: string; missed: string; from: 'ai' | 'local' }
  /** Nothing in the wish matched anything the game can build. */
  | { kind: 'unclear' }
  /** The wish did not pass the filter. */
  | { kind: 'refused' };

export interface Maker {
  /** The cards of a step, given the answers so far. Never waits longer than `cardWaitMs`. */
  cards(step: Step, draft: Settings): Promise<StepCards>;
  /** Read what the player wrote at a step. `locked` are the steps answered before it. */
  /** `either`: a change to a game being played; the AI decides whether it is about the weapon or the monsters. */
  wish(step: Step, draft: Settings, text: string, locked: ReadonlySet<Step>, either?: boolean): Promise<Wished>;
  /** Name the finished game and write its intro. */
  name(draft: Settings): Promise<Settings>;
  /**
   * Have a script written for a wish the blocks cannot express. Each script is checked and
   * test-run; a failure goes back to the model with the error, twice at most.
   */
  trick(draft: Settings, text: string, test: TrickTester, base?: string): Promise<Tricked>;
  /**
   * Change the game being played. A game of blocks is changed through its settings when the wish
   * fits them; otherwise, and for a game the AI wrote, the script is edited (or written) instead.
   */
  change(current: Settings, text: string, test: TrickTester, code?: string): Promise<Changed>;
}

export type Changed =
  | { kind: 'settings'; settings: Settings; heard: string }
  | { kind: 'code'; settings: Settings; code: string; title: string }
  | { kind: 'refused' }
  | { kind: 'failed'; reason: string };

export interface MakerOptions {
  /** The longest the screen waits for AI cards before it shows our own, in milliseconds. */
  cardWaitMs?: number;
  /** The longest a written wish waits for the AI before our own reading answers, in milliseconds. */
  wishWaitMs?: number;
}

/** About eight seconds: a wish that takes longer is read by us (the server gives up on its providers before this). */
export const WISH_WAIT_MS = 8000;

/** "Buildings, houses · Bow, shoots far" */
function heardLine(settings: Settings, filled: readonly Step[]): string {
  return filled.map((step) => understood(step, settings)).join(' · ');
}

/**
 * A monster the player describes is added (Amin, 18 Oct, evening: every game has all our monsters, and his own
 * come on top). Our monsters are never taken away by a wish; the oldest of his own go when there are too many.
 */
export function withDescribed(before: Settings, after: Settings): Settings {
  if (after.creatures.length === 0) return after;
  // Asked for again ("a dragon" when he has one), it is not doubled, and our monsters still stay.
  const kept = before.creatures.filter((old) => !after.creatures.some((creature) => creature.name === old.name));
  const enemies = [...new Set([...before.enemies, ...after.enemies])];
  const creatures = [...kept, ...after.creatures].slice(-CREATURES_MAX);
  return repairSettings({ ...after, enemies, creatures });
}

export function createMaker(client: AiClient, options: MakerOptions = {}): Maker {
  const cardWaitMs = options.cardWaitMs ?? 1800;
  const wishWaitMs = options.wishWaitMs ?? WISH_WAIT_MS;
  // Answers kept while the page is open, so going back a step asks nothing new.
  const known = new Map<string, StepCards>();
  const names = new Map<string, { title: string; intro: string }>();

  async function aiCards(step: Step, draft: Settings, key: string): Promise<StepCards | undefined> {
    const answer = await client.ask({ job: 'cards', step, draft, seed: draft.seed });
    if (!answer || !answer.ok || answer.job !== 'cards' || answer.step !== step) return undefined;
    // The server already checked its answer. Checked again here, so that a broken or
    // wrong server can never put anything on a card that the game cannot build.
    const repaired = repairCards(step, { cards: answer.cards, suggest: answer.suggest }, draft);
    if (!repaired) return undefined;
    const cards: StepCards = { ...repaired, from: 'ai' };
    known.set(key, cards);
    return cards;
  }

  return {
    async cards(step, draftIn) {
      const draft = repairSettings(draftIn);
      const own: StepCards = { cards: premadeCards(step, draft), suggest: null, from: 'local' };
      // The first step has nothing to follow from: our own four moods are the question.
      // A twist is a rule of the game, so its card must say exactly what the rule does:
      // those words stay ours.
      if (step === STEPS[0] || step === 'twist') return own;
      const key = `${step}|${pathKey(step, draft)}`;
      const saved = known.get(key);
      if (saved) return saved;
      const wait = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), cardWaitMs));
      // A late answer is still kept (in `known`), for the next time this step is opened.
      return (await Promise.race([aiCards(step, draft, key), wait])) ?? own;
    },

    async wish(step, draftIn, textIn, locked, either) {
      const draft = repairSettings(draftIn);
      if (!tidyWish(textIn)) return { kind: 'unclear' };
      const checked = checkText(textIn);
      if (!checked.ok) return { kind: 'refused' };
      const text = checked.text;

      // However long the line to the server takes, the player waits at most this long: then our own reading answers.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const late = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), wishWaitMs)));
      const answer = await Promise.race([client.ask({ job: 'wish', step, draft, text, seed: draft.seed, ...(either ? { either: true } : {}) }), late]);
      clearTimeout(timer);
      if (answer && !answer.ok && answer.reason === 'unsafe') return { kind: 'refused' };
      const read = answer && answer.ok && answer.job === 'wish' ? repairWish({ parts: answer.parts, missed: answer.missed }, draft) : { parts: [], missed: '' };
      // Checked against the words: a clear "dragon" the AI ignored is put back. With no answer, our own reading.
      const mended = mendWish(text, step, read.parts, locked, either);
      let made = applyWish(draft, mended.parts, locked);
      let from: 'ai' | 'local' = mended.local ? 'local' : 'ai';
      if (made.filled.length === 0 && !mended.local) {
        // An answer that changed nothing the player may change: our own reading after all.
        made = applyWish(draft, mendWish(text, step, [], locked, either).parts, locked);
        from = 'local';
      }
      if (made.filled.length === 0) return { kind: 'unclear' };
      // A change to the monsters that names none of his own keeps the ones he has.
      const ownKept = made.filled.includes('monsters') && made.settings.creatures.length === 0 && draft.creatures.length > 0;
      const settings = withDescribed(draft, ownKept ? repairSettings({ ...made.settings, creatures: draft.creatures }) : made.settings);
      const missed = from === 'ai' ? stillMissed(read.missed, mended.parts) : '';
      return { kind: 'made', settings, filled: made.filled, heard: heardLine(settings, made.filled), missed, from };
    },

    async trick(draftIn, textIn, test, base) {
      const draft = repairSettings(draftIn);
      const started = Date.now();
      const done = { tries: 0, tokens: 0, provider: '' };
      const seconds = () => Math.round((Date.now() - started) / 100) / 10;
      const checked = checkText(textIn);
      if (!checked.ok) return { ok: false, ...done, seconds: 0, lastError: 'The wish was refused.' };

      let broken: { code: string; error: string } | undefined;
      let lastError = 'No AI answered.';
      for (let attempt = 0; attempt < TRICK_TRIES; attempt++) {
        const answer = await client.ask({ job: 'trick', draft, text: checked.text, broken, base: broken ? undefined : base, seed: draft.seed });
        if (!answer || !answer.ok || answer.job !== 'trick') break;
        done.tries = attempt + 1;
        done.tokens += answer.tokens;
        done.provider = answer.provider;
        // First the look that needs no running, then the test run in the locked frame.
        const look = checkTrick(answer.code);
        const verdict = look.ok ? await test(look.code) : { ok: false, message: look.reason };
        if (look.ok && verdict.ok) return { ok: true, code: look.code, title: answer.title, ...done, seconds: seconds() };
        lastError = verdict.message;
        broken = { code: answer.code.slice(0, 9000), error: verdict.message };
      }
      return { ok: false, ...done, seconds: seconds(), lastError };
    },

    async change(currentIn, textIn, test, code) {
      const current = repairSettings(currentIn);
      if (!tidyWish(textIn)) return { kind: 'failed', reason: 'Write what you want to change.' };
      if (!checkText(textIn).ok) return { kind: 'refused' };
      if (!code) {
        // A game of blocks: the AI changes its weapon or its monsters, and decides which the words are about
        // (18 Oct: guessed here from our own words, "a frying pan" was taken for monsters). The rest stays as it is,
        // and it is never rewritten as code.
        const step: Step = readWish(textIn, 'weapon').some((part) => part.step === 'weapon') ? 'weapon' : 'monsters';
        const wished = await this.wish(step, current, textIn, new Set(STEPS.filter((name) => name !== 'weapon' && name !== 'monsters')), true);
        if (wished.kind === 'refused') return { kind: 'refused' };
        if (wished.kind === 'made') return { kind: 'settings', settings: wished.settings, heard: wished.missed ? `${wished.heard} · No ${wished.missed} yet` : wished.heard };
        return { kind: 'failed', reason: 'Could not make that. Try naming one thing, like "a bow" or "a dragon".' };
      }
      // Beyond the blocks, or a written game: the script is written, or edited, by the AI.
      const written = await this.trick(current, textIn, test, code);
      if (written.ok) return { kind: 'code', settings: current, code: written.code, title: written.title };
      return { kind: 'failed', reason: written.lastError };
    },

    async name(draftIn) {
      const draft = repairSettings(draftIn);
      const key = `${gameKey(draft)}|${draft.seed}`;
      let words = names.get(key);
      if (!words) {
        const answer = await client.ask({ job: 'name', draft, seed: draft.seed });
        if (answer && answer.ok && answer.job === 'name') words = repairName(answer);
        if (words) names.set(key, words);
      }
      if (!words) return draft;
      return repairSettings({ ...draft, title: words.title, intro: words.intro || draft.intro });
    },
  };
}

/**
 * The maker the app uses. In development the server function runs inside the dev server.
 * A built site talks to the address given at build time (VITE_AI_URL), and with no
 * address it makes every game locally and never sends anything.
 */
export function defaultMaker(): Maker {
  const url = import.meta.env.VITE_AI_URL ?? (import.meta.env.DEV ? '/api/make' : '');
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  // For testing: "?ai=off" makes every game locally; "?ai=fake" uses the dev server's canned
  // answers instead of a real AI; "?ai=slow" (or fail, malformed, wrong) makes them misbehave.
  const mode = params.get('ai');
  if (mode === 'off') return createMaker(createAiClient({ url: '' }));
  return createMaker(createAiClient({ url, headers: mode ? { 'x-dt-fake': mode === 'fake' ? 'good' : mode } : undefined }));
}
