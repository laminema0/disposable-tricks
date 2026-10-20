// Settings for the provider test ("npm run test:providers"). It reads the keys from
// server/.env and runs one call at a time, so the free limits are respected.

import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    environment: 'node',
    include: ['server/providers.live.test.ts'],
    env: loadEnv('', here, ''),
    testTimeout: 60_000,
    fileParallelism: false,
    reporters: ['verbose'],
  },
});
