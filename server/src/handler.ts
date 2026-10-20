// The server function. It receives the settings so far and, for a wish, the player's
// text. It returns the cards of the next step, what a wish means, or a name for the game.
//
// What it guarantees:
// - API keys stay here. The browser never sees them.
// - Text is checked by the filter before it reaches any provider.
// - Every AI answer is read field by field. Only things the game can build are kept.
// - Cards and names are saved per path of choices. An answer to a wish is never saved.
// - Nothing about a player is stored or logged: no text, no address, no cookies.
//
// It uses only web-standard Request and Response, so it runs the same on the dev
// server, in tests and on a hosted function.

import { repairCards, repairName, repairWish, toProposal } from '../../src/ai/assemble';
import { checkText } from '../../src/ai/filter';
import { gameKey, pathKey, type MakeResponse, type RefusedReason } from '../../src/ai/protocol';
import { STEPS, type Step } from '../../src/settings/options';
import type { Settings } from '../../src/settings/schema';
import { repairSettings } from '../../src/settings/validate';
import { createCache, type Cache } from './cache';
import { extractJson } from './parse';
import { checkTrick } from '../../src/trick/check';
import { cleanText } from '../../src/settings/validate';
import { TITLE_MAX } from '../../src/settings/schema';
import { cardsPrompt, namePrompt, trickPrompt, wishPrompt } from './prompt';
import { createRouter, type Provider, type RouterOptions } from './router';

export interface HandlerOptions {
  providers: Provider[];
  /** Who writes code for the "trick" job, best first. Left out, the same providers as for everything else. */
  codeProviders?: Provider[];
  router?: RouterOptions;
  cache?: Cache<unknown>;
  /** The site that may call this function from a browser. Empty when the site and the function share an address. */
  allowOrigin?: string;
  /** A ceiling on real AI calls per minute, for all players together, to protect the free limits. */
  maxCallsPerMinute?: number;
  now?: () => number;
}

export type Handler = (request: Request) => Promise<Response>;

/** A wish: one provider gets five seconds, and all of them together seven. Groq answered in 0.6 to 2.8 s (19 Oct). */
export const WISH_LIMITS = { timeoutMs: 5000, budgetMs: 7000 };

/** How many differently named games are kept per path of choices. */
const VARIANTS = 4;
// A repair try sends the failed script back, so the request can be large.
const MAX_BODY = 16000;

type CardsAnswer = NonNullable<ReturnType<typeof repairCards>>;
type NameAnswer = NonNullable<ReturnType<typeof repairName>>;

export function createHandler(options: HandlerOptions): Handler {
  const now = options.now ?? Date.now;
  const router = createRouter(options.providers, { now, ...options.router });
  const codeRouter = options.codeProviders ? createRouter(options.codeProviders, { now, ...options.router }) : router;
  const cache = options.cache ?? createCache<unknown>({ now });
  // One game is about six calls (four sets of cards, a wish, a name).
  const maxCalls = options.maxCallsPerMinute ?? 24;
  let minute = 0;
  let calls = 0;

  /** True when one more AI call fits in this minute. Counts the call. */
  function mayCall(): boolean {
    const current = Math.floor(now() / 60_000);
    if (current !== minute) {
      minute = current;
      calls = 0;
    }
    if (calls >= maxCalls) return false;
    calls += 1;
    return true;
  }

  const headers: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (options.allowOrigin) {
    headers['access-control-allow-origin'] = options.allowOrigin;
    headers.vary = 'origin';
  }
  const send = (body: MakeResponse, status = 200) => new Response(JSON.stringify(body), { status, headers });
  const refuse = (reason: RefusedReason, status = 200) => send({ ok: false, reason }, status);
  /** Refuse unless a provider is there and one more call fits. */
  const blocked = (): RefusedReason | undefined => (options.providers.length === 0 ? 'unavailable' : mayCall() ? undefined : 'busy');

  async function cards(step: Step, draft: Settings): Promise<Response> {
    const key = `cards|${step}|${pathKey(step, draft)}`;
    const reply = (answer: CardsAnswer, from: 'ai' | 'cache') => {
      const suggest = answer.cards.findIndex((card) => card.id === answer.suggest);
      return send({ ok: true, job: 'cards', step, cards: answer.cards.map(toProposal), suggest: suggest < 0 ? null : suggest, from });
    };
    const saved = cache.get(key) as CardsAnswer | undefined;
    if (saved) return reply(saved, 'cache');

    const no = blocked();
    if (no) return refuse(no);
    const routed = await router.ask(cardsPrompt(step, draft), (answer) => repairCards(step, extractJson(answer), draft));
    if (!routed) return refuse('unavailable');
    cache.set(key, routed.value);
    return reply(routed.value, 'ai');
  }

  async function wish(step: Step, draft: Settings, textIn: unknown, either = false): Promise<Response> {
    const checked = checkText(textIn);
    if (!checked.ok) return refuse(checked.reason === 'empty' ? 'bad-request' : 'unsafe', checked.reason === 'empty' ? 400 : 200);

    const no = blocked();
    if (no) return refuse(no);
    const routed = await router.ask(
      wishPrompt(step, draft, checked.text, either),
      (answer) => {
        const read = repairWish(extractJson(answer), draft);
        // An answer that understood nothing is not worth using: the browser reads the words itself.
        return read.parts.length > 0 ? read : undefined;
      },
      // The player waits about eight seconds in all (src/ai/client.ts): the answer, or "unavailable", comes before that.
      WISH_LIMITS,
    );
    if (!routed) return refuse('unavailable');
    // Never saved: what a player wrote is not a key and not a value anywhere.
    return send({ ok: true, job: 'wish', step, parts: routed.value.parts, missed: routed.value.missed, from: 'ai' });
  }

  async function name(draft: Settings, seed: number): Promise<Response> {
    const key = `name|${gameKey(draft)}|${seed % VARIANTS}`;
    const saved = cache.get(key) as NameAnswer | undefined;
    if (saved) return send({ ok: true, job: 'name', ...saved, from: 'cache' });

    const no = blocked();
    if (no) return refuse(no);
    const routed = await router.ask(namePrompt(draft), (answer) => repairName(extractJson(answer)));
    if (!routed) return refuse('unavailable');
    cache.set(key, routed.value);
    return send({ ok: true, job: 'name', ...routed.value, from: 'ai' });
  }

  /**
   * Write a script for a wish. What comes back is untrusted code: it is checked here for
   * the obvious, and the browser checks it again and runs it only in the locked frame.
   * Never saved: it was written for one player's words.
   */
  async function trick(draft: Settings, textIn: unknown, brokenIn: unknown, baseIn: unknown): Promise<Response> {
    const checked = checkText(textIn);
    if (!checked.ok) return refuse(checked.reason === 'empty' ? 'bad-request' : 'unsafe', checked.reason === 'empty' ? 400 : 200);
    const raw = (typeof brokenIn === 'object' && brokenIn !== null ? brokenIn : {}) as Record<string, unknown>;
    const broken = typeof raw.code === 'string' && typeof raw.error === 'string' ? { code: raw.code.slice(0, 9000), error: raw.error.slice(0, 300) } : undefined;

    const no = blocked();
    if (no) return refuse(no);
    let tokens = 0;
    const base = typeof baseIn === 'string' && baseIn.length > 0 ? baseIn.slice(0, 9000) : undefined;
    const prompt = trickPrompt(draft, checked.text, broken, base);
    prompt.onUsage = (used) => (tokens += used);
    const routed = await codeRouter.ask(
      prompt,
      (answer) => {
        const json = extractJson(answer);
        const script = checkTrick(json?.code);
        // A script that fails this first look still goes back to the browser's repair loop as a failure.
        if (!json || typeof json.code !== 'string') return undefined;
        return { code: script.ok ? script.code : json.code, title: cleanText(json.title, TITLE_MAX) };
      },
      // Code takes far longer to write than a card.
      { timeoutMs: 30_000, budgetMs: 40_000 },
    );
    if (!routed) return refuse('unavailable');
    return send({ ok: true, job: 'trick', code: routed.value.code, title: routed.value.title, tokens, provider: routed.provider, from: 'ai' });
  }

  return async (request) => {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...headers, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' },
      });
    }
    if (request.method !== 'POST') return refuse('bad-request', 405);

    let body: Record<string, unknown>;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY) return refuse('bad-request', 413);
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return refuse('bad-request', 400);
      body = parsed as Record<string, unknown>;
    } catch {
      return refuse('bad-request', 400);
    }

    const seed = typeof body.seed === 'number' && Number.isFinite(body.seed) ? Math.abs(Math.round(body.seed)) : 0;
    // The settings so far come from a browser, so they are repaired like anything else from outside.
    const draft = repairSettings(typeof body.draft === 'object' && body.draft !== null ? { ...body.draft, seed } : { seed });
    const step = STEPS.find((name) => name === body.step);
    try {
      if (body.job === 'name') return await name(draft, seed);
      if (body.job === 'cards' && step) return await cards(step, draft);
      if (body.job === 'wish' && step) return await wish(step, draft, body.text, body.either === true);
      if (body.job === 'trick') return await trick(draft, body.text, body.broken, body.base);
      return refuse('bad-request', 400);
    } catch {
      // Whatever went wrong, the browser has a fallback. Nothing about the request is logged.
      return refuse('unavailable');
    }
  };
}
