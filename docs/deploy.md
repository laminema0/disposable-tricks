# Putting Disposable Tricks online

Everything is ready on this computer. Nothing has been published yet. These steps put the game and its AI online, for free, at an address like `https://disposable-tricks.pages.dev`. Plan on about 20 minutes the first time and one command for each update after that.

## How it is set up

The game and the AI both live in one **Cloudflare Pages** project. Pages serves the game's files (the `dist` folder that `npm run build` makes), and the file `functions/api/make.ts` runs the AI at `/api/make` on the same address. The game's content policy only allows calls to its own address, and the privacy page promises exactly that, so this keeps everything in one place. The AI keys are kept by Cloudflare as encrypted secrets. They are never in a file that gets uploaded.

Cost: nothing on the free plan. Game files are free and not counted. The AI function gets 100,000 calls a day, far more than Groq's free limit of about 200 games a day.

## What you need

- Your Cloudflare account. You already have one: it is where the Workers AI key came from.
- The keys in `server/.env`, the same file the dev server uses.
- A terminal open in the `disposable-tricks` folder. In VS Code: Terminal, New Terminal. Run every command below from there.

**Live since 20 October 2026: https://disposable-tricks.pages.dev**

**Windows PowerShell:** if it says running scripts is disabled, type `npx.cmd` instead of `npx` and `npm.cmd` instead of `npm`.

## The first time

### 1. Sign Wrangler in to Cloudflare

Wrangler is Cloudflare's tool. It is already installed in this project.

```bash
npx wrangler login
```

A browser page opens. Sign in to Cloudflare and click **Allow**. The terminal then says you are logged in.

### 2. Create the project

```bash
npx wrangler pages project create disposable-tricks --production-branch main
```

The name `disposable-tricks` becomes the address `disposable-tricks.pages.dev`. If Cloudflare says the name is taken, pick another one, for example `disposable-tricks-amin`, and put the same name on the `name =` line of `wrangler.toml`.

### 3. Add the AI keys as secrets

Run these one at a time. Each one asks for the value. Paste it from `server/.env` (the text after the `=` sign) and press Enter. What you paste is not shown on screen, which is normal.

```bash
npx wrangler pages secret put GROQ_API_KEY --project-name disposable-tricks
```

```bash
npx wrangler pages secret put CLOUDFLARE_ACCOUNT_ID --project-name disposable-tricks
```

```bash
npx wrangler pages secret put CLOUDFLARE_API_TOKEN --project-name disposable-tricks
```

The other settings (`AI_ORDER` and `MAX_CALLS_PER_MINUTE`) are not secret. They are already in `wrangler.toml` and go up with the game.

You can also add the keys on the website instead. Go to dash.cloudflare.com, then **Workers & Pages**, then **disposable-tricks**, then **Settings**, then **Variables and Secrets**. Click **Add**, choose type **Secret**, and use the same three names.

### 4. Put the game online

```bash
npm run deploy
```

This checks the code, builds the game and uploads it with the AI function. At the end it prints the address. The first upload can take a minute before the address answers.

### 5. Check it on your phone

1. Open the address on your phone and turn it sideways.
2. Make a game with the four taps. Then make one with your own words in the text field. If the AI is working, the options and the name follow what you wrote.
3. Open **Privacy** from the pick screen and read it once more.
4. Optional: in Safari, Share, then **Add to Home Screen**. On Android, menu, then **Add to Home screen**.

If the game works but your written wishes are only read word by word, the AI is not answering. Check the three secrets in step 3, then run `npm run deploy` again. A new secret only reaches the game with the next upload.

## Updating the game later

After any change:

```bash
npm run deploy
```

That is all. Every upload is kept. To go back to an earlier one: dash.cloudflare.com, **Workers & Pages**, **disposable-tricks**, **Deployments**, then the **...** menu next to the one you want, then **Rollback**.

Returning players only download what changed. Phaser, the game engine and the biggest part of the download, has its own file. That file stays cached on their phones from one update to the next.

## Trying the built game on your computer first

To see exactly what will go online, including the AI function and the security headers:

```bash
npm run preview:host
```

Then open http://localhost:8788. With no secrets on this computer the AI answers "unavailable" and the game makes everything itself. To try the real AI here as well, create a file `.dev.vars` in this folder with the same three lines as in `server/.env`. It is listed in `.gitignore` and never uploaded. Stop the preview with Ctrl+C.

## A domain of your own (optional)

Buy the domain from any registrar. Then go to dash.cloudflare.com, **Workers & Pages**, **disposable-tricks**, **Custom domains**, **Set up a custom domain**, and follow the steps. HTTPS is free and automatic. Nothing in the code has to change.

## If something goes wrong

| What you see | What to do |
|---|---|
| `npm run deploy` stops at "tsc" with red errors | The code has a type error. Send the output to Claude. Nothing was uploaded. |
| "Not logged in" or "Authentication error" | Run `npx wrangler login` again. |
| "Project not found" | The name in `wrangler.toml` and in the commands has to match the project from step 2. |
| The written wishes never use the AI | Check the secrets (step 3), then deploy again. Check the Groq usage page in case the day's free limit is used up. |
| A key has leaked or was changed | Make a new key on the service, run its `secret put` command again, then `npm run deploy`. |

## Later: deploy from GitHub instead

Once the project is in its own GitHub repository (see launch.md, section 4), Cloudflare can build it on every push. On the website: **Workers & Pages**, **Create**, **Pages**, **Connect to Git**. Choose the repository, set the build command to `npm run build` and the output folder to `dist`. The secrets from step 3 stay as they are. Until then, `npm run deploy` from this computer does the same job.

## What is in the project for this

| File | What it does |
|---|---|
| `wrangler.toml` | The Pages project: its name, the `dist` folder, and the settings that are not secret. |
| `functions/api/make.ts` | The AI function at `/api/make`. It hands each request to `server/src/worker.ts`. |
| `.env.production` | Tells the built game where the AI is (`VITE_AI_URL=/api/make`). Leave it empty and the game never calls the AI. |
| `public/_headers` | Security headers and caching for every file. |
| `vite.config.ts` | Phaser in its own long-cached file, and the build of Phaser without the physics engine the game does not use. |
| `package.json` | `npm run deploy` and `npm run preview:host`. |
| `server/wrangler.toml` | Only for the other way, the AI as a separate Worker on its own address. Not needed with Pages. |
