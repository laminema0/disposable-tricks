// A monster's look, generated on request (Amin, 20 Oct: "the whole point of the game is that people can customise it
// in real time"). The player names a monster we have not drawn ("a kraken"); this asks Cloudflare's image model for a
// solid black silhouette of it on white, which the game turns into one of its own shadow creatures (src/ai/look.ts).
// Every look is kept by its name, so the same monster is made once and looks the same for everyone after.
// Weapons too (20 Oct: "it cannot load the desired weapons"): the thing in his hand, drawn the same way.
// POST { name, kind?: 'monster' | 'weapon' } -> { ok: true, image: "data:image/jpeg;base64,..." } | { ok: false, reason }.
// The image model's own safety filter sometimes refuses harmless words ("a menacing banana"): the request is then
// asked again in gentler words before giving up.

import { checkText } from '../../src/ai/filter';
import type { Env } from './providers';

export const LOOK = {
  model: '@cf/black-forest-labs/flux-1-schnell',
  steps: 4,
  /** The longest name we draw. */
  maxName: 40,
  /** Give up on the image model after this long (all tries together); the game keeps its stand-in. */
  timeoutMs: 14000,
  /** New looks per minute for all players together, so the free daily allowance is not spent in a burst. */
  perMinute: 10,
  /** How long a made look is kept. */
  keepSeconds: 60 * 60 * 24 * 60,
};

export type LookKind = 'monster' | 'weapon';

const FLAT = 'Flat black shape only, sharp clean edges, no ground, no floor, no shadow, no shading, no texture, no text.';

/** The words for the image model, tested on 20 Oct: a flat black shape, whole, alone, on white. Then gentler ones. */
export function lookPrompts(name: string, kind: LookKind = 'monster'): string[] {
  if (kind === 'weapon') {
    return [
      `Solid pure black silhouette of a ${name} held as a weapon, one single object, side view, isolated in the middle of a pure white background. ${FLAT}`,
      `Flat black shape of a ${name}, like a road sign symbol, on white. ${FLAT}`,
      `Simple solid black silhouette icon of a ${name}, one single object, centred on a plain white background. ${FLAT}`,
    ];
  }
  return [
    `Solid pure black silhouette of a menacing ${name}, full body, side view, isolated in the middle of a pure white background. ${FLAT}`,
    `Solid black silhouette of a giant ${name} monster with legs and eyes, floating in mid-air, side view, centred on a plain white background. ${FLAT}`,
    `Solid black silhouette of a fantasy creature shaped like a ${name}, full body, side view, centred on a plain white background. ${FLAT}`,
    `Simple solid black silhouette icon of a ${name}, centred on a plain white background. ${FLAT}`,
  ];
}

/** The first words tried; kept for tests and the log. */
export function lookPrompt(name: string, kind: LookKind = 'monster'): string {
  return lookPrompts(name, kind)[0];
}

/** The name as we draw it: plain words, lower case, or undefined when it is not something to draw. */
export function lookName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const checked = checkText(raw);
  if (!checked.ok) return undefined;
  const name = checked.text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9' -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < 2 || name.length > LOOK.maxName || !/[a-z]{2}/.test(name)) return undefined;
  return name;
}

type Reply = { ok: true; image: string } | { ok: false; reason: 'bad-request' | 'unavailable' | 'busy' | 'failed' };

let windowStart = 0;
let madeThisMinute = 0;

function json(body: Reply, status = 200, keep = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': keep > 0 ? `public, max-age=${keep}` : 'no-store' },
  });
}

/** The lasting store of every look made (Cloudflare KV, binding LOOKS in wrangler.toml), when there is one. */
interface LookStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
function lookStore(env: Env): LookStore | undefined {
  const store = (env as unknown as { LOOKS?: LookStore }).LOOKS;
  return store && typeof store.get === 'function' ? store : undefined;
}

/** The shared cache of this place on Cloudflare, when there is one (not in tests or the dev server). */
function edgeCache(): Cache | undefined {
  const store = (globalThis as { caches?: { default?: Cache } }).caches;
  return store?.default;
}

export async function handleLook(request: Request, env: Env, doFetch: typeof fetch = fetch, now = Date.now()): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, reason: 'bad-request' }, 405);
  const body = (await request.json().catch(() => undefined)) as { name?: unknown; kind?: unknown } | undefined;
  const name = lookName(body?.name);
  const kind: LookKind = body?.kind === 'weapon' ? 'weapon' : 'monster';
  if (!name) return json({ ok: false, reason: 'bad-request' }, 400);

  const cache = edgeCache();
  const key = new Request(`https://looks.disposable-tricks.internal/v1/${kind}/${encodeURIComponent(name)}`);
  const kept = await cache?.match(key);
  if (kept) return kept;
  // Made before, by anyone: from the lasting store, at no cost.
  const store = lookStore(env);
  const storeKey = `${kind}/${name}`;
  const stored = await store?.get(storeKey).catch(() => null);
  if (stored) {
    const reply = json({ ok: true, image: stored }, 200, LOOK.keepSeconds);
    await cache?.put(key, reply.clone()).catch(() => undefined);
    return reply;
  }

  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return json({ ok: false, reason: 'unavailable' }, 503);

  if (now - windowStart > 60_000) {
    windowStart = now;
    madeThisMinute = 0;
  }
  if (madeThisMinute >= LOOK.perMinute) return json({ ok: false, reason: 'busy' }, 429);
  madeThisMinute++;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOK.timeoutMs);
  try {
    // The first words, and gentler ones when the image model refuses them or sends nothing.
    for (const prompt of lookPrompts(name, kind)) {
      const res = await doFetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${LOOK.model}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, steps: LOOK.steps }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => undefined)) as { result?: { image?: unknown } } | undefined;
      const image = data?.result?.image;
      if (!res.ok || typeof image !== 'string' || image.length < 1000) continue;
      const dataUrl = `data:image/jpeg;base64,${image}`;
      const reply = json({ ok: true, image: dataUrl }, 200, LOOK.keepSeconds);
      await cache?.put(key, reply.clone()).catch(() => undefined);
      await store?.put(storeKey, dataUrl).catch(() => undefined);
      return reply;
    }
    return json({ ok: false, reason: 'failed' }, 502);
  } catch {
    return json({ ok: false, reason: 'failed' }, 504);
  } finally {
    clearTimeout(timer);
  }
}
