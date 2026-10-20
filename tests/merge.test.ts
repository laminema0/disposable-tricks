import { describe, expect, it } from 'vitest';
import { ARENA, BOSS_FROM, GROUND_Y } from '../src/game/config';
import { bossDesign, designFor, mergeDesign, mixedCreature } from '../src/game/creatures';
import { bossFigure, creatureFigure, frameFigures, mergeFigure, mergeKey } from '../src/game/kit';
import { addArena, buildLevel, hideSpotAt } from '../src/game/level';
import { MONSTERS, MonsterWorld, type HeroState, type Spawn } from '../src/game/monsters';
import { chooseMerges, chooseKinds, hasBoss, placeMonsters, type MonsterRules } from '../src/game/placement';
import { inSight } from '../src/game/sight';
import { ENEMIES, type Enemy } from '../src/settings/schema';
import { bossOf } from '../src/game/bosses';

const PAIRS: [Enemy, Enemy][] = ENEMIES.flatMap((a, i) => ENEMIES.slice(i + 1).map((b): [Enemy, Enemy] => [a, b]));
const rules = (over: Partial<MonsterRules> = {}): MonsterRules => ({ enemies: ['crawler', 'thorn', 'flyer'], difficulty: 2, twist: 'none', seed: 7, ...over });
const hero = (over: Partial<HeroState> = {}): HeroState => ({ x: 0, y: GROUND_Y, centreY: GROUND_Y - 46, lying: false, hidden: false, light: 1, ...over });

describe('the kit', () => {
  it('builds a figure with eyes for every pair of the five, and for the boss', () => {
    expect(PAIRS).toHaveLength(10);
    for (const [a, b] of PAIRS) {
      const figure = mergeFigure(a, b);
      expect(figure.shapes.length).toBeGreaterThan(1);
      expect(figure.eyes.length).toBeGreaterThan(0);
      expect(figure.height).toBeGreaterThan(30);
      // The order the two are named in does not matter.
      expect(mergeFigure(b, a)).toEqual(figure);
    }
    expect(bossFigure().eyes[0].pupil).toBe(true);
    expect(Object.keys(frameFigures())).toHaveLength(11);
  });

  it('gives anything that flies wings, and a described monster as many eyes as it was given', () => {
    expect(mergeFigure('crawler', 'flyer').wingAt).toBeGreaterThan(0);
    expect(mergeFigure('stalker', 'thorn').wingAt).toBe(0);
    for (let seed = 1; seed <= 40; seed++) {
      const creature = mixedCreature(seed);
      const figure = creatureFigure(creature);
      expect(figure.eyes.length).toBeGreaterThan(0);
      if (creature.attack !== 'spit' && creature.attack !== 'beam') expect(figure.eyes).toHaveLength(creature.eyes);
      expect(designFor(creature).figure).toEqual(figure);
    }
  });
});

describe('merged monsters', () => {
  it('are harder than either kind: the strikes and flowers of both', () => {
    for (const [a, b] of PAIRS) {
      const design = mergeDesign(a, b);
      expect(design.spec.hits).toBe(MONSTERS[a].hits + MONSTERS[b].hits);
      expect(design.spec.flowers).toBe(MONSTERS[a].flowers + MONSTERS[b].flowers);
      expect([a, b]).toContain(design.brain);
      expect([a, b]).toContain(design.also);
      expect(design.name).toBe(mergeKey(a, b));
    }
  });

  it('see in both ways: a winged crawler sees him below it and ahead of it on the ground', () => {
    const design = mergeDesign('crawler', 'flyer');
    expect(design.brain).toBe('flyer');
    const seer = { x: 0, y: GROUND_Y - 128, facing: 1 as const };
    const standing = (x: number) => ({ x, top: GROUND_Y - 92, bottom: GROUND_Y, roofed: false });
    const seen = (x: number) => [design.sight, design.extraSight].some((shape) => shape !== undefined && inSight(shape, seer, standing(x)));
    expect(seen(0)).toBe(true); // right under it, as a Flyer sees
    expect(seen(220)).toBe(true); // ahead on the ground, as a Crawler sees
    expect(seen(-220)).toBe(false); // behind it
  });

  it('a merge with a Thorn spits while it does what its body does', () => {
    const spawn: Spawn = { kind: 'crawler', x: 300, minX: 0, maxX: 900, design: mergeDesign('crawler', 'thorn') };
    const world = new MonsterWorld([spawn]);
    for (let i = 0; i < 120; i++) world.step(1 / 60, hero({ x: 80 }));
    expect(world.shots.length + (world.monsters[0].spitIn > 0 && world.monsters[0].spitIn < 1.8 ? 1 : 0)).toBeGreaterThan(0);
  });

  it('a merge with a Watcher exposes him with its beam', () => {
    const spawn: Spawn = { kind: 'crawler', x: 300, minX: 300, maxX: 300, design: mergeDesign('crawler', 'watcher') };
    const world = new MonsterWorld([spawn]);
    const result = world.step(1 / 60, hero({ x: 120, light: 0 }));
    expect(result.exposed).toBe(true);
  });
});

describe('as you go', () => {
  it('keeps the first part of the road plain and puts merges in the later part, more of them when harder', () => {
    const count = (difficulty: number) => {
      const r = rules({ difficulty });
      const merges = chooseMerges(r, chooseKinds(r));
      const first = merges.findIndex((merge) => merge !== undefined);
      // Once merges begin, everything after is a merge.
      if (first >= 0) expect(merges.slice(first).every((merge) => merge !== undefined)).toBe(true);
      return merges.filter((merge) => merge !== undefined).length;
    };
    expect(count(1)).toBeLessThan(count(2));
    expect(count(2)).toBeLessThan(count(3));
    expect(count(1)).toBeGreaterThan(0);
  });

  it('merges the kinds the game has, and finds a partner for a game with one kind', () => {
    const many = rules({ difficulty: 3 });
    for (const merge of chooseMerges(many, chooseKinds(many))) if (merge) expect(many.enemies).toContain(merge[1]);
    const one = rules({ enemies: ['thorn'], difficulty: 3 });
    for (const merge of chooseMerges(one, chooseKinds(one))) if (merge) expect(merge[1]).not.toBe('thorn');
  });

  it('puts the boss last, in its own clearing, from the middle difficulty up', () => {
    expect(hasBoss(rules({ difficulty: BOSS_FROM - 1 }))).toBe(false);
    expect(hasBoss(rules({ enemies: [] }))).toBe(false);
    const level = addArena(buildLevel(7));
    const spawns = placeMonsters(level, rules());
    const last = spawns[spawns.length - 1];
    expect(last.design?.boss).toBe(true);
    expect(last.x).toBe(level.arena?.bossX);
    for (const spawn of spawns.slice(0, -1)) expect(spawn.x).toBeLessThan(level.arena!.x0);
    // Two places to hide, inside the reach of its eye.
    expect(hideSpotAt(level, level.arena!.x0 + ARENA.grass[0] + 10)?.kind).toBe('grass');
    expect(level.arena!.bossX - (level.arena!.x0 + ARENA.rock[0])).toBeLessThan(bossOf(1).range);
  });
});

describe('the boss', () => {
  const fight = () => {
    const world = new MonsterWorld([{ kind: 'watcher', x: 1000, minX: 1000, maxX: 1000, design: bossDesign() }]);
    return { world, boss: world.monsters[0] };
  };
  const run = (world: MonsterWorld, seconds: number, state: HeroState) => {
    let hurt = 0;
    for (let i = 0; i < seconds * 60; i++) if (world.step(1 / 60, state).hurt) hurt++;
    return hurt;
  };

  it('costs a petal when he stands in its open eye, and none while he is hidden', () => {
    const open = fight();
    expect(run(open.world, 3, hero({ x: 800, light: 0 }))).toBeGreaterThan(0);
    const hidden = fight();
    expect(run(hidden.world, 3, hero({ x: 800, lying: true, hidden: true, light: 0 }))).toBe(0);
  });

  it('with no weapon: let it see him, hide to daze it, pull its root; three times and it is beaten', () => {
    const { world, boss } = fight();
    for (let round = 0; round < 3; round++) {
      expect(boss.alive).toBe(true);
      // Hiding before it has found him does nothing.
      if (round === 0) {
        run(world, 2, hero({ x: 800, lying: true, hidden: true, light: 0 }));
        expect(boss.boss?.daze).toBe(0);
      }
      let guard = 0;
      while (!boss.boss?.found && guard++ < 1200) world.step(1 / 60, hero({ x: 800, light: 0 }));
      expect(boss.boss?.found).toBe(true);
      guard = 0;
      while ((boss.boss?.daze ?? 0) <= 0 && guard++ < 1200) world.step(1 / 60, hero({ x: 800, lying: true, hidden: true, light: 0 }));
      expect(boss.boss?.daze).toBeGreaterThan(0);
      world.step(1 / 60, hero({ x: 990, light: 0 }));
      expect(boss.pulled).toBe(true);
      boss.pulled = false;
      expect(boss.hitsLeft).toBe(bossOf(1).hits - (round + 1) * bossOf(1).perPhase);
      run(world, 1.2, hero({ x: 600, lying: true, hidden: true, light: 0 }));
    }
    expect(boss.alive).toBe(false);
  });

  it('with a weapon: a few strikes fell it, never one, and it gets harder on the way', () => {
    const { world, boss } = fight();
    const zone = { x0: 960, x1: 1040, y0: GROUND_Y - 120, y1: GROUND_Y };
    world.strike(zone, true, 1, 1);
    expect(boss.alive).toBe(true);
    expect(boss.hitsLeft).toBe(bossOf(1).hits - 2);
    for (let id = 2; boss.alive && id < 20; id++) world.strike(zone, false, id, 1);
    expect(boss.alive).toBe(false);
    const again = fight();
    again.world.strike(zone, false, 1, 1);
    again.world.strike(zone, false, 2, 1);
    again.world.strike(zone, false, 3, 1);
    again.world.step(1 / 60, hero({ x: 800 }));
    expect(again.boss.boss?.phase).toBe(1);
  });
});

describe('the winged tall walker', () => {
  it('reaches down and swipes from the air when he is close', () => {
    const world = new MonsterWorld([{ kind: 'flyer', x: 400, minX: 400, maxX: 400, design: mergeDesign('flyer', 'stalker') }]);
    let wound = false;
    for (let i = 0; i < 240; i++) {
      world.step(1 / 60, hero({ x: 430 }));
      if (world.monsters[0].swipeT > 0) wound = true;
    }
    expect(wound).toBe(true);
  });
});
