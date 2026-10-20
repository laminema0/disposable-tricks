import { describe, expect, it } from 'vitest';
import { buildLevel } from '../src/game/level';
import { dryness, placeQuest, QUEST } from '../src/game/quest';
import { defaultSettings } from '../src/settings/defaults';

describe('the flowers to find (Amin, 18 Oct)', () => {
  const level = buildLevel(42, defaultSettings(), 6);
  const goalX = level.width - 300;

  it('puts ten flowers on a stretch with its detour, seven of them needed, some inside stones', () => {
    const road = placeQuest(level, goalX, 1, [], 'r1:', false);
    expect(road.flowers.length).toBe(QUEST.total - QUEST.perDetour);
    expect(road.flowers.filter((f) => f.stone).length).toBe(QUEST.inStones);
    expect(road.stones.length).toBe(QUEST.stones);
    const detour = placeQuest(level, goalX, 0, [], 'd1:', true);
    expect(road.flowers.length + detour.flowers.length).toBe(QUEST.total);
    expect(QUEST.needed).toBe(7);
  });

  it('keeps flowers off pits and water, and apart from each other', () => {
    const { flowers, stones } = placeQuest(level, goalX, 1, [], 'r1:', false);
    for (const f of flowers) {
      expect(level.pits.some((p) => f.x > p.x0 && f.x < p.x1)).toBe(false);
      expect(level.waters.some((w) => f.x > w.x0 && f.x < w.x1)).toBe(false);
    }
    const open = [...flowers.filter((f) => !f.stone).map((f) => f.x), ...stones.map((s) => s.x)].sort((a, b) => a - b);
    for (let i = 1; i < open.length; i++) expect(open[i] - open[i - 1]).toBeGreaterThan(140);
  });

  it('brings colour back as flowers are found and planted', () => {
    expect(dryness(0, 0)).toBe(1);
    expect(dryness(7, 0)).toBeLessThan(dryness(3, 0));
    expect(dryness(0, 3)).toBeLessThan(dryness(0, 0));
  });
});
