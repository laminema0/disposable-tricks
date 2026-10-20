import { describe, expect, it } from 'vitest';
import { withDescribed } from '../src/ai/maker';
import { repairSettings } from '../src/settings/validate';

describe('a described monster is added to all of ours (18 Oct, evening)', () => {
  const all = ['crawler', 'thorn', 'flyer', 'stalker', 'watcher'] as const;
  const dragon = { name: 'Dragon', body: 'flying', move: 'fly', attack: 'spit', size: 1.2, speed: 1, hits: 2, eyes: 2 } as const;
  const zombie = { name: 'Zombie', body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 0.7, hits: 2, eyes: 2 } as const;

  it('keeps every monster of ours and adds the described one', () => {
    const before = repairSettings({ seed: 1, enemies: [...all] });
    const after = repairSettings({ ...before, enemies: [], creatures: [dragon] });
    const made = withDescribed(before, after);
    expect(made.enemies).toEqual([...all]);
    expect(made.creatures.map((c) => c.name)).toEqual(['Dragon']);
  });

  it('adds a second one next to the first', () => {
    const before = repairSettings({ seed: 1, enemies: [...all], creatures: [dragon] });
    const after = repairSettings({ ...before, creatures: [zombie] });
    expect(withDescribed(before, after).creatures.map((c) => c.name)).toEqual(['Dragon', 'Zombie']);
  });
});
