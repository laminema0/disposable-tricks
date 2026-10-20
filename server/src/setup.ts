// Builds the server function from environment variables (see .env.example).

import { fakeProvider, isFakeMode } from './fake';
import { createHandler, type Handler } from './handler';
import { CODE_ORDER, providersFromEnv, type Env } from './providers';

export function handlerFromEnv(env: Env, doFetch: typeof fetch = fetch): Handler {
  // AI_FAKE swaps the real providers for the canned one. It is for development and tests only.
  const providers = isFakeMode(env.AI_FAKE) ? [fakeProvider(env.AI_FAKE)] : providersFromEnv(env, doFetch);
  const limit = Number(env.MAX_CALLS_PER_MINUTE);
  return createHandler({
    providers,
    codeProviders: isFakeMode(env.AI_FAKE) ? undefined : providersFromEnv({ ...env, AI_ORDER: env.AI_CODE_ORDER || CODE_ORDER }, doFetch),
    allowOrigin: env.ALLOWED_ORIGIN || '',
    maxCallsPerMinute: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  });
}
