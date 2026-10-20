// The browser's line to the server function. One job: ask, with a short timeout, and
// answer `null` whenever the server is missing, slow, failing or talking nonsense.
// After a failure it stops asking for a while, so a game is never held up twice.
// Nothing here throws, and nothing is stored.

import type { MakeRequest, MakeResponse } from './protocol';

export interface ClientOptions {
  /** Where the server function lives. An empty address means "no AI": nothing is ever sent. */
  url: string;
  fetch?: typeof fetch;
  /** How long to wait for each kind of answer, in milliseconds. */
  timeouts?: Record<MakeRequest['job'], number>;
  /** How long to leave the server alone after a failure, in milliseconds. */
  restMs?: number;
  now?: () => number;
  /** Extra request headers. Only the dev server uses this, to pick how the fake provider behaves. */
  headers?: Record<string, string>;
}

export interface AiClient {
  /** The server's answer, or null when there is none to be had. */
  ask(request: MakeRequest): Promise<MakeResponse | null>;
}

// A wish waits about eight seconds at most (19 Oct: it waited sixteen, and a stuck provider felt like "not working at all").
// The server stops asking its providers before this, so a late answer is still an answer.
export const DEFAULT_TIMEOUTS: Record<MakeRequest['job'], number> = { cards: 6000, wish: 8000, name: 8000, trick: 45000 };

function looksRight(value: unknown, job: MakeRequest['job']): value is MakeResponse {
  if (typeof value !== 'object' || value === null) return false;
  const answer = value as Record<string, unknown>;
  if (answer.ok === false) return typeof answer.reason === 'string';
  if (answer.ok !== true || answer.job !== job) return false;
  if (job === 'cards') return Array.isArray(answer.cards);
  if (job === 'wish') return Array.isArray(answer.parts);
  if (job === 'trick') return typeof answer.code === 'string';
  return typeof answer.title === 'string';
}

export function createAiClient(options: ClientOptions): AiClient {
  const timeouts = options.timeouts ?? DEFAULT_TIMEOUTS;
  // Short: one slow answer must not make the next wish fall back to word-reading for a whole minute.
  const restMs = options.restMs ?? 6000;
  const now = options.now ?? Date.now;
  let restUntil = 0;

  return {
    async ask(request) {
      if (!options.url || now() < restUntil) return null;
      const doFetch = options.fetch ?? globalThis.fetch;
      const control = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      // The wait ends on time even if the request itself never notices it was cancelled.
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          control.abort();
          reject(new Error('timeout'));
        }, timeouts[request.job]);
      });
      try {
        const reply = await Promise.race([timeout, doFetch(options.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...options.headers },
          body: JSON.stringify(request),
          signal: control.signal,
          // No cookies, no referrer: the server learns nothing about the player.
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        })]);
        if (!reply.ok) throw new Error(`status ${reply.status}`);
        const answer: unknown = await Promise.race([timeout, reply.json()]);
        if (!looksRight(answer, request.job)) throw new Error('unexpected answer');
        // "Not now" from the server is a reason to leave it alone too. A refused text is not.
        if (!answer.ok && answer.reason !== 'unsafe') restUntil = now() + restMs;
        return answer;
      } catch {
        restUntil = now() + restMs;
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
