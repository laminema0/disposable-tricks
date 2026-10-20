# Disposable Tricks: phones, hosting and the move to its own repository

Written 12 October 2026 by the app-shell session. Nothing here has been deployed, no account was made and the folder has not been moved.

## 1. What phones allow

Checked against MDN's browser support data (version 8.1.5, dated 8 October 2026), Apple's Safari web app documentation and the WebKit bug tracker.

| | iPhone, Safari tab | iPhone, from the home screen | Android, Chrome tab | Android, installed from Chrome |
|---|---|---|---|---|
| Full screen | No. The full screen feature exists on iPad only. The address bar shrinks when the phone is sideways but does not go away. | Partly. It opens without Safari's bars ("standalone"). True full screen is not supported. | Only after a tap, through the "Turn it for me" button. | Yes. The manifest asks for full screen and Chrome follows it. |
| Rotation lock | No. | No. iPhone ignores the manifest's `orientation`. | Only together with full screen, so through the same button. | Yes. The manifest asks for landscape and Chrome follows it. |
| How it gets on the home screen | | By hand: Share, then "Add to Home Screen". Safari never offers it by itself. | | Menu, then "Add to Home screen" or "Install app". |

What this means in practice:

- **iPhone can always be held upright**, in Safari and from the home screen. The "turn your phone" screen is the only answer there, so it is not optional.
- **An iPhone with rotation lock switched on never turns.** The player would look at the turn screen for ever, so that screen says "Nothing happens? Switch off rotation lock."
- **Android from the home screen is the best case**: full screen and locked sideways, no turn screen needed.
- **Android in a browser tab** gets the turn screen with one extra button, "Turn it for me", which goes full screen and turns the picture. The button only appears where the browser can do it, so it never shows on an iPhone.
- There is no offline mode. The app needs a connection each time it is opened. A later task could add one.

Sources:
- https://github.com/mdn/browser-compat-data (manifest `orientation`, manifest `display`, `Element.requestFullscreen`, `ScreenOrientation.lock`)
- https://bugs.webkit.org/show_bug.cgi?id=257695 (rotation lock on iPhone waits for full screen, which iPhone does not have)
- https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html (home screen icon and standalone mode)
- https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock

## 2. What was built for phones

| Piece | Where |
|---|---|
| "Turn your phone" screen (touch devices held upright only; pauses a running game) | `src/shell/turn.ts`, `src/shell/shell.css` |
| "Ages 16 and up · Privacy" line (pick screen rail; first title card when a visit starts from a share link) | `src/shell/legal.ts` |
| Manifest: landscape, full screen, dark colours | `public/manifest.webmanifest` |
| Icons: the hero's flower | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `icon.svg`. Redraw them with `node scripts/make-icons.mjs`. |
| Privacy page | `public/privacy.html` (its fonts are in `public/fonts/`) |
| Host settings | `wrangler.toml`, `public/_headers`, `.node-version` |

The home screen name is "Tricks", because phones cut names longer than about 12 letters. Change `short_name` in the manifest and `apple-mobile-web-app-title` in `index.html` if another short name is better.

## 3. Hosting: the three free hosts

| | Cloudflare Pages | Netlify | GitHub Pages |
|---|---|---|---|
| Free static site | Yes. Requests for static files are free and not counted. 500 builds a month. | Yes, but the free plan now runs on monthly credits. When they run out the site is paused until the next month. | Yes. Soft limits: 1 GB site, 100 GB a month. |
| One small server function later (for the AI calls) | Yes. "Pages Functions", 100,000 calls a day on the free plan. Secret keys are set in the dashboard. | Yes, counted against the same credits. | **No.** Static files only. The AI function would need a second service. |
| Private repository on the free plan | Yes | Yes | No. The repository has to be public. |
| Own domain and HTTPS | Free | Free | Free |
| Extra | One of the AI candidates in the brief (Workers AI) lives in the same account. | | Its terms say it is not meant for commercial services. |

Cloudflare and GitHub figures come from their own documentation. The Netlify credit figures come from third-party summaries and Netlify's blog, and should be read again on netlify.com before anyone relies on them.

**Recommendation: Cloudflare Pages.** It is the only one of the three with no monthly cut-off for a static site, and the AI function can live in the same project later, at the same address, which keeps the privacy page simple.

Sources:
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://www.netlify.com/blog/introducing-netlify-free-plan/

### What is ready for Cloudflare

- `wrangler.toml`: tells Cloudflare the site is the `dist` folder.
- `.node-version`: asks for Node 22 when Cloudflare builds.
- `public/_headers`: security headers. The content policy lets the app load from its own address only. It was tested locally against the built site: the game, the fonts, the icons and the privacy page all load with no blocked request.

For the AI session: on Cloudflare Pages a function is a file in a `functions/` folder at the top of the project (`functions/api/ai.ts` answers at `/api/ai`). The content policy allows calls to the app's own address only, so the function has to be reached at the same address as the site, which Pages Functions do by default.

### What Amin does himself (after the move in section 4)

Superseded on 19 October 2026 by `DEPLOY.md`, which deploys from this computer without the move and includes the AI function. The steps below are the GitHub way.

1. Make a free Cloudflare account at cloudflare.com.
2. In the dashboard: Workers & Pages, Create, Pages, "Connect to Git". Allow access to the `disposable-tricks` repository only.
3. Build command `npm run build`, output folder `dist`. Save and deploy.
4. The game is then live at an address like `disposable-tricks.pages.dev`. If that name is taken, Cloudflare proposes another.
5. A domain of your own is optional and can wait for task 5.7: buy it at any registrar, then add it under the project's "Custom domains".
6. Before launch, read the privacy page once more (section 5).

## 4. Moving the project into its own repository

Do this only when no session is writing in the folder. The folder was never committed in the HealthySongs repository, so nothing has to be removed from that repository's history.

1. Stop the dev server (the terminal running `npm run dev`).
2. Delete the two folders that are rebuilt anyway. In the `disposable-tricks` folder:
   ```bash
   rm -rf node_modules dist
   ```
3. Move the folder out of `music`, next to it:
   ```bash
   mv "C:/Users/aminr/OneDrive/Desktop/music/disposable-tricks" "C:/Users/aminr/OneDrive/Desktop/disposable-tricks"
   ```
   A folder outside OneDrive (for example `C:/Users/aminr/dev/disposable-tricks`) is better still: OneDrive tries to sync the thousands of small files that `npm install` creates.
4. In the new folder, open `.gitignore` and replace the line `.claude/` with `.claude/settings.local.json`, so the preview settings in `.claude/launch.json` are kept.
5. Start the repository and check that everything still works:
   ```bash
   git init -b main
   ```
   ```bash
   npm install
   ```
   ```bash
   npm test
   ```
   ```bash
   npm run build
   ```
6. First commit (no co-author line):
   ```bash
   git add -A
   ```
   ```bash
   git commit -m "Disposable Tricks: the maker, the base game and the phone shell"
   ```
7. Amin: make a new empty repository on github.com named `disposable-tricks` (private is fine, no README, no licence). Then, with your own user name in the address:
   ```bash
   git remote add origin https://github.com/YOUR-NAME/disposable-tricks.git
   ```
   ```bash
   git push -u origin main
   ```
8. In the `music` folder, check that the old folder is gone:
   ```bash
   git status
   ```
   `disposable-tricks/` should no longer be listed.
9. Open the new folder as its own project in Claude. For the parent session: Claude's saved notes are tied to the `music` folder. Copy the notes that belong to this project (the Disposable Tricks progress tracker, the Instant Games project, the design style and design craft notes, the no-co-author rule) into the new project's memory, and correct the paths in them. The shared hand-over notes of these sessions live outside the repository and do not move.
10. Update `README.md`: the "Run it" section and the brief's open question 4 can drop the remark about living inside another folder.

## 5. The privacy page: what must stay true

Every sentence on `public/privacy.html` was checked against the code on 12 October 2026: the app makes no network request of its own, writes nothing to the browser's storage and sets no cookie.

Things that would make the page wrong, and what to do then:

- **The AI text box.** Once typed text is sent to an AI service, the sentence "Your picks and the way you play are not sent anywhere" stops being true. The page then needs one more entry that names what is sent (the typed text and the picks), to whom, and that it is not kept with anything that identifies the player. Change the date at the bottom as well.
- **Play counts or any analytics.** The brief mentions anonymous play counts. The page says there are none.
- **Anything saved in the browser**, such as a remembered sound setting.

Open points for Amin, not decided here:

- The page names no person and gives no contact address. Depending on where you live, a public site may need one (in Germany, an Impressum). This is worth asking someone who knows the law before the public launch.
- Once the host is chosen, the entry "What no website can avoid" can name it.
