// Turns what an AI proposed into cards and settings the game can use. Nothing an AI
// says is trusted: every answer is read field by field, only things the engine can
// build are kept (see `repairPatch`), the words are cleaned and filtered, and the
// result always goes through the validator.
// Pure: used by the server function and, as a second check, by the browser.

import { applyPatch, DETAIL_MAX, LABEL_MAX, repairPatch, STEPS, understood, type Card, type Patch, type Step } from '../settings/options';
import { INTRO_MAX, TITLE_MAX, type Settings } from '../settings/schema';
import { cleanText } from '../settings/validate';
import { checkText } from './filter';
import { MISSED_MAX, type CardProposal, type WishPart } from './protocol';

export { playablePalette } from '../settings/validate';

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Words an AI wrote for the player to read: cleaned, and dropped if the filter refuses them. */
export function safeWords(value: unknown, max: number): string {
  // An answer that was cut to fit is worse than our own line, so too long means dropped.
  if (typeof value !== 'string' || value.trim().length > max) return '';
  const text = cleanText(value, max);
  return text && checkText(text).ok ? text : '';
}

/** The fewest and the most cards a step shows. */
const CARDS_MIN = 2;
const CARDS_MAX = 4;

/**
 * The cards an AI proposed for a step, made safe. A card survives when its patch names
 * something the engine can build. Its name and line are kept when they are clean and
 * fit; otherwise we write them ourselves from what the patch does.
 * Returns undefined when fewer than two usable cards are left: our own cards are better then.
 */
export function repairCards(step: Step, answer: unknown, draft: Settings): { cards: Card[]; suggest: string | null } | undefined {
  const raw: Loose = isObject(answer) ? answer : {};
  const list = Array.isArray(raw.cards) ? raw.cards.filter(isObject) : [];
  const cards: Card[] = [];
  const seen = new Set<string>();
  let suggest: string | null = null;

  list.forEach((item, index) => {
    if (cards.length >= CARDS_MAX) return;
    const patch = repairPatch(step, isObject(item.patch) ? item.patch : item, draft);
    if (!patch) return;
    // What the card would make of the game, in our own words. Two cards that do the same thing are one card.
    const does = understood(step, applyPatch(draft, step, patch));
    const same = JSON.stringify(patch);
    if (seen.has(same)) return;
    seen.add(same);
    const label = safeWords(item.label ?? item.name, LABEL_MAX) || does.slice(0, LABEL_MAX);
    const detail = safeWords(item.detail ?? item.line, DETAIL_MAX) || does.slice(0, DETAIL_MAX);
    const id = `ai-${cards.length}`;
    if (raw.suggest === index) suggest = id;
    cards.push({ id, label, detail, patch });
  });
  return cards.length >= CARDS_MIN ? { cards, suggest } : undefined;
}

/** What an AI read in a wish, step by step, made safe. Steps it got wrong are dropped. */
export function repairWish(answer: unknown, draft: Settings): { parts: WishPart[]; missed: string } {
  const raw: Loose = isObject(answer) ? answer : {};
  const list = Array.isArray(raw.parts) ? raw.parts.filter(isObject) : [];
  const parts: WishPart[] = [];
  for (const item of list) {
    const step = STEPS.find((name) => name === item.step);
    if (!step || parts.some((part) => part.step === step)) continue;
    const patch = repairPatch(step, isObject(item.patch) ? item.patch : item, draft);
    if (patch) parts.push({ step, patch });
  }
  return { parts, missed: safeWords(raw.missed, MISSED_MAX) };
}

/** The name and intro an AI wrote for a game. Undefined unless at least the name is usable. */
export function repairName(answer: unknown): { title: string; intro: string } | undefined {
  const raw: Loose = isObject(answer) ? answer : {};
  const title = safeWords(raw.title, TITLE_MAX);
  return title ? { title, intro: safeWords(raw.intro, INTRO_MAX) } : undefined;
}

/** A card as it travels between server and browser. */
export const toProposal = (card: Card): CardProposal => ({ label: card.label, detail: card.detail, patch: card.patch });

/**
 * Apply the parts of a wish to the settings. `locked` are the steps the player already
 * answered before this one: a wish never changes those. Returns the new settings and
 * the steps it filled, in the order of the maker.
 */
export function applyWish(draft: Settings, parts: readonly { step: Step; patch: Patch }[], locked: ReadonlySet<Step>): { settings: Settings; filled: Step[] } {
  let settings = draft;
  const filled: Step[] = [];
  for (const step of STEPS) {
    const part = parts.find((candidate) => candidate.step === step);
    if (!part || locked.has(step)) continue;
    const next = applyPatch(settings, step, part.patch);
    if (next === settings) continue;
    settings = next;
    filled.push(step);
  }
  return { settings, filled };
}
