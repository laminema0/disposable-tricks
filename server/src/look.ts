// A monster's look, generated on request (Amin, 20 Oct: "the whole point of the game is that people can customise it
// in real time"). The player names a monster we have not drawn ("a kraken"); this asks Cloudflare's image model for a
// solid black silhouette of it on white, which the game turns into one of its own shadow creatures (src/ai/look.ts).
// Every look is kept by its name, so the same monster is made once and looks the same for everyone after.
// POST { name } -> { ok: true, image: "data:image/jpeg;base64,..." } | { ok: false, reason }.

import { checkText } from '../../src/ai/filter';
import type { Env } from './providers';

export const LOOK = {
  model: '@cf/black-forest-labs/flux-1-schnell',
  steps: 4,
  /** The longest name we draw. */
  maxName: 40,
  /** Give up on the image model after this long; the game keeps its stand-in. */
  timeoutMs: 9000,
  /** New looks per minute for all players together, so the free daily allowance is not spent in a burst. */
  perMinute: 10,
  /** How long a made look is kept. */
  keepSeconds: 60 * 60 * 24 * 60,
};

/** The words for the image model, tested on 20 Oct: a flat black shape, whole, alone, on white. */
export function lookPrompt(name: string): string {
  return (
    `Solid pure black silhouette of a menacing ${name}, full body, side view, isolated in the middle of a pure white background. ` +
    'Flat black shape only, sharp clean edges, no ground, no floor, no shadow, no shading, no texture, no text.'
  );
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

/** The shared cache of this place on Cloudflare, when there is one (not in tests or the dev server). */
function edgeCache(): Cache | undefined {
  const store = (globalThis as { caches?: { default?: Cache } }).caches;
  return store?.default;
}

export async function handleLook(request: Request, env: Env, doFetch: typeof fetch = fetch, now = Date.now()): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, reason: 'bad-request' }, 405);
  const body = (await request.json().catch(() => undefined)) as { name?: unknown } | undefined;
  const name = lookName(body?.name);
  if (!name) return json({ ok: false, reason: 'bad-request' }, 400);

  const cache = edgeCache();
  const key = new Request(`https://looks.disposable-tricks.internal/v1/${encodeURIComponent(name)}`);
  const kept = await cache?.match(key);
  if (kept) return kept;

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
    const res = await doFetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${LOOK.model}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: lookPrompt(name), steps: LOOK.steps }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => undefined)) as { result?: { image?: unknown } } | undefined;
    const image = data?.result?.image;
    if (!res.ok || typeof image !== 'string' || image.length < 1000) return json({ ok: false, reason: 'failed' }, 502);
    const reply = json({ ok: true, image: `data:image/jpeg;base64,${image}` }, 200, LOOK.keepSeconds);
    await cache?.put(key, reply.clone()).catch(() => undefined);
    return reply;
  } catch {
    return json({ ok: false, reason: 'failed' }, 504);
  } finally {
    clearTimeout(timer);
  }
}
