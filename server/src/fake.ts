// A fake provider with canned answers. It stands in for a real AI in tests and on the
// dev server (open the page with "?ai=fake"), and it can be told to misbehave so that
// every kind of failure can be seen: an answer that is not JSON, JSON full of wrong
// values, an answer that comes too late, and no answer at all.

import { readWish } from '../../src/ai/wish';
import { STEPS } from '../../src/settings/options';
import { ProviderError, type Provider } from './router';

export const FAKE_MODES = ['good', 'malformed', 'wrong', 'slow', 'fail'] as const;
export type FakeMode = (typeof FAKE_MODES)[number];

const WORDS: Record<string, { title: string; intro: string }> = {
  calm: { title: 'Hush of the Low Lamps', intro: 'Hush now. The lamps are low and so are you.' },
  happy: { title: 'Petal Parade at Dusk', intro: 'Skip along. Even the thorns are smiling.' },
  eerie: { title: 'Whisper Marsh', intro: 'Something in the reeds is counting your steps.' },
  fierce: { title: 'Emberfall Run', intro: 'Run hot, strike fast, leave only petals.' },
};

function parse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function goodAnswer(user: string): string {
  const ask = parse(user);
  if (ask.job === 'cards') {
    // Our own cards in reverse order, so an answer from here is easy to tell from the fallback.
    const ours = (Array.isArray(ask.ours) ? ask.ours : []) as Record<string, unknown>[];
    return JSON.stringify({ cards: [...ours].reverse(), suggest: 0 });
  }
  if (ask.job === 'wish') {
    const step = STEPS.find((name) => name === ask.step);
    return JSON.stringify({ parts: readWish(typeof ask.wish === 'string' ? ask.wish : '', step), missed: '' });
  }
  const game = (ask.game ?? {}) as Record<string, unknown>;
  return JSON.stringify(WORDS[String(game.mood)] ?? WORDS.calm);
}

const WRONG_ANSWER = JSON.stringify({
  cards: [
    { label: '<script>alert(1)</script>', detail: 42, patch: { mood: 'purple', scenery: ['dragons'], enemies: ['dragon', 42], weapon: { kind: 'nuke' }, twist: 'gravity' } },
    'junk',
    null,
  ],
  suggest: 'nothing-we-offer',
  parts: [{ step: 'cheats', patch: { lives: 99 } }, { step: 'weapon', patch: { weapon: { look: 'tank', kind: 'vehicle' } } }],
  missed: { text: 'not a string' },
  title: '<script>alert(1)</script>'.repeat(4),
  intro: { text: 'not a string' },
});

export function fakeProvider(mode: FakeMode = 'good', name = 'fake'): Provider {
  return {
    name,
    async ask(prompt, signal) {
      switch (mode) {
        case 'good':
          return goodAnswer(prompt.user);
        case 'malformed':
          return 'Sure! Here is your game: {"cards": [{"label": ';
        case 'wrong':
          return WRONG_ANSWER;
        case 'fail':
          throw new ProviderError('fake outage', 503);
        case 'slow':
          // Longer than any timeout we use. Gives up as soon as the router stops waiting.
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(goodAnswer(prompt.user)), 30_000);
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new ProviderError('aborted'));
            });
          });
      }
    },
  };
}

export const isFakeMode = (value: unknown): value is FakeMode => (FAKE_MODES as readonly unknown[]).includes(value);
