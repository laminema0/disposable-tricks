import { describe, expect, it } from 'vitest';
import { EXTRA_WATCHERS, MONSTER_COUNT, SAFE_END, SAFE_START } from '../src/game/config';
import { buildLevel, pitAt } from '../src/game/level';
import { MONSTERS } from '../src/game/monsters';
import { chooseKinds, placeMonsters, type MonsterRules } from '../src/game/placement';
import { ENEMIES, type Enemy } from '../src/settings/schema';

const rules = (over: Partial<MonsterRules> = {}): MonsterRules => ({
  enemies: ['crawler', 'thorn', 'watcher'],
  difficulty: 2,
  twist: 'none',
  seed: 48213,
  ...over,
});

describe('placeMonsters', () => {
  it('gives the same monsters in the same places for the same settings', () => {
    const level = buildLevel(48213);
    expect(placeMonsters(level, rules())).toEqual(placeMonsters(level, rules()));
  });

  it('gives a different arrangement for a different seed', () => {
    const a = placeMonsters(buildLevel(1), rules({ seed: 1 }));
    const b = placeMonsters(buildLevel(2), rules({ seed: 2 }));
    expect(a).not.toEqual(b);
  });

  it('uses only the monsters the settings name', () => {
    for (const enemies of [['thorn'], ['crawler', 'flyer'], ['thorn', 'stalker']] as Enemy[][]) {
      const kinds = chooseKinds(rules({ enemies }));
      expect(kinds.length).toBeGreaterThan(0);
      for (const kind of kinds) expect(enemies).toContain(kind);
    }
  });

  it('uses every monster the settings name, at every difficulty', () => {
    for (const difficulty of [1, 2, 3]) {
      const kinds = chooseKinds(rules({ enemies: [...ENEMIES], difficulty }));
      for (const enemy of ENEMIES) expect(kinds).toContain(enemy);
    }
  });

  it('a higher difficulty means more monsters', () => {
    const count = (difficulty: number) => chooseKinds(rules({ difficulty })).length;
    expect(count(1)).toBe(MONSTER_COUNT[1]);
    expect(count(2)).toBe(MONSTER_COUNT[2]);
    expect(count(3)).toBe(MONSTER_COUNT[3]);
    expect(count(1)).toBeLessThan(count(2));
    expect(count(2)).toBeLessThan(count(3));
  });

  it('no monsters chosen means an empty road', () => {
    expect(placeMonsters(buildLevel(5), rules({ enemies: [] }))).toEqual([]);
  });

  it('the more Watchers twist adds Watchers', () => {
    const watchers = (twist: MonsterRules['twist']) =>
      chooseKinds(rules({ enemies: ['crawler', 'watcher'], twist })).filter((kind) => kind === 'watcher').length;
    expect(watchers('more-watchers')).toBe(watchers('none') + EXTRA_WATCHERS);
  });

  it('keeps the start and the planting place free, and nothing that walks stands in a pit', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const level = buildLevel(seed);
      const spawns = placeMonsters(level, rules({ enemies: [...ENEMIES], difficulty: 3, seed }));
      for (const spawn of spawns) {
        expect(spawn.x).toBeGreaterThanOrEqual(SAFE_START);
        expect(spawn.x).toBeLessThanOrEqual(level.width - SAFE_END);
        expect(spawn.minX).toBeLessThanOrEqual(spawn.x);
        expect(spawn.maxX).toBeGreaterThanOrEqual(spawn.x);
        if (MONSTERS[spawn.kind].fly === undefined) {
          expect(pitAt(level, spawn.x)).toBeUndefined();
          // Its whole patch is solid ground: it can never walk into a pit.
          for (const pit of level.pits) expect(pit.x1 <= spawn.minX || pit.x0 >= spawn.maxX).toBe(true);
        }
      }
    }
  });

  it('spreads them along the road, in order', () => {
    const spawns = placeMonsters(buildLevel(48213), rules({ difficulty: 3 }));
    const xs = spawns.map((spawn) => spawn.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(xs[xs.length - 1] - xs[0]).toBeGreaterThan(3000);
  });
});
