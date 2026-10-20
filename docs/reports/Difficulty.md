# Difficulty: bot playtests and tuning (19 October 2026)

Step 3 of the improvement plan. Without a person to watch, three bot players play the game's real rules
(level, placement, monsters, health) on 60 real first roads each (8 screens, 5 monsters).
Code: tests/sim/playtest.ts; guard test: tests/playtest.test.ts (`PLAYTEST=1 npx vitest run tests/playtest.test.ts` prints the table).

The bots react with a human delay and make human mistakes:

| Bot | Reaction time | Misses a warning | Jump error at an edge |
|---|---|---|---|
| Novice | 0.5 s | 25% | ±26 px |
| Average | 0.33 s | 12% | ±14 px |
| Skilled | 0.22 s | 4% | ±7 px |

They never hide, sneak-attack or pick up water, so they do worse than a person. Read their numbers as floors.

## What research says

- Flow: too easy bores, too hard makes anxious. Good games rise in waves of tension and release; Left 4 Dead's Director pulls threats back when a player's intensity runs high.
- Celeste keeps its challenge but offers an Assist Mode (speed, invincibility) with non-patronising wording. It was widely praised and is held up as best practice.

## Measured: first road, share of runs finished

| | Before the pass | After |
|---|---|---|
| Novice | 35% | 63% |
| Average | 43% | 63% |
| Skilled | 63% | 83% |
| Petals lost (skilled, of 5) | 2.97 | 2.33 |
| Pit falls per road (skilled) | 0.85 (a bot fault) | 0.38 |

## What hurt the bots

Most damage came from **bumping**:
- walking or jumping into a hovering diver;
- landing on a charger that is resting after its charge;
- the diver rising out of its rest.

That follows Amin's rule that bumping always hurts. Next came charges, dives and pits.

## Changes to the game

- After a hit, he's pushed **away from the monster** that hurt him. Before, it was always backwards, which could push him into a monster behind him and cost a second petal.
- Safe time after a hit: 1.0 s → 1.5 s.
- Warning before a charge: 0.4 s → 0.5 s. Before a dive: 0.5 s → 0.6 s.
- The widest pit is back to 120 px. At 150 px it left only about 17 px of room to jump.

## Still open (Amin's call)

- Bumping into a monster that is **resting or hovering** still hurts. That's the largest remaining source of damage. Options:
  - keep it;
  - make a bump during a monster's rest only push him back;
  - make a hovering diver fly higher.
- Healing is rare: a defeated monster drops water 34% of the time, about a tenth of a petal.
- An assist option in the menu, as in Celeste: slower game, or more petals.
