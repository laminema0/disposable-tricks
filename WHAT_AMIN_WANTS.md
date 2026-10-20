# What Amin wants

Written 13 October 2026 by going back through the whole brainstorm conversation.
This is the list to build from. Where it disagrees with BUILD_BRIEF.md or PROGRESS.md, this file wins.

Every line is something Amin asked for, close to his own words. Status is what the game does today:
**Built**, **Partly**, **Missing**. Statuses come from PROGRESS.md and from looking at the running game; brought up to date on 15 October.

## 0. How to work on this

- Amin is exploring. He is not publishing now. Do not spend time on launch, hosting, legal pages, rate limits or cost. Use the real AIs freely while building.
- Do what he asked for. If something he asked for is risky or hard, build it anyway in the simplest working way and tell him the risk in one line. Do not replace it with something safer.
- He is a designer. Visual quality matters to him as much as function.

## 1. The product

| # | What he asked for | Status |
|---|---|---|
| 1.1 | An application, not an OS, where you make an instant game. "You play what you want and then you delete it easily. Or you save it, or you share it." | Built: make, play, save, delete and share work for the adventure and for games the AI writes (their script travels in the link). |
| 1.2 | The AI makes what the player asks for, even when the game does not have it yet. His example: flying cars. "They have to wait for it to get it, because the code is getting written." Waiting is fine. | Built: any wish other than the adventure is written as its own game by the AI, in a locked frame, starting from the nearest of six starter games of ours. Second trial: 12 of 12 wishes worked. Written games have not been played by hand for long. |
| 1.3 | A strong foundation written by us, so the AIs "just add or change the code slightly to reach their desired game". | Built: six starter games and the adventure; the AI changes the nearest starter. |
| 1.4 | "Giving the control to the user to do whatever they want to do." Players can change the scenario, the characters, the atmosphere, how the monsters look, the weapons, and the genre. | Built for atmosphere, scenery, monsters, weapons, and now the scenario (a "How does it end?" step: the flower, home, or the hunt, or the player's own words). Genre: five starter genres plus anything written. Characters: the hero is fixed by design. |
| 1.5 | Other genres: a puzzle, riding a bike, driving a car, roads, firing from the car. | Partly: as written games (Road with a car that shoots, Flying, Space shooter, Puzzle, Catch; a bike by writing it). Not inside the adventure itself. |
| 1.6 | Limits: nothing unethical, and players cannot change the whole system. | Built: a text filter, and AI-written code runs only in a sandboxed frame with no network and a fixed game API. |
| 1.7 | Free AIs gathered into one harness. | Built: Groq, then Cloudflare, then OpenRouter. |
| 1.8 | Ages 16+. No sign-in. Never collect data. | Built. |

## 2. The maker (how a game is asked for)

| # | What he asked for | Status |
|---|---|---|
| 2.1 | "We ask some questions, and based on those questions we have other questions." If they say calm, the next question is related to calm. | Built: the AI proposes each step's cards. Check that the questions themselves, not only the cards, follow the answers. |
| 2.2 | Options, not always open-ended questions. "Narrowing down the decisions for them." | Built. |
| 2.3 | And they can also write, in every section. "For every section." | Built: a write-in on every step, including the first question and the story. |
| 2.4 | Not too many questions, or people leave. | Built: the first question, six steps for the adventure (two for a game of its own), and "Surprise me". |
| 2.5 | Genres can be mixed, a little, following the AI's suggestion. | Partly: a written wish can mix them ("flying cars with guns" worked); the cards do not suggest mixes. |
| 2.6 | Describing monsters, guns and atmosphere must work through the AIs. | Built. Described monsters are now drawn from a kit of parts in the board's style. |
| 2.7 | A variety of monsters. | Built: the five, any merge of two, a boss, described monsters from the kit, and seeded mixes. |

## 3. The base game

| # | What he asked for | Status |
|---|---|---|
| 3.1 | Phone held sideways, full screen. | Partly: fills the window in the browser at phone sizes. The "drawn in part of the window" report came from the preview pane's zoom, not the game. Never tried on a real phone. |
| 3.2 | Hold the right side to go forward, left side to go back, drag up to jump, drag down to lie down. | Built. |
| 3.3 | A way to fight on a phone (he asked Claude to choose). | Built: tap to strike. |
| 3.4 | Lights along the way. Somewhere strong, somewhere weak, some places dark. Sources: lamps, shiny lights, light reflected on water on the ground, mirrors. | Built. |
| 3.5 | We see the character more clearly near a light. | Built. In the dark he is very hard to find (see 5). |
| 3.6 | Light also exposes him to monsters. Darkness hides him. | Built. |
| 3.7 | He can hide in grass, behind rocks and pillars, "and more options for hiding". | Built, with more hide spots added. |
| 3.8 | When lying down he can crawl and pass monsters. A tall monster sees him standing but not crawling. | Built. |
| 3.9 | Monsters' eyes are like a lamp, so we see where they look. Tall ones see in front. Flying ones see beneath them. | Built: soft cones that fade, brighter once he is seen. |
| 3.10 | "There must be a way to avoid them without the sword." | Built. Probably too easy now. |
| 3.11 | The Watcher: a black ball with a big eye. Once its light exposes you, kill it within five seconds or lose a heart. | Built. |
| 3.12 | A heart is a petal of his flower. | Built. |
| 3.13 | Killed monsters burst into a lot of flowers. | Built: many petals, a flash, a ring of light and a jolt. |
| 3.14 | He keeps the five monsters and wants them merged into harder monsters and bosses as the game goes on. | Built: any two merge into a harder one in the later part of the road; a boss (a giant Watcher on a stem with two Thorn heads) waits before the end from the middle difficulty up. Also usable in written games. The boss is probably still too easy. |
| 3.15 | The ending, decided by Amin on 13 Oct: "At the end of the game we cut the head and we bury it in the ground with the flower." Asked whose head, he said: "the head of character". So at the end of the road the hero's own head is cut off and buried in the ground together with his flower. Claude's reading, not confirmed: the flower stays above the ground and grows from where the head is buried. | Built: he kneels, his head is taken off and buried with the flower, the flower grows, and what is left of him fades into petals. It stays the default story; the player can choose "Home" or "The hunt" instead. |
| 3.16 | He can turn from being hunted to hunting. | Built: sneak attack from hiding. |

## 4. The hero (his words, in the order he gave them)

| # | What he asked for | Status |
|---|---|---|
| 4.1 | A little boy, about twelve, big head, small body. | Built. |
| 4.2 | Dark grey, not bright white. | Built. |
| 4.3 | Always seen from the side: his right side going forward, his left side going back. | Built. |
| 4.4 | A flower on his head. "Flowers is always there", in every genre. | Built. |
| 4.5 | A long cape to the ground. In another genre the cape goes away. | Built. |
| 4.6 | A sword. | Built. |
| 4.7 | No nose, no lips. "Just the eyes are enough." Not many details on the body. | Built. |
| 4.8 | Mood depends on what the player selects. A happy choice shows him in colour. | Built. |
| 4.9 | "The main character must be really good." Not "just a cube or just a circle". Simple, but well made. | Built: drawn from `art/hero-v5.svg` in the adventure and in written games, with a soft edge of light. |

## 5. Visuals: what is wrong today and what to do

Seen in the running game on 13 October (a "Surprise me" game, ruins, calm):

1. **The game does not fill the screen.** The scene sat in the top-left part of the window. Fix scaling so it fills a landscape phone screen edge to edge, with the ground near the bottom, not across the middle.
2. **The hero is too small and too rough.** He was about 40 pixels tall. Bring the camera closer so he is roughly a quarter of the screen height. Draw him from `art/hero-v5.svg`, split into its named parts (cape, legs, body, arm, sword, flower, head, eye), tinted per part.
3. **He needs real animation.** Legs that step, a cape that trails and swings, a flower that bobs, a sword arm that swings on a strike, a squash on landing, a smooth drop into lying down and crawling. Code-driven is fine if it looks alive.
4. **In the dark he disappears completely.** Keep his pale eye and flower readable everywhere, and add a faint edge of light on him when a light is near.
5. **Monsters look crude.** Use `art/enemies.svg` for the five base monsters. For AI-described monsters, give the AI a kit of better parts (bodies, legs, wings, horns, spikes, tails, eyes) to combine, so the result looks like one creature and not loose shapes. Yellow eyes always visible.
6. **Eye beams.** Each monster's gaze should look like light from a lamp: a soft cone that fades, clearly showing direction, brighter when it has seen him.
7. **The world is flat.** Add depth: two or three backdrop layers that move at different speeds, a ground with an edge and some texture, light that pools on the ground under lamps, a reflection in water, drifting fireflies and dust in lamp light, fog that moves.
8. **The flower burst.** Make it the best moment in the game: many flowers and petals thrown outward, a short flash, a soft sound, then they settle and can be collected.
9. **Lights.** Lamps should glow and flicker slightly. Mirrors should throw a visible beam. Water should shimmer.
10. **The maker screens.** They work but are plain. Give them the game's atmosphere: the hero standing in the scene behind the questions, changing as the player picks (mood changes the light, monsters appear as they are chosen), so the player sees the game being built.
11. **Follow Amin's design rules:** short labels stay on one line, one spacing rhythm, things line up on shared edges. Headings in Newsreader, text in Instrument Sans.

### Status of section 5 on 15 October

Items 1 to 9 are done (the graphics pass of 15 October went further: see GRAPHICS_LOOPS.md). Item 10, the maker screens, is built: the game being made stands behind the questions and changes with each choice. Item 11 is followed and checked at 568x320, 757x387, 844x390 and 1280x720.

Still missing against his wishes:
- Riding and driving inside the adventure (only in written games).
- The cards do not suggest genre mixes.
- How the games play is being reworked (movement, weapons, hints) in a separate step on 15 October.
- Nothing has been tried on a real phone.

## 6. Order of work

1. Finish the AI-writes-code path and the trial (1.2). Report honestly how well the free AIs do.
2. Visuals, items 1 to 9 of section 5. Screen fill and the hero first.
3. Genres through the code path and through blocks: bike, car, roads, firing from the car, a puzzle (1.5, 2.5).
4. Merged monsters and bosses (3.14).
5. The maker screens (5.10) and the scenario choice (3.15, 1.4). **Done 15 Oct.**

## 7. Still for Amin to answer

- Answered 13 Oct: music and sound come later. Use the default stand-in sounds for now.
- Answered 13 Oct: the ending is in 3.15.
- Open: in the ending, does the flower stay above the ground and grow from where the head is buried? And who cuts the head: he himself, with his sword?
- Open (blocks item 1.2): Amin has to approve the sandboxed code path himself in the build session.

## Redesign, 17 October 2026 (this section wins over everything above)

Amin's words, trimmed: "The UI of the application is not pleasant at all. Don't use emojis and different colours.
Simplicity is the key." ... "We have some options for the first question, and according to each selection the next
questions must be relevant to what we selected. Four options, and a fifth that is what they want [written]. If I
select weapons: knife, gun, sword, stone, and the fifth they can write. I write shotgun, I expect to see a shotgun.
I write a pen, I expect to see a pen. The AI is responsible for that part: minor changes." ... "Keep the game
minimalist with fewer options. Just the one we designed together. No different genres: not puzzles, not car racing."
... "That game must have different levels or an infinite version, so it gets harder, and the player has more options,
more weapons, more features, more decisions to make." ... "Going from left to right we see valleys, streets, exit
streets, alleys. If we do the same thing as hiding, the camera rotates 90 degrees and we enter that street and
continue the game there, so it gives different scenarios."

Decided with Amin on 17 Oct:
- **One game only:** the flower boy adventure. The other genres (road, flying, space, puzzle, catch) leave the maker.
- **Endless, in chapters.** One endless road. Each chapter ends at a gate where the player picks one new thing
  (a weapon, an ability, more light). Each chapter is harder. The score is how far he got.
- **The ending happens when the run ends:** when the last petal falls he kneels and his head is buried with the flower.
- **Side streets:** along the road there are openings (alleys, streets, valleys). Doing the hiding gesture at an
  opening turns the camera 90 degrees and he enters it: a different stretch with its own scenario, which leads back.
- **The maker:** every question has four options and a fifth, written, option. Each answer decides the next question.
  A written answer is made real by the AI as a minor change: "shotgun" gives a shotgun, "pen" gives a pen.
- **Look:** simple and calm. No emojis, few colours.

## Redesign, 18 October 2026 (wins over the 17 October section where they differ)

- **Detours live inside archway gates**, not side streets. Some archways glow with another place inside; up (W / drag up) goes through. The way back stands behind him in the detour; the far gate also leads back.
- **The camera turns round him** as he goes through, filming his side the whole time; halfway, a light from the gate carries the change into the other place. He stays put on screen, walking.
- **Monsters hunt**: once one sees him it goes after him (to where it last saw him), searches, and gives up only if he hides. Then it is fight or hide.
- **Weapon charges**: 3 uses, one comes back every 8 seconds.
- **Three quick taps throw the weapon** (blades). It kills nearly anything, then lies on the ground; no weapon until he picks it up.
- **Flowers are rarer**: about one monster in three drops them, and fewer.
- **No upgrade cards and no chapter titles**: skills come while playing from XP, chosen by the game; monsters grow stronger with every skill. Full list in SKILLS.md.
- **Water**: four kinds (pond, stream, puddles, marsh). Walking in water makes noise monsters hear; crawling is silent.
- Shooting weapons stay available for players who ask for them.

## Changes, 18 October 2026, evening (win over the sections above)

- **The maker asks two things only**: what he carries and what he meets, each four options plus a written answer. Night and place are chosen by the game. Anything written is made by the AI ("a dragon", "a frying pan"); common monsters (dragon, spider, snake, wolf, bat, ghost, zombie, scorpion) use our own drawings, like the common weapons do.
- **A described monster replaces the stock ones.** A change touches only the weapon or only the monsters, never the other.
- **"Change this game" must work**: it was failing because the AI was given too little time, and failed answers were thrown away. It never turns the game into a different (code-written) game.
- **No line of answers under "Paused"**.
- **Throwing** costs all charges and needs them full; no Boomerang skill.
- **Monster attacks must read**: a charge stops when it hits him; a stalker swipes at him when he stands close; a flyer commits to its dive.
- **Scenario**: Amin wants a story to follow and certain objects to find. He is thinking about it; do not build it yet.

## The story, 18 October 2026, night (Amin's first take; he may change it)

- **A dried-out desert world.** Dunes, cacti, dead trees, broken walls; a veil of dust over everything.
- **Living flowers to find:** ten on each stretch of road (some in the open, two hidden inside stones, three through each detour gate). Seven are needed.
- **Stones can be broken** with any weapon (two hits). Inside: a flower, a petal (a life), two weapon charges, or nothing.
- **At the gate at the end he plants the flowers**: they grow in a row, and the world takes back its colour. The gate stays shut until seven are found.
- **The world gets brighter as flowers are found**, and stays a little brighter after every planting.
- **A map at the top right** shows the whole stretch: pits, water, gates, the end, flowers in the open, stones, and him, with "found / 7".
- **Weapon charges: four.** Throwing (three quick taps) always works with a blade in hand and uses all charges.
- **Gates show only a blurred, dim glimpse inside**, no landscape.
- **Common monsters are our own drawings** (dragon, spider, snake, wolf, bat, ghost, zombie, scorpion), with hit areas to match.

## Changes, 19 October 2026

- **Ten living flowers in the whole world** (the road and its three detours), seven needed: the only flowers in the game. The small flowers on the ground are dry twigs now; monsters leave glowing drops of water, not flowers.
- **The map, from above, simple:** a small circle in the top right shows only the ways around him (the road east, each detour north from its gate). Tapping it opens the whole world's map over the game, paused.
- **Every game has all our monsters**; the second question only offers to add the player's own ("zombies"), which are added, never replacing ours.
- **Our own drawings of 37 monsters**; the AI is told their names and puts the closest one in a monster's name, so it is drawn with ours.
- **The turn into a detour:** Amin wants the camera to turn with the character, as in a 3D game. Not possible in this flat 2D game (see the conversation); waiting for his choice.
- **Ten rounds of improvement:** see ENHANCE_LOOPS.md.

## The design pass, 19 October 2026 (from the research report "Silhouette monster and hero design")

- **Every monster owns one verb**, and its outline, idle motion and light say it before it acts: a telegraph (crouch, swell, raised arm, folded wings), a short strike, then a recovery in which a soft light marks its open weak point. A strike during the recovery counts double.
- **The five monsters are redrawn** (src/game/roleView.ts): a horned, spined wedge (charger); a rooted plant with a toothed pod (spitter); a beaked bat-winged diver; a hunched stalker with ribs cut out and arms that drag on the ground; a crowned eye (watcher).
- **The flyer is a diver, never a shooter:** it freezes, flashes, folds into an arrow, dives straight to where he stood, and lies stuck on the ground, harmless and within reach.
- **One language of light** (src/game/signals.ts): eyes calm, amber when searching, the danger colour when they have him; the danger colour is kept for danger (alert eyes, charging glow, shots). Light gathers to the eye in every wind-up; one eye flare commits; struck monsters flash white; the dead break into shards.
- **The watcher's five seconds are on the beam**, which narrows and reddens, and on a ring closing round its eye.
- **All 37 drawn monsters** speak the same language, lean into their speed, breathe, and carry a rim of light.
- **The hero** is always the dark grey boy; his flower is his only colour and glows softly; he breathes when still.

## Monster behaviour, 19 October 2026 ("now focus on the functionality of the monsters")

- **Suspicious before alerted:** a monster that catches sight of him turns to him and holds still, its eyes amber, while it becomes sure (about 0.35 s close up, 1.2 s at the edge of its sight). Out of sight, it calms again. A short glimpse is forgiven. Once it is hunting him, it is sure again at once.
- **Every attack is warned** at least 0.35 s before it can hurt, and **every monster can be avoided without the sword:** hide while the charger winds up, hide while the spitter aims, step aside when the diver flashes (it dives to where he stood then), lie flat under the stalker's swipe, and leave the watcher's beam before its five seconds are up.
- **Every attack leaves an opening** of at least half a second; a strike in it counts double. Monsters keep to their own stretch of ground.
- **A merged monster uses one attack at a time.**
- **Monster shots are in the danger colour** with a glow and a tail, so they read at a glance in the dark.
- All of this is held by tests/behaviour.test.ts.
- **Bumping into any monster always hurts** (Amin, 19 Oct), whether or not it had noticed him, and it then has him and attacks. The only exception is lying hidden in cover. This replaces the earlier rule that he could slip past or crawl under a monster that had not seen him.

## Weapons and quick monsters, 19 October 2026

- **Guns fire while he lies down;** he stays down. Only a blade's swing brings him up.
- **Every weapon but stones can be thrown,** guns too: three quick taps at any time, or one tap once it is empty and has nothing left to fire. He walks over it to pick it up. A hint says so the first time it runs empty.
- **Monsters find him within a few seconds:** close by (about 240 px) they sense him even in the dark or behind their back, in about 3 s, and attack. Only lying hidden in cover keeps him from it, and a flyer does not come for him under a roof.

## Sound, holes and stones, 19 October 2026

- **Calm ambient music** in the background (Amin's wish), made in code. It gently follows the monsters, gains bell notes with each living flower, resolves when the flowers are planted, and changes key in each detour. Music and Sound sliders sit in the pause menu.
- **More holes:** about 6–8 per road instead of 1–2. Walking off an edge falls in again (the edge-catch now only helps a jump reaching the far side).
- **Stones are aimed:** their arc is worked out to land on the monster ahead, or on the ground at their reach.

## Dialogue, the boss story, bumps and healing, 19 October 2026

- **Bumping a monster at rest** (after its attack) only pushes him back; bumping one that is not resting still hurts.
- **Healing:** a defeated monster leaves water 60% of the time (was 34%), a full share (was half).
- **The story in words:** the monsters drank the Earth dry; he is the son of the rose.
  - The first monster of each kind on a stretch taunts him in a bubble, and he answers.
  - The first to fall warns that its master is waiting.
- **A boss at the end of every world:**
  - As he enters its clearing it talks (a panel at the bottom; the world holds still; a tap moves on) and calls its soldiers: 3 in world 1, up to 6.
  - In the fight with them he gets 2 extra charges, a full weapon and three times the recharge; the music goes to its fight pulse.
  - When the soldiers fall the boss faces him itself. As it dies it warns him that its brothers (or sisters, its elders, the deep ones) hold the rest of the world.
  - Bosses by world: The Thirst, The Ash Queen, The Salt King, The Dust Twins, The Last Drought.

## Fewer words, a road that fills again, five worlds, 19 October 2026

- **Talk:** only about 4 in 10 monsters taunt (the first of each kind gets one chance), he answers about half of those, and the first to fall speaks half the time.
- **Going back for flowers:** each time he reaches the end without seven flowers, monsters come back onto the road behind him (up to 3 + the world's number, at most 7), spread out and off the pits. Once more after each time he walks well away (1,500 px) and returns.
- **Five worlds** (src/game/lands.ts), then round again, harder each time:
  1. The Dry Desert: his own colours.
  2. The Ash Forest: dead trees, ember light, darker; more stalkers; pillar halls and grass.
  3. The Salt Sea: pale; more divers and spitters; more pits and ponds.
  4. The Red Canyons: rust; more spitters and watchers.
  5. The Silent City: night blue; more watchers.
  Each has its own palette, scenery, light, music key, title line and boss.
