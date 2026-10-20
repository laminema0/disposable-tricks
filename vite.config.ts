import { defineConfig } from 'vitest/config';
import { aiDevServer } from './server/vite-plugin.mjs';

export default defineConfig(({ command }) => ({
  // Relative paths, so the built game works from any folder on a static host.
  base: './',
  // In development the AI server function runs inside this dev server, at /api/make.
  plugins: [aiDevServer()],
  server: { port: 5183, strictPort: true },
  // The game uses no physics engine, so the built game takes Phaser's own build without
  // Matter physics (about 110 KB lighter). Types still come from "phaser" as before.
  // Build only, so the dev server and the tests are unchanged.
  resolve:
    command === 'build'
      ? { alias: [{ find: /^phaser$/, replacement: 'phaser/dist/phaser-arcade-physics.min.js' }] }
      : undefined,
  build: {
    // Phaser is most of the download and almost never changes. In its own file it keeps the
    // same name from one update of the game to the next, so a returning player's phone keeps
    // it (public/_headers caches assets/ for a year) and only fetches the game's own code.
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ }] } },
    },
    // Phaser alone is about 1.1 MB before compression; that is expected, not a warning.
    chunkSizeWarningLimit: 1200,
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
}));
