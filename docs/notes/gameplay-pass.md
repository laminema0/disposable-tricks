# Gameplay pass

Amin, 15 October 2026: "You have to work on the logic of the games: how they play, the scenario, how they move,
how they use the weapons. It's completely unprofessional." And: "Let's see where we can use this feature that
people can use AI instantly to make changes in the games."

## Movement (src/game/hero.ts, src/game/config.ts, src/core/controls.ts)

- He speeds up and slows down instead of starting and stopping dead, and turns round quickly.
- A jump pressed a moment too early, or a moment after running off an edge, still counts.
- Jumps go higher the longer they are held; a quick flick still rises for a short minimum time.
- He falls faster than he rises and hangs a moment at the top, so jumps feel weighty, not floaty.
- Checked by stepping the simulation: full speed in about 0.1 s, stopped in about 0.1 s, short jump 118 px,
  full jump 156 px, about 0.77 s in the air, a buffered jump on landing works.

## Combat

- A hit makes the world stand still for a few hundredths of a second, with a spark and a small jolt.
- Strikes asked for during the recovery of the last one are kept and made, so taps are never lost.
- Quick strikes alternate between a downswing and an upswing; the slash turns with them.
- Shots that fly straight aim at the nearest monster ahead, so arrows and bullets can hit flyers.
- A monster's eyes flare hot and pulse just before it attacks: the warning to read and dodge.

## Scenario

- One-time hints at the moment they are needed (src/game/coach.ts): the goal at the start, how to jump at the
  first pit, how to hide at the first hiding place, how to crawl, how to strike at the first monster, and a warning
  when something sees him or a Watcher's beam has him.
- A thin road along the bottom shows how far he has come and where the planting place is.

## AI changes while playing

Where it fits, best first:
1. **"Change this game" in the menu while playing.** The player writes "slower monsters", "give me a bow",
   "make it snow" or "add a flying car", and the game rebuilds and carries on from the same spot, with the same petals.
2. **After losing:** three suggestions the AI makes from how the run went ("fewer monsters", "more light",
   "one more petal"), each one tap.
3. **For a written game:** the same box edits its script instead of starting a new one.
4. **On the end card:** "What would make it better?" replaces "remix one choice".

Built so far (engine and AI side):
- `maker.change(current, text, test, code?)` in src/ai/maker.ts: a wish that fits the blocks changes the
  settings; anything else, or any written game, has its script written or edited by the AI.
- The trick request takes `base`: the script being played. The server tells the AI to keep everything else and
  change only what the wish asks. Checked with the real AI: the Road game came back edited in 2.3 seconds.
- `GameData.resume` and `GameScene.snapshot()`: a rebuilt game carries on where he stood, with his petals and
  flowers, and no monster is placed right on top of him.

Not built yet: the box itself in the menu (src/ui), and ideas 2 and 4.
