// Ten worlds, ten bosses (Amin, 20 Oct): "only 10 levels ... harder in each level ... every boss ... has a
// different characteristic and abilities, and is completely different person".
import { describe, expect, it } from 'vitest';
import { BOSSES, bossOf, bossPhase, type BossProfile } from '../src/game/bosses';
import { GROUND_Y } from '../src/game/config';
import { bossDesign } from '../src/game/creatures';
import { bossBody } from '../src/game/kit';
import { MonsterWorld, type HeroState, type StepResult } from '../src/game/monsters';
import { afterGate, isLastLevel, LAST_LEVEL, LEVELS, levelOf, newRun, planChapter } from '../src/game/run';
import { defaultSettings } from '../src/settings/defaults';

const hero = (over: Partial<HeroState> = {}): HeroState => ({ x: 800, y: GROUND_Y, centreY: GROUND_Y - 55, lying: false, hidden: false, light: 0, ...over });

/** A fight with the boss of this world, standing at 1000; one that moves may come as far as 700. */
function fight(chapter: number) {
  const design = bossDesign(chapter);
  const world = new MonsterWorld([{ kind: 'watcher', x: 1000, minX: 700, maxX: 1000, design }]);
  return { world, boss: world.monsters[0] };
}

/** Run the fight and gather what happened. */
function watch(world: MonsterWorld, seconds: number, state: HeroState) {
  const results: StepResult[] = [];
  for (let i = 0; i < seconds * 60; i++) results.push(world.step(1 / 60, state));
  return results;
}

/** What a boss can do, as one line: no two bosses fight the same way. */
const ways = (p: BossProfile) =>
  JSON.stringify([p.spit.map(Boolean), p.volley.map((v) => v > 1), p.rain.map(Boolean), p.stomp.map(Boolean), p.walk.map(Boolean), p.gust.map(Boolean), p.summon.map(Boolean), p.blink, p.heal > 0, p.countdown < 2]);

describe('ten levels', () => {
  it('there are ten, and the run stops at the tenth', () => {
    expect(LAST_LEVEL).toBe(10);
    expect(LEVELS).toHaveLength(10);
    expect(BOSSES).toHaveLength(10);
    expect(isLastLevel(9)).toBe(false);
    expect(isLastLevel(10)).toBe(true);
    expect(afterGate({ ...newRun(5), chapter: 10 }, 1000).chapter).toBe(10);
    expect(afterGate({ ...newRun(5), chapter: 9 }, 1000).chapter).toBe(10);
  });

  it('every level is harder than the one before', () => {
    for (let c = 2; c <= 10; c++) {
      const [was, now] = [levelOf(c - 1), levelOf(c)];
      expect(now.monsters, `world ${c}`).toBeGreaterThan(was.monsters);
      expect(now.pace).toBeGreaterThan(was.pace);
      expect(now.sight).toBeGreaterThan(was.sight);
      expect(now.screens).toBeGreaterThanOrEqual(was.screens);
      expect(now.toughness).toBeGreaterThanOrEqual(was.toughness);
      expect(now.soldiers).toBeGreaterThanOrEqual(was.soldiers);
      expect(bossOf(c).hits).toBeGreaterThanOrEqual(bossOf(c - 1).hits);
    }
    const base = defaultSettings();
    const first = planChapter(base, newRun(5));
    const last = planChapter(base, { ...newRun(5), chapter: 10 });
    expect(last.monsters).toBeGreaterThan(first.monsters);
    expect(last.toughness).toBeGreaterThan(first.toughness);
    expect(last.settings.difficulty).toBeGreaterThan(first.settings.difficulty);
  });
});

describe('ten bosses', () => {
  it('each is its own: its own name, body, and way of fighting', () => {
    expect(new Set(BOSSES.map((b) => b.name)).size).toBe(10);
    expect(new Set(BOSSES.map((b) => b.body)).size).toBe(10);
    expect(new Set(BOSSES.map(ways)).size).toBe(10);
    // Their bodies are drawn differently, each with one great eye.
    const drawn = BOSSES.map((b) => bossBody(b.body));
    expect(new Set(drawn.map((d) => JSON.stringify(d.figure.shapes))).size).toBe(10);
    for (const d of drawn) {
      expect(d.figure.eyes[0].pupil).toBe(true);
      // Its eye is on its body, its head on the screen.
      expect(d.eye.up).toBeLessThanOrEqual(d.figure.height);
      expect(d.figure.height).toBeLessThan(GROUND_Y);
    }
  });

  it('the boss of each world is that world’s', () => {
    for (let c = 1; c <= 10; c++) {
      const design = bossDesign(c);
      expect(design.profile?.name).toBe(bossOf(c).name);
      expect(design.spec.hits).toBe(bossOf(c).hits);
    }
  });

  it('the last boss does a little of everything the others did', () => {
    const last = bossOf(10);
    expect(last.hits).toBe(Math.max(...BOSSES.map((b) => b.hits)));
    for (const way of [last.rain, last.stomp, last.walk, last.gust, last.summon, last.spit]) expect(Math.max(...way)).toBeGreaterThan(0);
    expect(last.blink && last.heal > 0).toBe(true);
  });

  it('every boss can be beaten without a weapon: found, hidden from, dazed, its root pulled', () => {
    for (let c = 1; c <= 10; c++) {
      const { world, boss } = fight(c);
      for (let round = 0; round < 3 && boss.alive; round++) {
        let guard = 0;
        while (!boss.boss?.found && guard++ < 1200) world.step(1 / 60, hero({ x: boss.x - 200 }));
        guard = 0;
        while ((boss.boss?.daze ?? 0) <= 0 && guard++ < 1200) world.step(1 / 60, hero({ x: boss.x - 200, lying: true, hidden: true }));
        expect(boss.boss?.daze, `${bossOf(c).name}, round ${round}`).toBeGreaterThan(0);
        world.step(1 / 60, hero({ x: boss.x - 10 }));
        // Out of its way while it wakes in its next phase (some vanish, some walk).
        watch(world, 1.2, hero({ x: 400, lying: true, hidden: true }));
      }
      expect(boss.alive, bossOf(c).name).toBe(false);
    }
  });

  it('the Ash Queen fans her embers', () => {
    const { world, boss } = fight(2);
    boss.hitsLeft = bossOf(2).hits - bossOf(2).perPhase;
    let most = 0;
    for (let i = 0; i < 240; i++) {
      world.step(1 / 60, hero({ x: 540 }));
      most = Math.max(most, world.shots.length);
    }
    expect(most).toBeGreaterThanOrEqual(3);
  });

  it('the Salt King rains salt where he stands', () => {
    const { world } = fight(3);
    let fell = false;
    for (let i = 0; i < 240 && !fell; i++) {
      world.step(1 / 60, hero({ lying: true, hidden: true }));
      fell = world.shots.some((s) => s.vx === 0 && s.vy > 0 && Math.abs(s.x - 800) < 40);
    }
    expect(fell).toBe(true);
  });

  it('the Dust Twins vanish when hurt, and rise in front of him', () => {
    const { world, boss } = fight(4);
    boss.hitsLeft = bossOf(4).hits - bossOf(4).perPhase;
    const results = watch(world, 0.1, hero({ x: 600 }));
    const blink = results.find((r) => r.blinked)?.blinked;
    expect(blink).toBeDefined();
    expect(boss.x).toBeLessThan(1000);
    expect(boss.x).toBeGreaterThan(600);
  });

  it('the Mire Mother calls her children, and heals with her eye shut', () => {
    const { world, boss } = fight(6);
    const p = bossOf(6);
    boss.hitsLeft = p.hits - p.perPhase - 1;
    const results = watch(world, 0.1, hero({ x: 600, lying: true, hidden: true }));
    expect(results.some((r) => (r.summon ?? 0) > 0)).toBe(true);
    const before = boss.hitsLeft;
    watch(world, 12, hero({ x: 300, lying: true, hidden: true }));
    expect(boss.hitsLeft).toBe(before + 1);
    // Never out of the phase it is in.
    expect(bossPhase(p, boss.hitsLeft)).toBe(1);
  });

  it('the Hollow Giant walks at him and stamps waves he must jump', () => {
    const { world, boss } = fight(7);
    const results = watch(world, 4, hero({ x: 500, lying: true, hidden: true }));
    expect(boss.x).toBeLessThan(1000);
    expect(results.some((r) => r.stomped)).toBe(true);
    // A wave hurts him standing; jumping, it passes under him.
    const standing = fight(7);
    let hurt = false;
    for (let i = 0; i < 400 && !hurt; i++) hurt = standing.world.step(1 / 60, hero({ x: 870, hidden: true })).hurt;
    expect(hurt).toBe(true);
    const jumping = fight(7);
    let hit = false;
    for (let i = 0; i < 400; i++) hit = jumping.world.step(1 / 60, hero({ x: 870, y: GROUND_Y - 60, centreY: GROUND_Y - 115, hidden: true })).hurt || hit;
    expect(hit).toBe(false);
  });

  it('the Storm Crow blows him back with its wings, unless he lies flat', () => {
    const { world } = fight(8);
    expect(watch(world, 4, hero({ hidden: true })).some((r) => r.gust === -1)).toBe(true);
    const flat = fight(8);
    expect(watch(flat.world, 4, hero({ lying: true, hidden: true })).some((r) => r.gust)).toBe(false);
  });
});
