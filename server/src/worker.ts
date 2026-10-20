// The server function as a Cloudflare Worker. Deploy with "npm run deploy" in this folder.
// The keys are set as Worker secrets, never in a file that is uploaded (see README.md here).

import type { Handler } from './handler';
import type { Env } from './providers';
import { handleLook } from './look';
import { handlerFromEnv } from './setup';

let handler: Handler | undefined;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    // A monster's generated look (look.ts) has its own address beside the AI's.
    if (new URL(request.url).pathname.endsWith('/look')) return handleLook(request, env);
    // AI_FAKE is for development only. A deployed function never answers from the fake provider.
    handler ??= handlerFromEnv({ ...env, AI_FAKE: undefined });
    return handler(request);
  },
};
