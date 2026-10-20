# The AI function

This folder is the only place that ever holds API keys. The browser sends it the picks so far and, if the player wrote something, their text. It answers with either the cards for the next step or a full settings file. It never returns code or art, and it stores nothing about a player.

The game works without it. If it is missing, slow or failing, the maker uses the pre-made options and reads the wish with a simple keyword match.

## Where it stands (12 October 2026)

Keys for Groq, Cloudflare and OpenRouter are in `server/.env`. The provider test was run against all three:

| Service | Result | Speed |
|---|---|---|
| Groq (`openai/gpt-oss-20b`) | 14 of 14 | about half a second |
| Cloudflare (`llama-3.1-8b-instruct-fp8-fast`) | 13 of 14 (one answer ignored part of a wish) | about one second |
| OpenRouter (`openrouter/free`) | 1 of 14: slow, empty or off-topic answers | 2 to 20 seconds |

So the order is `groq,cloudflare`. OpenRouter is left out until it passes.

## With no keys

`npm run dev` (in the project folder) runs this function inside the dev server at `/api/make`, answering from a **fake provider** with canned answers. The start-up log says `AI: fake provider ("good"). No real AI is called.`

To see each kind of failure in the browser, add one of these to the address:

| Address | What happens |
|---|---|
| `?ai=off` | No server at all. Everything is made locally. |
| `?ai=fake` | Canned answers instead of a real AI, even when keys are present. Our own cards come back in reverse order, so it is easy to tell. |
| `?ai=fail` | The provider is down. The game is made locally, at once. |
| `?ai=slow` | The provider never answers in time. The game is made locally after about 3 seconds. |
| `?ai=malformed` | The provider answers with broken text. Same result. |
| `?ai=wrong` | The provider answers with nonsense values. Same result. |
| `?wish=only` | Preview of the text box replacing the four taps (decision D1). `?wish=off` hides it. |

## What Amin has to do (once)

1. **Create the accounts.** In this order of usefulness:
   - Groq: https://console.groq.com
   - Cloudflare: https://dash.cloudflare.com (the free plan includes Workers AI)
   - OpenRouter: https://openrouter.ai . In Settings, Privacy, leave "model training" off.
   - Not Google Gemini for now. The reasons are in `.env.example` and in the comparison note.
2. **Put the keys in a file.** Copy `.env.example` to `.env` in this folder and paste each key after its name. `.env.example` says where each key is found. `.env` is never uploaded and never committed.
3. **Run the provider test** from the project folder:

   ```bash
   npm run test:providers
   ```

   It asks every provider that has a key the same 14 fixed questions and checks the answers (about two minutes per provider, well inside the free limits, though it does use 14 of OpenRouter's 50 free requests for the day). A provider that fails any of them should be left out of `AI_ORDER` in `.env`. Send the output to Claude if something fails: the test set or the prompt may need tuning for that model.
4. **Open the game.** No restart is needed: the dev server reads `server/.env` on every request. Make a few games with and without text.

To test only some services: `PROVIDER_TEST_ONLY=groq,cloudflare npm run test:providers`.

## Putting it online

Ready, not yet done: see `../DEPLOY.md`. The function runs on Cloudflare Pages through `../functions/api/make.ts`, at the same address as the game, and the built game finds it through `VITE_AI_URL=/api/make` in `../.env.production`. The keys become Pages secrets with the same names as in `.env.example`.

`wrangler.toml` and `npm run deploy` in this folder are for the other way, a separate Cloudflare Worker on its own address. That way also needs `ALLOWED_ORIGIN` set to the game's address, and the game's content policy (`public/_headers`) opened for the Worker's address.

## What is in here

- `src/handler.ts`: the function itself. Filter, saved answers, router, validator, in that order.
- `src/router.ts`: tries one provider, falls back to the next, rests a provider that failed.
- `src/providers.ts`: the four real services. One adapter, because they all speak the same format.
- `src/prompt.ts`: the words sent to a provider. The allowed values are built from the game's own option tree.
- `src/cache.ts`: saved answers, in memory only. Never anything a player wrote.
- `src/fake.ts`: the fake provider (good, malformed, wrong, slow, fail).
- `src/testset.ts` and `providers.live.test.ts`: the fixed test set and the script that runs it.
- `src/dev.ts`, `vite-plugin.mjs`: how the dev server runs the function. `src/worker.ts`: how a host runs it.
- Shared with the browser, in `../src/ai/`: the text filter, the keyword reading of a wish, and `assemble.ts`, which turns any proposal into a valid game.
