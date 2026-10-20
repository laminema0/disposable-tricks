import { describe, expect, it } from 'vitest';
import { QUEST } from '../src/game/quest';
import { newRun } from '../src/game/run';
import { worldLayout } from '../src/game/world';
import { sceneFor } from '../src/settings/tree';
import { repairSettings } from '../src/settings/validate';

describe('one world (Amin, 18 Oct)', () => {
  it('has three detours and exactly ten flowers in all of it', () => {
    for (const seed of [3, 41, 977]) {
      const world = worldLayout(sceneFor(repairSettings({ seed })), newRun(5));
      expect(world.detours.length).toBe(3);
      const flowers = world.road.quest.flowers.length + world.detours.reduce((sum, d) => sum + d.quest.flowers.length, 0);
      expect(flowers).toBe(QUEST.total);
      const ids = [world.road.quest, ...world.detours.map((d) => d.quest)].flatMap((q) => q.flowers.map((f) => f.id));
      expect(new Set(ids).size).toBe(QUEST.total);
    }
  });

  it('is the same world every time it is worked out', () => {
    const base = sceneFor(repairSettings({ seed: 12 }));
    expect(JSON.stringify(worldLayout(base, newRun(5)))).toBe(JSON.stringify(worldLayout(base, { ...newRun(5), upgrades: ['reach', 'quick'] })));
  });
});
