// The AI function on Cloudflare Pages. A file here answers at the same address as the game:
// functions/api/make.ts answers at /api/make, which is where the built game sends its requests
// (VITE_AI_URL in .env.production). Everything else on the site stays plain static files.
// The keys are secrets in the Cloudflare dashboard (see DEPLOY.md), never in a file.

import worker from '../../server/src/worker';
import type { Env } from '../../server/src/providers';

export const onRequest = (context: { request: Request; env: Env }) => worker.fetch(context.request, context.env);
