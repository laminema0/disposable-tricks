# Skills while playing

Amin, 18 October 2026: no upgrade cards at the end of a stretch. New skills come during play, and the game chooses
them. Every new skill makes the monsters a little stronger too, so the game keeps its balance. Tuning numbers live in
`src/game/run.ts` (`SKILLS`, `XP`, `skillAt`, `threat`).

## Earning XP

| What he does | XP |
|---|---|
| Defeats a monster that takes 1 hit (crawler, flyer) | 2 |
| Defeats a monster that takes 2 hits (thorn, stalker) | 3 |
| Defeats a watcher, or a merged monster | 4 |
| Defeats a boss | 10 |
| The defeat was a sneak attack (struck from hiding) | +1 |
| Walks through a detour gate and out the other end | 3 |

## When a skill comes

The first skill comes at 4 XP. Each one after that needs 2 more XP than the last gap:

4, 10, 18, 28, 40, 54, 70, ... (skill n arrives at n² + 3n XP)

When a skill arrives, a short line appears at the top ("New skill · Longer reach") and the game goes on. There is no
pause and no menu.

## How the game chooses

From the skills still open (one-time skills drop out once he has them), a skill is picked by the run's seed. One rule
keeps the choices fair:

- If he has 1 or 2 petals left, "Full bloom" comes first when it is open.

## The skills

| Skill | What it does | Stacks |
|---|---|---|
| Longer reach | Weapon reaches 25% further | yes, up to 3 |
| Quicker hands | Strikes and shots 25% faster | yes, up to 3 |
| Sharper edge | Weapon power +1 | yes, up to 2 |
| Deep pockets | One more weapon charge (3 → 4 → 5) | yes, up to 2 |
| Quick reload | A charge comes back 25% sooner | yes, up to 2 |
| Second jump | One more jump in the air | once |
| Soft steps | Monsters notice him later in light | once |
| Quiet feet | Walking in water makes no sound | once |
| Fertile ground | Monsters drop flowers more often | once |
| Full bloom | All petals grow back at once | yes |

## Monsters grow too (threat)

Threat = the number of skills he holds.

- Every skill: monsters move 5% faster and see 3% further.
- Every 3 skills: monsters take one more hit to defeat (a sneak attack still counts double).
- Every 2 skills: one more monster in each new stretch.
- Light gets a little scarcer as threat rises, as it did with chapters before.

## Other rules from the same day

- **Weapon charges.** A weapon holds 4 charges. Each strike or shot uses one. One charge comes back every 8 seconds,
  one at a time. Four small marks by the flower show them.
- **Throwing the weapon.** Three quick taps (or J three times) throws the weapon at the nearest monster ahead. It
  needs full charges and uses all of them (Amin, 18 Oct: throwing again and again made it too easy; the Boomerang
  skill is gone). A thrown weapon defeats almost anything it hits, then lies on the ground under a column of light,
  and he has no weapon until he walks over it.
- **Flowers are rare.** Only about one monster in three drops flowers, and fewer of them. Bosses always drop.
- **Monsters hunt.** A monster that has seen him hunts him. It goes to where it last saw him, even beyond its usual
  patch, and searches there for a few seconds before giving up. Hiding is how he shakes it off.
- **Monsters hear.** Walking in water splashes, and monsters close by come to look. Crawling through water is silent.
- **Water** comes in four kinds: still pond, running stream, puddles, and marsh with reeds.
- **Detours** open inside archway gates that glow faintly. Pressing up at one takes him through it. The camera turns
  round him as he goes, with a transition into the other place. He can go back through the same gate, or walk on to
  the gate at the far end.
