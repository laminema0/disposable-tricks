// The text filter. It runs before any text reaches an AI provider, and again on the
// name and intro an AI writes. Simple on purpose: a word list and a few patterns.
// It is a first line of defence, not a promise. Pure: no browser, no server.
//
// The game is about monsters in the dark, so words like "scary", "kill the monsters"
// or "blood moon" are fine. Refused: sexual content, hate, self-harm, real-world
// violence against people, and anything that looks like personal data.

import { WISH_MAX } from './protocol';

export type FilterReason = 'empty' | 'unsafe' | 'personal';
export type FilterResult = { ok: true; text: string } | { ok: false; reason: FilterReason };

// Whole words (after tidying). A trailing * also matches longer words that start the same.
const BLOCKED_WORDS = [
  // sexual
  'sex', 'sexy', 'sexier', 'sexiest', 'sexual*', 'porn*', 'nude*', 'naked', 'nsfw', 'erotic*', 'hentai', 'fetish*', 'orgasm*', 'genital*', 'penis*',
  'vagina*', 'boob*', 'blowjob*', 'handjob*', 'masturbat*', 'horny', 'slut*', 'whore*', 'incest*', 'pedo*',
  'paedo*', 'molest*', 'rape*', 'rapist*', 'raping', 'lolita', 'cum', 'dick', 'dicks', 'cock', 'cocks', 'pussy', 'tits',
  // hate
  'nazi*', 'hitler', 'holocaust', 'kkk', 'nigg*', 'fagg*', 'kike*', 'chink*', 'spic', 'spics', 'retard*',
  'tranny', 'trannies', 'genocide*', 'ethnic cleansing', 'white power', 'heil',
  // self-harm
  'suicid*', 'self harm*', 'selfharm*', 'kill myself', 'killing myself', 'end my life', 'hang myself',
  'cut myself', 'cutting myself', 'want to die',
  // real-world violence
  'terroris*', 'school shoot*', 'mass shoot*', 'shoot up', 'bomb a', 'bomb the', 'behead*', 'lynch*',
  'torture*', 'kill my', 'kill her', 'kill him', 'kill people', 'kill children', 'kill kids', 'murder my',
  'child abuse', 'abuse children', 'abuse kids',
];

const PERSONAL_PATTERNS = [
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, // an email address
  /(https?:\/\/|www\.)\S+/i, // a web address
  /(^|\s)@[a-z0-9_.]{3,}/i, // a social handle
  /(\d[\s().-]?){7,}/, // a phone number or any other long number
];

/** Lower case, no accents, common letter swaps undone ("s3x" reads as "sex"), words split by one space. */
function tidy(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4|@/g, 'a')
    .replace(/5|\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BLOCKED = new RegExp(
  `(^| )(${BLOCKED_WORDS.map((word) => (word.endsWith('*') ? `${escape(word.slice(0, -1))}[a-z]*` : escape(word))).join('|')})( |$)`,
);

/** Plain spaces, no control characters, cut to the longest wish we accept. */
export function tidyWish(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WISH_MAX)
    .trim();
}

/** Check a piece of text. On success it returns the tidied text that may be passed on. */
export function checkText(input: unknown): FilterResult {
  const text = tidyWish(input);
  if (!text) return { ok: false, reason: 'empty' };
  if (PERSONAL_PATTERNS.some((pattern) => pattern.test(text))) return { ok: false, reason: 'personal' };
  if (BLOCKED.test(tidy(text))) return { ok: false, reason: 'unsafe' };
  return { ok: true, text };
}
