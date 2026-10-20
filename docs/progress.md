# Disposable Tricks: where we are

Last updated: 13 October 2026, after Amin's first play-test (the maker and stealth were reworked; see build-brief.md section 10).

**What "done" means is set by [design-decisions.md](design-decisions.md).** Where it differs from this list or from the brief, it wins.

This is the one list we track progress on. Every work session reads it first and updates it last.
The full design is in [build-brief.md](build-brief.md) and on the [FigJam board](https://www.figma.com/board/N7rWnbbznoWuKkfgeve94S). Launch steps are in [launch.md](launch.md), AI key steps in [server/README.md](../server/README.md).

Status words: **Done** = built and checked in the browser. **Partly** = some of it works, the rest is listed. **Not started**. **Waiting** = needs a decision or an action from Amin first.

"Checked in the browser" means driven by script at phone size on a computer. **Nothing has been tried on a real phone yet.**

## The goal

A web app where a player makes their own small 2D game and plays it at once.
They pick options, each pick changes the options that come next, and they can also write what they want.
An AI turns the picks and the text into a game made for them, using our art and our rules.
The dark side-scroller with the flower boy is the base example the AI starts from. It is not the product; the maker is.
The game can then be shared with a link. No sign-in, no data collected, ages 16+.

## Where we are in one line

A player makes a game in five steps by tapping or writing; a real AI (Groq, then Cloudflare) proposes each step's cards and turns wishes into atmosphere, scenery, monsters of the player's own description and weapons including guns. Games can be saved on the device and deleted. Riding, driving and roads are next and not built. Nothing is online yet, and none of this has been tried on a phone.

## What Amin has to do himself

| # | Action | Where the steps are |
|---|---|---|
| A1 | Try the game on a phone held sideways (`npm run dev:phone`) | README.md |
| A2 | Done on 13 Oct for Groq and Cloudflare (keys are in `server/.env`, used on this computer only) | server/README.md |
| A3 | Create an empty `disposable-tricks` repository on GitHub and a free Cloudflare account | launch.md |

## Order of work (changed on 13 October)

Amin asked for one step at a time, each checked before the next. After the first trial showed that the AI's written games were plain and often empty, "make written games good" was put ahead of the visuals pass, because it is the heart of the product.

1. The AI-writes-code path. **Done.**
2. The first ten-wish trial. **Done** (first table below).
3. Make written games good: a first question, starter games, our art inside written games, a playability check, a better model, a second trial. **Done** (second table below).
4. Visuals pass. **Done, except the kit of parts for described monsters** (see below).
5. Merged monsters and bosses: **done**. The maker screens and the scenario as a choice: **done 15 Oct** (below). Other genres inside the adventure: not started.

## The calm maker (17 October 2026, Amin's redesign)

- **One game.** The first question ("What do you want to play?") and the other genres are gone from the maker. src/trick stays, unused by the maker; old links with a written game still open.
- **A branching tree of questions** (src/settings/tree.ts, tested): What kind of night? (Calm, Bright, Eerie, Fierce) → the place, offered and asked according to the night ("What is burning?" after Fierce) → the monsters that live in that place ("What walks the streets?": Stalkers, Watchers, Crawlers, All five) → what he carries, by how the monsters come at him (up close: Knife, Sword, Spear, Axe; from above: Bow, Gun, Sling, Stone; both: Knife, Gun, Sword, Stone, Amin's four) → how he looks ("Knife in hand. How does he look?": grey or in colour, with or without the cape). Five questions on every path; every option is something the game builds.
- **Four options and a written fifth**, as five equal rows over the live scene. A written answer goes to the AI as a change to that one part of the game only (the other parts are locked). Checked with the real AI: "shotgun" gave a weapon named Shotgun that shoots far; "a pen" gave a Pen (drawn for now as the nearest stick the game has). The look is read by our own words (cape, no cape, grey, colour). When something cannot be built, one plain line under the question says so.
- **Calm look:** the night palette, one accent, Newsreader and Instrument Sans, one spacing rhythm, the answers so far listed on the left in the same words as the cards.
- **Cards for an endless game:** the title card adds "The road goes on. Each gate is a new chapter." The end card says "The flower grows" with "Chapter 3 · 1,240 m · 12 monsters defeated" once the game reports chapter and distance, and offers Play again, Change this game, Share, Save, New game. Remix is gone.
- **Change this game** is on the pause card and the end card. After a run has ended a change starts a fresh run. A change that would turn the adventure into another kind of game is not made.

Looked at on screen: the maker at 568x320, 757x387, 844x390 and 1280x720 (nothing cut, no scrolling); a full path Fierce → Ruins → Watchers → Gun → look with the scene following each answer; written "shotgun" and "a pen"; the title card; the pause card; the end card (with a chapter and distance sent by hand); "snow" written on the end card with the real AI, which started a fresh run in snow.
Not looked at: a run that really ends in the endless game; the change box at 568x320; a written monster or place answer.

## The maker screens and the story (15 October 2026)

- **The first screen no longer overlaps.** The cards are glass over the scene, two to a row, and every name and line fits on one line at 568x320, 757x387, 844x390 and 1280x720. On a small phone the step names drop their answers and "Saved" sits under the name.
- **The game being made stands behind the questions.** For the adventure it is the real game, drawn as in play: the hero stands in the open space between the steps and the cards with his chosen weapon, the chosen monsters stand in front of him, and the mood, world and weather change as they are picked. For a game of its own, its frame shows its backdrop, the hero in his vehicle and its monsters.
- **The story is a step: "How does it end?"** The flower (the ending Amin decided, still the default), Home (he walks into the light and lives), or The hunt (the end stays closed until every monster has fallen; not offered without a weapon). Written words choose one of them and become the line on the title card. For a game of its own the step offers "As it is" or the player's own ending, which the AI writes into the game. The story travels in the share link.
- **The winged tall walker** (Flyer + Stalker) now swipes down from the air when he is close; lying flat avoids it.
- **The ending:** what is left of him kneeling fades into a drift of petals as the flower opens. The end card says "Home at last" for Home.
- **Flying games** are high in the sky over a floor of moving cloud, with no ground underneath.
- A bug fixed on the way: going back to the first question and picking a starter left the screen on the twist question.

Looked at on screen: the first question at four sizes; the adventure's scene following every step (Fierce turned it red, Eerie green, monsters and weapon appeared); the Space shooter's scene; the story step at 844x390 and 568x320; the Home ending in play.
Not looked at: the hunt in play, the petal fade in the flower ending, the Flying game's cloud floor, the Road, Flying, Puzzle and Catch scenes behind the questions, a written story rewritten by the AI, and the boss after it was made harder (the other session began reworking how the game plays before this could be done, so the game files were left to it).

## Merged monsters and the boss (13 October 2026) - built, not fully checked

- **The kit** (src/game/kit.ts): drawn parts in the style of art/enemies.svg. Described monsters without their own silhouette, merges and the boss are all built from it.
- **Merges:** any two of the five. It moves like one, has both attacks and both ways of seeing, and takes the strikes of both.
- **Boss:** a giant Watcher on a thick stem with two Thorn heads, in its own clearing before the planting place. Three phases. With a weapon: nine strikes. Without: let its eye find you, hide in the grass or behind the rock until it loses you and is dazed, then run in and pull its root; three pulls.
- **As you go:** plain monsters first, merges in the later part of the road (20, 40, 55 percent by difficulty), boss last from the middle difficulty up.
- **Written games:** kind "crawler+flyer" and so on, and kind "boss". Road starter brings winged crawlers from score 6; Space shooter ends with the boss.
- **Seen on screen:** all ten merges and ten described monsters beside the hero in the adventure; the boss; one whole boss fight without a weapon (scripted, started at the clearing, before it was made harder); six merges inside a written game's frame.
- **Not seen:** the boss fight with a weapon (tests only), the fight after it was made harder, the boss and four merges inside a written game, the two changed starters played to their merges and boss, a whole level walked from the start.
- **Open:** the dev-only view (__play) showed the frame zoomed in; the Space starter looked right, so it may be the preview. The boss fight is probably still too easy.

## The visuals pass (13 October 2026)

What was built, for the base adventure and for written games together:
- **The hero in written games** is now the board's own drawing (art/hero-v5.svg): big head, one eye, flower, cape, legs. Seated in the car, on the bike and in the ship; with wings for flying.
- **The five monsters in written games** are the board's own outlines (art/enemies.svg), with a faint haze behind them so they show on a dark backdrop.
- **Backdrops for written games:** `game.scene("road" | "sky" | "space" | "room")`, drawn in the mood's colours. Road has a night sky, a moon, two lines of hills and textured ground. Sky has drifting clouds. Space has twinkling stars and a far planet. Room is a dotted floor. The backdrop now reaches the edges of a wide phone.
- **Gaze cones** in the base game fade with distance like lamp light, and are brighter once the hero is seen.
- **The flower burst:** more petals, a larger flash, a ring of light and a small jolt of the screen, in the base game. In written games: a flash and twenty flowers of mixed sizes.
- **The world of the base game:** grain and tufts on the ground, dust in the air in every weather, lamps and swarms that breathe, a moon that shimmers in the water.
- **Title card of a written game** shows that game's own first picture, not the adventure. One of our own starters says what it is ("Drive, jump and shoot.") instead of "Written for you just now."
- **The top line** of a written game is cut at 46 characters and the AI is told to stay under 44. Each starter now has something to do on screen from the first second.
- **End card** of the adventure now says "The flower grows".

Looked at on screen, at phone-landscape size (844 by 390):
- Road, Flying, Space shooter, Puzzle and Catch starters, each started and seen running.
- The adventure: the first scene, the watcher's beam, the faded gaze of a crawler and a thorn, a burst, the whole ending, the hero walking and crawling.

Not looked at, or not done:
- **A kit of better-drawn parts for AI-described monsters: not done.**
- The sword swing and the burst's ring are too quick for a screenshot; they were not seen.
- The fixes made after looking (bigger seated hero, bigger wings, visible puzzle boxes, the dimmer planet) were not looked at again.
- A game written by the AI was not opened in this pass, only our own starters.
- How any of it feels in the hand on a real phone.
- In the ending, the kneeling body beside the flower is still a small plain shape.

## The second trial: written games made good (13 October 2026)

What changed since the first trial:
- **A first question, "What do you want to play?"** with six cards (Adventure, Road, Flying, Space shooter, Puzzle, Catch) and a write-in. Anything written there, other than a request for the base adventure, is always written as its own game.
- **Six starter games of our own** (src/trick/starters.ts). The AI is given the nearest one and changes it, instead of writing from nothing. The five on cards also play at once with no AI.
- **Our art inside written games:** the boy with his flower (on foot, in a car, on a bike, in a ship, with wings), the five monsters, flowers to collect, the flower burst, lights and darkness, petals as lives.
- **A playability check** on top of the crash check: what the player does must change something, and in forty seconds of pretend play something must be scored, won or lost.
- **A better model for code:** Groq's larger free model (openai/gpt-oss-120b) first, then the smaller one. Cloudflare's small model no longer writes code.

| Wish | Model | Wait | Tokens | Result | What came out |
|---|---|---|---|---|---|
| flying cars | Groq large | 1.9 s | 3,336 | Worked first time | The flying starter with the boy in a car. |
| ride a bike on a road | Groq small | 14.8 s | 3,464 | Worked first time | The road starter on a bike. |
| drive a car and shoot from it | Groq large | 2.1 s | 3,419 | Worked first time | The road starter, unchanged: it already is this game. |
| a simple puzzle with boxes to push | Groq large | 2.7 s | 3,867 | Worked first time | The puzzle starter, unchanged. |
| a fishing game | Groq large | 1.9 s | 3,274 | Worked first time | Changed from the catch starter: "Tap to cast line and catch fish. Avoid trash." |
| space shooter | Groq large | 1.4 s | 3,148 | Worked first time | The space starter, lightly changed. |
| jump over rocks while running through a dark forest | Groq large | 1.6 s | 3,318 | Worked first time | Changed from the open stage: "Run right, swipe up to jump over rocks." No monsters in it. |
| catch falling flowers in a basket | Groq large | 1.8 s | 3,085 | Worked first time | The catch starter, lightly changed. |
| a maze with a monster that chases you | Groq large | 2.2 s | 3,828 | Worked first time | Changed from the puzzle starter into a room seen from above, a chasing monster and a flower to reach. |
| tennis against a wall | Groq large | 2.5 s | 5,862 | Worked after 1 repair | Changed from the catch starter: "Keep the ball in play." |
| flying cars with guns | Groq large | 2.4 s | 3,518 | Worked first time | The flying starter with a car, and shooting added. |
| ride a bike and jump over monsters | Groq large | 1.3 s | 3,097 | Worked first time | The road starter on a bike, jumping instead of shooting. |

**Summary, against the first trial**
- **Passed: 12 of 12** (11 first time, 1 after repair), and the test is now stricter. First trial: 8 of 10 on the easier test.
- **Amin's own examples all worked** this time: flying cars, the bike, the car that shoots.
- **Wait:** 1 to 3 seconds, once 15.
- **Tokens:** about 3,600 per wish. If the larger model has the same free allowance as the smaller one (200,000 a day, not confirmed), that is about 55 written games a day.
- **Looks:** every game has the boy with his flower, and most have our monsters. The backdrops are still plain: a gradient sky and a ground line, with none of the base game's scenery.
- **Seen on screen:** three results were opened in the browser. The preview does not run the frame's animation while it is in the background, so each was seen as a still first picture, not in motion: the boy in a flying car firing a shot; the boy on a bike; the maze room with the boy, a monster with yellow eyes and a glowing flower.
- **Not checked:** how any of them feels to play, the unchanged starters in motion, and the wording when the AI fails and the nearest starter is used.

## The first trial: can the free AIs write a game on request? (13 October 2026)

Ten wishes, sent exactly as the game sends them, each script test-run in the locked frame in the browser. "Worked" means it passed the automatic test run: it started, drew something, changed over six seconds of made-up input, did not crash and did not end by itself. It does **not** mean it is a good game. The last column is from reading each script, not from playing it.

| Wish | Model | Wait | Tokens | Result | What the script does, from reading it |
|---|---|---|---|---|---|
| flying cars | Cloudflare | 10.8 s | 7,551 | Failed after 3 tries | Every version ended by itself within a second. |
| ride a bike on a road | Groq | 1.1 s | 2,229 | Worked first time | A box with two wheels moves left and right. Rocks and stars appear off the right edge and fall out of sight, so nothing ever reaches the bike. No real game. |
| drive a car and shoot from it | Groq | 2.1 s | 4,939 | Worked after 1 repair | A plain box drives along a scrolling road. Shots fly straight up while enemies come along the ground, so they cannot be hit. No real game. |
| a simple puzzle with boxes to push | Groq | 1.1 s | 2,233 | Worked first time | A square pushes three boxes sideways onto two glowing targets. Simple, but it is the puzzle that was asked for. |
| a fishing game | Groq | 17.9 s | 4,911 | Worked after 1 repair | A boat moves along the bottom; a tap sends a line up; fish fall from the top and are caught on the line. Odd, but playable. |
| space shooter | Groq | 2.6 s | 4,582 | Worked after 1 repair | A ship moves and shoots upward at things drifting down. Plays as a basic shooter. The ship vanishes when hit. |
| jump over rocks while running through a dark forest | Cloudflare | 4.3 s | 6,464 | Failed after 3 tries | Every version had a syntax error. |
| catch falling flowers in a basket | Groq | 0.6 s | 1,891 | Worked first time | Correct. It is nearly the example from the API text. |
| a maze with a monster that chases you | Groq | 2.1 s | 5,135 | Worked after 1 repair | Walls and a chasing monster, but the hero moves like a platform jumper, which does not suit a maze. Confused. |
| tennis against a wall | Groq | 1.1 s | 2,267 | Worked first time | A ball goes back and forth in a straight line between a wall and a paddle. Works, but trivial. |

**Summary**
- **Passed the test run: 8 of 10** (4 first time, 4 after one repair). Both failures were answered by Cloudflare's small model, on tries where Groq did not answer.
- **A game worth playing, from reading the scripts: about 4 of 10** (puzzle, space shooter, catch the flowers, and fishing at a stretch). Two more run but are confused or trivial; two have nothing to play.
- **Wait:** usually 1 to 3 seconds; the slowest was 18 seconds.
- **Looks:** every game is plain boxes and circles. None looks like the base game.
- **Free limits:** a wish cost about 4,200 tokens on average, repairs and failures included. At Groq's free 200,000 tokens a day that is about 47 written games a day for all players together, and at 8,000 tokens a minute about two a minute.
- **Share link:** a packed script added 470 to 840 characters to the link.

## 1. The maker (pick, write, play, share)

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Steps: the first question, then Mood, World, Monsters, Weapon, Twist, Story | Done | Weapon was added on 13 Oct, Story on 15 Oct. A game of its own asks Mood and Story only. |
| 1.2 | Each answer changes the next question | Done | Checked with the real AI: after "Calm" the world cards were Serene Village, Moonlit Forest, Calm Shore, Quiet Ruins; after a town the monster cards were Town Creepers, Roof Flyers and so on. Our own cards are the fallback after about 2 seconds. Twist cards always keep our own words. |
| 1.3 | "Surprise me" fills everything | Done | |
| 1.4 | Write what you want, at every step | Done | A field under the cards of each step. One sentence can answer several steps. A line then says what was understood and what could not be built. Checked with the real AI and with `?ai=off`. |
| 1.11 | Scenery from a library the AI can pick from | Done | Buildings, houses, towers, ruins, trees, mountains, bridges, fences; up to three per game, each with an amount and a size. "A town with tall buildings" gives a skyline with lit windows. |
| 1.12 | Weapons the player can choose or write | Done | Melee, ranged, thrown or none; nine shapes; reach, speed, power and a name. "A bow" shoots arrows; "a crossbow" is a bow called Crossbow. |
| 1.5 | Title card before the game | Done | Shows the name and a one-line intro. |
| 1.6 | After the game: play again, remix one choice, new game | Done | The end card says whether the flower was planted or the last petal fell. |
| 1.7 | Share link that carries the whole game | Done | The written text is never in the link. |
| 1.8 | The Monsters pick changes the game | Done | |
| 1.13 | Described monsters, built from blocks | Done | Body, movement, attack, capped numbers, 1 to 3 eyes, and a look the AI composes from simple shapes. Checked with the real AI: "a tall three-eyed thing that floats" gave a floating three-eyed monster. Its drawing was crude; quality depends on the model. |
| 1.14 | Variety of monsters without writing | Done | With AI, monster cards include invented monsters. Without AI, every pack brings one monster mixed by the seed (four games gave Hoverer, Glider, Scuttler, Swooper). |
| 1.15 | Described atmosphere | Done | Palette, kinds and amount of light, and weather (fog, rain, snow, petals). "A foggy green swamp" gave green dark with fog banks. Only fog was looked at in the browser. |
| 1.16 | Guns | Done | A ranged weapon with its own shape and a fast shot. Checked: "a gun" gave one and it fired. |
| 1.17 | The AI composes silhouettes from simple shapes | Partly | Works for monster looks (seen in the browser) and is built for custom scenery and weapon looks (covered by tests, not seen in the browser). |
| 1.18 | "My games": save on the device, delete | Done | Save on the game's menu; "Saved" on the first screen lists them. Checked: save, list, delete. |
| 1.19 | Ride a bike or drive a car, on a road, with a mounted weapon | Not started | **Next pass.** The settings file has the fields; the game ignores them. |
| 1.9 | More worlds | Done | Forest, Town, Ruins and Shore are ready-made mixes of scenery. They change the backdrop, not yet the ground or the hide spots. |
| 1.10 | Other genres (runner, arena, puzzle, driving) | Not started | Later, after the base game is fun. |

## 2. The base game

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Controls: hold to move, drag up to jump, drag down to lie down, tap to strike | Done | |
| 2.2 | Light: lamps, dark stretches, the hero brightens and darkens | Done | |
| 2.3 | Hiding: grass, rocks, pillars; flower closes and eye narrows | Done | |
| 2.4 | Level built from chunks by a seed | Done | Now ends in a clearing with the planting place. |
| 2.5 | Water splashes | Done | |
| 2.6 | The five monsters: Crawler, Thorn, Flyer, Stalker, Watcher | Done | Each was met in a scripted browser check. All speeds and timings are first guesses. |
| 2.7 | Monsters see him in light and lose him in the dark | Done | |
| 2.8 | Hearts as the five petals of his flower | Done | A larger flower in the corner shows the count. Falling in a pit now costs a petal. |
| 2.9 | The Watcher's five-second countdown | Done | Not checked in the browser: the countdown stopping when he hides (covered by a unit test). |
| 2.10 | Sneak attack from hiding defeats in one hit | Done | |
| 2.11 | Defeated monsters burst into flowers; ten flowers regrow a petal | Done | |
| 2.12 | A scenario: why he walks, where the road ends, how you win and lose | Done | New ending from Amin, 13 Oct: at the end of the road the hero's own head is cut off and buried in the ground with his flower. Shown quietly in silhouette. Two details are a reading he has not confirmed: he does it himself with his sword (without a weapon he lifts it off with his hands), and the flower stays above ground and grows from where the head lies. |
| 2.13 | Monsters merge into harder ones and bosses | Not started | |
| 2.14 | Four light sources: lamps, fireflies, moonlit water, mirrors | Done | |
| 2.15 | Tune how fights feel: speeds, timings, difficulty | In progress | 19 Oct: suspicion before attack, warned and avoidable attacks, openings after them, held by tests/behaviour.test.ts. Still needs A1. **Likely too easy now:** a simple script that only walks, jumps and crawls won two unarmed runs, losing 0 and 1 petals. |
| 2.16 | Crawling while lying down | Done | Drag down, then slide the same finger sideways (or S with A/D). 70 px/s. The gesture has not been tried on a phone. |
| 2.17 | Monsters see by where they look, and the player can see it | Done | Each eye throws a faint shape. Stalker: ahead at standing height. Flyer: downward. Crawler: ahead along the ground. Thorn: both ways. 19 Oct: bumping into any monster now always hurts, and alerts it (Amin). |
| 2.18 | Every monster can be passed without a weapon | Done | Lie flat under the Stalker's swipe, step aside from the Flyer's dive, hide from the Crawler's charge, jump the Thorn. (19 Oct: walking or crawling into a monster now always hurts.) Two unarmed runs were finished by script, one with all five monsters at the hardest setting. |
| 2.19 | More ways to hide: bush, crate, archway | Done | An archway's roof also hides him from Flyers while he stands. No pebble to throw and no way to put out a lamp yet. |
| 2.20 | Controls and feel pass (reports/Controls and feel.md) | Done | 19 Oct: second-finger strike on touch-down, 80 ms walk delay, 28 px drag or flick, scaled landing squash and dust, two-way knockback, hurt freeze and red edges, ledge catch 14 px, Android vibration, touch marks for the first minute, delay readout. About 5 → 6.5–7 of 10; needs A1. |
| 2.21 | Difficulty pass with bot players (reports/Difficulty.md) | Done | 19 Oct: three bot skills on 60 roads; finish rates 35/43/63% → 63/63/83%. Knockback away from the monster, safe time 1.5 s, longer charge and dive warnings, widest pit back to 120 px. Bump-on-resting-monster rule left for Amin. Needs A1. |
| 2.22 | Dialogue and a boss for every world | Done | 19 Oct: taunts and answers in bubbles, dying line, boss conversation panel, soldiers wave with fight mood, boss death warning. Bump on a resting monster only pushes; healing water 60%, full share. |
| 2.23 | Five worlds; the road fills again | Done | 19 Oct: lands.ts (desert, ash forest, salt sea, red canyons, silent city) with palette, scenery, light, monster and stretch lean, music key, title line; return wave when he reaches the end without seven flowers; talk is rarer. Later worlds brightened (lighter ash, salt and city colours; light loss capped at 0.12, floor 0.3). |
| 2.24 | Centred picture menus | Done | 20 Oct: weapon tiles as pictures, monsters shown as silhouettes, title card "Disposable Tricks" + one line + Play + Back, pause menu with icon buttons and volume, game blurred behind menus (src/ui/icons.ts, pick.ts, cards.ts). |
| 5.3 | First deploy | Done | 20 Oct: live at https://disposable-tricks.pages.dev (Cloudflare Pages + Pages Function); AI answers online (Groq). Update with npm run deploy (npm.cmd in PowerShell). |

## 3. The AI

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Settings file that fully describes a game | Done | |
| 3.2 | Validator that repairs a bad settings file | Done | |
| 3.3 | Choose the free AI services | Done | Order: Groq, then Cloudflare Workers AI, then OpenRouter free models. Google Gemini left off: its free tier is not for players in the EU or under 18 and trains on what they write. Some free limits could not be confirmed without an account. |
| 3.4 | Accounts and API keys | Done | Groq and Cloudflare. OpenRouter failed the provider test earlier and is not used. |
| 3.5 | A small server function that holds the keys | Partly | Runs inside the dev server. Not hosted yet (needs 5.3). |
| 3.6 | AI proposes the cards of the next step | Done | Real AI, about half a second per step. Only cards the engine can build are shown. |
| 3.7 | AI reads the player's text and turns it into settings | Done | Real AI, with the filter for unsafe text before it. Without AI, a keyword reading does the same more roughly. |
| 3.8 | AI names the game and writes a one-line intro | Partly | Rebuilt as its own small request. Covered by tests; not looked at with the real AI in this pass. |
| 3.9 | Fallback: try one service, then the next; saved answers | Partly | Tested with fake providers. The provider test set was rewritten for the new questions and has **not been re-run against the real services** (it costs about 13 calls each): `npm run test:providers`. |
| 3.12 | Keep AI answers short enough for free models | Done | The first monster prompt was too long: Groq refused it and Cloudflare took 6 seconds. Cards now carry no drawings; only a written wish may. After that both answered in 0.7 to 1.8 seconds. |
| 3.11 | Stay inside the free limits | Partly | About six AI calls per game (Groq allows roughly 1,000 a day). Cards and names are saved per path of choices; wishes never are. A ceiling of 24 calls a minute for all players together. |
| 3.10 | The app still works when every AI service is down | Done | Checked with the server off, failing and slow. |

## 4. Art and sound

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Hero drawn like "Hero version 5" on the board | Partly | Since 13 Oct his cape, body, legs, arm and sword are cut from the board's own drawing (art/hero-v5.svg). Seen on screen at 844x390: he stands about 28% of the screen height. Head, eye and flower are still simple circles. |
| 4.8 | Visuals pass (design-decisions.md section 5) | Done | See "The visuals pass", "Merged monsters and the boss", "The maker screens and the story", and notes/graphics-loops.md. |
| 4.9 | AI writes game code for wishes the blocks cannot express ("tricks") | Done | Built on 13 Oct after Amin said yes. A wish the blocks cannot express is written as one small script against a short game API (src/trick/reference.ts), test-run, repaired up to twice, and played in a locked frame with no network and no access to the page. It travels in the share link and can be saved. Trial results are below. **Not yet played by anyone:** the preview's safety check refused playing the written games, so how they look and feel is unverified. |
| 4.2 | Hero in colour for a happy mood, cape on or off | Done | |
| 4.3 | Hero animation set: idle, run, jump, lie down, hide, strike, hurt | Partly | All exist as simple code motion, not drawn animation. |
| 4.4 | Moods change the palette | Done | |
| 4.5 | Monster art | Partly | Drawn in code after the board, not from the board's vectors. |
| 4.6 | Real sounds and one music loop | Not started | Stand-in sounds are made in code and nobody has heard them yet. D4. |
| 4.7 | Interface look for the pick screens | Partly | Built; not yet reviewed by Amin. |

## 5. Making it real

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Try it on a real phone held sideways | Waiting | Action A1. |
| 5.2 | Move the project into its own repository | Not started | Steps are in launch.md section 4. Nothing is committed anywhere yet. |
| 5.3 | Hosting on a free static host | Partly | Cloudflare Pages chosen and its config files are in place. Account and first deploy: action A3. |
| 5.4 | "Turn your phone" screen and Add to Home Screen | Done | iPhones cannot lock rotation or go full screen from a web page, so the turn screen stays necessary there. |
| 5.5 | Privacy page and 16+ label | Done | The page now says that choices and written wishes go to our server and on to an AI service, and that nothing is stored. Contact line still open (D7). |
| 5.6 | Test with 5 to 10 players aged 16+ | Not started | |
| 5.7 | Domain and public launch | Not started | |

## Decisions waiting for Amin

| # | Question | Why it matters |
|---|---|---|
| D1 | Answered on 13 Oct: writing is in addition to the cards, at every step. | |
| D9 | Answered on 13 Oct: the AI may compose silhouettes from simple shapes. Building blocks now; AI-written code later and undecided. | See build-brief.md section 11. |
| D10 | Is the crawl gesture right (drag down, then slide the same finger sideways)? | Needs A1. |
| D2 | Answered on 13 Oct: at the end his head is cut off and buried with the flower. Open detail: does he do it himself, and does the flower grow from the spot? | Built on that reading. |
| D4 | Answered on 13 Oct: music and real sounds come later. The stand-in sounds made in code stay for now. | |
| D5 | Does tap-to-strike feel right in the hand? | Needs A1. |
| D6 | Home-screen name is "Tricks" because phones cut long names. Keep it? | |
| D7 | Does the privacy page need a name and contact address? Depending on where Amin lives a public site may legally need one. | Before launch. |
| D8 | A refused wish gets one generic line, even for text about self-harm. Should that case get a kinder message? | |

## Suggested order from here

1. Amin: phone test (A1), above all the crawl gesture and whether the monsters are now too easy.
2. Riding, driving and roads (1.19).
3. Tune the fights after the phone test (2.15), and re-run the full provider test (3.9).
3. Own repository and first deploy (5.2, 5.3, A3).
4. Host the AI server function (3.5).
5. Real art from the board and real sound (4.1, 4.5, 4.6).
6. Merged monsters and bosses, more worlds (2.13, 1.9).
7. Test with players, then launch (5.6, 5.7).
