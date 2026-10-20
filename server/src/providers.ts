// The real providers. Groq, Cloudflare Workers AI, OpenRouter and Google Gemini all
// speak the same "chat completions" format, so one small adapter covers all four.
// Keys come from environment variables only (see .env.example). A provider with no key is left out.

import { ProviderError, type Provider } from './router';

export type Env = Record<string, string | undefined>;

interface ChatConfig {
  name: string;
  url: string;
  key: string;
  model: string;
  /** Ask for a JSON object in the request itself. Not every service accepts this. */
  jsonMode: boolean;
  /** Extra request fields only this service understands. */
  extra?: Record<string, unknown>;
}

function chatProvider(config: ChatConfig, doFetch: typeof fetch): Provider {
  return {
    name: config.name,
    async ask(prompt, signal) {
      const reply = await doFetch(config.url, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.key}` },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          temperature: prompt.temperature ?? 0.9,
          max_tokens: 2500,
          ...(config.jsonMode ? { response_format: { type: 'json_object' } } : {}),
          ...config.extra,
          ...(prompt.maxTokens ? { max_tokens: prompt.maxTokens } : {}),
        }),
      });
      if (!reply.ok) {
        // Groq's strict JSON check sometimes turns down a good answer over a small slip, and hands the answer
        // back with the error. It is used like any answer: checked and repaired before anything is built from it.
        // Nothing else of an error is read or logged: it can echo the request.
        if (reply.status === 400) {
          const error = (await reply.json().catch(() => undefined)) as { error?: { code?: unknown; failed_generation?: unknown } } | undefined;
          const kept = error?.error?.code === 'json_validate_failed' ? error.error.failed_generation : undefined;
          if (typeof kept === 'string' && kept) return kept;
        }
        throw new ProviderError(`${config.name} answered ${reply.status}`, reply.status);
      }
      const data = (await reply.json()) as { choices?: { message?: { content?: unknown } }[]; usage?: { total_tokens?: unknown } };
      if (typeof data.usage?.total_tokens === 'number') prompt.onUsage?.(data.usage.total_tokens, config.name);
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content) throw new ProviderError(`${config.name} sent no text`);
      return content;
    },
  };
}

/**
 * The default order: the two that passed the provider test on 12 Oct 2026.
 * OpenRouter's free router failed it (slow, empty or off-topic answers) and Gemini is
 * left out on purpose (see .env.example). Both can still be named in AI_ORDER.
 */
export const DEFAULT_ORDER = 'groq,cloudflare';

const BUILDERS: Record<string, (env: Env) => ChatConfig | undefined> = {
  groq: (env) =>
    env.GROQ_API_KEY
      ? {
          name: 'groq',
          url: 'https://api.groq.com/openai/v1/chat/completions',
          key: env.GROQ_API_KEY,
          // The free plan's list of models (checked in the account, 12 Oct 2026) has no Llama.
          // This one thinks before it answers: kept short, hidden, and given room in the token limit.
          // The larger model: as quick on the free plan (18 Oct) and better at drawing what a player names.
          // Its thinking counts against the token limit, so the limit leaves room for a monster and its drawing.
          model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
          jsonMode: true,
          extra: { reasoning_effort: 'low', include_reasoning: false, max_tokens: 4000 },
        }
      : undefined,
  // For writing code: the larger model on the same free account. Only the "trick" job uses it.
  'groq-code': (env) =>
    env.GROQ_API_KEY
      ? {
          name: 'groq-code',
          url: 'https://api.groq.com/openai/v1/chat/completions',
          key: env.GROQ_API_KEY,
          model: env.GROQ_CODE_MODEL || 'openai/gpt-oss-120b',
          jsonMode: true,
          extra: { reasoning_effort: 'low', include_reasoning: false, max_tokens: 3500 },
        }
      : undefined,
  cloudflare: (env) =>
    env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID
      ? {
          name: 'cloudflare',
          url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
          key: env.CLOUDFLARE_API_TOKEN,
          model: env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
          jsonMode: true,
        }
      : undefined,
  openrouter: (env) =>
    env.OPENROUTER_API_KEY
      ? {
          name: 'openrouter',
          url: 'https://openrouter.ai/api/v1/chat/completions',
          key: env.OPENROUTER_API_KEY,
          model: env.OPENROUTER_MODEL || 'openrouter/free',
          jsonMode: false,
        }
      : undefined,
  gemini: (env) =>
    env.GEMINI_API_KEY
      ? {
          name: 'gemini',
          url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
          key: env.GEMINI_API_KEY,
          model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
          jsonMode: false,
        }
      : undefined,
};

export const PROVIDER_NAMES = Object.keys(BUILDERS);
/**
 * Who writes code, best first. Cloudflare's small model is left out: in the first trial both
 * of its scripts had syntax errors.
 */
export const CODE_ORDER = 'groq-code,groq';

/** The providers that have a key, in the order of AI_ORDER. */
export function providersFromEnv(env: Env, doFetch: typeof fetch = fetch): Provider[] {
  const order = (env.AI_ORDER || DEFAULT_ORDER).split(',').map((name) => name.trim().toLowerCase());
  const providers: Provider[] = [];
  for (const name of new Set(order)) {
    const config = BUILDERS[name]?.(env);
    if (config) providers.push(chatProvider(config, doFetch));
  }
  return providers;
}
