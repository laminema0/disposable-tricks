// A monster's generated look on Cloudflare Pages: /api/look, beside the AI at /api/make (server/src/look.ts).

import worker from '../../server/src/worker';
import type { Env } from '../../server/src/providers';

export const onRequest = (context: { request: Request; env: Env }) => worker.fetch(context.request, context.env);
