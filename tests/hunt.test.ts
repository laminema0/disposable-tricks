import { describe, expect, it } from 'vitest';
import { GROUND_Y } from '../src/game/config';
import { waterKind, WATER_KINDS, type Level } from '../src/game/level';
import { HUNT, MONSTERS, MonsterWorld, type HeroState } from '../src/game/monsters';

const DT = 1 / 60;

function hero(x: number, over: Partial<HeroState> = {}): HeroState {
  return { x, y: GROUND_Y, centreY: GROUND_Y - 55, lying: false, hidden: false, light: 0.8, ...over };
}

function step(w: MonsterWorld, seconds: number, at: HeroState): void {
  for (let t = 0; t < seconds; t += DT) w.step(DT, at);
}

describe('monsters hunt and hear (Amin, 18 Oct)', () => {
  it('a monster that saw him goes to where he was, past its usual patch', () => {
    const w = new MonsterWorld([{ kind: 'stalker', x: 1000, minX: 400, maxX: 1600 }]);
    const m = w.monsters[0];
    step(w, 1, hero(820)); // seen, lit, in front of it, long enough to be sure of him
    expect(m.hunt).toBeGreaterThan(0);
    // He slips into hiding further on; it strides to where it last saw him, to arm's length, and swipes there.
    step(w, 3, hero(650, { hidden: true, lying: true }));
    expect(m.x).toBeLessThan(950);
    expect(Math.abs(m.x - 820)).toBeLessThanOrEqual(100);
  });

  it('gives up once he stays hidden long enough', () => {
    const w = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 400, maxX: 1600 }]);
    const m = w.monsters[0];
    step(w, 0.2, hero(900));
    step(w, HUNT.memory + 1, hero(900, { hidden: true, lying: true }));
    expect(m.hunt).toBe(0);
  });

  it('hears a splash close by, but not a silent crawl', () => {
    const quiet = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 400, maxX: 1600 }]);
    step(quiet, 0.1, hero(1200, { light: 0, lying: true, noise: 0 }));
    expect(quiet.monsters[0].hunt).toBe(0);
    const loud = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 400, maxX: 1600 }]);
    step(loud, 0.1, hero(1200, { light: 0, noise: 300 }));
    expect(loud.monsters[0].hunt).toBeGreaterThan(0);
    expect(loud.monsters[0].lastX).toBe(1200);
  });

  it('grows with his skills: more hits, faster, further-sighted', () => {
    const w = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 400, maxX: 1600 }], { toughness: 1, pace: 1.2, sight: 1.1 });
    const m = w.monsters[0];
    expect(m.hitsLeft).toBe(MONSTERS.crawler.hits + 1);
    expect(m.speed).toBeCloseTo(1.2);
    expect(m.spec.sight).toBeGreaterThan(MONSTERS.crawler.sight);
    // The shared table is untouched.
    expect(MONSTERS.crawler.hits).toBe(1);
  });
});

describe('water comes in four kinds', () => {
  it('each piece of water is one kind, and the kinds all appear', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const level = { seed } as Level;
      const kind = waterKind(level, { x0: 300 + seed * 37, x1: 600 });
      expect(WATER_KINDS).toContain(kind);
      expect(waterKind(level, { x0: 300 + seed * 37, x1: 600 })).toBe(kind);
      seen.add(kind);
    }
    expect(seen.size).toBe(4);
  });
});
