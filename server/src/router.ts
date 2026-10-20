// The router: ask one provider, and if it is slow, failing or answers nonsense, ask the next.
// A provider that failed is left alone for a while, so later requests do not wait on it.

export interface Prompt {
  system: string;
  user: string;
  /** The most tokens the answer may have. Left out, the provider's usual limit applies. */
  maxTokens?: number;
  /** How free the answer may be, 0 to 1. Left out: 0.9. */
  temperature?: number;
  /** Called with the tokens a provider says the call used (question and answer together). */
  onUsage?: (tokens: number, provider: string) => void;
}

/** Limits for one question that differ from the router's usual ones. */
export interface AskOptions {
  timeoutMs?: number;
  budgetMs?: number;
}

export interface Provider {
  name: string;
  /** The provider's raw text answer. May throw, and must stop when `signal` aborts. */
  ask(prompt: Prompt, signal: AbortSignal): Promise<string>;
}

/** An error from a provider. `status` is the HTTP status when there was one. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface RouterOptions {
  /** How long one provider gets, in milliseconds. */
  timeoutMs?: number;
  /** How long the whole request may take across all providers, in milliseconds. */
  budgetMs?: number;
  /** How long a provider rests after an error, and after "too many requests" (HTTP 429). */
  restMs?: number;
  restAfterLimitMs?: number;
  now?: () => number;
}

export interface Routed<T> {
  value: T;
  provider: string;
}

export interface Router {
  /**
   * Ask the providers in order until one gives an answer that `accept` takes.
   * `accept` returns undefined for an answer it cannot use. Resolves to undefined when nobody could help.
   */
  ask<T>(prompt: Prompt, accept: (text: string) => T | undefined, limits?: AskOptions): Promise<Routed<T> | undefined>;
  /** The providers that are not resting right now. */
  ready(): string[];
}

export function createRouter(providers: Provider[], options: RouterOptions = {}): Router {
  // A model that thinks before it answers needs several seconds with a full prompt: a short limit made
  // every answer look like an outage (18 Oct). One slow answer rests a provider only briefly.
  const timeoutMs = options.timeoutMs ?? 9000;
  const budgetMs = options.budgetMs ?? 15_000;
  const restMs = options.restMs ?? 8000;
  const restAfterLimitMs = options.restAfterLimitMs ?? 60_000;
  const now = options.now ?? Date.now;
  const restUntil = new Map<string, number>();
  const resting = (provider: Provider) => (restUntil.get(provider.name) ?? 0) > now();

  return {
    ready: () => providers.filter((provider) => !resting(provider)).map((provider) => provider.name),

    async ask(prompt, accept, limits = {}) {
      const deadline = now() + (limits.budgetMs ?? budgetMs);
      for (const provider of providers) {
        if (resting(provider)) continue;
        const left = deadline - now();
        if (left <= 0) break;

        const control = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            control.abort();
            reject(new ProviderError('timeout'));
          }, Math.min(limits.timeoutMs ?? timeoutMs, left));
        });
        try {
          const text = await Promise.race([provider.ask(prompt, control.signal), timeout]);
          const value = accept(text);
          if (value !== undefined) return { value, provider: provider.name };
          // An answer we cannot use is not an outage: move on, but do not rest the provider.
        } catch (error) {
          const limited = error instanceof ProviderError && error.status === 429;
          restUntil.set(provider.name, now() + (limited ? restAfterLimitMs : restMs));
        } finally {
          clearTimeout(timer);
        }
      }
      return undefined;
    },
  };
}
