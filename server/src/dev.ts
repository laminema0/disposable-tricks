// The server function as the dev server runs it (see vite-plugin.mjs).
// With no keys in server/.env it answers from the fake provider, so the whole flow can
// be tried before any account exists. A page opened with "?ai=slow" (or fail, malformed,
// wrong) asks the fake provider to misbehave in that way.

import { isFakeMode } from './fake';
import type { Handler } from './handler';
import { providersFromEnv, type Env } from './providers';
import { handlerFromEnv } from './setup';

const handlers = new Map<string, Handler>();
const KEY_NAMES = ['AI_ORDER', 'GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_CODE_MODEL', 'AI_CODE_ORDER', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_MODEL', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'MAX_CALLS_PER_MINUTE'];

function modeFor(request: Request | undefined, env: Env): string {
  const asked = request?.headers.get('x-dt-fake');
  if (isFakeMode(asked)) return asked;
  if (isFakeMode(env.AI_FAKE)) return env.AI_FAKE;
  return providersFromEnv(env).length > 0 ? '' : 'good';
}

export function handle(request: Request, env: Env): Promise<Response> {
  const mode = modeFor(request, env);
  // One function per fake mode and per set of keys, so a change in server/.env takes effect at once.
  const key = `${mode}|${KEY_NAMES.map((name) => env[name] ?? '').join('|')}`;
  let handler = handlers.get(key);
  if (!handler) {
    handler = handlerFromEnv({ ...env, AI_FAKE: mode });
    handlers.set(key, handler);
  }
  return handler(request);
}

/** One line for the dev server's start-up log. */
export function describe(env: Env): string {
  const mode = modeFor(undefined, env);
  if (mode) return `fake provider ("${mode}"). No real AI is called.`;
  return `real providers: ${providersFromEnv(env).map((provider) => provider.name).join(', ')}`;
}
