// Runs the server function inside the Vite dev server, at /api/make and /api/look.
// So "npm run dev" is all that is needed: one address, one port, and the keys in
// server/.env stay on this computer. A built site does not contain any of this.

import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const ROUTES = ['/api/make', '/api/look'];

export function aiDevServer() {
  return {
    name: 'disposable-tricks-ai',
    apply: 'serve',
    configureServer(server) {
      // Read on every request, so a key added to server/.env works without a restart.
      const readEnv = () => loadEnv('', fileURLToPath(new URL('.', import.meta.url)), '');
      const load = () => server.ssrLoadModule('/server/src/dev.ts');
      load().then(
        (dev) => server.config.logger.info(`  AI: ${dev.describe(readEnv())}`),
        (error) => server.config.logger.error(`  AI: could not start (${error.message})`),
      );

      server.middlewares.use(async (req, res, next) => {
        const route = req.url?.split('?')[0];
        if (!route || !ROUTES.includes(route)) return next();
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const dev = await load();
          const reply = await dev.handle(
            new Request(`http://localhost${route}`, {
              method: req.method,
              headers: Object.entries(req.headers).filter(([, value]) => typeof value === 'string'),
              body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
            }),
            readEnv(),
          );
          res.statusCode = reply.status;
          reply.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(await reply.text());
        } catch {
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}
