# Disposable Tricks

The game maker described in [BUILD_BRIEF.md](BUILD_BRIEF.md). What is built and what is left is tracked in [PROGRESS.md](PROGRESS.md). Launch steps are in [LAUNCH.md](LAUNCH.md) and the AI key steps in [server/README.md](server/README.md).

Built so far: the player makes a game in five steps, by tapping cards or by writing what they want at any step; an AI proposes each step's cards from the answers so far and turns written wishes into scenery, monsters and weapons from our own library. The game is then played against five kinds of monsters with petals as hearts, won or lost, and shared with a link.

## How a game is made

1. Five steps: Mood, World, Monsters, Weapon, Twist. At each one, tap a card or write in the field under the cards.
2. Each answer shapes the next step. From the second step on, the cards are proposed by the AI from what was chosen so far. If the AI does not answer within about two seconds, our own cards are shown instead (they also change with the mood).
3. A written wish can answer several steps at once: "a town with tall buildings and a bow" fills World and Weapon. A line beside the question then says what was understood, for example "Buildings · Bow, shoots far", and names anything that could not be built.
4. "Surprise me" fills all five. Then a title card, then the game.
5. At the end of the road (or from "Menu"): play again, remix one choice, copy the share link, or start a new game.

Described monsters, atmosphere and guns: at the Monsters step a player can describe a monster ("a tall three-eyed thing that floats"); at the Mood step the air ("a foggy green swamp"); at the Weapon step a weapon ("a gun"). A game can be kept with Save on its menu and found again under "Saved" on the first screen; it stays on the device and can be deleted there.

The first question is "What do you want to play?": the base adventure, five starter games of ours that play at once (Road, Flying, Space shooter, Puzzle, Catch), or anything the player writes. A written wish is always made into its own game: the AI takes the nearest starter (`src/trick/starters.ts`) and changes it.

Wishes the blocks cannot express ("flying cars"): the AI writes the game as one small script. This takes a few seconds ("Writing your game…"). The script is test-run and then played in a locked frame (`public/trick-frame.html`) that has no network and cannot reach the page. If it cannot be made to work, the nearest game from the blocks is made instead. The API a script may use is in `src/trick/reference.ts`.

What the AI may do with the blocks: pick from our library, set a few numbers, and compose flat silhouettes from simple shapes (boxes, circles, triangles, lines) for monsters, scenery and weapons. That is data, not code: it is clamped, shrunk to fit and repaired like everything else. Scenery is up to three of buildings, houses, towers, ruins, trees, mountains, bridges and fences, each with an amount and a size. A weapon is a kind (melee, ranged, thrown, none), one of our nine shapes, a reach, a speed, a power and a name. It never writes code and never draws. Twist cards always keep our own words, because they state a rule of the game.

The address bar always holds the share link of the game on screen. Opening such a link plays that exact game with no maker screen. Everything sits after the `#`, which browsers never send to a server. Nothing is stored. A written wish is never put in the link. While a game is being made, the choices so far and any written wish are sent to the AI server function (see [public/privacy.html](public/privacy.html)).

Open the page with `?ai=off` to make everything locally with nothing sent, or `?ai=fake` to use canned answers instead of a real AI.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5183 in a browser.

To try it on a phone on the same Wi-Fi, run `npm run dev:phone` and open the "Network" address it prints. Hold the phone sideways.

```bash
npm test
```

runs the unit tests. `npm run build` makes the static site in `dist/`.

## Controls

| Touch | Keyboard | Action |
|---|---|---|
| Hold the right half | D or → | Go forward |
| Hold the left half | A or ← | Go back |
| Drag up | W, Space or ↑ | Jump |
| Drag down and keep holding | S or ↓ | Lie down. At a rock, pillar or crate he crouches behind it. In a hide spot in low light this hides him. |
| While lying, slide the same finger sideways | S with A or D | Crawl that way, slowly. Slide back to the middle to stop. A second finger held on one side also works. |
| Quick tap | J or Enter | Use the weapon: strike, shoot or throw |
| | Q | Show or hide the debug readout |
| | M | Sound on or off |

Add `?debug=1` before the `#` in the address to start with the debug readout on.

## Where things are

- `src/settings/schema.ts`: the settings file, one small object that fully describes a game (brief 5.2).
- `src/settings/defaults.ts`: the default game, and what each mood brings (palette, lights, hero in colour).
- `src/settings/validate.ts`: the validator. Anything invalid or missing is repaired with defaults (pure, tested).
- `src/settings/share.ts`: share-link encoding and decoding (pure, tested).
- `src/settings/options.ts`: the five steps, our own cards for each, and how a card's "patch" is read and applied (pure, tested).
- `src/settings/title.ts`: the pre-made game names.
- `src/ai/`: asks the server function for suggestions, and falls back to a local keyword match when there is no AI.
- `server/`: the AI server function (router, cache, text filter, fake provider). See its own README.
- `src/shell/`, `public/`: turn-your-phone screen, home-screen manifest and icons, privacy page.
- `src/ui/`: the pick screen, title card, end card, and the flow between them (`app.ts`). Fonts are bundled, not loaded from the network.
- `src/game/look.ts`: turns the six palette slots into every colour the game draws with (pure, tested).
- `src/game/config.ts`: every number to tune (speed, jump, strike, light thresholds, touch thresholds).
- `src/core/light.ts`: the light-level function (pure, tested).
- `src/core/input.ts`: tap, hold and drag classification (pure, tested).
- `src/core/sfx.ts`: the sounds (splash, step, landing, sword), made in code until real recordings exist.
- `src/core/controls.ts`: connects fingers and keys to the game.
- `src/game/level.ts`: the five chunk types and the seeded level builder. The settings decide which kinds of light appear and how many (pure, tested).
- `src/game/creatures.ts`, `src/game/creatureView.ts`: described monsters as building blocks (pure, tested) and how they are drawn.
- `src/game/recipeDraw.ts`: draws a silhouette composed from simple shapes.
- `src/settings/shelf.ts`: "My games", kept on the device only (pure, tested).
- `src/game/sight.ts`: where each monster looks, as a shape (pure, tested). The same shapes are drawn in the game.
- `src/game/scenery.ts`, `src/game/sceneryView.ts`: where the scenery stands (pure) and how each kind is drawn.
- `src/game/hero.ts`: the hero's movement and his placeholder drawing.
- `src/game/textures.ts`: the flat white placeholder shapes, tinted at run time.
- `src/game/GameScene.ts`: draws the level, runs the hero, camera and debug readout.
