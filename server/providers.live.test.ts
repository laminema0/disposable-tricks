// The provider test: runs the fixed test set against every real provider that has a key
// in server/.env. A provider must pass all of it before it goes into AI_ORDER.
//
//   npm run test:providers
//
// It makes about 14 small calls per provider and waits between them, so it stays
// inside the free limits. It takes about two minutes per provider.
// To try the script itself without any key:  PROVIDER_TEST_FAKE=good npm run test:providers

import { describe, expect, it } from 'vitest';
import { fakeProvider, isFakeMode } from './src/fake';
import { PROVIDER_NAMES, providersFromEnv, type Env } from './src/providers';
import type { Provider } from './src/router';
import { judge, promptFor, TEST_SET } from './src/testset';

const env = process.env as Env;
const fake = env.PROVIDER_TEST_FAKE;
// Every provider with a key is tested, whether or not it is in AI_ORDER yet.
// To test only some of them:  PROVIDER_TEST_ONLY=groq,cloudflare npm run test:providers
const providers: Provider[] = isFakeMode(fake)
  ? [fakeProvider(fake, `fake (${fake})`)]
  : providersFromEnv({ ...env, AI_ORDER: env.PROVIDER_TEST_ONLY || PROVIDER_NAMES.join(',') });

const pauseMs = Number(env.PROVIDER_TEST_PAUSE_MS ?? (isFakeMode(fake) ? 0 : 7000));
/** The slowest answer we accept. The game waits less than this before it falls back. */
const TOO_SLOW_MS = 3000;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

if (providers.length === 0) {
  describe('provider test', () => {
    it('needs at least one key in server/.env (copy .env.example and fill it in)', () => {
      console.log('\nNo keys found in server/.env, so there is nothing to test yet.\n');
    });
  });
}

for (const provider of providers) {
  describe(`provider: ${provider.name}`, () => {
    for (const test of TEST_SET) {
      it(test.name, async () => {
        await pause(pauseMs);
        const started = Date.now();
        const answer = await provider.ask(promptFor(test), AbortSignal.timeout(20_000));
        const took = Date.now() - started;
        console.log(`TOOK ${provider.name} | ${test.name} | ${took} ms`);
        const wrong = judge(test, answer);
        if (took > TOO_SLOW_MS) wrong.push(`too slow: ${took} ms`);
        // The answer is shown on a failure only. It can hold the test's own text, never a player's.
        expect(wrong, `${provider.name} answered:\n${answer}\n`).toEqual([]);
      });
    }
  });
}
