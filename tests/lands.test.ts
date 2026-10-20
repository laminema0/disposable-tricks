// The worlds of the run (19 Oct, more to play): five lands, each with its own look and lean.
import { describe, expect, it } from 'vitest';
import { chooseChunks } from '../src/game/level';
import { chooseKinds } from '../src/game/placement';
import { LANDS, landOf } from '../src/game/lands';
import { bossName } from '../src/game/dialogue';
import { newRun, planChapter } from '../src/game/run';
import { defaultSettings } from '../src/settings/defaults';
import { ENEMIES } from '../src/settings/schema';

describe('lands', () => {
  it('five lands, each after the first with its own colours and scenery, and its boss', () => {
    expect(LANDS).toHaveLength(5);
    expect(new Set(LANDS.map((l) => l.name)).size).toBe(5);
    for (const land of LANDS.slice(1)) {
      expect(land.palette).toBeDefined();
      expect(land.scenery?.length).toBeGreaterThan(0);
    }
    expect(landOf(6)).toBe(LANDS[0]);
    expect(bossName(2)).toBe('The Ash Queen');
  });

  it('a world takes its land: world 2 is the ash forest, in its colours, darker', () => {
    const base = { ...defaultSettings(), enemies: [...ENEMIES] };
    const one = planChapter(base, { ...newRun(5), chapter: 1 });
    const two = planChapter(base, { ...newRun(5), chapter: 2 });
    expect(one.settings.palette).toEqual(base.palette);
    expect(two.settings.palette).toEqual(LANDS[1].palette);
    expect(two.settings.scenery).toEqual(LANDS[1].scenery);
    expect(two.more).toContain('stalker');
  });

  it("a land's own stretches and monsters come up more often", () => {
    let pillar = 0;
    let plain = 0;
    for (let seed = 1; seed <= 200; seed++) {
      pillar += chooseChunks(seed, 11, ['pillarHall']).filter((c) => c === 'pillarHall').length;
      plain += chooseChunks(seed, 11).filter((c) => c === 'pillarHall').length;
    }
    expect(pillar).toBeGreaterThan(plain);
    const rules = { enemies: [...ENEMIES], difficulty: 2, twist: 'none' as const, seed: 7, count: 40 };
    const leaning = chooseKinds({ ...rules, more: ['watcher', 'watcher'] }).filter((k) => k === 'watcher').length;
    const even = chooseKinds(rules).filter((k) => k === 'watcher').length;
    expect(leaning).toBeGreaterThan(even);
  });
});

describe('land lines', () => {
  it('fit on one line under the title', () => {
    for (const land of LANDS) expect(land.line.length, land.line).toBeLessThanOrEqual(58);
  });
});
