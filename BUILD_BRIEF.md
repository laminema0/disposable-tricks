# Disposable Tricks: build brief

Written 12 October 2026 from the brainstorm between Amin and Claude.
This file is the handover. Someone who has not seen the brainstorm should be able to start building from it.

- Brainstorm board (all rounds, hero drawings, enemies, roadmap): https://www.figma.com/board/N7rWnbbznoWuKkfgeve94S
- Art audit of 39 games: https://claude.ai/artifact/FoXriKGogdx6eRzBKBj74p

Marking used below: **[Amin]** is a decision Amin made. **[Claude]** is a choice Claude made because Amin asked Claude to choose, or a proposal Amin has not confirmed. Treat [Claude] items as defaults that can change.

---

## 1. What we are building

A web app where a player makes a small 2D game by tapping choices, plays it at once, and shares it with a link.

The idea behind it: give control to the player. There is one base game. The player can change its scenario, its characters, its atmosphere, how the monsters look, and later the genre itself (a puzzle, driving a car). The app is called **Disposable Tricks** [Amin]. A game is something you make for the moment, not something you install.

Promise: pick, play and share a game in one minute. [Claude]

## 2. Locked decisions

Product
- An application, not an operating system. Games only for now. Other tools maybe later. [Amin]
- For ages 16 and up. [Amin]
- No sign-in. No collection of user data. [Amin]
- Guided choices, not open prompts. About 4 taps, and each choice changes the options that come next. [Amin]
- One world and one genre for now. More genres later. [Amin]
- Everything designed so far is the base. Players can change it. [Amin]

Art
- Our art is the base. The AI may compose new silhouettes from simple shapes. [Amin, 13 Oct. This replaces "All art is ours. The AI never generates graphics."]
- "Shadow" style: a dark world, lit by lights along the way, with one accent colour. [Amin]
- The hero is a boy of about twelve with a big round head and a small body, dark grey, always seen from the side. His face is one plain eye. No nose, no mouth. [Amin]
- He has one flower on his head. The flower is always there, in every genre. [Amin]
- His body is a plain shape. The eye and the flower are the only details. [Amin]
- He wears a long cape that reaches the ground and carries a sword. The cape belongs to the base genre and comes off in other genres. [Amin]
- A happy choice can show the hero in colour. Mood follows what the player selects. [Amin]

AI
- The AI works inside a frame. It writes a small settings file. It never writes game code. [Amin]
- Free AI services for now, behind one harness. [Amin]
- The app must work with no AI at all. [Claude]
- Built with Claude Opus and ChatGPT as coding assistants. [Amin]

## 3. The base game

A side-scrolling action game with light and hiding. [Claude: Amin's controls and hiding rules describe this genre, so it replaces the runner as the first thing to build. The runner and the arena come later as extra genres.]

### 3.1 Light
- The world is dark. Lights stand along the way. Some are strong, some weak. [Amin]
- Sources differ: lamps, fireflies, the moon reflected in water on the ground, mirrors throwing a beam. [Amin]
- Near a light the hero is clearly visible. In the dark he is nearly a silhouette. [Amin]
- Light is two-sided. It shows the path, but enemies also see the hero in it. Darkness is where he hides. [Amin agreed]

### 3.2 Hiding
- The hero can hide in darkness, in grass, and behind rocks and pillars. [Amin]
- When hidden, his flower closes and his eye narrows. No text is needed. [Claude]
- A strike from hiding defeats an enemy in one hit (sneak attack). [Claude]
- He can turn the tables: hunted one moment, hunter the next. [Amin]

### 3.3 Health
- Hearts are the petals of his flower. Five petals, five hearts. Losing a heart removes a petal. [Amin, count by Claude]
- The flower is repeated larger in a screen corner so the petals can be counted. [Claude]
- Collecting flowers regrows a petal. Default: 10 flowers for one petal. [Claude]

### 3.4 Enemies
Five base enemies. All are black shapes with yellow eyes. Names are Claude's.

| Enemy | Behaviour |
|---|---|
| Crawler | Walks the ground. Charges when it sees the hero. |
| Thorn | A thorny plant. Stays in place and spits when the hero is lit and in range. |
| Flyer | Hovers, then swoops down. |
| Stalker | Tall and slow, with a long reach. |
| Watcher | A black ball with one big eye that throws a beam of light. |

- **Watcher rule** [Amin]: once its light exposes the hero, he has five seconds. If the countdown ends, he loses a heart.
- The countdown stops if he defeats the Watcher, leaves its light, or hides. [Claude, Amin said hiding should count]
- The countdown is shown in the Watcher itself (its pupil shrinks) with a sound that speeds up. [Claude]
- Enemies merge into harder enemies and bosses as the game goes on. [Amin] Examples drawn: Crawler + Flyer, Stalker + Thorn, a boss made of a Watcher and Thorns.
- Enemies are built from parts (body, mover, head, eye) so that a merge is a new mix of parts. [Claude]
- A defeated monster bursts into many flowers. [Amin]
- Enemy eyes must stay visible in the dark, or the dark becomes unfair. [Claude]

### 3.5 Controls
The phone is held sideways and the game fills the screen. [Amin]

| Input | Action | Source |
|---|---|---|
| Hold the right half | Go forward | Amin |
| Hold the left half | Go back | Amin |
| Drag up | Jump | Amin |
| Drag down | Lie down. Near grass, a rock or a pillar this hides him. | Amin |
| Quick tap | Strike: a short lunge and a slash in that direction | Claude |

Starting values for the touch logic [Claude]:
- He starts moving the moment a finger touches.
- If the finger lifts within 200 ms and has moved less than 12 px, the step becomes a strike.
- A drag of more than 40 px up or down is a jump or a lie-down.
- Keyboard for testing on a computer: A/D or arrows to move, W or Space to jump, S to lie down, J or Enter to strike.

### 3.6 Starting numbers
All of these are Claude's first guesses. Tune them in testing.

- Hero speed 220 px/s. Jump height about 1.6 hero heights.
- Strike: lunge 48 px, reach 70 px, 0.35 s between strikes.
- Crawler, Flyer: 1 hit. Thorn, Stalker: 2 hits. Watcher: 3 hits.
- After losing a petal the hero cannot be hurt for 1 s.
- Light level at the hero is 0 to 1. Hidden below 0.15 when lying down in a hide spot. Seen by enemies above 0.35.

## 4. What the player can change

The vision is that the player controls everything: scenario, characters, atmosphere, monsters, and later the genre. [Amin]

Proposed scope for the first version [Claude]:

| Tap | Choice | What it changes |
|---|---|---|
| 1 | Mood | Atmosphere: palette, light sources, music. A happy mood puts the hero in colour. |
| 2 | World | Backdrop shapes and hide objects (forest, ruins, shore). Version one ships one world. |
| 3 | Monsters | Which base enemies appear, and how they look. |
| 4 | Twist | A rule change: fewer lights, more Watchers, no sword, flowers heal faster. |

Plus one "Surprise me" button that fills all four.

Later: more worlds, the scenario text, the hero's outfit, other genres (runner, arena, puzzle, driving).

## 5. How it is built

### 5.1 Stack [Claude]
- A web app. TypeScript, Vite, and the Phaser 3 game engine.
- Static hosting. No database in version one.
- One small server function for the AI calls, so that API keys never sit in the browser.

### 5.2 The settings file
One small JSON object fully describes a game. The engine reads it and runs. The AI may only produce this object, and a validator repairs anything invalid with defaults.

```json
{
  "v": 1,
  "genre": "side-scroller",
  "modifier": null,
  "mood": "calm",
  "world": "forest",
  "palette": { "far": "#17153a", "mid": "#1f1c48", "stage": "#070a14", "hero": "#6b7388", "light": "#ffd9a0", "accent": "#ffe66d" },
  "hero": { "cape": true, "colour": false },
  "lights": ["lamp", "fireflies", "water", "mirror"],
  "lightDensity": 0.5,
  "enemies": ["crawler", "thorn", "watcher"],
  "merges": true,
  "twist": "none",
  "difficulty": 2,
  "seed": 48213,
  "title": "The Quiet Lamp Road"
}
```

### 5.3 Art in the engine
- Every sprite is drawn as a flat single-colour shape and tinted at run time. A palette swap is then free.
- The hero drawings on the board are vector shapes and can be exported as SVG.
- Lights are soft gradient sprites added on top of a dark layer. The hero's tint moves between a dark and a lit colour according to the light level where he stands.
- Motion comes from code where possible: squash, shake, trails, particles. The flower burst is a particle effect.

### 5.4 Levels [Claude]
A level is a row of pre-made chunks (flat ground, gap, pillar hall, grass field, pond, lamp road) chosen by the seed. The same seed always gives the same level, so a shared link gives the same game.

### 5.5 Sharing
- The share link carries the settings in the part after `#`. That part is never sent to a server.
- Opening the link plays the same game. No account, nothing stored.

### 5.6 The AI layer
- Jobs: suggest the next options, name the game, write a one-line intro, tune the settings.
- A server function receives the choices so far and returns options or a settings file.
- Every answer passes the validator. A bad answer is replaced by defaults.
- Answers are saved per path of choices, so most plays cost no AI call.
- A router tries one free provider and falls back to the next. Candidates to check: Google Gemini API, Groq, OpenRouter free models, Cloudflare Workers AI. Their limits change, so confirm them first.
- A fixed test set of choice paths must pass for a provider before it is switched on.
- With every provider down, the app still works from the pre-made options.

### 5.7 Privacy
- No sign-in, no personal data, no cookies. Anonymous play counts only.
- A short privacy page that says exactly this, and a 16+ label.

### 5.8 Suggested folders
```
disposable-tricks/
  BUILD_BRIEF.md
  src/
    core/        input, physics, camera, light, health, particles
    game/        hero, enemies, level chunks, rules
    settings/    schema, defaults, validator, share-link encoding
    ui/          pick screens, title card, game over, remix, share
    ai/          client for the server function
  server/        the AI function: prompt, validator, cache, router
  assets/        svg sprites, sounds
  tests/
```

## 6. The path

| # | Phase | Done when |
|---|---|---|
| 1 | **Finish the hero.** Final side-view design. Animation set: idle, run, jump, fall, lie down, hide, strike, hurt. Flower states: open, closed, 5 to 0 petals. | He runs, jumps, hides and strikes on a test screen. |
| 2 | **Design world one.** Palette slots, backdrop layers, the four light sources, hide objects (grass, rock, pillar), interface kit, sounds and one music loop. | A mock screenshot looks like a finished game. |
| 3 | **Write the frame.** Settings schema, defaults, validator, the option tree for the 4 taps, share-link encoding. | Any valid settings file describes a playable game, and round-trips through a link. |
| 4 | **Build the core and the base game.** Input, movement, camera, light levels, hiding, strike. One level from chunks. | **Milestone 1:** the hero moves through a lit and dark level on a phone, hides and strikes. |
| 5 | **Add enemies and rules.** The five enemies, petals as hearts, the Watcher countdown, sneak attack, flower burst, game over. | **Milestone 2:** the base game is fun for five minutes. |
| 6 | **Build pick, play, share.** The four taps, "Surprise me", title card, game over, remix one choice, share link. | **Milestone 3:** a friend opens your link and plays your game. No AI yet. |
| 7 | **Let players change it.** Moods and palettes, hero in colour, cape on or off, enemy looks from parts, merged enemies and bosses by difficulty. | Two games made with different choices look and feel clearly different. |
| 8 | **Add the AI layer.** Server function, validator, saved answers, router, test set. | **Milestone 4:** better with AI, still works without it. |
| 9 | **Test with real players.** 5 to 10 people aged 16+, on their own phones. Measure time to first play, finished creations, remixes, shares. | Most play, remix and share without help. Playing starts in under one minute. |
| 10 | **Launch.** Domain, hosting, privacy page, 16+ label, "turn your phone" screen, Add to Home Screen. | **Milestone 5:** the public link is live. |
| 11 | **Grow.** More worlds. More genres: runner, arena, then puzzle and driving. A paid model if free limits bite. | Ongoing. |

The AI comes late on purpose. Until phase 8 the app runs on pre-made options, so it never depends on a free service being up.

## 7. Milestone 1 in detail

This is the first thing to build. It needs no AI, no enemies and no menus.

1. Create the project: Vite, TypeScript, Phaser 3. One scene, landscape, scaled to fit the screen.
2. Put the hero on flat ground using placeholder art that matches the board: round head, flower, body, cape, sword. Flat shapes, tinted.
3. Input: the touch logic from 3.5 and the keyboard keys. Hold to move both ways with the sprite mirrored, drag up to jump, drag down to lie down, tap to strike.
4. A level about 8 screens long, built from 4 or 5 chunk types, with a camera that follows him.
5. Lights: at least a strong lamp, a weak lamp and a dark stretch. Compute the light level at the hero and tint him between the dark and lit colours.
6. Hide spots: grass, a rock, a pillar. Lying down in one in low light sets "hidden". Show it with the closed flower and narrowed eye.
7. A debug readout of light level and hidden state, switchable off.
8. Tests for the light-level function and the tap, hold and drag classification.
9. Check it on a real phone held sideways.

Out of scope for milestone 1: enemies, health, flowers, menus, sharing, AI, sound.

## 8. Open questions for Amin

1. Tap to strike: Claude chose it because you asked Claude to choose. Change it if it feels wrong in the hand.
2. Does the first version let players change all four things in section 4, or fewer?
3. Who makes the sounds and music?
4. Where does the project live? This folder sits inside the HealthySongs workspace for now. It should move to its own repository.
5. How many hours a week go into this? The phases have no dates until that is known.

## 9. Known risks and their fixes

| Risk | Fix |
|---|---|
| Crowded market: other tools already make games from a prompt. | Compete on what they lack: taps only, designed worlds, a share link with no account. |
| Too many steps and people leave. | A hard budget of 4 taps plus "Surprise me". |
| The dark hero is hard to see. | His pale eye and flower stay visible. Add a faint outline if testers lose him. |
| Hiding does not suit a runner, where he never stops. | The base game is a side-scroller. In a runner, hiding becomes a short duck into shadow. |
| Tap and hold get confused. | The 200 ms rule in 3.5. Tune on a real phone. |
| iPhone browsers may not allow true full screen or rotation lock. Not checked against current iOS. | A "turn your phone" screen, and Add to Home Screen. |
| Free AI tiers are limited and can vanish. | Pre-made options, saved answers, a router. The app works without AI. |
| Each AI model answers differently. | One strict settings format, a validator, a test set per provider. |
| One world needs a lot of art. | Flat tinted shapes, palette swaps, enemies built from parts. |
| Petals are too small to count at playing size. | Repeat the flower larger in a screen corner. |

## 10. Changes after the first play-test (13 October 2026)

Amin play-tested on 13 October and said two things: writing a wish did nothing he could see, and stealth was too thin. This section records what changed. Where it disagrees with an earlier section, this one is current.

### 10.1 The maker
- **Writing is allowed at every step.** [Amin] This replaces "guided choices, not open prompts" in section 2. Each step has its own write-in field under the cards.
- **Five steps, not four:** Mood, World, Monsters, Weapon, Twist. [Claude added Weapon as its own step, because Amin asked that players can write the weapon they want.]
- **The next question follows from the answers so far.** [Amin] The AI proposes the cards of each step after the first, as names, lines and settings. Our own option tree is the fallback, and it also changes with the mood.
- **One sentence can answer several steps.** [Claude] A wish never changes a step that was already answered before it.
- **The player is told what was understood** in one plain line, and what could not be built. [Claude]
- **Twist cards keep our own words.** [Claude] The AI wrote lines for twists that promised things the game does not do, so it no longer writes them.
- The art rule was relaxed later the same day: see section 11.

### 10.2 The settings file gained two fields
```json
{
  "scenery": [{ "kind": "buildings", "amount": 0.8, "size": 1.4 }, { "kind": "houses", "amount": 0.5, "size": 1 }],
  "weapon": { "name": "Crossbow", "kind": "ranged", "look": "bow", "reach": 380, "speed": 0.8, "power": 1 }
}
```
- Scenery kinds: buildings, houses, towers, ruins, trees, mountains, bridges, fences. Up to three per game. Drawn in code in the flat tinted style.
- Worlds (forest, town, ruins, shore) are now ready-made mixes of scenery, and all four can be played.
- Weapon kinds: melee, ranged, thrown, none. Looks: sword, dagger, spear, axe, club, staff (melee), bow (ranged), sling, stone (thrown). A weapon we have no shape for takes the closest one and keeps its own name.
- Both fields are validated and repaired with defaults, and travel in the share link. Old links still work.

### 10.3 Stealth
- **Crawling.** [Amin] Lying down, he can move at 70 px/s. Gesture [Claude, on the brainstorm session's suggestion]: drag down to lie, then slide the same finger sideways by more than 28 px to crawl that way; a second finger held on a side also works. Keyboard: S with A or D.
- **Sight follows the body.** [Amin] Each monster's eye throws a shape, drawn faintly like the light of a lamp. He is seen when he is lit, not hidden, and inside that shape.
  - Stalker: looks ahead at standing height and misses a hero lying flat. With nothing to look at it turns round every 5 s.
  - Flyer: looks down. It sees what is beneath it unless he is under a roof.
  - Crawler: looks ahead along the ground. Lying does not fool it; being in the air does.
  - Thorn: senses both ways within its range. Watcher: its beam, unchanged.
- **Touching a monster only hurts when it has seen him** (or is mid-attack). Thorns always prick. [Claude] This is what lets him crawl under a Stalker.
- **More ways to hide** [Claude]: bushes (lie flat, like grass), crates (crouch behind, like rocks), archways (lie in their shadow; their roof also blinds Flyers while he stands). A new level chunk, "archway", holds two arches and a crate.
- Not added: a throwable pebble or a way to put out lamps. Left for later.
- Every monster can be passed without a weapon: crawl under the Stalker, crawl or shelter under the Flyer, jump the Crawler and the Thorn, cross or wait out the Watcher's beam.

### 10.4 Privacy
The privacy page now says that the choices so far and any written wish are sent to our server and on to an AI service (Groq or Cloudflare Workers AI), and that nothing is stored.

## 11. A much bigger frame (13 October 2026, later the same day)

Amin's words: "Relax the rule. We have a really big frame for it. They cannot make something unethical, or change the whole system." And: "Building blocks now, code changes later. I want a variety of monsters. Describing monsters, guns and atmosphere must be activated by AIs."

### 11.1 What is decided
- **Building blocks, not code.** [Amin] A game is still one settings file. The AI fills in blocks and numbers; nothing a model writes is ever run in a player's browser. Everything from an AI, from a share link and from the saved shelf is treated as untrusted data and repaired by the validator.
- **Recipes.** [Amin allowed it; the format is Claude's] The AI may compose a flat silhouette from up to 12 simple shapes (box, circle, triangle, line) inside a square of 100 by 100 units. A drawing that spills out is shrunk to fit; a broken one is dropped and a stock shape is used. Recipes are used for custom scenery, for a monster's look and for a weapon's look.
- **Described monsters come first.** [Amin] A monster is built from blocks: a body (low, tall, flying) that decides where it looks; a way of moving (walk, hop, fly, float, still); an attack (touch, charge, spit, swoop, reach, beam); and capped numbers for size (0.7 to 1.5), speed (0.6 to 1.4), hits (1 to 3) and eyes (1 to 3). Its eyes always glow. The five named monsters are presets of the same blocks.
- **How a described monster behaves** [Claude]: its attack picks one of the five existing behaviours (charge and touch: Crawler; reach: Stalker; spit: Thorn; swoop: Flyer; beam: Watcher), so players meet moves they can already read. In the air, an attack that needs the ground becomes a swoop.
- **Variety without writing.** [Amin] With AI, two of the four monster cards carry a monster the AI invents. Without AI, every pack of ours brings one monster mixed from the blocks by the seed.
- **Guns.** [Amin] A gun is a ranged weapon with its own shape, a fast small shot and a high rate of fire. Hits still end in the flower burst.
- **Atmosphere.** [Amin] At the Mood step the AI may set the six palette colours, the kinds and amount of light, and the weather (fog, rain, snow, falling petals; for show only). A palette is only accepted if the game stays readable: dark stage and backdrop, bright light, and a hero that stands out. The monsters' eye colour is fixed, so it cannot be painted out.
- **My games.** [Amin: "play it, then delete it, or save it, or share it"] A Save button on the game's menu keeps a game on the player's own device only. "Saved" on the first screen lists them, each with Delete. Nothing is sent anywhere.

### 11.2 Limits Amin stated
Nothing unethical, and a wish must not be able to change the system itself. Kept by: the text filter before any AI call and on every word an AI writes; fixed lists and capped numbers for everything else; and no model-written code.

### 11.3 Next pass, not built yet
- **Riding and driving.** How he travels (on foot, bike, car), what he travels on (path, road), and a weapon mounted on the vehicle ("ride a car on a road and fire from it"). The settings file already has the fields `travel`, `ground` and the weapon kind `mounted`, validated and carried in the share link, but **the game does not use them yet**.
- Composed looks for the named monsters, props and hide spots.

### 11.4 AI-written code: "tricks" [Amin said yes on 13 Oct]
Amin: "The users who want to have flying cars in the game: they have to wait for it, because the code is getting written."
- **When:** a written wish that the building blocks cannot express. The blocks stay the instant path and the fallback.
- **What the AI writes:** one small script that may only use a short game API (src/trick/reference.ts; the same text is the AI's prompt): add and move flat shapes, read input, check overlaps, score and lives, a line of words, a few sounds, win and lose.
- **Where it runs:** only in a locked frame (public/trick-frame.html). The frame is sandboxed with scripts allowed and nothing else, so it has no origin: no cookies, no storage, no access to the page, the share link, the saved games or the AI endpoint. Its own policy gives it no network. Inside the frame the script runs in a worker that can be stopped. This is what keeps Amin's rule that players cannot change the whole system.
- **Before play:** a first look that refuses the obvious (src/trick/check.ts), then six seconds of made-up input in the frame. A failure goes back to the model with the error, twice at most. After that the nearest game from the blocks is made and the player is told.
- **Sharing and saving:** the script is compressed into the link and into the saved entry. There is no server store. A script from a link is checked and test-run again before it plays.
- **Risks, plainly:** a runaway script can still freeze its own frame until it is stopped; the first look is a word list and can refuse harmless scripts; a script from a free model, in a link, runs in someone else's browser, held only by the frame. The frame has been tested with our own scripts, not attacked on purpose.
- **First trial, 13 Oct:** it worked technically and fast, but the free models wrote a game worth playing less than half the time, and all of them looked plain.
- **What was changed after it** [the brainstorm session's plan, from Amin's "the foundation with Opus, and then they just add or change the code slightly"]:
  - The maker opens with "What do you want to play?". Anything written there that is not the base adventure is written as its own game, every time.
  - Six starter games of ours (src/trick/starters.ts): road, flying, space shooter, puzzle, catch, open stage. The AI changes the nearest one rather than writing from nothing.
  - The trick API now has our art: the hero with his flower and his vehicles, the five monsters, flowers, the flower burst, lights and darkness, petals as lives.
  - The test before play also checks that there is a game: input must change something, and something must be scored, won or lost.
  - Code is written by Groq's larger free model first.
- **Second trial, 13 Oct:** 12 of 12 wishes worked, 11 first time. See PROGRESS.md.
